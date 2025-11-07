// src/indexer.ts
import * as fs from 'fs';
import * as path from 'path';
import { CodeChunk } from './types.js';

export class CodeIndexer {
    constructor(private repoPath: string) { }

    /**
     * Parse file and extract chunks
     */
    async parseFile(filePath: string): Promise<CodeChunk[]> {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const language = this.detectLanguage(filePath);

            // For now, use simple line-based chunking
            // In production, use proper AST parsing per language
            const chunks = this.chunkByStructure(content, filePath, language);
            
            // Split chunks that are too large (Gemini limit is 36KB, we use 20KB to be safe)
            return this.splitLargeChunks(chunks);
        } catch (error) {
            console.error(`Error parsing ${filePath}:`, error);
            return [];
        }
    }

    /**
     * Split chunks that exceed size limit
     */
    private splitLargeChunks(chunks: CodeChunk[]): CodeChunk[] {
        const MAX_CHUNK_SIZE = 20000; // 20KB (safe limit, Gemini allows 36KB)
        const result: CodeChunk[] = [];

        for (const chunk of chunks) {
            const size = Buffer.byteLength(chunk.content, 'utf-8');
            
            if (size <= MAX_CHUNK_SIZE) {
                result.push(chunk);
                continue;
            }

            // Split large chunk into smaller pieces
            const lines = chunk.content.split('\n');
            const linesPerChunk = Math.ceil(lines.length / Math.ceil(size / MAX_CHUNK_SIZE));
            
            for (let i = 0; i < lines.length; i += linesPerChunk) {
                const subLines = lines.slice(i, i + linesPerChunk);
                const subContent = subLines.join('\n');
                
                result.push({
                    ...chunk,
                    id: `${chunk.id}_part${Math.floor(i / linesPerChunk)}`,
                    content: subContent,
                    startLine: chunk.startLine + i,
                    endLine: chunk.startLine + i + subLines.length,
                    complexity: this.estimateComplexity(subContent)
                });
            }
        }

        return result;
    }

    private detectLanguage(filePath: string): string {
        const ext = path.extname(filePath);
        const langMap: Record<string, string> = {
            '.py': 'python',
            '.js': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.jsx': 'javascript',
            '.java': 'java',
            '.go': 'go',
            '.rs': 'rust',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp',
            '.rb': 'ruby',
            '.php': 'php',
            '.swift': 'swift',
            '.kt': 'kotlin',
            '.dart': 'dart',
            '.vue': 'vue',
            '.svelte': 'svelte'
        };
        return langMap[ext] || 'unknown';
    }

    /**
     * Simple chunking strategy: split by functions/classes
     * For production, integrate with proper language-specific parsers
     */
    private chunkByStructure(
        content: string,
        filePath: string,
        language: string
    ): CodeChunk[] {
        const chunks: CodeChunk[] = [];
        const lines = content.split('\n');

        let currentChunk = '';
        let startLine = 0;
        let chunkId = 0;

        // Regex patterns for function/class detection
        const patterns = this.getPatterns(language);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Check if line starts a new function/class
            const matches = patterns.functionPattern.exec(line) ||
                patterns.classPattern.exec(line);

            if (matches && currentChunk.trim()) {
                // Save previous chunk
                const chunk: CodeChunk = {
                    id: `${filePath}:${startLine}:${chunkId++}`,
                    content: currentChunk,
                    type: 'function',
                    name: this.extractName(currentChunk, language),
                    filePath: path.relative(this.repoPath, filePath),
                    startLine,
                    endLine: i,
                    language,
                    imports: this.extractImports(content),
                    complexity: this.estimateComplexity(currentChunk)
                };
                chunks.push(chunk);

                currentChunk = line;
                startLine = i;
            } else {
                currentChunk += (currentChunk ? '\n' : '') + line;
            }
        }

        // Save last chunk
        if (currentChunk.trim()) {
            chunks.push({
                id: `${filePath}:${startLine}:${chunkId}`,
                content: currentChunk,
                type: 'function',
                name: this.extractName(currentChunk, language),
                filePath: path.relative(this.repoPath, filePath),
                startLine,
                endLine: lines.length,
                language,
                imports: this.extractImports(content),
                complexity: this.estimateComplexity(currentChunk)
            });
        }

        return chunks;
    }

    private getPatterns(language: string) {
        const patterns: Record<string, { functionPattern: RegExp; classPattern: RegExp }> = {
            python: {
                functionPattern: /^\s*def\s+\w+/,
                classPattern: /^\s*class\s+\w+/
            },
            typescript: {
                functionPattern: /^\s*(export\s+)?(async\s+)?function\s+\w+|^\s*\w+\s*=\s*(async\s+)?\(.*?\)\s*=>/,
                classPattern: /^\s*(export\s+)?(class|interface)\s+\w+/
            },
            javascript: {
                functionPattern: /^\s*(export\s+)?(async\s+)?function\s+\w+|^\s*\w+\s*=\s*(async\s+)?\(.*?\)\s*=>/,
                classPattern: /^\s*(export\s+)?class\s+\w+/
            },
            dart: {
                functionPattern: /^\s*(void|Future|String|int|bool|dynamic|var)\s+\w+\s*\(/,
                classPattern: /^\s*class\s+\w+/
            }
        };

        return patterns[language] || {
            functionPattern: /^\s*function\s+\w+|^\s*def\s+\w+/,
            classPattern: /^\s*class\s+\w+/
        };
    }

    private extractName(chunk: string, language: string): string {
        const lines = chunk.split('\n').slice(0, 5);

        for (const line of lines) {
            // Python
            if (language === 'python') {
                const match = /^\s*(?:def|class)\s+(\w+)/.exec(line);
                if (match) return match[1];
            }
            // TypeScript/JavaScript
            else if (language === 'typescript' || language === 'javascript') {
                let match = /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/.exec(line);
                if (match) return match[1];

                match = /^\s*(?:export\s+)?(?:class|interface)\s+(\w+)/.exec(line);
                if (match) return match[1];

                match = /^\s*(\w+)\s*=\s*(?:async\s+)?\(/.exec(line);
                if (match) return match[1];
            }
            // Dart
            else if (language === 'dart') {
                let match = /^\s*(?:void|Future|String|int|bool|dynamic|var)\s+(\w+)\s*\(/.exec(line);
                if (match) return match[1];

                match = /^\s*class\s+(\w+)/.exec(line);
                if (match) return match[1];
            }
        }

        return 'anonymous';
    }

    private extractImports(content: string): string[] {
        const imports: string[] = [];
        const lines = content.split('\n');

        for (const line of lines.slice(0, 50)) { // Check first 50 lines
            if (line.match(/^import\s|^from\s|^require\s|^using\s/)) {
                imports.push(line.trim());
            }
            if (imports.length > 0 && !line.match(/^import|^from|^require|^using|^\/\/|^#|^\s*$/)) {
                break; // Stop after imports section
            }
        }

        return imports;
    }

    private estimateComplexity(chunk: string): number {
        let score = 1;
        const ifMatches = chunk.match(/if\s*\(/g);
        const forMatches = chunk.match(/for\s*\(/g);
        const whileMatches = chunk.match(/while\s*\(/g);

        if (ifMatches) score += ifMatches.length;
        if (forMatches) score += forMatches.length * 2;
        if (whileMatches) score += whileMatches.length * 2;

        return Math.min(score, 5);
    }
}
