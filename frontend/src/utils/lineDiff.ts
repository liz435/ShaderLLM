/**
 * Compute which line numbers in `newCode` differ from `oldCode`.
 * Returns a Set of 1-based line numbers that were added or changed.
 */
export function getChangedLines(oldCode: string, newCode: string): Set<number> {
  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');
  const changed = new Set<number>();

  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    if (oldLines[i] !== newLines[i]) {
      // 1-based line number (only for lines that exist in newCode)
      if (i < newLines.length) {
        changed.add(i + 1);
      }
    }
  }

  return changed;
}
