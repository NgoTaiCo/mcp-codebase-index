// src/enhancement/promptEnhancer.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import {
    CodebaseContext,
    EnhancementConfig,
    EnhancePromptInput,
    EnhancePromptResult,
    IncrementalIndexState,
    FileMetadata
} from '../types/index.js';
import { getTemplate, formatTemplate } from './templates.js';

const SUPPORTED_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'] as const;
type SupportedModel = typeof SUPPORTED_MODELS[number];

export class PromptEnhancer {
    private genAI: GoogleGenerativeAI;
    private contextCachePath: string;
    private cachedContext: CodebaseContext | null = null;
    private queryCache = new Map<string, { enhanced: string; timestamp: number }>();
    private telemetry = {
        totalEnhancements: 0,
        successfulEnhancements: 0,
        failedEnhancements: 0,
        totalApiCalls: 0,
        totalLatency: 0,
        cacheHits: 0
    };

    // Configuration
    private config = {
        enabled: true,
        maxQueryLength: 500,
        cacheTTL: 3600000, // 1 hour
        contextCacheTTL: 3600000 // 1 hour
    };

    constructor(
        private apiKey: string,
        private memoryPath: string,
        config?: Partial<typeof PromptEnhancer.prototype.config>
    ) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.contextCachePath = path.join(memoryPath, 'enhancement-context.json');

        // Merge config
        if (config) {
            this.config = { ...this.config, ...config };
        }

        // Load cached context if exists
        this.loadCachedContext();

        console.log('[PromptEnhancer] Initialized', {
            enabled: this.config.enabled,
            maxQueryLength: this.config.maxQueryLength,
            cacheTTL: this.config.cacheTTL
        });
    }

    /**
     * Load cached codebase context from file
     */
    private loadCachedContext(): void {
        try {
            if (fs.existsSync(this.contextCachePath)) {
                const data = fs.readFileSync(this.contextCachePath, 'utf-8');
                this.cachedContext = JSON.parse(data);
                console.log('[PromptEnhancer] Loaded cached context');
            }
        } catch (error) {
            console.warn('[PromptEnhancer] Failed to load cached context:', error);
            this.cachedContext = null;
        }
    }

    /**
     * Save codebase context to cache file
     */
    private saveCachedContext(context: CodebaseContext): void {
        try {
            // Ensure memory directory exists
            const memoryDir = path.dirname(this.contextCachePath);
            if (!fs.existsSync(memoryDir)) {
                fs.mkdirSync(memoryDir, { recursive: true });
            }

            fs.writeFileSync(
                this.contextCachePath,
                JSON.stringify(context, null, 2),
                'utf-8'
            );
            this.cachedContext = context;
            console.log('[PromptEnhancer] Saved context to cache');
        } catch (error) {
            console.error('[PromptEnhancer] Failed to save context:', error);
        }
    }

    /**
     * Analyze codebase to extract context from indexed files
     */
    async analyzeCodebase(indexState: IncrementalIndexState): Promise<CodebaseContext> {
        console.log('[PromptEnhancer] Analyzing codebase context...');

        // Extract languages from file extensions
        const languageMap = new Map<string, number>();
        const frameworkSet = new Set<string>();
        const patternSet = new Set<string>();
        let totalLines = 0;

        for (const [filePath, metadata] of indexState.indexedFiles) {
            // Count languages by extension
            const ext = path.extname(filePath).toLowerCase();
            const language = this.getLanguageFromExtension(ext);
            if (language) {
                languageMap.set(language, (languageMap.get(language) || 0) + 1);
            }

            // Detect frameworks from file paths and names
            const frameworks = this.detectFrameworks(filePath);
            frameworks.forEach(fw => frameworkSet.add(fw));

            // Estimate lines (rough estimate based on chunk count)
            totalLines += metadata.chunkCount * 20; // Assume ~20 lines per chunk
        }

        // Sort languages by frequency
        const languages = Array.from(languageMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([lang]) => lang);

        const mainLanguage = languages[0] || 'Unknown';
        const projectType = this.inferProjectType(languages, Array.from(frameworkSet));

        // Detect common patterns (basic heuristics)
        const patterns = this.detectPatterns(indexState);

        const context: CodebaseContext = {
            languages,
            frameworks: Array.from(frameworkSet),
            patterns,
            fileCount: indexState.indexedFiles.size,
            totalLines,
            mainLanguage,
            projectType,
            lastAnalyzed: Date.now()
        };

        // Save to cache
        this.saveCachedContext(context);

        console.log('[PromptEnhancer] Context analyzed:', {
            languages: context.languages.slice(0, 3),
            frameworks: context.frameworks.slice(0, 3),
            fileCount: context.fileCount
        });

        return context;
    }

    /**
     * Get language from file extension
     */
    private getLanguageFromExtension(ext: string): string | null {
        const langMap: Record<string, string> = {
            '.ts': 'TypeScript',
            '.tsx': 'TypeScript',
            '.js': 'JavaScript',
            '.jsx': 'JavaScript',
            '.py': 'Python',
            '.dart': 'Dart',
            '.java': 'Java',
            '.kt': 'Kotlin',
            '.swift': 'Swift',
            '.go': 'Go',
            '.rs': 'Rust',
            '.rb': 'Ruby',
            '.php': 'PHP',
            '.c': 'C',
            '.cpp': 'C++',
            '.cs': 'C#',
            '.sh': 'Shell',
            '.sql': 'SQL'
        };
        return langMap[ext] || null;
    }

    /**
     * Detect frameworks from file paths
     */
    private detectFrameworks(filePath: string): string[] {
        const frameworks: string[] = [];
        const lowerPath = filePath.toLowerCase();

        // Frontend frameworks
        if (lowerPath.includes('react') || lowerPath.includes('jsx')) frameworks.push('React');
        if (lowerPath.includes('vue')) frameworks.push('Vue');
        if (lowerPath.includes('angular')) frameworks.push('Angular');
        if (lowerPath.includes('next')) frameworks.push('Next.js');
        
        // Backend frameworks
        if (lowerPath.includes('express')) frameworks.push('Express');
        if (lowerPath.includes('fastapi')) frameworks.push('FastAPI');
        if (lowerPath.includes('django')) frameworks.push('Django');
        if (lowerPath.includes('flask')) frameworks.push('Flask');
        if (lowerPath.includes('spring')) frameworks.push('Spring');
        
        // Mobile frameworks
        if (lowerPath.includes('flutter') || lowerPath.endsWith('.dart')) frameworks.push('Flutter');
        if (lowerPath.includes('react-native')) frameworks.push('React Native');
        
        // Other
        if (lowerPath.includes('getx')) frameworks.push('GetX');
        if (lowerPath.includes('redux')) frameworks.push('Redux');
        if (lowerPath.includes('graphql')) frameworks.push('GraphQL');

        return frameworks;
    }

    /**
     * Infer project type from languages and frameworks
     */
    private inferProjectType(languages: string[], frameworks: string[]): string {
        const hasWeb = frameworks.some(fw => ['React', 'Vue', 'Angular', 'Next.js'].includes(fw));
        const hasMobile = frameworks.some(fw => ['Flutter', 'React Native'].includes(fw));
        const hasBackend = frameworks.some(fw => ['Express', 'FastAPI', 'Django', 'Flask', 'Spring'].includes(fw));

        if (hasMobile) return 'Mobile Application';
        if (hasWeb && hasBackend) return 'Full-stack Web Application';
        if (hasWeb) return 'Frontend Web Application';
        if (hasBackend) return 'Backend API';
        if (languages.includes('TypeScript') || languages.includes('JavaScript')) return 'JavaScript/TypeScript Project';
        if (languages.includes('Python')) return 'Python Project';
        
        return 'Software Project';
    }

    /**
     * Detect common patterns (basic heuristics)
     */
    private detectPatterns(indexState: IncrementalIndexState): string[] {
        const patterns: string[] = [];
        const filePaths = Array.from(indexState.indexedFiles.keys());

        // MVC pattern
        if (filePaths.some(p => p.includes('controller')) && 
            filePaths.some(p => p.includes('model')) &&
            filePaths.some(p => p.includes('view'))) {
            patterns.push('MVC');
        }

        // Repository pattern
        if (filePaths.some(p => p.includes('repository'))) {
            patterns.push('Repository Pattern');
        }

        // Service layer
        if (filePaths.some(p => p.includes('service'))) {
            patterns.push('Service Layer');
        }

        // Dependency injection
        if (filePaths.some(p => p.includes('inject') || p.includes('provider'))) {
            patterns.push('Dependency Injection');
        }

        return patterns;
    }

    /**
     * Enhance a user query with codebase context
     */
    async enhance(
        input: EnhancePromptInput,
        indexState: IncrementalIndexState
    ): Promise<EnhancePromptResult> {
        const startTime = Date.now();
        this.telemetry.totalEnhancements++;

        try {
            // Check if enhancement is enabled
            if (!this.config.enabled) {
                console.log('[PromptEnhancer] Enhancement disabled, returning original query');
                return {
                    enhancedQuery: input.query,
                    originalQuery: input.query,
                    template: input.template || 'general',
                    model: 'none'
                };
            }

            // Check query cache
            const cacheKey = `${input.query}:${input.template || 'general'}`;
            const cached = this.queryCache.get(cacheKey);

            if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
                console.log('[PromptEnhancer] Using cached enhancement');
                this.telemetry.cacheHits++;
                return {
                    enhancedQuery: cached.enhanced,
                    originalQuery: input.query,
                    template: input.template || 'general',
                    model: input.model || 'gemini-2.5-flash'
                };
            }

            // Get or analyze codebase context
            let context = this.cachedContext;
            if (!context || Date.now() - context.lastAnalyzed > this.config.contextCacheTTL) {
                context = await this.analyzeCodebase(indexState);
            }

            // Get template
            const template = getTemplate(input.template);

            // Format custom prompts
            const customPromptsText = input.customPrompts && input.customPrompts.length > 0
                ? `Additional Instructions:\n${input.customPrompts.map(p => `- ${p}`).join('\n')}`
                : '';

            // Format template with context
            const { systemPrompt, userPrompt } = formatTemplate(template, {
                languages: context.languages.join(', ') || 'Unknown',
                frameworks: context.frameworks.join(', ') || 'None detected',
                patterns: context.patterns.join(', ') || 'None detected',
                projectType: context.projectType,
                query: input.query,
                customPrompts: customPromptsText
            });

            // Call Gemini API
            const model = input.model || 'gemini-2.5-flash';
            this.telemetry.totalApiCalls++;
            const rawEnhanced = await this.callGemini(model, systemPrompt, userPrompt);

            // Validate and sanitize output
            const enhancedQuery = this.validateAndSanitize(rawEnhanced);

            // Quality check: ensure it's actually enhanced
            if (enhancedQuery.toLowerCase() === input.query.toLowerCase()) {
                console.warn('[PromptEnhancer] No enhancement detected, using simple expansion');
                const fallbackResult = this.simpleEnhancement(input, context);

                // Cache fallback result
                this.queryCache.set(cacheKey, {
                    enhanced: fallbackResult.enhancedQuery,
                    timestamp: Date.now()
                });

                return fallbackResult;
            }

            // Cache successful result
            this.queryCache.set(cacheKey, {
                enhanced: enhancedQuery,
                timestamp: Date.now()
            });

            this.telemetry.successfulEnhancements++;
            this.telemetry.totalLatency += Date.now() - startTime;

            return {
                enhancedQuery,
                originalQuery: input.query,
                template: template.name,
                model
            };
        } catch (error: any) {
            console.error('[PromptEnhancer] Enhancement failed:', error);
            this.telemetry.failedEnhancements++;

            // Fallback to simple enhancement
            const context = this.cachedContext || await this.analyzeCodebase(indexState);
            return this.simpleEnhancement(input, context);
        }
    }

    /**
     * Call Gemini API for text generation
     */
    private async callGemini(
        modelName: string,
        systemPrompt: string,
        userPrompt: string
    ): Promise<string> {
        const model = this.genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemPrompt
        });

        const result = await model.generateContent(userPrompt);
        const response = result.response;
        const text = response.text();

        return text;
    }

    /**
     * Validate and sanitize enhanced query output
     */
    private validateAndSanitize(query: string): string {
        // Remove excessive whitespace
        let cleaned = query.replace(/\s+/g, ' ').trim();

        // Remove markdown formatting
        cleaned = cleaned.replace(/```[\s\S]*?```/g, ''); // Code blocks
        cleaned = cleaned.replace(/`([^`]+)`/g, '$1'); // Inline code
        cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1'); // Bold
        cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1'); // Italic
        cleaned = cleaned.replace(/#+ /g, ''); // Headers

        // Remove query syntax operators (in case AI still uses them)
        cleaned = cleaned.replace(/\b(file|path|ext|lang):/gi, '');
        cleaned = cleaned.replace(/[(){}[\]]/g, ''); // Remove brackets

        // Limit length
        if (cleaned.length > this.config.maxQueryLength) {
            cleaned = cleaned.substring(0, this.config.maxQueryLength);
            // Try to cut at word boundary
            const lastSpace = cleaned.lastIndexOf(' ');
            if (lastSpace > this.config.maxQueryLength * 0.8) {
                cleaned = cleaned.substring(0, lastSpace);
            }
        }

        // Validate it's not empty
        if (!cleaned || cleaned.length < 3) {
            throw new Error('Enhanced query too short or empty');
        }

        return cleaned;
    }

    /**
     * Simple keyword expansion fallback (no AI)
     */
    private simpleEnhancement(
        input: EnhancePromptInput,
        context: CodebaseContext
    ): EnhancePromptResult {
        console.log('[PromptEnhancer] Using simple keyword expansion');

        // Combine query with top languages and frameworks
        const keywords = [
            input.query,
            ...context.languages.slice(0, 2),
            ...context.frameworks.slice(0, 2),
            ...context.patterns.slice(0, 1)
        ].filter(Boolean).join(' ');

        return {
            enhancedQuery: keywords,
            originalQuery: input.query,
            template: 'fallback',
            model: 'none'
        };
    }

    /**
     * Invalidate context cache (call after indexing)
     */
    invalidateContextCache(): void {
        this.cachedContext = null;
        console.log('[PromptEnhancer] Context cache invalidated');
    }

    /**
     * Clear query cache
     */
    clearQueryCache(): void {
        this.queryCache.clear();
        console.log('[PromptEnhancer] Query cache cleared');
    }

    /**
     * Get telemetry data
     */
    getTelemetry() {
        return {
            ...this.telemetry,
            successRate: this.telemetry.totalEnhancements > 0
                ? ((this.telemetry.successfulEnhancements / this.telemetry.totalEnhancements) * 100).toFixed(2) + '%'
                : '0%',
            avgLatency: this.telemetry.totalApiCalls > 0
                ? (this.telemetry.totalLatency / this.telemetry.totalApiCalls).toFixed(0) + 'ms'
                : '0ms',
            cacheHitRate: this.telemetry.totalEnhancements > 0
                ? ((this.telemetry.cacheHits / this.telemetry.totalEnhancements) * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<typeof PromptEnhancer.prototype.config>): void {
        this.config = { ...this.config, ...config };
        console.log('[PromptEnhancer] Config updated:', this.config);
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}

