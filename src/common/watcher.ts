// src/sandbox/watcher.ts

import * as fs from 'fs';
import * as path from 'path';

export type WatchEvent = 'rename' | 'change';
export type WatchCallback = (eventType: WatchEvent, filePath: string) => void;

/**
 * Watch a list of directories recursively.
 * Returns a function that stops all watchers when called.
 *
 * @param dirs    Array of absolute paths to folders to watch
 * @param onEvent Callback invoked on each change or rename
 */
export function watchFolders(
  dirs: string[],
  onEvent: WatchCallback
): () => void {
  const watchers: fs.FSWatcher[] = [];

  function watchDir(dir: string) {
    try {
      const watcher = fs.watch(dir, (eventType, filename) => {
        const fullPath = filename
          ? path.join(dir, filename)
          : dir;
        onEvent(eventType as WatchEvent, fullPath);

        // If a new folder was created, start watching it too
        if (eventType === 'rename' && filename) {
          const potentialDir = fullPath;
          fs.stat(potentialDir, (err, stats) => {
            if (!err && stats.isDirectory()) {
              watchDir(potentialDir);
            }
          });
        }
      });

      watchers.push(watcher);
    } catch (err) {
      console.error(`Failed to watch ${dir}:`, err);
    }

    // Recurse into subdirectories
    fs.readdir(dir, { withFileTypes: true }, (err, entries) => {
      if (err) return;
      for (const entry of entries) {
        if (entry.isDirectory()) {
          watchDir(path.join(dir, entry.name));
        }
      }
    });
  }

  // Start watching each provided directory
  for (const d of dirs) {
    watchDir(d);
  }

  // Return an "unwatch" function
  return () => {
    for (const w of watchers) {
      try { w.close(); }
      catch { /* ignore errors on close */ }
    }
  };
}
