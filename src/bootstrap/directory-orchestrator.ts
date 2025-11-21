#!/usr/bin/env tsx
/**
 * Directory-Based Bootstrap Orchestrator
 * 
 * NEW APPROACH (v2.0): Gemini-Driven Directory Analysis
 * 
 * Instead of:
 * - AST Parser (TS/JS only)
 * - K-Means clustering (random, unstable)
 * - Pattern inference (weak)
 * 
 * We do:
 * - Scan all directories
 * - Gemini selects important ones
 * - Deep analyze each directory
 * - Generate comprehensive entities
 * 
 * Benefits:
 * - Language-agnostic
 * - Architecture-aware
 * - Stable results
 * - Better quality entities
 */

import { DirectoryAnalyzer } from './directory-analyzer.js';
import type { MemoryEntity } from '../../src/memory/types.js';

/**
 * Bootstrap configuration
 */
export interface DirectoryBootstrapConfig {
    // Project path
    repoPath: string;

    // Gemini config
    geminiApiKey: string;
    geminiModel?: string;           // Default: gemini-2.5-flash-lite

    // Analysis config
    tokenBudget?: number;           // Default: 50k (directory analysis uses less)
    ignorePaths?: string[];         // Directories to ignore

    // Output config
    outputPath?: string;            // Optional: save results to JSON
    verbose?: boolean;              // Default: false
}

/**
 * Bootstrap result
 */
export interface DirectoryBootstrapResult {
    // Analysis results
    architecture: string;
    primaryLanguage: string;
    analyzedDirectories: number;

    // Entities
    entities: MemoryEntity[];

    // Stats
    tokensUsed: number;
    totalTime: number;

    // Status
    success: boolean;
    errors: string[];
}

/**
 * Directory-Based Bootstrap Orchestrator
 */
export class DirectoryBootstrapOrchestrator {
    private config: Required<DirectoryBootstrapConfig>;
    private analyzer: DirectoryAnalyzer;

    constructor(config: DirectoryBootstrapConfig) {
        this.config = {
            ...config,
            geminiModel: config.geminiModel || 'gemini-2.5-flash-lite',
            tokenBudget: config.tokenBudget || 50000,
            ignorePaths: config.ignorePaths || [
                '.git', 'node_modules', '__pycache__', '.venv',
                'build', 'dist', '.next', 'target',
                '.dart_tool', '.fvm', 'ios/Pods', 'android/.gradle',
                '.symlinks', 'coverage', '.pytest_cache'
            ],
            outputPath: config.outputPath || '',
            verbose: config.verbose || false
        };

        this.analyzer = new DirectoryAnalyzer(
            this.config.geminiApiKey,
            this.config.repoPath,
            {
                model: this.config.geminiModel,
                tokenBudget: this.config.tokenBudget,
                ignorePaths: this.config.ignorePaths
            }
        );
    }

    /**
     * Run bootstrap process
     */
    async bootstrap(): Promise<DirectoryBootstrapResult> {
        const startTime = Date.now();
        const errors: string[] = [];

        this.log('🚀 Starting Directory-Based Bootstrap Process...');
        this.log('');

        const result: DirectoryBootstrapResult = {
            architecture: 'Unknown',
            primaryLanguage: 'Unknown',
            analyzedDirectories: 0,
            entities: [],
            tokensUsed: 0,
            totalTime: 0,
            success: false,
            errors: []
        };

        try {
            // Run analysis
            const analysis = await this.analyzer.analyze();

            // Populate result
            result.architecture = analysis.directoryAnalysis.architecture;
            result.primaryLanguage = analysis.directoryAnalysis.primaryLanguage;
            result.analyzedDirectories = analysis.deepAnalyses.length;
            result.entities = analysis.entities;
            result.tokensUsed = analysis.tokensUsed;
            result.success = true;

            this.log('');
            this.log('✅ Bootstrap completed successfully!');

        } catch (error: any) {
            errors.push(error.message);
            result.success = false;

            this.log('');
            this.log('❌ Bootstrap failed');
            this.log(`   Error: ${error.message}`);
        }

        result.totalTime = Date.now() - startTime;
        result.errors = errors;

        // Display summary
        this.displaySummary(result);

        // Save to file if requested
        if (this.config.outputPath) {
            await this.saveResults(result);
        }

        return result;
    }

    /**
     * Display summary
     */
    private displaySummary(result: DirectoryBootstrapResult) {
        console.log('');
        console.log('📋 Bootstrap Summary');
        console.log('─'.repeat(60));
        console.log(`✅ Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);

        if (result.success) {
            console.log('');
            console.log('🏗️  Architecture:');
            console.log(`   Pattern: ${result.architecture}`);
            console.log(`   Language: ${result.primaryLanguage}`);
            console.log('');
            console.log('📊 Analysis:');
            console.log(`   Directories analyzed: ${result.analyzedDirectories}`);
            console.log(`   Entities created: ${result.entities.length}`);
            console.log(`   Tokens used: ${result.tokensUsed.toLocaleString()}`);
            console.log('');
            console.log('⏱️  Performance:');
            console.log(`   Total time: ${(result.totalTime / 1000).toFixed(2)}s`);
        }

        if (result.errors.length > 0) {
            console.log('');
            console.log('❌ Errors:');
            result.errors.forEach(err => console.log(`   - ${err}`));
        }

        console.log('');
    }

    /**
     * Save results to JSON file
     */
    private async saveResults(result: DirectoryBootstrapResult): Promise<void> {
        try {
            const fs = await import('fs/promises');
            await fs.writeFile(
                this.config.outputPath,
                JSON.stringify(result, null, 2),
                'utf8'
            );
            console.log(`📄 Results saved to: ${this.config.outputPath}`);
        } catch (error: any) {
            console.error(`Failed to save results: ${error.message}`);
        }
    }

    /**
     * Log helper
     */
    private log(message: string) {
        if (this.config.verbose || message.startsWith('🚀') || message.startsWith('✅') || message.startsWith('❌')) {
            console.log(message);
        }
    }
}
