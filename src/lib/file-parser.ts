/**
 * Parses an AI response containing multi-file code output into individual files.
 * Supports two common formats:
 *   1. "// FILE: path/to/file.tsx" section markers
 *   2. ```language\n// path/to/file.tsx\ncontent``` code blocks
 */

export interface ParsedFile {
  path: string;
  content: string;
  language: string;
}

const EXT_TO_LANGUAGE: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  css: "css",
  json: "json",
  html: "html",
  md: "markdown",
  mjs: "javascript",
  svg: "svg",
  yml: "yaml",
  yaml: "yaml",
};

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  return EXT_TO_LANGUAGE[ext] || "text";
}

/**
 * Primary parser: looks for "// FILE: <path>" or "// === FILE: <path> ===" markers
 * that divide the AI's single-string output into multiple logical files.
 */
function parseByFileMarkers(response: string): ParsedFile[] {
  const files: ParsedFile[] = [];
  // Match lines like: // FILE: src/app/page.tsx  or  // ======= FILE: package.json =======
  const markerRegex =
    /^\s*\/\/\s*(?:={2,}\s*)?FILE:\s*(.+?)(?:\s*={2,})?\s*$/gim;

  const markers: { path: string; index: number }[] = [];
  let match;
  while ((match = markerRegex.exec(response)) !== null) {
    markers.push({ path: match[1].trim(), index: match.index });
  }

  for (let i = 0; i < markers.length; i++) {
    const startIdx =
      response.indexOf("\n", markers[i].index) + 1 || markers[i].index;
    const endIdx = i + 1 < markers.length ? markers[i + 1].index : response.length;
    let content = response.slice(startIdx, endIdx).trim();

    // Remove trailing separator lines like // ====...
    content = content.replace(/\n\s*\/\/\s*={4,}\s*$/, "").trim();

    if (markers[i].path && content.length > 0) {
      files.push({
        path: markers[i].path,
        content,
        language: getLanguageFromPath(markers[i].path),
      });
    }
  }
  return files;
}

/**
 * Fallback parser: looks for fenced code blocks with file paths.
 * e.g. ```tsx\n// src/App.tsx\n...```
 * or   ```json\n// package.json\n...```
 */
function parseByCodeBlocks(response: string): ParsedFile[] {
  const files: ParsedFile[] = [];
  const blockRegex = /```(\w*)\s*\n\s*\/\/\s*(.+?)\n([\s\S]*?)```/g;

  let match;
  while ((match = blockRegex.exec(response)) !== null) {
    const lang = match[1] || "text";
    const path = match[2].trim();
    const content = match[3].trim();

    if (path && content.length > 0) {
      files.push({
        path,
        content,
        language: lang,
      });
    }
  }
  return files;
}

/**
 * Main entry point — tries both strategies and returns whichever finds files.
 */
export function parseFilesFromResponse(response: string): ParsedFile[] {
  // Try marker-based first (this is what our mock generators produce)
  const markerFiles = parseByFileMarkers(response);
  if (markerFiles.length > 0) return markerFiles;

  // Try code-block based (this is what real AI models tend to produce)
  const blockFiles = parseByCodeBlocks(response);
  if (blockFiles.length > 0) return blockFiles;

  // If nothing was parsed, wrap the entire thing as a single file
  return [
    {
      path: "src/app/page.tsx",
      content: response,
      language: "tsx",
    },
  ];
}
