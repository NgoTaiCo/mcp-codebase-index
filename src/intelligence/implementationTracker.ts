/**
 * Implementation Tracker
 * Tracks file changes and automatically updates memory using Gemini analysis
 * Integrates with existing chokidar file watcher
 * Now includes automatic memory sync to Vector Store
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
    Intent,
    ImplementationTracking
} from './types.js';
import type { MemorySyncManager } from '../memory/sync/sync-manager.js';
import type { MemoryEntity } from '../memory/types.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * File change event
 */
export interface FileChange {
    /** File path */
    path: string;

    /** Change type */
    type: 'created' | 'modified' | 'deleted';

    /** Timestamp */
    timestamp: number;

    /** File content (for created/modified) */
    content?: string;
}

/**
 * Analysis result from Gemini
 */
interface ChangeAnalysis {
    /** Components added */
    components_added: string[];

    /** Functions added */
    functions_added: string[];

    /** Dependencies installed */
    dependencies_installed: string[];

    /** Summary of changes */
    summary: string;
}

/**
 * Implementation Tracker
 */
export class ImplementationTracker {
    private gemini: GoogleGenerativeAI;
    private model: string;
    private activeTrackings: Map<string, ImplementationTracking>;
    private fileChanges: Map<string, FileChange[]>;
    private syncManager?: MemorySyncManager;
    private autoSync: boolean;

    constructor(
        apiKey?: string, 
        model?: string,
        syncManager?: MemorySyncManager
    ) {
        const key = apiKey || process.env.GEMINI_API_KEY;
        if (!key) {
            throw new Error('GEMINI_API_KEY is required for Implementation Tracker');
        }

        this.gemini = new GoogleGenerativeAI(key);
        this.model = model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
        this.activeTrackings = new Map();
        this.fileChanges = new Map();
        this.syncManager = syncManager;
        
        // Auto-sync enabled if sync manager provided and feature flag is on
        this.autoSync = !!syncManager && process.env.VECTOR_MEMORY_SEARCH === 'true';

        console.log(`[ImplementationTracker] Initialized with model: ${this.model}`);
        
        if (this.autoSync) {
            console.log('[ImplementationTracker] Auto memory sync enabled');
        }
    }

    /**
     * Start tracking an intent implementation
     */
    trackIntent(intent: Intent): void {
        const tracking: ImplementationTracking = {
            intent_id: intent.id,
            files_created: [],
            files_modified: [],
            components_added: [],
            functions_added: [],
            dependencies_installed: [],
            success_criteria_met: [],
            next_steps: [],
            started_at: Date.now()
        };

        this.activeTrackings.set(intent.id, tracking);
        this.fileChanges.set(intent.id, []);

        console.log(`[ImplementationTracker] Started tracking: ${intent.id}`);
    }

    /**
     * Record a file change
     */
    recordChange(intentId: string, change: FileChange): void {
        const changes = this.fileChanges.get(intentId);
        if (!changes) {
            console.warn(`[ImplementationTracker] No active tracking for: ${intentId}`);
            return;
        }

        changes.push(change);

        const tracking = this.activeTrackings.get(intentId)!;

        // Update tracking based on change type
        switch (change.type) {
            case 'created':
                if (!tracking.files_created.includes(change.path)) {
                    tracking.files_created.push(change.path);
                }
                break;
            case 'modified':
                if (!tracking.files_modified.includes(change.path)) {
                    tracking.files_modified.push(change.path);
                }
                break;
        }

        console.log(`[ImplementationTracker] Recorded ${change.type}: ${change.path}`);
    }

    /**
     * Analyze changes and update tracking
     */
    async analyzeChanges(intentId: string): Promise<void> {
        const tracking = this.activeTrackings.get(intentId);
        const changes = this.fileChanges.get(intentId);

        if (!tracking || !changes || changes.length === 0) {
            return;
        }

        try {
            // Analyze with Gemini
            const analysis = await this.analyzeWithGemini(changes);

            // Update tracking
            tracking.components_added.push(...analysis.components_added);
            tracking.functions_added.push(...analysis.functions_added);
            tracking.dependencies_installed.push(...analysis.dependencies_installed);

            console.log(`[ImplementationTracker] Analysis complete for: ${intentId}`);
            console.log(`  Components: ${analysis.components_added.length}`);
            console.log(`  Functions: ${analysis.functions_added.length}`);
            console.log(`  Summary: ${analysis.summary}`);
        } catch (error) {
            console.error('[ImplementationTracker] Error analyzing changes:', error);
        }
    }

    /**
     * Analyze changes using Gemini
     */
    private async analyzeWithGemini(changes: FileChange[]): Promise<ChangeAnalysis> {
        const model = this.gemini.getGenerativeModel({ model: this.model });

        // Build change summary
        const changeSummary = changes.map(c => {
            const content = c.content ? `\n${c.content.slice(0, 500)}...` : '';
            return `${c.type.toUpperCase()}: ${c.path}${content}`;
        }).join('\n\n');

        const prompt = `You are a code analysis expert. Analyze the following file changes and extract structured information.

File Changes:
${changeSummary}

Return ONLY valid JSON (no markdown, no explanation) with this structure:
{
  "components_added": ["ComponentName1", "ComponentName2"],
  "functions_added": ["functionName1", "functionName2"],
  "dependencies_installed": ["package1", "package2"],
  "summary": "Brief summary of what was implemented"
}

Guidelines:
- Look for new classes, components, modules in the code
- Detect function/method definitions
- Find package.json changes for dependencies
- Provide a concise summary of the implementation

Example:
For a file creating GoogleAuthService with login() method:
{
  "components_added": ["GoogleAuthService"],
  "functions_added": ["login", "logout", "refreshToken"],
  "dependencies_installed": ["passport-google-oauth20"],
  "summary": "Implemented Google OAuth authentication service with login and token management"
}

Now analyze the changes above.`;

        try {
            const result = await model.generateContent(prompt);
            const response = result.response.text();

            // Parse JSON response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Invalid JSON response from Gemini');
            }

            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error('[ImplementationTracker] Gemini analysis error:', error);

            // Return empty analysis on error
            return {
                components_added: [],
                functions_added: [],
                dependencies_installed: [],
                summary: 'Analysis failed'
            };
        }
    }

    /**
     * Complete tracking for an intent
     * Now includes automatic memory sync if enabled
     */
    async completeTracking(intentId: string): Promise<ImplementationTracking | null> {
        const tracking = this.activeTrackings.get(intentId);
        if (!tracking) {
            return null;
        }

        tracking.completed_at = Date.now();

        console.log(`[ImplementationTracker] Completed tracking: ${intentId}`);
        console.log(`  Files created: ${tracking.files_created.length}`);
        console.log(`  Files modified: ${tracking.files_modified.length}`);
        console.log(`  Components added: ${tracking.components_added.length}`);

        // Auto-sync to memory if enabled
        if (this.autoSync && this.syncManager) {
            console.log('[ImplementationTracker] Triggering auto memory sync...');
            
            try {
                await this.updateMemoryFromTracking(tracking);
            } catch (error) {
                console.error('[ImplementationTracker] Error syncing to memory:', error);
                // Don't fail tracking if sync fails
            }
        }

        return tracking;
    }

    /**
     * Update memory entities from tracking data (NEW)
     * Creates memory entities for new components, functions, etc.
     */
    private async updateMemoryFromTracking(tracking: ImplementationTracking): Promise<void> {
        if (!this.syncManager) {
            return;
        }

        const entities: MemoryEntity[] = [];
        const timestamp = Date.now();

        // Get intent for context
        const intent = this.activeTrackings.get(tracking.intent_id);

        // Create entity for the implementation itself
        if (tracking.components_added.length > 0 || tracking.functions_added.length > 0) {
            const implementationEntity: MemoryEntity = {
                name: `implementation_${tracking.intent_id}_${timestamp}`,
                entityType: 'Implementation',
                observations: [
                    `Implementation completed for intent: ${tracking.intent_id}`,
                    `Files created: ${tracking.files_created.join(', ')}`,
                    `Files modified: ${tracking.files_modified.join(', ')}`,
                    `Components added: ${tracking.components_added.join(', ')}`,
                    `Functions added: ${tracking.functions_added.join(', ')}`,
                    `Dependencies: ${tracking.dependencies_installed.join(', ')}`
                ],
                relatedFiles: [...tracking.files_created, ...tracking.files_modified],
                relatedComponents: [...tracking.components_added, ...tracking.functions_added],
                dependencies: tracking.dependencies_installed,
                tags: ['implementation', 'auto-tracked']
            };

            entities.push(implementationEntity);
        }

        // Create entities for each component
        for (const component of tracking.components_added) {
            const componentEntity: MemoryEntity = {
                name: `component_${component.toLowerCase().replace(/\s+/g, '_')}_${timestamp}`,
                entityType: 'Component',
                observations: [
                    `Component ${component} added`,
                    `Part of implementation: ${tracking.intent_id}`
                ],
                relatedFiles: tracking.files_created.filter(f => 
                    f.toLowerCase().includes(component.toLowerCase())
                ),
                relatedComponents: [component],
                tags: ['component', 'auto-tracked']
            };

            entities.push(componentEntity);
        }

        // Create entities for each function
        for (const func of tracking.functions_added) {
            const functionEntity: MemoryEntity = {
                name: `function_${func.toLowerCase().replace(/\s+/g, '_')}_${timestamp}`,
                entityType: 'Function',
                observations: [
                    `Function ${func} added`,
                    `Part of implementation: ${tracking.intent_id}`
                ],
                relatedComponents: [func],
                tags: ['function', 'auto-tracked']
            };

            entities.push(functionEntity);
        }

        // Sync to memory
        if (entities.length > 0) {
            console.log(`[ImplementationTracker] Syncing ${entities.length} entities to memory...`);
            
            const syncResult = await this.syncManager.syncAll(entities);
            
            console.log(`[ImplementationTracker] Memory sync complete: ${syncResult.created} created, ${syncResult.updated} updated`);
            
            if (syncResult.errors.length > 0) {
                console.error(`[ImplementationTracker] Sync errors: ${syncResult.errors.join(', ')}`);
            }
        }
    }

    /**
     * Get active tracking
     */
    getTracking(intentId: string): ImplementationTracking | null {
        return this.activeTrackings.get(intentId) || null;
    }

    /**
     * Get all active trackings
     */
    getAllTrackings(): ImplementationTracking[] {
        return Array.from(this.activeTrackings.values());
    }

    /**
     * Stop tracking an intent
     */
    stopTracking(intentId: string): void {
        this.activeTrackings.delete(intentId);
        this.fileChanges.delete(intentId);
        console.log(`[ImplementationTracker] Stopped tracking: ${intentId}`);
    }
}
