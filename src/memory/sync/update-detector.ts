/**
 * Memory Update Detector
 * Detects changes in memory entities using content hash comparison
 * 
 * Based on MEMORY_OPTIMIZATION_PLAN.md Section 8
 */

import { createHash } from 'crypto';
import type { MemoryVectorStore } from '../vector-store.js';
import type { MemoryEntity } from '../types.js';

/**
 * Change detection result
 */
export interface ChangeDetectionResult {
    /** Entity name */
    entityName: string;

    /** Whether entity has changed */
    hasChanged: boolean;

    /** Previous hash (if exists) */
    previousHash?: string;

    /** Current hash */
    currentHash: string;

    /** Change type */
    changeType: 'created' | 'updated' | 'unchanged' | 'not_found';
}

/**
 * Batch change detection result
 */
export interface BatchChangeDetectionResult {
    /** Total entities checked */
    total: number;

    /** Entities that changed */
    changed: string[];

    /** Entities that are new */
    created: string[];

    /** Entities that are unchanged */
    unchanged: string[];

    /** Entities not found in vector store */
    notFound: string[];
}

/**
 * Memory Update Detector
 * Detects changes in memory entities by comparing content hashes
 */
export class MemoryUpdateDetector {
    private memoryVectorStore: MemoryVectorStore;

    constructor(memoryVectorStore: MemoryVectorStore) {
        this.memoryVectorStore = memoryVectorStore;
    }

    /**
     * Detect if a single entity has changed
     */
    async detectChanges(entity: MemoryEntity): Promise<ChangeDetectionResult> {
        try {
            // Calculate current hash
            const currentHash = this.hashEntity(entity);

            // Get existing entity from vector store
            const existing = await this.memoryVectorStore.getEntity(entity.name);

            if (!existing) {
                // Entity doesn't exist in vector store (new)
                return {
                    entityName: entity.name,
                    hasChanged: true,
                    currentHash,
                    changeType: 'created'
                };
            }

            // Get previous hash from vector store payload
            // The vector store stores contentHash in payload
            const existingEntity: MemoryEntity = {
                name: existing.entityName,
                entityType: existing.entityType,
                observations: existing.observations,
                relatedFiles: existing.relatedFiles,
                relatedComponents: existing.relatedComponents,
                dependencies: existing.dependencies,
                tags: existing.tags
            };

            const previousHash = this.hashEntity(existingEntity);

            // Compare hashes
            const hasChanged = currentHash !== previousHash;

            return {
                entityName: entity.name,
                hasChanged,
                previousHash,
                currentHash,
                changeType: hasChanged ? 'updated' : 'unchanged'
            };
        } catch (error) {
            console.error(`[MemoryUpdateDetector] Error detecting changes for ${entity.name}:`, error);
            throw error;
        }
    }

    /**
     * Detect changes for multiple entities in batch
     */
    async detectBatchChanges(entities: MemoryEntity[]): Promise<BatchChangeDetectionResult> {
        const result: BatchChangeDetectionResult = {
            total: entities.length,
            changed: [],
            created: [],
            unchanged: [],
            notFound: []
        };

        console.log(`[MemoryUpdateDetector] Checking ${entities.length} entities for changes...`);

        for (const entity of entities) {
            try {
                const detection = await this.detectChanges(entity);

                switch (detection.changeType) {
                    case 'created':
                        result.created.push(entity.name);
                        break;
                    case 'updated':
                        result.changed.push(entity.name);
                        break;
                    case 'unchanged':
                        result.unchanged.push(entity.name);
                        break;
                    case 'not_found':
                        result.notFound.push(entity.name);
                        break;
                }
            } catch (error) {
                console.error(`[MemoryUpdateDetector] Error checking ${entity.name}:`, error);
                result.notFound.push(entity.name);
            }
        }

        console.log(`[MemoryUpdateDetector] Results: ${result.created.length} new, ${result.changed.length} changed, ${result.unchanged.length} unchanged`);

        return result;
    }

    /**
     * Hash entity content for change detection
     * Uses same algorithm as MemoryVectorStore for consistency
     */
    private hashEntity(entity: MemoryEntity): string {
        const content = JSON.stringify({
            name: entity.name,
            type: entity.entityType,
            observations: entity.observations.sort(),
            files: entity.relatedFiles?.sort(),
            components: entity.relatedComponents?.sort(),
            deps: entity.dependencies?.sort()
        });

        return createHash('sha256').update(content).digest('hex');
    }

    /**
     * Check if any entity in the list needs update
     */
    async needsUpdate(entities: MemoryEntity[]): Promise<boolean> {
        const result = await this.detectBatchChanges(entities);
        return result.created.length > 0 || result.changed.length > 0;
    }

    /**
     * Get only entities that need update (created or changed)
     */
    async filterNeedsUpdate(entities: MemoryEntity[]): Promise<MemoryEntity[]> {
        const needsUpdateList: MemoryEntity[] = [];

        for (const entity of entities) {
            const detection = await this.detectChanges(entity);
            
            if (detection.changeType === 'created' || detection.changeType === 'updated') {
                needsUpdateList.push(entity);
            }
        }

        return needsUpdateList;
    }
}
