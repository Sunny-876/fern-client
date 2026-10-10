import * as path from 'path';
import * as fs from 'fs/promises';
import * as zlib from 'zlib';

export interface ZipEntry {
  name: string;
  isDirectory: boolean;
  compressedSize: number;
  uncompressedSize: number;
  crc32: number;
  compressionMethod: number; // 0 = stored, 8 = deflated
  dataOffset: number;
  getData: () => Buffer;
}

// Precomputed CRC32 table
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c >>> 0;
}

export function calculateCrc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Parses Central Directory of a ZIP archive from a Buffer.
 */
export function readZipEntries(buffer: Buffer): ZipEntry[] {
  const entries: ZipEntry[] = [];
  if (buffer.length < 22) {
    return entries;
  }

  // Find End of Central Directory Record (EOCD) signature 0x06054b50
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    return entries;
  }

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const cdSize = buffer.readUInt32LE(eocdOffset + 12);
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

  let currentOffset = cdOffset;
  for (let i = 0; i < totalEntries && currentOffset < buffer.length; i++) {
    if (buffer.readUInt32LE(currentOffset) !== 0x02014b50) {
      break;
    }

    const compressionMethod = buffer.readUInt16LE(currentOffset + 10);
    const crc32 = buffer.readUInt32LE(currentOffset + 16);
    const compressedSize = buffer.readUInt32LE(currentOffset + 20);
    const uncompressedSize = buffer.readUInt32LE(currentOffset + 24);
    const fileNameLength = buffer.readUInt16LE(currentOffset + 28);
    const extraFieldLength = buffer.readUInt16LE(currentOffset + 30);
    const commentLength = buffer.readUInt16LE(currentOffset + 32);
    const localHeaderOffset = buffer.readUInt32LE(currentOffset + 42);

    const fileNameBytes = buffer.slice(currentOffset + 46, currentOffset + 46 + fileNameLength);
    const name = fileNameBytes.toString('utf-8');
    const isDirectory = name.endsWith('/') || name.endsWith('\\');

    // Calculate actual data offset from Local File Header
    const localNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localNameLen + localExtraLen;

    entries.push({
      name,
      isDirectory,
      compressedSize,
      uncompressedSize,
      crc32,
      compressionMethod,
      dataOffset,
      getData: () => {
        if (isDirectory || uncompressedSize === 0) {
          return Buffer.alloc(0);
        }
        const compressedData = buffer.slice(dataOffset, dataOffset + compressedSize);
        if (compressionMethod === 0) {
          return compressedData;
        } else if (compressionMethod === 8) {
          return zlib.inflateRawSync(compressedData);
        } else {
          throw new Error(`Unsupported ZIP compression method: ${compressionMethod}`);
        }
      },
    });

    currentOffset += 46 + fileNameLength + extraFieldLength + commentLength;
  }

  return entries;
}

/**
 * Reads a text file directly from inside a zip buffer without extracting.
 */
export function readZipEntryText(buffer: Buffer, entryPath: string): string | null {
  const entries = readZipEntries(buffer);
  const normalizedTarget = entryPath.replace(/\\/g, '/').toLowerCase();
  const entry = entries.find((e) => e.name.replace(/\\/g, '/').toLowerCase() === normalizedTarget);
  if (!entry) return null;
  return entry.getData().toString('utf-8');
}

export interface SafeExtractOptions {
  maxTotalBytes?: number; // Zip bomb defense, default 500 MB
  filter?: (entryName: string) => boolean;
}

/**
 * Safely extracts a ZIP buffer to a destination directory.
 * Includes strict path traversal and zip bomb defenses.
 */
export async function extractZipSafe(
  buffer: Buffer,
  targetDir: string,
  options: SafeExtractOptions = {}
): Promise<string[]> {
  const maxBytes = options.maxTotalBytes || 500 * 1024 * 1024;
  const entries = readZipEntries(buffer);
  const extractedFiles: string[] = [];
  const normalizedTargetRoot = path.resolve(targetDir);

  await fs.mkdir(normalizedTargetRoot, { recursive: true });

  let cumulativeBytes = 0;

  for (const entry of entries) {
    if (options.filter && !options.filter(entry.name)) {
      continue;
    }

    // Path traversal defense
    const rawName = entry.name.replace(/\\/g, '/');
    if (rawName.includes('..') || rawName.startsWith('/') || /^[a-zA-Z]:/.test(rawName)) {
      throw new Error(`Security Violation: Path traversal attack detected in zip entry "${entry.name}"`);
    }

    const resolvedDestination = path.resolve(normalizedTargetRoot, rawName);
    if (
      !resolvedDestination.startsWith(normalizedTargetRoot + path.sep) &&
      resolvedDestination !== normalizedTargetRoot
    ) {
      throw new Error(`Security Violation: Zip entry "${entry.name}" escapes target directory`);
    }

    if (entry.isDirectory) {
      await fs.mkdir(resolvedDestination, { recursive: true });
      continue;
    }

    cumulativeBytes += entry.uncompressedSize;
    if (cumulativeBytes > maxBytes) {
      throw new Error(`Security Violation: Uncompressed size exceeds maximum safety limit (${maxBytes} bytes)`);
    }

    await fs.mkdir(path.dirname(resolvedDestination), { recursive: true });
    const fileData = entry.getData();
    await fs.writeFile(resolvedDestination, fileData);
    extractedFiles.push(resolvedDestination);
  }

  return extractedFiles;
}

/**
 * Creates a standard ZIP archive buffer from a list of relative file entries.
 */
export function createZipArchive(
  entries: Array<{ relativePath: string; content: Buffer | string }>
): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let currentOffset = 0;

  for (const entry of entries) {
    const rawContent = Buffer.isBuffer(entry.content)
      ? entry.content
      : Buffer.from(entry.content, 'utf-8');
    const nameBytes = Buffer.from(entry.relativePath.replace(/\\/g, '/'), 'utf-8');
    const crc = calculateCrc32(rawContent);

    // Deflate content
    const deflated = zlib.deflateRawSync(rawContent);
    const isSmaller = deflated.length < rawContent.length;
    const compressionMethod = isSmaller ? 8 : 0;
    const compressedData = isSmaller ? deflated : rawContent;

    // Local File Header (30 bytes + name length)
    const localHeader = Buffer.alloc(30 + nameBytes.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local header signature
    localHeader.writeUInt16LE(20, 4); // Version needed to extract (2.0)
    localHeader.writeUInt16LE(0, 6); // General purpose bit flag
    localHeader.writeUInt16LE(compressionMethod, 8);
    localHeader.writeUInt16LE(0, 10); // Last mod file time
    localHeader.writeUInt16LE(0, 12); // Last mod file date
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressedData.length, 18);
    localHeader.writeUInt32LE(rawContent.length, 22);
    localHeader.writeUInt16LE(nameBytes.length, 26);
    localHeader.writeUInt16LE(0, 28); // Extra field length
    nameBytes.copy(localHeader, 30);

    localHeaders.push(localHeader, compressedData);

    // Central Directory Header (46 bytes + name length)
    const cdHeader = Buffer.alloc(46 + nameBytes.length);
    cdHeader.writeUInt32LE(0x02014b50, 0); // CD header signature
    cdHeader.writeUInt16LE(20, 4); // Version made by
    cdHeader.writeUInt16LE(20, 6); // Version needed to extract
    cdHeader.writeUInt16LE(0, 8); // General purpose bit flag
    cdHeader.writeUInt16LE(compressionMethod, 10);
    cdHeader.writeUInt16LE(0, 12); // Last mod time
    cdHeader.writeUInt16LE(0, 14); // Last mod date
    cdHeader.writeUInt32LE(crc, 16);
    cdHeader.writeUInt32LE(compressedData.length, 20);
    cdHeader.writeUInt32LE(rawContent.length, 24);
    cdHeader.writeUInt16LE(nameBytes.length, 28);
    cdHeader.writeUInt16LE(0, 30); // Extra field length
    cdHeader.writeUInt16LE(0, 32); // Comment length
    cdHeader.writeUInt16LE(0, 34); // Disk number start
    cdHeader.writeUInt16LE(0, 36); // Internal file attributes
    cdHeader.writeUInt32LE(0, 38); // External file attributes
    cdHeader.writeUInt32LE(currentOffset, 42); // Relative offset of local header
    nameBytes.copy(cdHeader, 46);

    centralHeaders.push(cdHeader);
    currentOffset += localHeader.length + compressedData.length;
  }

  const centralDirBuffer = Buffer.concat(centralHeaders);
  const cdOffset = currentOffset;
  const cdSize = centralDirBuffer.length;

  // End of Central Directory Record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4); // Disk number
  eocd.writeUInt16LE(0, 6); // Start disk
  eocd.writeUInt16LE(entries.length, 8); // Entries on this disk
  eocd.writeUInt16LE(entries.length, 10); // Total entries
  eocd.writeUInt32LE(cdSize, 12); // CD size
  eocd.writeUInt32LE(cdOffset, 16); // CD offset
  eocd.writeUInt16LE(0, 20); // Comment length

  return Buffer.concat([...localHeaders, centralDirBuffer, eocd]);
}
