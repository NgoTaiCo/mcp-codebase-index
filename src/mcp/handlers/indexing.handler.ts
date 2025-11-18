import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { QdrantVectorStore } from '../../storage/qdrantClient.js';
import { CodeEmbedder } from '../../core/embedder.js';
import { IncrementalIndexState } from '../../types/index.js';

export interface IndexingHandlerContext {
    vectorStore: QdrantVectorStore;
    embedder: CodeEmbedder;
    indexState: IncrementalIndexState;
    isIndexing: boolean;
    indexingQueue: Set<string>;
    indexingProgress: {
        totalFiles: number;
        processedFiles: number;
        currentFile: string | null;
        estimatedTimeRemaining: number | null;
        percentage: number;
    };
    performanceMetrics: {
        averageTimePerFile: number;
        filesPerSecond: number;
        totalDuration: number;
        chunksProcessed: number;
    };
    recentErrors: Array<{ filePath: string; error: string; timestamp: number }>;
    config: {
        qdrant: { collectionName: string };
        repoPath: string;
        ignorePaths: string[];
        codebaseMemoryPath: string;
    };
    watcher: any;  // FileWatcher type
    saveIndexState: () => void;
    processIndexingQueue: () => Promise<void>;
}

// Helper functions
function formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.round((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatTimeAgo(ms: number): string {
    if (ms < 1000) return 'just now';
    if (ms < 60000) return `${Math.round(ms / 1000)}s ago`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m ago`;
    return `${Math.round(ms / 3600000)}h ago`;
}

export async function handleIndexingStatus(
    args: any,
    context: IndexingHandlerContext
): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
        // Parse verbose flag
        const verbose = args?.verbose === true || args?.verbose === 'true';

        const collections = await context.vectorStore.getCollections();
        const vectorCount = collections.collections?.[0]?.vectors_count ||
            collections.collections?.[0]?.points_count || 0;

        // Calculate storage size estimate (rough: 768 dim * 4 bytes per float + metadata)
        const estimatedSize = vectorCount * (768 * 4 + 500); // ~3.5KB per vector

        // Get quota usage from embedder
        const quotaUsage = context.embedder.getQuotaUsage();

        const status = {
            isIndexing: context.isIndexing,
            queuedFiles: context.indexingQueue.size,
            vectorsStored: vectorCount,
            collection: context.config.qdrant.collectionName,
            dailyQuota: context.indexState.dailyQuota,
            stats: context.indexState.stats,
            pendingQueue: context.indexState.pendingQueue.length,
            progress: context.indexingProgress,
            performance: context.performanceMetrics,
            recentErrors: context.recentErrors,
            storageSize: estimatedSize,
            quotaUsage: quotaUsage
        };

        // Build status message
        let message = `**📊 Indexing Status**\n\n`;

        // Progress section (only if indexing)
        if (status.isIndexing && status.progress.totalFiles > 0) {
            message += `**Progress:** ${status.progress.percentage}% (${status.progress.processedFiles}/${status.progress.totalFiles} files)\n`;
            message += `**Current File:** \`${status.progress.currentFile || 'Processing...'}\`\n`;

            if (status.progress.estimatedTimeRemaining !== null) {
                message += `**ETA:** ${formatDuration(status.progress.estimatedTimeRemaining)}\n`;
            }
            message += `\n`;
        }

        // Performance metrics (only if indexing or recently indexed)
        if (status.performance.filesPerSecond > 0) {
            message += `**⏱️ Performance:**\n`;
            message += `- Speed: ${status.performance.filesPerSecond.toFixed(2)} files/sec\n`;
            message += `- Average: ${formatDuration(status.performance.averageTimePerFile)} per file\n`;
            message += `- Total Time: ${formatDuration(status.performance.totalDuration)}\n`;
            message += `- Chunks Processed: ${status.performance.chunksProcessed}\n`;
            message += `\n`;
        }

        // API Quota usage (RPM, TPM, RPD)
        message += `**📈 API Quota Usage:**\n`;
        message += `- **RPM:** ${status.quotaUsage.rpm.current}/${status.quotaUsage.rpm.limit} (${status.quotaUsage.rpm.percentage.toFixed(1)}%)\n`;
        message += `- **TPM:** ${status.quotaUsage.tpm.current.toLocaleString()}/${status.quotaUsage.tpm.limit.toLocaleString()} (${status.quotaUsage.tpm.percentage.toFixed(1)}%)\n`;

        if (status.quotaUsage.rpd.limit > 0) {
            message += `- **RPD:** ${status.quotaUsage.rpd.current}/${status.quotaUsage.rpd.limit} (${status.quotaUsage.rpd.percentage.toFixed(1)}%)\n`;
        } else {
            message += `- **RPD:** ${status.quotaUsage.rpd.current} (no daily limit)\n`;
        }

        message += `- **Tier:** ${status.quotaUsage.tier.charAt(0).toUpperCase() + status.quotaUsage.tier.slice(1)}\n`;
        message += `- **Model:** ${status.quotaUsage.model}\n`;
        message += `\n`;

        // Daily chunks quota (for spreading work)
        const quotaUsagePercent = ((status.dailyQuota.chunksIndexed / status.dailyQuota.limit) * 100).toFixed(1);
        message += `**📊 Daily Chunks Quota (${status.dailyQuota.date}):**\n`;
        message += `- Used: ${status.dailyQuota.chunksIndexed} / ${status.dailyQuota.limit} chunks\n`;
        message += `- Remaining: ${status.dailyQuota.limit - status.dailyQuota.chunksIndexed} chunks\n`;
        message += `- Usage: ${quotaUsagePercent}%\n`;
        message += `\n`;

        // Storage stats
        message += `**📦 Storage:**\n`;
        message += `- Vectors: ${status.vectorsStored}\n`;
        message += `- Collection: \`${status.collection}\`\n`;
        message += `- Estimated Size: ${formatBytes(status.storageSize)}\n`;
        message += `\n`;

        // File categorization stats
        message += `**📊 File Categorization:**\n`;
        message += `- ✨ New: ${status.stats.newFiles}\n`;
        message += `- 📝 Modified: ${status.stats.modifiedFiles}\n`;
        message += `- ✅ Unchanged: ${status.stats.unchangedFiles}\n`;
        message += `- 🗑️ Deleted: ${status.stats.deletedFiles}\n`;
        message += `\n`;

        // Recent errors (if any)
        if (status.recentErrors.length > 0) {
            message += `**⚠️ Recent Errors (${status.recentErrors.length}):**\n`;
            const errorsToShow = verbose ? status.recentErrors : status.recentErrors.slice(0, 3);

            for (const error of errorsToShow) {
                const timeAgo = formatTimeAgo(Date.now() - error.timestamp);
                message += `- \`${error.filePath}\`: ${error.error} (${timeAgo})\n`;
            }

            if (!verbose && status.recentErrors.length > 3) {
                message += `  _...and ${status.recentErrors.length - 3} more (use verbose:true to see all)_\n`;
            }
            message += `\n`;
        }

        // Queue status
        if (status.pendingQueue > 0) {
            message += `**📋 Queue:** ${status.pendingQueue} files pending for next run\n`;
            message += `\n`;
        }

        // Overall status
        message += status.isIndexing ?
            '⏳ **Status:** Indexing in progress...' :
            '✅ **Status:** Ready for search';

        if (status.queuedFiles > 0) {
            message += `\n⚠️ ${status.queuedFiles} files queued for processing`;
        }

        if (status.pendingQueue > 0) {
            message += `\n⚠️ ${status.pendingQueue} files queued for next run (quota reached)`;
        }

        return {
            content: [
                {
                    type: 'text',
                    text: message
                }
            ]
        };
    } catch (error: any) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Failed to get status: ${error.message || error}`
                }
            ]
        };
    }
}

export async function handleCheckIndex(
    args: any,
    context: IndexingHandlerContext
): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
        const deepScan = args?.deepScan === true || args?.deepScan === 'true';

        // Warn if indexing in progress
        if (context.isIndexing) {
            return {
                content: [
                    {
                        type: 'text',
                        text: '⚠️ **Warning:** Indexing is currently in progress. Results may be incomplete or inaccurate.\n\nPlease wait for indexing to complete and try again.'
                    }
                ]
            };
        }

        console.log('[CheckIndex] Starting index health check...');

        // 1. Get all files in repository
        const repoFiles = new Set<string>();
        const walkDir = (dir: string) => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                try {
                    const stat = fs.statSync(filePath);
                    if (stat.isDirectory()) {
                        const dirName = path.basename(filePath);
                        const shouldIgnore = context.config.ignorePaths.some(pattern =>
                            dirName === pattern ||
                            filePath.includes(path.sep + pattern + path.sep) ||
                            filePath.endsWith(path.sep + pattern)
                        );
                        if (!shouldIgnore) {
                            walkDir(filePath);
                        }
                    } else if (context.watcher['shouldWatch'](filePath)) {
                        const relativePath = path.relative(context.config.repoPath, filePath);
                        repoFiles.add(relativePath);
                    }
                } catch (error) {
                    // Skip files that can't be read
                }
            }
        };
        walkDir(context.config.repoPath);

        // 2. Get all indexed files from Qdrant
        const indexedFiles = await context.vectorStore.getAllIndexedFiles();

        // 3. Compare and detect issues
        const missingFiles: string[] = [];
        const orphanedVectors: string[] = [];

        // Find missing files (in repo but not indexed)
        for (const file of repoFiles) {
            if (!indexedFiles.has(file)) {
                missingFiles.push(file);
            }
        }

        // Find orphaned vectors (indexed but not in repo)
        for (const file of indexedFiles) {
            if (!repoFiles.has(file)) {
                orphanedVectors.push(file);
            }
        }

        // 4. Get vector count and stats
        const vectorCount = await context.vectorStore.getVectorCount();
        const coverage = repoFiles.size > 0
            ? ((repoFiles.size - missingFiles.length) / repoFiles.size * 100).toFixed(1)
            : '0.0';

        // 5. Determine overall status
        const totalIssues = missingFiles.length + orphanedVectors.length;
        let overallStatus = '✅ Healthy';
        if (totalIssues > 0 && totalIssues < 10) {
            overallStatus = '⚠️ Healthy (minor issues)';
        } else if (totalIssues >= 10) {
            overallStatus = '❌ Issues detected';
        }

        // 6. Build report
        let report = `🔍 **Index Health Check**\n\n`;
        report += `**Overall Status:** ${overallStatus}\n\n`;

        report += `📊 **Statistics:**\n`;
        report += `- Files in repo: ${repoFiles.size}\n`;
        report += `- Files indexed: ${repoFiles.size - missingFiles.length}\n`;
        report += `- Coverage: ${coverage}%\n`;
        report += `- Vectors stored: ${vectorCount}\n\n`;

        if (totalIssues > 0) {
            report += `⚠️ **Issues Found (${totalIssues}):**\n\n`;

            if (missingFiles.length > 0) {
                report += `**1. Missing Files (${missingFiles.length}):**\n`;
                const filesToShow = missingFiles.slice(0, 10);
                for (const file of filesToShow) {
                    report += `   - ${file}\n`;
                }
                if (missingFiles.length > 10) {
                    report += `   - ... and ${missingFiles.length - 10} more\n`;
                }
                report += `\n`;
            }

            if (orphanedVectors.length > 0) {
                report += `**2. Orphaned Vectors (${orphanedVectors.length}):**\n`;
                const filesToShow = orphanedVectors.slice(0, 10);
                for (const file of filesToShow) {
                    report += `   - ${file} (deleted)\n`;
                }
                if (orphanedVectors.length > 10) {
                    report += `   - ... and ${orphanedVectors.length - 10} more\n`;
                }
                report += `\n`;
            }

            report += `💡 **Recommendations:**\n`;
            if (missingFiles.length > 0) {
                report += `- Run \`repair_index\` with \`issues: ["missing_files"]\` to index missing files\n`;
            }
            if (orphanedVectors.length > 0) {
                report += `- Run \`repair_index\` with \`issues: ["orphaned_vectors"]\` to clean orphaned vectors\n`;
            }
            report += `- Or use \`autoFix: true\` to fix all issues automatically\n`;
        } else {
            report += `✅ **No Issues Found**\n\n`;
            report += `Your index is healthy and up to date!`;
        }

        console.log('[CheckIndex] Health check complete');

        return {
            content: [
                {
                    type: 'text',
                    text: report
                }
            ]
        };
    } catch (error: any) {
        console.error('[CheckIndex] Error:', error);
        return {
            content: [
                {
                    type: 'text',
                    text: `❌ Failed to check index: ${error.message || error}`
                }
            ]
        };
    }
}

export async function handleRepairIndex(
    args: any,
    context: IndexingHandlerContext
): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
        // Parse arguments
        const issuesToFix = args?.issues || ['missing_files', 'orphaned_vectors'];
        const autoFix = args?.autoFix === true || args?.autoFix === 'true';

        // Check if indexing is already in progress
        if (context.isIndexing) {
            return {
                content: [
                    {
                        type: 'text',
                        text: '⚠️ **Error:** Indexing is currently in progress.\n\nPlease wait for the current indexing operation to complete before running repair.'
                    }
                ]
            };
        }

        console.log('[RepairIndex] Starting index repair...');
        console.log('[RepairIndex] Issues to fix:', issuesToFix);

        let report = `🔧 **Index Repair**\n\n`;
        let totalFixed = 0;

        // 1. Get all files in repository
        const repoFiles = new Set<string>();
        const walkDir = (dir: string) => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                try {
                    const stat = fs.statSync(filePath);
                    if (stat.isDirectory()) {
                        const dirName = path.basename(filePath);
                        const shouldIgnore = context.config.ignorePaths.some(pattern =>
                            dirName === pattern ||
                            filePath.includes(path.sep + pattern + path.sep) ||
                            filePath.endsWith(path.sep + pattern)
                        );
                        if (!shouldIgnore) {
                            walkDir(filePath);
                        }
                    } else if (context.watcher['shouldWatch'](filePath)) {
                        const relativePath = path.relative(context.config.repoPath, filePath);
                        repoFiles.add(relativePath);
                    }
                } catch (error) {
                    // Skip files that can't be read
                }
            }
        };
        walkDir(context.config.repoPath);

        // 2. Get all indexed files from Qdrant
        const indexedFiles = await context.vectorStore.getAllIndexedFiles();

        // 3. Handle missing files
        if (issuesToFix.includes('missing_files')) {
            const missingFiles: string[] = [];
            for (const file of repoFiles) {
                if (!indexedFiles.has(file)) {
                    missingFiles.push(file);
                }
            }

            if (missingFiles.length > 0) {
                report += `**Missing Files (${missingFiles.length}):**\n`;

                if (autoFix) {
                    report += `Re-indexing missing files...\n\n`;

                    // Add to indexing queue
                    for (const file of missingFiles) {
                        const fullPath = path.join(context.config.repoPath, file);
                        context.indexingQueue.add(fullPath);
                    }

                    // Process queue
                    await context.processIndexingQueue();

                    totalFixed += missingFiles.length;
                    report += `✅ Re-indexed ${missingFiles.length} files\n\n`;
                } else {
                    const filesToShow = missingFiles.slice(0, 10);
                    for (const file of filesToShow) {
                        report += `   - ${file}\n`;
                    }
                    if (missingFiles.length > 10) {
                        report += `   - ... and ${missingFiles.length - 10} more\n`;
                    }
                    report += `\n💡 Use \`autoFix: true\` to re-index these files\n\n`;
                }
            } else {
                report += `**Missing Files:** None found ✅\n\n`;
            }
        }

        // 4. Handle orphaned vectors
        if (issuesToFix.includes('orphaned_vectors')) {
            const orphanedVectors: string[] = [];
            for (const file of indexedFiles) {
                if (!repoFiles.has(file)) {
                    orphanedVectors.push(file);
                }
            }

            if (orphanedVectors.length > 0) {
                report += `**Orphaned Vectors (${orphanedVectors.length}):**\n`;

                if (autoFix) {
                    report += `Removing orphaned vectors...\n\n`;

                    // Delete orphaned vectors
                    for (const file of orphanedVectors) {
                        await context.vectorStore.deleteByFilePath(file);
                        context.indexState.indexedFiles.delete(file);
                    }

                    // Save state
                    context.saveIndexState();

                    totalFixed += orphanedVectors.length;
                    report += `✅ Removed ${orphanedVectors.length} orphaned vectors\n\n`;
                } else {
                    const filesToShow = orphanedVectors.slice(0, 10);
                    for (const file of filesToShow) {
                        report += `   - ${file} (deleted)\n`;
                    }
                    if (orphanedVectors.length > 10) {
                        report += `   - ... and ${orphanedVectors.length - 10} more\n`;
                    }
                    report += `\n💡 Use \`autoFix: true\` to remove these vectors\n\n`;
                }
            } else {
                report += `**Orphaned Vectors:** None found ✅\n\n`;
            }
        }

        // 5. Summary
        if (autoFix) {
            report += `\n✅ **Repair Complete**\n`;
            report += `Total issues fixed: ${totalFixed}\n\n`;
            report += `Run \`check_index\` to verify the repairs.`;
        } else {
            report += `\n💡 **Next Steps:**\n`;
            report += `Run this command again with \`autoFix: true\` to apply the fixes.`;
        }

        console.log('[RepairIndex] Repair complete');

        return {
            content: [
                {
                    type: 'text',
                    text: report
                }
            ]
        };
    } catch (error: any) {
        console.error('[RepairIndex] Error:', error);
        return {
            content: [
                {
                    type: 'text',
                    text: `❌ Failed to repair index: ${error.message || error}`
                }
            ]
        };
    }
}
