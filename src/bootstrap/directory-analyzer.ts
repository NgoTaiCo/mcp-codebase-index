/**
 * Directory Analyzer for Bootstrap System
 * Uses Gemini to intelligently analyze repository structure
 * 
 * NEW APPROACH (v2.0):
 * - List all directories in repo
 * - Ask Gemini to identify important directories
 * - Deep analyze selected directories
 * - Generate comprehensive memory entities
 * 
 * Why this is better:
 * - Gemini understands architecture patterns (MVC, Clean, etc.)
 * - Language-agnostic (works for Dart, TS, Python, etc.)
 * - Focuses on meaningful code, not random clusters
 * - Produces actionable memory entities
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import type { MemoryEntity } from '../memory/types.js';

/**
 * Directory information
 */
export interface DirectoryInfo {
    path: string;           // Relative path from repo root
    fileCount: number;      // Number of source files
    subdirCount: number;    // Number of subdirectories
    extensions: string[];   // File extensions found
    depth: number;          // Directory depth from root
}

/**
 * Gemini's directory analysis
 */
export interface DirectoryAnalysis {
    selectedDirectories: string[];  // Directories to deep analyze
    reasoning: string;              // Why these directories
    architecture: string;           // Detected architecture pattern
    primaryLanguage: string;        // Main programming language
    confidence: number;             // 0-1
}

/**
 * Deep directory analysis result
 */
export interface DeepDirectoryAnalysis {
    directory: string;
    purpose: string;                // What this directory does
    keyFiles: string[];             // Important files
    patterns: string[];             // Code patterns found
    dependencies: string[];         // Related directories
    complexity: 'low' | 'medium' | 'high';
    tags: string[];
}

/**
 * Directory Analyzer - Gemini-powered intelligent analysis
 */
export class DirectoryAnalyzer {
    private genAI: GoogleGenerativeAI;
    private selectionModel: any;    // Flash-Lite for batch/selection
    private analysisModel: any;     // Flash for deep source analysis
    private repoPath: string;
    private ignorePaths: string[];
    private tokensUsed: number = 0;
    private tokenBudget: number;

    constructor(
        apiKey: string,
        repoPath: string,
        options: {
            model?: string;
            tokenBudget?: number;
            ignorePaths?: string[];
        } = {}
    ) {
        this.genAI = new GoogleGenerativeAI(apiKey);

        // Use Flash-Lite for batch operations (directory selection)
        this.selectionModel = this.genAI.getGenerativeModel({
            model: 'gemini-2.5-flash-lite'
        });

        // Use Flash for deep source code analysis (better quality)
        this.analysisModel = this.genAI.getGenerativeModel({
            model: options.model || 'gemini-2.5-flash'
        });

        this.repoPath = repoPath;
        this.tokenBudget = options.tokenBudget || 50000; // 50k tokens for directory analysis
        this.ignorePaths = options.ignorePaths || [
            '.git', 'node_modules', '__pycache__', '.venv',
            'build', 'dist', '.next', 'target',
            '.dart_tool', '.fvm', 'ios/Pods', 'android/.gradle',
            '.symlinks', 'coverage', '.pytest_cache'
        ];
    }

    /**
     * Main analysis pipeline
     */
    async analyze(): Promise<{
        directoryAnalysis: DirectoryAnalysis;
        deepAnalyses: DeepDirectoryAnalysis[];
        entities: MemoryEntity[];
        tokensUsed: number;
    }> {
        console.log('[Bootstrap] 🔍 Phase 1/4: Scanning repository...');
        console.log(`[Bootstrap]   Repo: ${this.repoPath}`);
        console.log(`[Bootstrap]   Token budget: ${this.tokenBudget.toLocaleString()}`);

        // Phase 1: Scan repository structure
        const directories = this.scanDirectories();
        console.log(`[Bootstrap] ✓ Found ${directories.length} directories`);
        console.log('');

        // Phase 2: Gemini selects important directories
        console.log('[Bootstrap] 🤖 Phase 2/4: Gemini selecting important directories...');
        const directoryAnalysis = await this.selectImportantDirectories(directories);
        console.log(`[Bootstrap] ✓ Selected ${directoryAnalysis.selectedDirectories.length} directories for deep analysis`);
        console.log(`[Bootstrap]   Architecture: ${directoryAnalysis.architecture}`);
        console.log(`[Bootstrap]   Language: ${directoryAnalysis.primaryLanguage}`);
        console.log('');

        // Phase 3: Deep analyze selected directories
        console.log('[Bootstrap] 🔬 Phase 3/4: Deep analyzing directories...');
        const deepAnalyses: DeepDirectoryAnalysis[] = [];
        const totalToAnalyze = directoryAnalysis.selectedDirectories.length;

        for (let i = 0; i < directoryAnalysis.selectedDirectories.length; i++) {
            const dir = directoryAnalysis.selectedDirectories[i];

            if (this.tokensUsed >= this.tokenBudget) {
                console.log(`[Bootstrap]   ⚠️  Token budget exhausted (${i}/${totalToAnalyze} completed)`);
                break;
            }

            console.log(`[Bootstrap]   Analyzing ${i + 1}/${totalToAnalyze}: ${dir}...`);
            const analysis = await this.deepAnalyzeDirectory(dir, directoryAnalysis);
            if (analysis) {
                deepAnalyses.push(analysis);
            }
        }
        console.log(`[Bootstrap] ✓ Completed deep analysis (${deepAnalyses.length} directories)`);
        console.log('');

        // Phase 4: Convert to memory entities
        const entities = this.toMemoryEntities(directoryAnalysis, deepAnalyses);
        console.log(`[DirectoryAnalyzer] Generated ${entities.length} memory entities`);

        return {
            directoryAnalysis,
            deepAnalyses,
            entities,
            tokensUsed: this.tokensUsed
        };
    }

    /**
     * Scan repository directories
     */
    private scanDirectories(): DirectoryInfo[] {
        const directories: DirectoryInfo[] = [];
        const sourceExtensions = [
            '.ts', '.js', '.tsx', '.jsx',
            '.dart',
            '.py',
            '.java', '.kt',
            '.swift',
            '.go',
            '.rs',
            '.c', '.cpp', '.h',
            '.vue', '.svelte'
        ];

        const walk = (dir: string, depth: number = 0) => {
            if (depth > 10) return; // Safety: max depth 10

            try {
                const files = fs.readdirSync(dir);
                let fileCount = 0;
                let subdirCount = 0;
                const extensions = new Set<string>();

                for (const file of files) {
                    const filePath = path.join(dir, file);
                    const stat = fs.statSync(filePath);

                    if (stat.isDirectory()) {
                        const basename = path.basename(filePath);

                        // Skip ignored directories
                        const shouldIgnore = this.ignorePaths.some(pattern =>
                            basename === pattern || basename.startsWith('.')
                        );

                        if (!shouldIgnore) {
                            subdirCount++;
                            walk(filePath, depth + 1);
                        }
                    } else {
                        const ext = path.extname(filePath);
                        if (sourceExtensions.includes(ext)) {
                            fileCount++;
                            extensions.add(ext);
                        }
                    }
                }

                if (fileCount > 0 || subdirCount > 0) {
                    const relativePath = path.relative(this.repoPath, dir);
                    directories.push({
                        path: relativePath || '.',
                        fileCount,
                        subdirCount,
                        extensions: Array.from(extensions),
                        depth
                    });
                }
            } catch (error) {
                // Skip directories we can't read
            }
        };

        walk(this.repoPath);
        return directories;
    }

    /**
     * Ask Gemini to select important directories
     */
    private async selectImportantDirectories(
        directories: DirectoryInfo[]
    ): Promise<DirectoryAnalysis> {
        const prompt = this.buildSelectionPrompt(directories);

        try {
            // Use Flash-Lite for batch selection (high quota, 1000 RPD)
            const result = await this.selectionModel.generateContent(prompt);
            const text = result.response.text();

            // Update token count
            this.tokensUsed += Math.ceil(prompt.length / 4) + Math.ceil(text.length / 4);

            return this.parseSelectionResponse(text, directories);
        } catch (error) {
            console.error('[DirectoryAnalyzer] Error calling Gemini:', error);

            // Fallback: select top directories by file count
            const topDirs = directories
                .filter(d => d.fileCount > 5)
                .sort((a, b) => b.fileCount - a.fileCount)
                .slice(0, 10)
                .map(d => d.path);

            return {
                selectedDirectories: topDirs,
                reasoning: 'Fallback selection (Gemini unavailable)',
                architecture: 'Unknown',
                primaryLanguage: 'Unknown',
                confidence: 0.5
            };
        }
    }

    /**
     * Build prompt for directory selection
     */
    private buildSelectionPrompt(directories: DirectoryInfo[]): string {
        // Sort by file count for better visibility
        const sorted = directories
            .sort((a, b) => b.fileCount - a.fileCount)
            .slice(0, 100); // Limit to top 100 directories

        const dirList = sorted.map(d =>
            `- ${d.path} (${d.fileCount} files, ${d.subdirCount} subdirs, extensions: ${d.extensions.join(', ')})`
        ).join('\n');

        return `You are analyzing a codebase repository structure. Your task is to:
1. Identify the architecture pattern (e.g., Clean Architecture, MVC, Feature-first, etc.)
2. Detect the primary programming language
3. Select the MOST IMPORTANT directories for detailed analysis (max 15 directories)

Focus on directories that:
- Contain core business logic
- Define the application architecture
- Have significant code complexity
- Are NOT generated/build files
- Are NOT test-only directories

Repository directory structure:
${dirList}

Respond in JSON format:
{
  "selectedDirectories": ["dir1", "dir2", ...],
  "reasoning": "Brief explanation of why these directories were chosen",
  "architecture": "Detected architecture pattern",
  "primaryLanguage": "Main programming language",
  "confidence": 0.95
}

IMPORTANT: 
- Select 10-15 directories maximum
- Prioritize directories with business logic over utilities
- Avoid selecting both parent and child if parent is sufficient`;
    }

    /**
     * Parse Gemini's selection response
     */
    private parseSelectionResponse(
        text: string,
        directories: DirectoryInfo[]
    ): DirectoryAnalysis {
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            // Validate selected directories exist
            const validDirs = parsed.selectedDirectories.filter((dir: string) =>
                directories.some(d => d.path === dir)
            );

            return {
                selectedDirectories: validDirs,
                reasoning: parsed.reasoning || 'No reasoning provided',
                architecture: parsed.architecture || 'Unknown',
                primaryLanguage: parsed.primaryLanguage || 'Unknown',
                confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8
            };
        } catch (error) {
            console.error('[DirectoryAnalyzer] Error parsing response:', error);

            // Fallback
            return {
                selectedDirectories: directories.slice(0, 10).map(d => d.path),
                reasoning: 'Parse error - using fallback',
                architecture: 'Unknown',
                primaryLanguage: 'Unknown',
                confidence: 0.5
            };
        }
    }

    /**
     * Deep analyze a specific directory
     */
    private async deepAnalyzeDirectory(
        directory: string,
        context: DirectoryAnalysis
    ): Promise<DeepDirectoryAnalysis | null> {
        const fullPath = path.join(this.repoPath, directory);

        // Get file list
        const files = this.getFilesInDirectory(fullPath);
        if (files.length === 0) return null;

        const prompt = this.buildDeepAnalysisPrompt(directory, files, context);

        // Retry logic for 503 errors (Gemini overloaded)
        let lastError: any;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                // Use Flash for deep source analysis (better quality, 250 RPD)
                const result = await this.analysisModel.generateContent(prompt);
                const text = result.response.text();

                this.tokensUsed += Math.ceil(prompt.length / 4) + Math.ceil(text.length / 4);

                return this.parseDeepAnalysisResponse(text, directory);
            } catch (error: any) {
                lastError = error;

                // If 503 (overloaded), retry with exponential backoff
                if (error?.message?.includes('503')) {
                    const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                    console.warn(`[DirectoryAnalyzer] 503 error analyzing ${directory}, retry ${attempt}/3 after ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                // Other errors: fail immediately
                break;
            }
        }

        console.error(`[DirectoryAnalyzer] Failed analyzing ${directory} after 3 attempts:`, lastError);
        return null;
    }

    /**
     * Get files in directory (non-recursive)
     */
    private getFilesInDirectory(dir: string): string[] {
        const files: string[] = [];

        try {
            const entries = fs.readdirSync(dir);
            for (const entry of entries) {
                const fullPath = path.join(dir, entry);
                const stat = fs.statSync(fullPath);

                if (stat.isFile() && !entry.startsWith('.')) {
                    files.push(entry);
                }
            }
        } catch (error) {
            // Skip unreadable directories
        }

        return files;
    }

    /**
     * Build prompt for deep directory analysis
     */
    private buildDeepAnalysisPrompt(
        directory: string,
        files: string[],
        context: DirectoryAnalysis
    ): string {
        // Smart file selection: prioritize key files, then sample rest
        const keyExtensions = new Set(['.dart', '.ts', '.js', '.py', '.java', '.swift', '.kt']);
        const keyFiles = files.filter(f => keyExtensions.has(path.extname(f)));
        const otherFiles = files.filter(f => !keyExtensions.has(path.extname(f)));

        // Take up to 20 key files + 10 other files
        const selectedFiles = [
            ...keyFiles.slice(0, 20),
            ...otherFiles.slice(0, 10)
        ];

        const fileList = selectedFiles.join('\n- ');
        const totalFiles = files.length;
        const truncated = totalFiles > selectedFiles.length ? ` (showing ${selectedFiles.length}/${totalFiles})` : '';

        return `You are analyzing a specific directory in a ${context.primaryLanguage} codebase with ${context.architecture} architecture.

Directory: ${directory}
Files in this directory${truncated}:
- ${fileList}

Analyze this directory and provide:
1. Purpose: What this directory does (1-2 sentences)
2. Key files: Most important files (max 5)
3. Patterns: Code patterns or conventions used
4. Dependencies: Related directories this depends on
5. Complexity: low/medium/high
6. Tags: Relevant tags for categorization

Respond in JSON format:
{
  "purpose": "Clear description of directory purpose",
  "keyFiles": ["file1.dart", "file2.dart"],
  "patterns": ["pattern1", "pattern2"],
  "dependencies": ["../other_dir"],
  "complexity": "medium",
  "tags": ["tag1", "tag2"]
}`;
    }

    /**
     * Parse deep analysis response
     */
    private parseDeepAnalysisResponse(
        text: string,
        directory: string
    ): DeepDirectoryAnalysis | null {
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            return {
                directory,
                purpose: parsed.purpose || 'Unknown purpose',
                keyFiles: Array.isArray(parsed.keyFiles) ? parsed.keyFiles : [],
                patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
                dependencies: Array.isArray(parsed.dependencies) ? parsed.dependencies : [],
                complexity: parsed.complexity || 'medium',
                tags: Array.isArray(parsed.tags) ? parsed.tags : []
            };
        } catch (error) {
            console.error('[DirectoryAnalyzer] Parse error:', error);
            return null;
        }
    }

    /**
     * Convert analyses to memory entities
     */
    private toMemoryEntities(
        directoryAnalysis: DirectoryAnalysis,
        deepAnalyses: DeepDirectoryAnalysis[]
    ): MemoryEntity[] {
        const entities: MemoryEntity[] = [];
        const now = Date.now();

        // Entity 1: Overall architecture
        entities.push({
            name: 'codebase_architecture',
            entityType: 'Architecture',
            observations: [
                `Architecture pattern: ${directoryAnalysis.architecture}`,
                `Primary language: ${directoryAnalysis.primaryLanguage}`,
                `Reasoning: ${directoryAnalysis.reasoning}`,
                `Analysis confidence: ${(directoryAnalysis.confidence * 100).toFixed(1)}%`,
                `Key directories: ${directoryAnalysis.selectedDirectories.length} identified`
            ],
            tags: [
                directoryAnalysis.architecture.toLowerCase().replace(/\s+/g, '_'),
                directoryAnalysis.primaryLanguage.toLowerCase(),
                'architecture',
                'ai_analyzed'
            ],
            createdAt: now,
            updatedAt: now
        });

        // Entity 2-N: Each analyzed directory
        deepAnalyses.forEach(analysis => {
            const dirName = analysis.directory.replace(/[\/\\]/g, '_').toLowerCase();

            entities.push({
                name: `directory_${dirName}`,
                entityType: 'Directory',
                observations: [
                    `Purpose: ${analysis.purpose}`,
                    `Complexity: ${analysis.complexity}`,
                    `Key files: ${analysis.keyFiles.join(', ')}`,
                    `Patterns: ${analysis.patterns.join(', ')}`,
                    ...(analysis.dependencies.length > 0
                        ? [`Dependencies: ${analysis.dependencies.join(', ')}`]
                        : []
                    )
                ],
                relatedFiles: analysis.keyFiles.map(f =>
                    path.join(analysis.directory, f)
                ),
                dependencies: analysis.dependencies,
                tags: [
                    ...analysis.tags,
                    analysis.complexity,
                    'directory_analysis',
                    'ai_analyzed'
                ],
                createdAt: now,
                updatedAt: now
            });
        });

        return entities;
    }

    /**
     * Get token usage stats
     */
    getTokenStats(): { used: number; budget: number; remaining: number } {
        return {
            used: this.tokensUsed,
            budget: this.tokenBudget,
            remaining: Math.max(0, this.tokenBudget - this.tokensUsed)
        };
    }
}
