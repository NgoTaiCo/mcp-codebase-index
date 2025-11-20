#!/usr/bin/env tsx
/**
 * Bootstrap Orchestrator
 * 
 * Coordinates the entire bootstrap process:
 * 1. AST Parser - Extract code structure (0 tokens)
 * 2. Index Analyzer - Detect patterns from vectors
 * 3. Gemini Analyzer - Semantic analysis of complex items (<100k tokens)
 * 
 * Target: Bootstrap 500-file project in 3-5 minutes with <100k tokens
 */

import { ASTParser, type CodeElement } from './ast-parser.js';
import { IndexAnalyzer, type DetectedPattern } from './index-analyzer.js';
import { GeminiAnalyzer } from './gemini-analyzer.js';
import type { MemoryEntity } from '../../src/memory/types.js';

/**
 * Bootstrap configuration
 */
export interface BootstrapConfig {
    // Project paths
    sourceDir: string;                  // Directory to parse (e.g., 'src/')

    // Qdrant config
    qdrantUrl: string;
    qdrantApiKey: string;
    collection: string;                 // Collection to analyze

    // Gemini config
    geminiApiKey: string;
    geminiModel?: string;               // Default: gemini-2.5-flash

    // Analysis config
    tokenBudget?: number;               // Default: 100k
    maxVectors?: number;                // Default: 1000
    clusterCount?: number;              // Default: 5
    topCandidates?: number;             // Default: 50 (top items for Gemini)

    // Output config
    outputPath?: string;                // Optional: save results to JSON
    verbose?: boolean;                  // Default: false
}

/**
 * Bootstrap result
 */
export interface BootstrapResult {
    // Phase 1: AST Parsing
    astElements: CodeElement[];
    astTime: number;
    astStats: {
        filesProcessed: number;
        elementsExtracted: number;
        byType: Record<string, number>;
    };

    // Phase 2: Index Analysis
    patterns: DetectedPattern[];
    indexTime: number;
    indexStats: {
        vectorsAnalyzed: number;
        clustersFound: number;
        patternsDetected: number;
    };

    // Phase 3: Gemini Analysis
    analyses: number;
    geminiTime: number;
    geminiStats: {
        itemsAnalyzed: number;
        tokensUsed: number;
        avgConfidence: number;
    };

    // Overall
    entities: MemoryEntity[];
    totalTime: number;
    success: boolean;
    errors: string[];
}

/**
 * Bootstrap Orchestrator
 */
export class BootstrapOrchestrator {
    private config: Required<BootstrapConfig>;
    private astParser: ASTParser;
    private indexAnalyzer: IndexAnalyzer;
    private geminiAnalyzer: GeminiAnalyzer;

    constructor(config: BootstrapConfig) {
        // Set defaults
        this.config = {
            ...config,
            geminiModel: config.geminiModel || 'gemini-2.5-flash',
            tokenBudget: config.tokenBudget || 100_000,
            maxVectors: config.maxVectors || 1000,
            clusterCount: config.clusterCount || 5,
            topCandidates: config.topCandidates || 50,
            outputPath: config.outputPath || '',
            verbose: config.verbose || false,
        };

        // Initialize components
        this.astParser = new ASTParser();
        this.indexAnalyzer = new IndexAnalyzer(
            this.config.qdrantUrl,
            this.config.qdrantApiKey,
            this.config.collection
        );
        this.geminiAnalyzer = new GeminiAnalyzer(this.config.geminiApiKey, {
            model: this.config.geminiModel,
            tokenBudget: this.config.tokenBudget,
        });
    }

    /**
     * Run complete bootstrap process
     */
    async bootstrap(): Promise<BootstrapResult> {
        const startTime = Date.now();
        const errors: string[] = [];

        this.log('\n🚀 Starting Bootstrap Process...\n');

        // Initialize result
        const result: BootstrapResult = {
            astElements: [],
            astTime: 0,
            astStats: {
                filesProcessed: 0,
                elementsExtracted: 0,
                byType: {},
            },
            patterns: [],
            indexTime: 0,
            indexStats: {
                vectorsAnalyzed: 0,
                clustersFound: 0,
                patternsDetected: 0,
            },
            analyses: 0,
            geminiTime: 0,
            geminiStats: {
                itemsAnalyzed: 0,
                tokensUsed: 0,
                avgConfidence: 0,
            },
            entities: [],
            totalTime: 0,
            success: false,
            errors: [],
        };

        try {
            // Phase 1: AST Parsing
            const astResult = await this.runASTPhase();
            result.astElements = astResult.elements;
            result.astTime = astResult.time;
            result.astStats = astResult.stats;

            // Phase 2: Index Analysis
            const indexResult = await this.runIndexPhase();
            result.patterns = indexResult.patterns;
            result.indexTime = indexResult.time;
            result.indexStats = indexResult.stats;

            // Phase 3: Gemini Analysis
            const geminiResult = await this.runGeminiPhase(
                astResult.elements,
                indexResult.patterns
            );
            result.analyses = geminiResult.analyses;
            result.geminiTime = geminiResult.time;
            result.geminiStats = geminiResult.stats;

            // Combine all entities
            // Note: AST parser needs full parseResults (not just elements)
            // We'll create simple entities from elements directly for now
            const astEntities: MemoryEntity[] = astResult.elements.map(el => ({
                name: `ast_${el.type}_${el.name}`.toLowerCase(),
                entityType: 'Component',
                observations: [
                    `Type: ${el.type}`,
                    `Name: ${el.name}`,
                    `File: ${el.filePath}`,
                    ...(el.description ? [`Description: ${el.description}`] : []),
                ]
            }));

            const indexEntities = this.indexAnalyzer.toMemoryEntities(indexResult.patterns);

            result.entities = [
                ...astEntities,
                ...indexEntities,
                ...geminiResult.entities,
            ];

            result.success = true;

        } catch (error: any) {
            errors.push(error.message);
            result.success = false;
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
     * Phase 1: AST Parsing (Optional - TS/JS only)
     */
    private async runASTPhase() {
        this.log('📊 Phase 1: AST Parsing');
        this.log('─'.repeat(60));

        // Detect primary language
        const primaryLanguage = this.astParser.detectPrimaryLanguage(this.config.sourceDir);
        this.log(`   Primary language: ${primaryLanguage}`);

        // Only run AST parsing for TypeScript/JavaScript projects
        if (primaryLanguage !== 'TypeScript' && primaryLanguage !== 'JavaScript') {
            this.log('⏭️  Skipped - AST parsing only supports TypeScript/JavaScript');
            this.log(`   Your project uses ${primaryLanguage}`);
            this.log('   Will rely on Index Analysis + Gemini for code understanding');
            this.log('');

            return {
                elements: [],
                time: 0,
                stats: {
                    filesProcessed: 0,
                    elementsExtracted: 0,
                    byType: {},
                },
            };
        }

        const startTime = Date.now();
        const parseResults = await this.astParser.parseDirectory(this.config.sourceDir);
        const time = Date.now() - startTime;

        // Flatten all elements from all files
        const allElements: CodeElement[] = [];
        for (const result of parseResults) {
            allElements.push(...result.elements);
        }

        // Calculate stats
        const byType: Record<string, number> = {};
        allElements.forEach((el: CodeElement) => {
            byType[el.type] = (byType[el.type] || 0) + 1;
        });

        const stats = {
            filesProcessed: parseResults.length,
            elementsExtracted: allElements.length,
            byType,
        };

        this.log(`✅ Parsed ${stats.filesProcessed} files in ${time}ms`);
        this.log(`   Extracted ${stats.elementsExtracted} elements:`);
        Object.entries(byType).forEach(([type, count]) => {
            this.log(`   - ${type}: ${count}`);
        });
        this.log('');

        return {
            elements: allElements,
            time,
            stats,
        };
    }

    /**
     * Phase 2: Index Analysis
     */
    private async runIndexPhase() {
        this.log('🔍 Phase 2: Index Analysis');
        this.log('─'.repeat(60));

        const startTime = Date.now();
        const indexResult = await this.indexAnalyzer.analyze({
            maxVectors: this.config.maxVectors,
            clusterCount: this.config.clusterCount,
            minClusterSize: 2,
        });
        const time = Date.now() - startTime;

        const stats = {
            vectorsAnalyzed: indexResult.totalVectors,
            clustersFound: indexResult.clusters.length,
            patternsDetected: indexResult.patterns.length,
        };

        this.log(`✅ Analyzed ${stats.vectorsAnalyzed} vectors in ${time}ms`);
        this.log(`   Found ${stats.clustersFound} clusters`);
        this.log(`   Detected ${stats.patternsDetected} patterns`);
        this.log('');

        return {
            patterns: indexResult.patterns,
            time,
            stats,
        };
    }

    /**
     * Phase 3: Gemini Analysis
     */
    private async runGeminiPhase(
        elements: CodeElement[],
        patterns: DetectedPattern[]
    ) {
        this.log('🤖 Phase 3: Gemini Analysis');
        this.log('─'.repeat(60));

        // Prioritize and select top candidates
        const allCandidates = this.geminiAnalyzer.prioritizeCandidates(elements, patterns);
        const topCandidates = allCandidates.slice(0, this.config.topCandidates);

        this.log(`   Prioritized ${allCandidates.length} candidates`);
        this.log(`   Analyzing top ${topCandidates.length} with Gemini...`);

        const startTime = Date.now();
        const geminiResult = await this.geminiAnalyzer.analyze(topCandidates);
        const time = Date.now() - startTime;

        // Convert to entities (pass both analyses Map and candidates array)
        const entities = this.geminiAnalyzer.toMemoryEntities(
            geminiResult.analyses,
            topCandidates
        );

        // Calculate average confidence
        const analyses = Array.from(geminiResult.analyses.values());
        const avgConfidence = analyses.length > 0
            ? analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length
            : 0;

        const stats = {
            itemsAnalyzed: geminiResult.itemsAnalyzed,
            tokensUsed: geminiResult.tokensUsed,
            avgConfidence,
        };

        this.log(`✅ Analyzed ${stats.itemsAnalyzed} items in ${time}ms`);
        this.log(`   Tokens used: ${stats.tokensUsed.toLocaleString()}/${this.config.tokenBudget.toLocaleString()}`);
        this.log(`   Avg confidence: ${(avgConfidence * 100).toFixed(1)}%`);
        this.log('');

        return {
            analyses: geminiResult.itemsAnalyzed,
            time,
            stats,
            entities,
        };
    }

    /**
     * Display summary
     */
    private displaySummary(result: BootstrapResult) {
        this.log('\n📋 Bootstrap Summary');
        this.log('='.repeat(60));

        if (result.success) {
            this.log('✅ Status: SUCCESS\n');
        } else {
            this.log('❌ Status: FAILED\n');
            result.errors.forEach(err => {
                this.log(`   Error: ${err}`);
            });
            this.log('');
        }

        // Phase timings
        this.log('⏱️  Timings:');
        this.log(`   Phase 1 (AST):    ${result.astTime.toLocaleString()}ms`);
        this.log(`   Phase 2 (Index):  ${result.indexTime.toLocaleString()}ms`);
        this.log(`   Phase 3 (Gemini): ${result.geminiTime.toLocaleString()}ms`);
        this.log(`   Total:            ${result.totalTime.toLocaleString()}ms (${(result.totalTime / 1000).toFixed(1)}s)\n`);

        // Results
        this.log('📊 Results:');
        this.log(`   AST Elements:     ${result.astStats.elementsExtracted}`);
        this.log(`   Patterns:         ${result.indexStats.patternsDetected}`);
        this.log(`   Gemini Analyses:  ${result.geminiStats.itemsAnalyzed}`);
        this.log(`   Total Entities:   ${result.entities.length}\n`);

        // Resource usage
        this.log('💰 Resource Usage:');
        this.log(`   Tokens used:      ${result.geminiStats.tokensUsed.toLocaleString()}/${this.config.tokenBudget.toLocaleString()} (${((result.geminiStats.tokensUsed / this.config.tokenBudget) * 100).toFixed(1)}%)`);
        this.log(`   Avg confidence:   ${(result.geminiStats.avgConfidence * 100).toFixed(1)}%`);

        // Performance metrics
        const filesPerSec = result.astStats.filesProcessed / (result.astTime / 1000);
        const tokensPerSec = result.geminiStats.tokensUsed / (result.geminiTime / 1000);

        this.log(`\n⚡ Performance:`);
        this.log(`   Files/sec:        ${filesPerSec.toFixed(0)}`);
        this.log(`   Tokens/sec:       ${tokensPerSec.toFixed(0)}`);

        this.log('\n' + '='.repeat(60));
    }

    /**
     * Save results to JSON file
     */
    private async saveResults(result: BootstrapResult) {
        const fs = await import('fs/promises');
        const path = await import('path');

        const outputPath = path.resolve(this.config.outputPath);
        const output = {
            timestamp: new Date().toISOString(),
            config: {
                sourceDir: this.config.sourceDir,
                collection: this.config.collection,
                tokenBudget: this.config.tokenBudget,
                geminiModel: this.config.geminiModel,
            },
            ...result,
        };

        await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
        this.log(`\n💾 Results saved to: ${outputPath}`);
    }

    /**
     * Log helper
     */
    private log(message: string) {
        if (this.config.verbose || message.includes('✅') || message.includes('❌') || message.includes('🚀') || message.includes('📋')) {
            console.log(message);
        }
    }
}

// Export for use as module
export default BootstrapOrchestrator;
