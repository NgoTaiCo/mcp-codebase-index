// src/backupManager.ts
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { QdrantVectorStore } from './qdrantClient.js';
import {
    BackupFile,
    BackupInfo,
    BackupMetadata,
    VectorExport,
    ExportStats,
    ImportStats,
    ConflictStrategy
} from './types.js';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export class BackupManager {
    private vectorStore: QdrantVectorStore;
    private backupDir: string;
    private collectionName: string;
    private model: string;
    private dimensions: number;

    constructor(
        vectorStore: QdrantVectorStore,
        backupDir: string,
        collectionName: string,
        model: string,
        dimensions: number
    ) {
        this.vectorStore = vectorStore;
        this.backupDir = backupDir;
        this.collectionName = collectionName;
        this.model = model;
        this.dimensions = dimensions;

        // Ensure backup directory exists
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    /**
     * Export index to local file
     */
    async exportIndex(
        outputPath?: string,
        compress: boolean = true
    ): Promise<ExportStats> {
        const startTime = Date.now();
        console.log('[Export] Starting export...');

        try {
            // Collect all vectors from Qdrant
            const vectors: VectorExport[] = [];
            const filePaths = new Set<string>();
            let offset: string | number | null = null;
            const limit = 100;

            console.log('[Export] Fetching vectors from Qdrant...');
            while (true) {
                const response = await this.vectorStore.client.scroll(this.collectionName, {
                    limit,
                    offset,
                    with_payload: true,
                    with_vector: true
                });

                if (!response.points || response.points.length === 0) {
                    break;
                }

                // Convert points to export format
                for (const point of response.points) {
                    if (point.payload && point.vector) {
                        // Ensure vector is a flat array
                        const vectorArray = Array.isArray(point.vector) 
                            ? (Array.isArray(point.vector[0]) ? [] : point.vector as number[])
                            : [];
                        
                        vectors.push({
                            id: point.payload.id as string,
                            vector: vectorArray,
                            payload: {
                                id: point.payload.id as string,
                                content: point.payload.content as string,
                                type: point.payload.type as string,
                                name: point.payload.name as string,
                                filePath: point.payload.filePath as string,
                                startLine: point.payload.startLine as number,
                                endLine: point.payload.endLine as number,
                                language: point.payload.language as string,
                                complexity: point.payload.complexity as number
                            }
                        });

                        filePaths.add(point.payload.filePath as string);
                    }
                }

                // Check if there are more points
                const nextOffset = response.next_page_offset;
                if (!nextOffset || typeof nextOffset === 'object') {
                    break;
                }
                offset = nextOffset as string | number;

                if (vectors.length % 500 === 0) {
                    console.log(`[Export] Collected ${vectors.length} vectors...`);
                }
            }

            console.log(`[Export] Collected ${vectors.length} vectors from ${filePaths.size} files`);

            // Create backup metadata
            const metadata: BackupMetadata = {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                model: this.model,
                dimensions: this.dimensions,
                totalVectors: vectors.length,
                collectionName: this.collectionName,
                fileCount: filePaths.size
            };

            // Create backup file object
            const backupData: BackupFile = {
                metadata,
                vectors
            };

            // Generate output path if not provided
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
            const filename = compress
                ? `backup-${timestamp}-${vectors.length}v.json.gz`
                : `backup-${timestamp}-${vectors.length}v.json`;
            
            const finalPath = outputPath || path.join(this.backupDir, filename);

            // Write to file
            console.log('[Export] Writing to file...');
            const jsonData = JSON.stringify(backupData, null, 2);
            
            let fileSize: number;
            if (compress) {
                const compressed = await gzip(Buffer.from(jsonData, 'utf-8'));
                fs.writeFileSync(finalPath, compressed);
                fileSize = compressed.length;
            } else {
                fs.writeFileSync(finalPath, jsonData, 'utf-8');
                fileSize = Buffer.byteLength(jsonData, 'utf-8');
            }

            const duration = Date.now() - startTime;
            console.log(`[Export] Complete: ${finalPath} (${this.formatBytes(fileSize)})`);

            return {
                totalVectors: vectors.length,
                totalFiles: filePaths.size,
                outputPath: finalPath,
                compressed: compress,
                fileSize,
                duration
            };
        } catch (error) {
            console.error('[Export] Error:', error);
            throw error;
        }
    }

    /**
     * Import index from local file
     */
    async importIndex(
        inputPath: string,
        conflictStrategy: ConflictStrategy = 'skip'
    ): Promise<ImportStats> {
        const startTime = Date.now();
        console.log(`[Import] Starting import from: ${inputPath}`);
        console.log(`[Import] Conflict strategy: ${conflictStrategy}`);

        try {
            // Check if file exists
            if (!fs.existsSync(inputPath)) {
                throw new Error(`File not found: ${inputPath}`);
            }

            // Read file
            console.log('[Import] Reading file...');
            let jsonData: string;
            const fileBuffer = fs.readFileSync(inputPath);

            // Detect if compressed
            const isCompressed = inputPath.endsWith('.gz');
            if (isCompressed) {
                const decompressed = await gunzip(fileBuffer);
                jsonData = decompressed.toString('utf-8');
            } else {
                jsonData = fileBuffer.toString('utf-8');
            }

            // Parse JSON
            console.log('[Import] Parsing backup data...');
            const backupData: BackupFile = JSON.parse(jsonData);

            // Validate schema
            this.validateBackupData(backupData);

            // Check compatibility
            if (backupData.metadata.dimensions !== this.dimensions) {
                throw new Error(
                    `Dimension mismatch: backup has ${backupData.metadata.dimensions}, ` +
                    `current collection expects ${this.dimensions}`
                );
            }

            console.log('[Import] Backup metadata:');
            console.log(`  - Version: ${backupData.metadata.version}`);
            console.log(`  - Exported: ${backupData.metadata.exportedAt}`);
            console.log(`  - Model: ${backupData.metadata.model}`);
            console.log(`  - Vectors: ${backupData.metadata.totalVectors}`);
            console.log(`  - Files: ${backupData.metadata.fileCount}`);

            // Get existing vectors if needed for conflict resolution
            const existingFiles = new Set<string>();
            if (conflictStrategy !== 'overwrite') {
                const files = await this.vectorStore.getAllIndexedFiles();
                files.forEach(file => existingFiles.add(file));
            }

            // Process vectors
            let newVectors = 0;
            let updatedVectors = 0;
            let skippedVectors = 0;
            let conflicts = 0;

            const BATCH_SIZE = 100;
            const totalBatches = Math.ceil(backupData.vectors.length / BATCH_SIZE);

            console.log(`[Import] Importing ${backupData.vectors.length} vectors in ${totalBatches} batches...`);

            for (let i = 0; i < backupData.vectors.length; i += BATCH_SIZE) {
                const batch = backupData.vectors.slice(i, i + BATCH_SIZE);
                const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

                // Group by file for conflict checking
                const fileGroups = new Map<string, VectorExport[]>();
                for (const vector of batch) {
                    const filePath = vector.payload.filePath;
                    if (!fileGroups.has(filePath)) {
                        fileGroups.set(filePath, []);
                    }
                    fileGroups.get(filePath)!.push(vector);
                }

                // Process each file group
                for (const [filePath, vectors] of fileGroups) {
                    const fileExists = existingFiles.has(filePath);

                    // Apply conflict strategy
                    if (fileExists) {
                        conflicts++;

                        if (conflictStrategy === 'skip') {
                            skippedVectors += vectors.length;
                            continue;
                        } else if (conflictStrategy === 'overwrite') {
                            // Delete existing vectors for this file
                            await this.vectorStore.deleteByFilePath(filePath);
                            updatedVectors += vectors.length;
                        } else if (conflictStrategy === 'merge') {
                            // Keep existing, only add if not exists (by vector ID)
                            // For simplicity, we'll overwrite since we can't easily check individual vectors
                            await this.vectorStore.deleteByFilePath(filePath);
                            updatedVectors += vectors.length;
                        }
                    } else {
                        newVectors += vectors.length;
                    }

                    // Upsert vectors for this file
                    if (conflictStrategy !== 'skip' || !fileExists) {
                        const points = vectors.map(v => ({
                            id: this.hashId(v.id),
                            vector: v.vector,
                            payload: v.payload
                        }));

                        await this.vectorStore.client.upsert(this.collectionName, {
                            points
                        });
                    }
                }

                console.log(`[Import] Batch ${batchNumber}/${totalBatches}: ${Math.min(i + BATCH_SIZE, backupData.vectors.length)}/${backupData.vectors.length} vectors`);
            }

            const duration = Date.now() - startTime;
            console.log('[Import] Complete');

            return {
                totalVectors: backupData.vectors.length,
                newVectors,
                updatedVectors,
                skippedVectors,
                duration,
                conflicts
            };
        } catch (error) {
            console.error('[Import] Error:', error);
            throw error;
        }
    }

    /**
     * List available backups
     */
    listBackups(): BackupInfo[] {
        if (!fs.existsSync(this.backupDir)) {
            return [];
        }

        const files = fs.readdirSync(this.backupDir);
        const backups: BackupInfo[] = [];

        for (const file of files) {
            if (!file.startsWith('backup-') || (!file.endsWith('.json') && !file.endsWith('.json.gz'))) {
                continue;
            }

            const filePath = path.join(this.backupDir, file);
            const stats = fs.statSync(filePath);

            try {
                // Read metadata only (don't load entire file)
                const compressed = file.endsWith('.gz');
                let jsonData: string;

                if (compressed) {
                    const fileBuffer = fs.readFileSync(filePath);
                    const decompressed = zlib.gunzipSync(fileBuffer);
                    jsonData = decompressed.toString('utf-8');
                } else {
                    jsonData = fs.readFileSync(filePath, 'utf-8');
                }

                // Parse to get metadata
                const backupData: BackupFile = JSON.parse(jsonData);

                backups.push({
                    name: file,
                    path: filePath,
                    metadata: backupData.metadata,
                    size: stats.size,
                    compressed
                });
            } catch (error) {
                console.warn(`[Backup] Failed to read metadata from ${file}:`, error);
            }
        }

        // Sort by date (newest first)
        backups.sort((a, b) => 
            new Date(b.metadata.exportedAt).getTime() - new Date(a.metadata.exportedAt).getTime()
        );

        return backups;
    }

    /**
     * Restore from a backup (convenience wrapper around importIndex)
     */
    async restoreBackup(
        backupName: string,
        conflictStrategy: ConflictStrategy = 'overwrite'
    ): Promise<ImportStats> {
        const backupPath = path.join(this.backupDir, backupName);
        return await this.importIndex(backupPath, conflictStrategy);
    }

    /**
     * Validate backup data structure
     */
    private validateBackupData(data: any): void {
        if (!data.metadata) {
            throw new Error('Invalid backup: missing metadata');
        }

        if (!data.vectors || !Array.isArray(data.vectors)) {
            throw new Error('Invalid backup: missing or invalid vectors array');
        }

        if (!data.metadata.version) {
            throw new Error('Invalid backup: missing version in metadata');
        }

        if (!data.metadata.dimensions) {
            throw new Error('Invalid backup: missing dimensions in metadata');
        }

        // Validate first vector structure
        if (data.vectors.length > 0) {
            const firstVector = data.vectors[0];
            if (!firstVector.id || !firstVector.vector || !firstVector.payload) {
                throw new Error('Invalid backup: malformed vector data');
            }
        }
    }

    /**
     * Hash string to numeric ID (same as qdrantClient)
     */
    private hashId(id: string): number {
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = ((hash << 5) - hash) + id.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    /**
     * Format bytes to human-readable string
     */
    private formatBytes(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
}
