// src/fileWatcher.ts
import chokidar, { FSWatcher } from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export class FileWatcher {
    private watcher: FSWatcher | null = null;
    private fileHashes: Map<string, string> = new Map();
    private changedFiles: Set<string> = new Set();

    constructor(
        private repoPath: string,
        private ignorePaths: string[],
        private onFileChange: (filePath: string) => Promise<void>
    ) { }

    /**
     * Load previous file hashes from memory
     */
    loadIndexMetadata(metadataPath: string): void {
        try {
            if (fs.existsSync(metadataPath)) {
                const data = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
                this.fileHashes = new Map(Object.entries(data));
            }
        } catch (error) {
            console.error('Error loading metadata:', error);
        }
    }

    /**
     * Save file hashes for next run
     */
    saveIndexMetadata(metadataPath: string): void {
        try {
            const dir = path.dirname(metadataPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const metadata = Object.fromEntries(this.fileHashes);
            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        } catch (error) {
            console.error('Error saving metadata:', error);
        }
    }

    /**
     * Calculate MD5 hash of file
     */
    private getFileHash(filePath: string): string {
        const content = fs.readFileSync(filePath);
        return crypto.createHash('md5').update(content).digest('hex');
    }

    /**
     * Check if file should be watched
     */
    private shouldWatch(filePath: string): boolean {
        // Only watch source files (adjust extensions as needed)
        const sourceExtensions = [
            '.py', '.js', '.ts', '.tsx', '.jsx',
            '.java', '.go', '.rs', '.cpp', '.c',
            '.cs', '.rb', '.php', '.swift', '.kt',
            '.dart', '.vue', '.svelte'
        ];

        const ext = path.extname(filePath);
        const isSourceFile = sourceExtensions.includes(ext);

        // Check ignore patterns
        const isIgnored = this.ignorePaths.some(pattern =>
            filePath.includes(path.sep + pattern + path.sep) ||
            filePath.includes(path.sep + pattern)
        );

        return isSourceFile && !isIgnored;
    }

    /**
     * Initial scan to find changed files since last index
     */
    async scanForChanges(): Promise<string[]> {
        const changed: string[] = [];
        const walk = (dir: string) => {
            const files = fs.readdirSync(dir);

            for (const file of files) {
                const filePath = path.join(dir, file);

                try {
                    const stat = fs.statSync(filePath);

                    if (stat.isDirectory()) {
                        // Check if directory should be ignored
                        const shouldIgnore = this.ignorePaths.some(pattern =>
                            filePath.includes(path.sep + pattern)
                        );
                        if (!shouldIgnore) {
                            walk(filePath);
                        }
                    } else if (this.shouldWatch(filePath)) {
                        const hash = this.getFileHash(filePath);
                        const storedHash = this.fileHashes.get(filePath);

                        if (!storedHash || storedHash !== hash) {
                            changed.push(filePath);
                            this.fileHashes.set(filePath, hash);
                        }
                    }
                } catch (error) {
                    // Skip files that can't be read
                    console.error(`Error reading ${filePath}:`, error);
                }
            }
        };

        walk(this.repoPath);
        return changed;
    }

    /**
     * Start watching for file changes
     */
    startWatching(): void {
        if (this.watcher) return;

        this.watcher = chokidar.watch(this.repoPath, {
            ignored: (filePath) => {
                // Ignore node_modules, .git, etc
                return this.ignorePaths.some(pattern => filePath.includes(pattern));
            },
            persistent: true,
            usePolling: false,
            depth: undefined,
            ignoreInitial: true
        });

        // File added or changed
        this.watcher.on('add', (filePath: string) => {
            if (this.shouldWatch(filePath)) {
                this.onFileChange(filePath).catch(console.error);
            }
        });

        this.watcher.on('change', (filePath: string) => {
            if (this.shouldWatch(filePath)) {
                this.onFileChange(filePath).catch(console.error);
            }
        });

        this.watcher.on('unlink', (filePath: string) => {
            this.fileHashes.delete(filePath);
        });

        console.log(`[FileWatcher] Watching ${this.repoPath}`);
    }

    /**
     * Stop watching
     */
    stopWatching(): void {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
    }
}
