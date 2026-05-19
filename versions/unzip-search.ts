import * as fs from 'node:fs';
import * as path from 'node:path';
import * as AdmZip from 'adm-zip';

interface UnzipSearchOptions {
  path: string;
  function_name: string;
  item_type?: 'function' | 'class' | 'interface' | 'type' | 'enum' | 'constant' | 'variable';
  max_lines?: number;
  max_seconds?: number;
  exclude_dirs?: string[];
  include_exts?: string[];
  return_tree?: boolean;
  tree_json_path?: string;
}

/**
 * Translates Python-like regex patterns to JavaScript-compatible ones.
 * @param name The name to search for.
 * @returns An array of RegExp objects.
 */
function getSearchPatterns(name: string, itemType: string): RegExp[] {
  const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special characters
  const patterns: string[] = [];

  switch (itemType.toLowerCase()) {
    case 'class':
      patterns.push(`class\\s+${safeName}\\b`);
      break;
    case 'interface':
      patterns.push(`interface\\s+${safeName}\\b`);
      break;
    case 'type':
      patterns.push(`type\\s+${safeName}\\b`);
      break;
    case 'enum':
      patterns.push(`enum\\s+${safeName}\\b`);
      break;
    case 'constant':
    case 'variable':
      patterns.push(
        `(?:export\\s+)?(?:const|let|var)\\s+${safeName}\\b`,
        `(?:exports|module\\.exports|this)\\.${safeName}\\s*=`,
        `^${safeName}\\s*=`
      );
      break;
    default: // function or general
      patterns.push(
        `def\\s+${safeName}\\s*\\(`, // Python function
        `(?:async\\s+)?function\\s+${safeName}\\s*\\(`, // JS/TS function
        `(?:const|let|var)\\s+${safeName}\\s*=\\s*(?:async\\s+)?(?:\\([^)]*\\)|[a-zA-Z_$][\\w$]*)\\s*=>`, // Arrow function
        `^\\s*(?:(?:public|private|protected|static|async|get|set)\\s+)*\\*?\\s+${safeName}\\s*\\(`, // Class method
        `${safeName}\\s*:\\s*(?:async\\s+)?(?:function\\b|(?:\\([^)]*\\)|[a-zA-Z_$][\\w$]*)\\s*=>)`, // Object method
        `^#+\\s+${safeName}\\b` // Markdown header
      );
      break;
  }
  return patterns.map(p => new RegExp(p, 'm'));
}

/**
 * Extracts a code block based on language syntax.
 * @param lines Array of lines from the file.
 * @param startIndex The index of the line where the match was found.
 * @param extension File extension to determine syntax.
 * @param maxLines Max lines to extract.
 * @returns The extracted code block and the index of the next line to process.
 */
function extractBlock(lines: string[], startIndex: number, extension: string, maxLines: number): { block: string; nextIndex: number } {
  const blockLines: string[] = [lines[startIndex]];
  let currentIndex = startIndex + 1;

  if (extension === '.py') {
    const baseIndentMatch = lines[startIndex].match(/^\s*/);
    const baseIndent = baseIndentMatch ? baseIndentMatch[0].length : 0;

    while (currentIndex < lines.length && blockLines.length < maxLines) {
      const line = lines[currentIndex];
      const currentIndentMatch = line.match(/^\s*/);
      const currentIndent = currentIndentMatch ? currentIndentMatch[0].length : 0;

      if (line.trim() === '' || currentIndent > baseIndent) {
        blockLines.push(line);
      } else if (currentIndent <= baseIndent && line.trim() !== '') {
        // New block starts or indentation level matches/decreases
        break;
      }
      currentIndex++;
    }
  } else if (extension === '.md') {
    const headerMatch = lines[startIndex].match(/^(#+)/);
    const level = headerMatch ? headerMatch[0].length : 0;

    while (currentIndex < lines.length && blockLines.length < maxLines) {
      const line = lines[currentIndex];
      const nextHeaderMatch = line.match(/^(#+)/);
      if (level > 0 && nextHeaderMatch && nextHeaderMatch[0].length <= level) {
        break; // Found a header of same or higher level
      }
      blockLines.push(line);
      currentIndex++;
    }
  } else { // JS/TS/JSX/TSX/SH (brace/paren counting)
    let balance = 0;
    let inBlock = false;

    // Initial balance check for the first line
    for (const char of lines[startIndex]) {
      if (char === '{' || char === '(' || char === '[') {
        balance++;
        inBlock = true;
      } else if (char === '}' || char === ')' || char === ']') {
        balance--;
      }
    }

    while (currentIndex < lines.length && blockLines.length < maxLines) {
      const line = lines[currentIndex];
      blockLines.push(line);

      for (const char of line) {
        if (char === '{' || char === '(' || char === '[') {
          balance++;
          inBlock = true;
        } else if (char === '}' || char === ')' || char === ']') {
          balance--;
        }
      }

      if (inBlock && balance <= 0) {
        break; // Block closed
      }
      currentIndex++;
    }
  }

  if (blockLines.length >= maxLines) {
    blockLines.push('... [Max lines reached] ...');
  }

  return { block: blockLines.join('\n'), nextIndex: currentIndex };
}

/**
 * Recursively generates a tree-like string representation of scanned paths.
 */
function generateTree(scannedPaths: Set<string>): string {
  if (!scannedPaths.size) return '';
  const sortedPaths = Array.from(scannedPaths).sort();
  const treeLines = ['\n--- Scanned Folders Tree ---'];
  const root: { [key: string]: any } = {};

  sortedPaths.forEach(p => {
    const parts = p.split('/').filter(Boolean);
    let current = root;
    parts.forEach(part => {
      current[part] = current[part] || {};
      current = current[part];
    });
  });

  function buildTreeString(node: { [key: string]: any }, prefix: string = '', isLast: boolean = false) {
    const keys = Object.keys(node).sort();
    keys.forEach((key, index) => {
      const isLastChild = index === keys.length - 1;
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      treeLines.push(`${prefix}${isLastChild ? '└── ' : '├── '}${key}/`);
      buildTreeString(node[key], newPrefix, isLastChild);
    });
  }

  buildTreeString(root);
  return treeLines.join('\n');
}

/**
 * Searches through folders or zip archives for specific code definitions.
 */
export async function unzipSearchTool(options: UnzipSearchOptions): Promise<string> {
  const {
    path: inputPath,
    function_name: functionName,
    item_type = 'function',
    max_lines = 500,
    max_seconds = 30.0,
    exclude_dirs = ['node_modules', '.git', '__pycache__', 'venv', 'dist', 'build', 'out'],
    include_exts = ['.py', '.js', '.ts', '.jsx', '.tsx', '.md', '.sh'],
    return_tree = false,
    tree_json_path
  } = options;

  if (!fs.existsSync(inputPath)) {
    return `Error: Path not found at ${inputPath}`;
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unzip-search-'));
  const startTime = Date.now();
  let timeoutReached = false;
  const results: string[] = [];
  const scannedPaths = new Set<string>();

  const searchQueue: { fsPath: string; label: string }[] = [];

  try {
    if (fs.statSync(inputPath).isDirectory()) {
      searchQueue.push({ fsPath: inputPath, label: 'root' });
    } else if (inputPath.toLowerCase().endsWith('.zip')) {
      const zip = new AdmZip(inputPath);
      const rootExt = path.join(tempDir, 'input_root');
      zip.extractAllTo(rootExt, true);
      searchQueue.push({ fsPath: rootExt, label: path.basename(inputPath) });
    } else {
      return `Error: ${inputPath} is neither a directory nor a valid zip file.`;
    }

    const searchPatterns = getSearchPatterns(functionName, itemType);

    while (searchQueue.length > 0 && !timeoutReached) {
      const { fsPath: currentScanPath, label } = searchQueue.shift()!;

      for (const entry of fs.readdirSync(currentScanPath, { withFileTypes: true })) {
        if (Date.now() - startTime > max_seconds * 1000) {
          results.push(`... [Search timed out after ${max_seconds}s] ...`);
          timeoutReached = true;
          break;
        }

        const fullPath = path.join(currentScanPath, entry.name);
        const relativePath = path.relative(inputPath, fullPath);

        if (entry.isDirectory()) {
          if (!exclude_dirs.includes(entry.name)) {
            scannedPaths.add(path.join(label, entry.name).replace(/\\/g, '/'));
            searchQueue.push({ fsPath: fullPath, label: path.join(label, entry.name).replace(/\\/g, '/') });
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (include_exts.includes(ext)) {
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              const lines = content.split('\n');

              for (let i = 0; i < lines.length; i++) {
                if (Date.now() - startTime > max_seconds * 1000) {
                  results.push(`... [Search timed out after ${max_seconds}s] ...`);
                  timeoutReached = true;
                  break;
                }

                const line = lines[i];
                if (searchPatterns.some(pattern => pattern.test(line))) {
                  const { block, nextIndex } = extractBlock(lines, i, ext, max_lines);
                  results.push(`--- Found in ${relativePath} (Origin: ${label}) ---\n${block.trim()}`);
                  i = nextIndex - 1; // Adjust index to continue search after the extracted block
                }
              }
            } catch (e) {
              // Ignore read errors for binary files or permissions
            }
          }
        }
      }
    }

    let output = '';
    if (!results.length) {
      output = `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} '${functionName}' not found in the provided archive.`;
    } else {
      output = results.join('\n\n');
    }

    if (return_tree) {
      output += generateTree(scannedPaths);
    }

    if (tree_json_path) {
      const treeDict: { [key: string]: any } = {};
      scannedPaths.forEach(p => {
        const parts = p.split('/').filter(Boolean);
        let current = treeDict;
        parts.forEach(part => {
          current[part] = current[part] || {};
          current = current[part];
        });
      });
      try {
        fs.writeFileSync(tree_json_path, JSON.stringify(treeDict, null, 2), 'utf-8');
      } catch (e: any) {
        output += `\nWarning: Could not save JSON tree to ${tree_json_path}: ${e.message}`;
      }
    }

    return output;
  } catch (e: any) {
    return `An unexpected error occurred: ${e.message}`;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

import * as os from 'node:os'; // Moved import here to avoid circular dependency with fs