import * as crypto from 'crypto';
import * as fs from 'fs';

export async function calculateFileHash(
  filePath: string,
  algorithm: 'sha1' | 'sha256' | 'md5' = 'sha1'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => reject(err));
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex').toLowerCase()));
  });
}

export function generateOfflineUuid(username: string): string {
  // Deterministic Offline Minecraft Player UUID (RFC 4122 v3 MD5 hash of "OfflinePlayer:" + username)
  const hash = crypto.createHash('md5').update(`OfflinePlayer:${username}`).digest('hex');
  // Format as standard UUID (8-4-4-4-12) with version 3 and variant 2
  const p1 = hash.substring(0, 8);
  const p2 = hash.substring(8, 12);
  const p3 = '3' + hash.substring(13, 16);
  const p4 = ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hash.substring(18, 20);
  const p5 = hash.substring(20, 32);
  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
}
