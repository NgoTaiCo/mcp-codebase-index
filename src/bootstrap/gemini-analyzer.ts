/**
 * Gemini Analyzer for Bootstrap System
 * Selective semantic analysis of complex code using Gemini API
 * 
 * Phase 3 of Bootstrap: AI-powered analysis for complex patterns
 * - Analyzes only complex/ambiguous code
 * - Generates high-quality descriptions
 * - Target: <100k tokens for 500-file project
 * 
 * Based on MEMORY_OPTIMIZATION_PLAN.md Section 11
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { MemoryEntity } from '../../src/memory/types.js';
import type { CodeElement } from './ast-parser.js';
import type { DetectedPattern } from './index-analyzer.js';

/**
 * Analysis candidate (code that needs semantic analysis)
 */
export interface AnalysisCandidate {
    element?: CodeElement;
    pattern?: DetectedPattern;
    code?: string;
    context?: string;
    priority: number; // 0-10, higher = more important
}

/**
 * Semantic analysis result
 */
export interface SemanticAnalysis {
    description: string;
    purpose: string;
    usage: string[];
    complexity: 'low' | 'medium' | 'high';
    tags: string[];
    confidence: number;
}

/**
 * Gemini analysis result
 */
export interface GeminiAnalysisResult {
    analyses: Map<string, SemanticAnalysis>;
    tokensUsed: number;
    analysisTime: number;
    itemsAnalyzed: number;
}

/**
 * Gemini Analyzer - Selective semantic analysis
 */
export class GeminiAnalyzer {
    private genAI: GoogleGenerativeAI;
    private model: any;
    private tokenBudget: number;
    private tokensUsed: number = 0;

    constructor(apiKey: string, options: {
        model?: string;
        tokenBudget?: number;
    } = {}) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ 
            model: options.model || 'gemini-2.5-flash' // 4M TPM, better quota
        });
        this.tokenBudget = options.tokenBudget || 100000; // 100k default
    }

    /**
     * Analyze candidates selectively based on priority
     */
    async analyze(candidates: AnalysisCandidate[]): Promise<GeminiAnalysisResult> {
        const startTime = Date.now();
        
        console.log('[GeminiAnalyzer] Starting selective analysis...');
        console.log(`  Candidates: ${candidates.length}`);
        console.log(`  Token budget: ${this.tokenBudget.toLocaleString()}`);

        const result: GeminiAnalysisResult = {
            analyses: new Map(),
            tokensUsed: 0,
            analysisTime: 0,
            itemsAnalyzed: 0
        };

        // Sort by priority (highest first)
        const sortedCandidates = [...candidates].sort((a, b) => b.priority - a.priority);

        // Analyze until budget exhausted
        for (const candidate of sortedCandidates) {
            if (this.tokensUsed >= this.tokenBudget) {
                console.log('[GeminiAnalyzer] Token budget exhausted');
                break;
            }

            try {
                const key = this.getCandidateKey(candidate);
                const analysis = await this.analyzeCandidate(candidate);
                
                if (analysis) {
                    result.analyses.set(key, analysis);
                    result.itemsAnalyzed++;
                    
                    if (result.itemsAnalyzed % 10 === 0) {
                        console.log(`[GeminiAnalyzer] Progress: ${result.itemsAnalyzed}/${candidates.length} (${this.tokensUsed.toLocaleString()} tokens)`);
                    }
                }
            } catch (error) {
                console.error(`[GeminiAnalyzer] Error analyzing candidate:`, error);
            }
        }

        result.tokensUsed = this.tokensUsed;
        result.analysisTime = Date.now() - startTime;

        console.log('[GeminiAnalyzer] Analysis complete:');
        console.log(`  Items analyzed: ${result.itemsAnalyzed}/${candidates.length}`);
        console.log(`  Tokens used: ${result.tokensUsed.toLocaleString()}/${this.tokenBudget.toLocaleString()}`);
        console.log(`  Time: ${result.analysisTime}ms`);

        return result;
    }

    /**
     * Prioritize candidates for analysis
     * Returns candidates sorted by priority with estimated token cost
     */
    prioritizeCandidates(
        elements: CodeElement[],
        patterns: DetectedPattern[]
    ): AnalysisCandidate[] {
        const candidates: AnalysisCandidate[] = [];

        // Analyze patterns (high priority)
        for (const pattern of patterns) {
            candidates.push({
                pattern,
                priority: this.calculatePatternPriority(pattern),
                context: `Pattern with ${pattern.files.length} files`
            });
        }

        // Analyze complex elements (medium-high priority)
        for (const element of elements) {
            const priority = this.calculateElementPriority(element);
            
            // Only analyze if priority > 5 (selective)
            if (priority > 5) {
                candidates.push({
                    element,
                    priority,
                    context: `${element.type} in ${element.filePath}`
                });
            }
        }

        return candidates.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Convert analyses to memory entities
     */
    toMemoryEntities(
        analyses: Map<string, SemanticAnalysis>,
        candidates: AnalysisCandidate[]
    ): MemoryEntity[] {
        const entities: MemoryEntity[] = [];
        const now = Date.now();

        for (const [key, analysis] of analyses.entries()) {
            const candidate = candidates.find(c => this.getCandidateKey(c) === key);
            if (!candidate) continue;

            let name: string;
            let relatedFiles: string[] = [];
            let relatedComponents: string[] = [];

            if (candidate.element) {
                name = `analyzed_${candidate.element.type}_${candidate.element.name}`.toLowerCase();
                relatedFiles = [candidate.element.filePath];
                relatedComponents = [candidate.element.name];
            } else if (candidate.pattern) {
                name = `analyzed_pattern_${candidate.pattern.name}`.toLowerCase().replace(/\s+/g, '_');
                relatedFiles = candidate.pattern.files;
            } else {
                continue;
            }

            const entity: MemoryEntity = {
                name,
                entityType: candidate.element ? 'Component' : 'Pattern',
                observations: [
                    analysis.description,
                    `Purpose: ${analysis.purpose}`,
                    `Complexity: ${analysis.complexity}`,
                    ...(analysis.usage.length > 0 ? [`Usage: ${analysis.usage.join(', ')}`] : []),
                    `AI confidence: ${(analysis.confidence * 100).toFixed(1)}%`
                ],
                relatedFiles,
                relatedComponents: relatedComponents.length > 0 ? relatedComponents : undefined,
                tags: [
                    ...analysis.tags,
                    analysis.complexity,
                    `ai_analyzed`,
                    `confidence_${Math.floor(analysis.confidence * 10) * 10}`
                ],
                createdAt: now,
                updatedAt: now
            };

            entities.push(entity);
        }

        return entities;
    }

    /**
     * Analyze a single candidate
     */
    private async analyzeCandidate(candidate: AnalysisCandidate): Promise<SemanticAnalysis | null> {
        const prompt = this.buildPrompt(candidate);
        
        // Estimate tokens (rough: 1 token ≈ 4 chars)
        const estimatedTokens = Math.ceil(prompt.length / 4);
        
        if (this.tokensUsed + estimatedTokens > this.tokenBudget) {
            return null;
        }

        try {
            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            // Update token count (estimate: input + output)
            this.tokensUsed += estimatedTokens + Math.ceil(text.length / 4);

            // Parse response
            return this.parseResponse(text);
        } catch (error) {
            console.error('[GeminiAnalyzer] Error calling Gemini:', error);
            return null;
        }
    }

    /**
     * Build analysis prompt
     */
    private buildPrompt(candidate: AnalysisCandidate): string {
        if (candidate.element) {
            return `Analyze this code element and provide a concise semantic analysis.

Element: ${candidate.element.type} "${candidate.element.name}"
File: ${candidate.element.filePath}
Exported: ${candidate.element.exported}
${candidate.element.description ? `Description: ${candidate.element.description}` : ''}

Respond in JSON format:
{
  "description": "Brief 1-sentence description",
  "purpose": "What this code does",
  "usage": ["usage scenario 1", "usage scenario 2"],
  "complexity": "low|medium|high",
  "tags": ["tag1", "tag2"],
  "confidence": 0.95
}`;
        }

        if (candidate.pattern) {
            return `Analyze this code pattern and provide a concise semantic analysis.

Pattern: ${candidate.pattern.name}
Type: ${candidate.pattern.type}
Files: ${candidate.pattern.files.length}
Description: ${candidate.pattern.description}

Respond in JSON format:
{
  "description": "Brief 1-sentence description of the pattern",
  "purpose": "What this pattern achieves",
  "usage": ["when to use this pattern"],
  "complexity": "low|medium|high",
  "tags": ["tag1", "tag2"],
  "confidence": 0.95
}`;
        }

        return '';
    }

    /**
     * Parse Gemini response
     */
    private parseResponse(text: string): SemanticAnalysis {
        try {
            // Extract JSON from response (may have markdown code blocks)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const parsed = JSON.parse(jsonMatch[0]);
            
            return {
                description: parsed.description || '',
                purpose: parsed.purpose || '',
                usage: Array.isArray(parsed.usage) ? parsed.usage : [],
                complexity: parsed.complexity || 'medium',
                tags: Array.isArray(parsed.tags) ? parsed.tags : [],
                confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8
            };
        } catch (error) {
            console.error('[GeminiAnalyzer] Error parsing response:', error);
            
            // Fallback: extract from text
            return {
                description: text.substring(0, 200),
                purpose: 'Analysis failed',
                usage: [],
                complexity: 'medium',
                tags: ['parse_error'],
                confidence: 0.5
            };
        }
    }

    /**
     * Calculate element priority (0-10)
     */
    private calculateElementPriority(element: CodeElement): number {
        let priority = 5; // Base priority

        // Boost for exported (public API)
        if (element.exported) priority += 2;

        // Boost for components
        if (element.type === 'component' || element.type === 'class') priority += 1;

        // Boost for complex code (rough heuristic: lines)
        const lines = element.endLine - element.startLine;
        if (lines > 100) priority += 2;
        else if (lines > 50) priority += 1;

        // Boost if has description (JSDoc)
        if (element.description) priority += 1;

        // Reduce for types/interfaces (usually self-explanatory)
        if (element.type === 'interface' || element.type === 'type') priority -= 2;

        return Math.max(0, Math.min(10, priority));
    }

    /**
     * Calculate pattern priority (0-10)
     */
    private calculatePatternPriority(pattern: DetectedPattern): number {
        let priority = 7; // Patterns are generally important

        // Boost for high confidence
        if (pattern.confidence > 0.9) priority += 2;
        else if (pattern.confidence > 0.8) priority += 1;

        // Boost for large patterns
        if (pattern.files.length > 20) priority += 2;
        else if (pattern.files.length > 10) priority += 1;

        // Boost for feature/module (more important than utility)
        if (pattern.type === 'feature' || pattern.type === 'module') priority += 1;

        return Math.max(0, Math.min(10, priority));
    }

    /**
     * Get unique key for candidate
     */
    private getCandidateKey(candidate: AnalysisCandidate): string {
        if (candidate.element) {
            return `element_${candidate.element.filePath}_${candidate.element.name}`;
        }
        if (candidate.pattern) {
            return `pattern_${candidate.pattern.name}`;
        }
        return `unknown_${Math.random()}`;
    }

    /**
     * Get remaining token budget
     */
    getRemainingBudget(): number {
        return Math.max(0, this.tokenBudget - this.tokensUsed);
    }

    /**
     * Reset token counter
     */
    resetTokens() {
        this.tokensUsed = 0;
    }
}
