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

    constructor(
        private apiKey: string,
        private memoryPath: string
    ) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.contextCachePath = path.join(memoryPath, 'enhancement-context.json');
        
        // Load cached context if exists
        this.loadCachedContext();
        
        console.log('[PromptEnhancer] Initialized');
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
        try {
            // Get or analyze codebase context
            let context = this.cachedContext;
            if (!context || Date.now() - context.lastAnalyzed > 3600000) { // 1 hour cache
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
            const enhancedQuery = await this.callGemini(model, systemPrompt, userPrompt);

            return {
                enhancedQuery: enhancedQuery.trim(),
                originalQuery: input.query,
                template: template.name,
                model
            };
        } catch (error: any) {
            console.error('[PromptEnhancer] Enhancement failed:', error);
            // Fallback: return original query
            return {
                enhancedQuery: input.query,
                originalQuery: input.query,
                template: input.template || 'general',
                model: input.model || 'gemini-2.5-flash'
            };
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
}

