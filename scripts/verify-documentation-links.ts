import * as fs from 'fs';
import * as path from 'path';

export interface DocValidationResult {
  valid: boolean;
  totalDocsScanned: number;
  totalLinksChecked: number;
  brokenLinks: Array<{
    file: string;
    link: string;
    reason: string;
  }>;
}

export function verifyDocumentationLinks(docsDir = path.resolve('docs')): DocValidationResult {
  const brokenLinks: DocValidationResult['brokenLinks'] = [];
  let totalLinksChecked = 0;
  let totalDocsScanned = 0;

  if (!fs.existsSync(docsDir)) {
    return { valid: true, totalDocsScanned: 0, totalLinksChecked: 0, brokenLinks: [] };
  }

  const files = fs.readdirSync(docsDir).filter((f) => f.endsWith('.md'));
  totalDocsScanned = files.length;

  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  for (const file of files) {
    const fullPath = path.join(docsDir, file);
    const content = fs.readFileSync(fullPath, 'utf-8');

    let match;
    while ((match = markdownLinkRegex.exec(content)) !== null) {
      const link = match[2];
      totalLinksChecked++;

      // Ignore external web URLs or anchors
      if (link.startsWith('http://') || link.startsWith('https://') || link.startsWith('#')) {
        continue;
      }

      // Handle file:/// URLs
      if (link.startsWith('file:///')) {
        const withoutHash = link.split('#')[0];
        const decoded = decodeURI(withoutHash.replace('file:///', ''));
        // Windows absolute path
        const targetPath = decoded.replace(/\//g, path.sep);
        if (!fs.existsSync(targetPath)) {
          brokenLinks.push({
            file,
            link,
            reason: `Target file does not exist: ${targetPath}`,
          });
        }
        continue;
      }

      // Handle relative paths
      const relWithoutHash = link.split('#')[0];
      const resolved = path.resolve(docsDir, relWithoutHash);
      if (!fs.existsSync(resolved)) {
        brokenLinks.push({
          file,
          link,
          reason: `Relative target does not exist: ${resolved}`,
        });
      }
    }
  }

  return {
    valid: brokenLinks.length === 0,
    totalDocsScanned,
    totalLinksChecked,
    brokenLinks,
  };
}

if (process.argv[1]?.endsWith('verify-documentation-links.ts')) {
  const result = verifyDocumentationLinks();
  console.log(`[Docs Verifier] Scanned ${result.totalDocsScanned} docs, checked ${result.totalLinksChecked} links.`);
  if (!result.valid) {
    console.error(`[Docs Verifier] Found ${result.brokenLinks.length} broken links:`);
    console.error(JSON.stringify(result.brokenLinks, null, 2));
    process.exit(1);
  } else {
    console.log('[Docs Verifier] All documentation internal references are valid.');
  }
}
