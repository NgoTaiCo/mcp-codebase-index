/**
 * AST Parser for Bootstrap System
 * Extracts components, functions, classes from TypeScript/JavaScript files
 * 
 * Phase 1 of Bootstrap: Fast extraction without AI (0 tokens)
 * 
 * Based on MEMORY_OPTIMIZATION_PLAN.md Section 11
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import type { MemoryEntity } from '../../src/memory/types.js';

/**
 * Extracted code element from AST
 */
export interface CodeElement {
    name: string;
    type: 'class' | 'function' | 'interface' | 'enum' | 'type' | 'component';
    filePath: string;
    startLine: number;
    endLine: number;
    exported: boolean;
    dependencies: string[];
    description?: string;
}

/**
 * AST Parser result
 */
export interface ASTParseResult {
    elements: CodeElement[];
    imports: string[];
    exports: string[];
    totalLines: number;
}

/**
 * AST Parser for extracting code structure
 */
export class ASTParser {
    private fileCache: Map<string, ASTParseResult> = new Map();

    /**
     * Parse a TypeScript/JavaScript file and extract code elements
     */
    parseFile(filePath: string): ASTParseResult {
        // Check cache
        if (this.fileCache.has(filePath)) {
            return this.fileCache.get(filePath)!;
        }

        const result: ASTParseResult = {
            elements: [],
            imports: [],
            exports: [],
            totalLines: 0
        };

        try {
            // Read file
            const sourceCode = fs.readFileSync(filePath, 'utf-8');
            result.totalLines = sourceCode.split('\n').length;

            // Create source file
            const sourceFile = ts.createSourceFile(
                filePath,
                sourceCode,
                ts.ScriptTarget.Latest,
                true
            );

            // Visit nodes
            this.visitNode(sourceFile, filePath, result);

            // Cache result
            this.fileCache.set(filePath, result);

            return result;
        } catch (error) {
            console.error(`[ASTParser] Error parsing ${filePath}:`, error);
            return result;
        }
    }

    /**
     * Detect primary programming language of the project
     */
    detectPrimaryLanguage(dirPath: string): string {
        const languageExtensions: Record<string, string[]> = {
            'TypeScript': ['.ts', '.tsx'],
            'JavaScript': ['.js', '.jsx'],
            'Dart': ['.dart'],
            'Python': ['.py'],
            'Go': ['.go'],
            'Rust': ['.rs'],
            'Java': ['.java'],
            'Kotlin': ['.kt'],
            'Swift': ['.swift'],
            'C++': ['.cpp', '.cc', '.cxx'],
            'C': ['.c'],
            'C#': ['.cs'],
            'Ruby': ['.rb'],
            'PHP': ['.php']
        };

        const skipDirs = [
            'node_modules', 'dist', 'build', '.git', 'coverage',
            '.dart_tool', '.pub-cache', 'android', 'ios', 'web',
            'windows', 'linux', 'macos', '.gradle', '.idea',
            'out', 'target', 'bin', 'obj', '.vs'
        ];

        const fileCounts: Record<string, number> = {};

        const walkDir = (currentPath: string) => {
            try {
                const files = fs.readdirSync(currentPath);

                for (const file of files) {
                    const filePath = path.join(currentPath, file);
                    const stat = fs.statSync(filePath);

                    if (stat.isDirectory()) {
                        if (!skipDirs.includes(file)) {
                            walkDir(filePath);
                        }
                    } else {
                        const ext = path.extname(file);
                        for (const [lang, exts] of Object.entries(languageExtensions)) {
                            if (exts.includes(ext)) {
                                fileCounts[lang] = (fileCounts[lang] || 0) + 1;
                                break;
                            }
                        }
                    }
                }
            } catch (error) {
                // Ignore errors
            }
        };

        walkDir(dirPath);

        // Find language with most files
        let primaryLanguage = 'Unknown';
        let maxCount = 0;

        for (const [lang, count] of Object.entries(fileCounts)) {
            if (count > maxCount) {
                maxCount = count;
                primaryLanguage = lang;
            }
        }

        return primaryLanguage;
    }

    /**
     * Check if directory contains TypeScript/JavaScript files
     */
    hasTypeScriptFiles(dirPath: string): boolean {
        const extensions = ['.ts', '.tsx', '.js', '.jsx'];
        let hasFiles = false;

        // Directories to skip (common build/generated code)
        const skipDirs = [
            'node_modules',
            'dist',
            'build',
            '.git',
            'coverage',
            '.dart_tool',
            '.pub-cache',
            'android',
            'ios',
            'web',
            'windows',
            'linux',
            'macos',
            '.gradle',
            '.idea',
            'out',
            'target',
            'bin',
            'obj',
            '.vs'
        ];

        const walkDir = (currentPath: string): boolean => {
            if (hasFiles) return true; // Early exit

            try {
                const files = fs.readdirSync(currentPath);

                for (const file of files) {
                    const filePath = path.join(currentPath, file);
                    const stat = fs.statSync(filePath);

                    if (stat.isDirectory()) {
                        // Skip common build/generated directories
                        if (!skipDirs.includes(file)) {
                            if (walkDir(filePath)) {
                                return true;
                            }
                        }
                    } else if (extensions.some(ext => file.endsWith(ext))) {
                        hasFiles = true;
                        return true;
                    }
                }
            } catch (error) {
                // Ignore errors (permission denied, etc.)
                return false;
            }

            return false;
        };

        walkDir(dirPath);
        return hasFiles;
    }

    /**
     * Parse multiple files in a directory
     */
    parseDirectory(dirPath: string, extensions: string[] = ['.ts', '.tsx', '.js', '.jsx']): ASTParseResult[] {
        const results: ASTParseResult[] = [];

        // Directories to skip (common build/generated code)
        const skipDirs = [
            'node_modules',
            'dist',
            'build',
            '.git',
            'coverage',
            '.dart_tool',
            '.pub-cache',
            'android',
            'ios',
            'web',
            'windows',
            'linux',
            'macos',
            '.gradle',
            '.idea',
            'out',
            'target',
            'bin',
            'obj',
            '.vs'
        ];

        const walkDir = (currentPath: string) => {
            const files = fs.readdirSync(currentPath);

            for (const file of files) {
                const filePath = path.join(currentPath, file);
                const stat = fs.statSync(filePath);

                if (stat.isDirectory()) {
                    // Skip common build/generated directories
                    if (!skipDirs.includes(file)) {
                        walkDir(filePath);
                    }
                } else if (extensions.some(ext => file.endsWith(ext))) {
                    const result = this.parseFile(filePath);
                    if (result.elements.length > 0) {
                        results.push(result);
                    }
                }
            }
        };

        walkDir(dirPath);
        return results;
    }

    /**
     * Convert parsed elements to memory entities
     */
    toMemoryEntities(results: ASTParseResult[]): MemoryEntity[] {
        const entities: MemoryEntity[] = [];
        const now = Date.now();

        for (const result of results) {
            for (const element of result.elements) {
                const entity: MemoryEntity = {
                    name: `${element.type}_${element.name}_${path.basename(element.filePath, path.extname(element.filePath))}`.toLowerCase(),
                    entityType: this.mapElementTypeToEntityType(element.type),
                    observations: [
                        `${element.type === 'component' ? 'React component' : element.type.charAt(0).toUpperCase() + element.type.slice(1)} "${element.name}" defined in ${path.basename(element.filePath)}`,
                        `Location: lines ${element.startLine}-${element.endLine}`,
                        element.exported ? 'Exported (public API)' : 'Internal (not exported)',
                        ...(element.description ? [element.description] : [])
                    ],
                    relatedFiles: [element.filePath],
                    relatedComponents: [element.name],
                    dependencies: element.dependencies.length > 0 ? element.dependencies : undefined,
                    tags: [
                        element.type,
                        element.exported ? 'exported' : 'internal',
                        path.extname(element.filePath).substring(1) // ts, tsx, js, jsx
                    ],
                    createdAt: now,
                    updatedAt: now
                };

                entities.push(entity);
            }
        }

        return entities;
    }

    /**
     * Get statistics from parsed results
     */
    getStats(results: ASTParseResult[]): {
        totalFiles: number;
        totalElements: number;
        byType: Record<string, number>;
        totalLines: number;
        avgElementsPerFile: number;
    } {
        const stats = {
            totalFiles: results.length,
            totalElements: 0,
            byType: {} as Record<string, number>,
            totalLines: 0,
            avgElementsPerFile: 0
        };

        for (const result of results) {
            stats.totalElements += result.elements.length;
            stats.totalLines += result.totalLines;

            for (const element of result.elements) {
                stats.byType[element.type] = (stats.byType[element.type] || 0) + 1;
            }
        }

        stats.avgElementsPerFile = stats.totalFiles > 0
            ? Math.round(stats.totalElements / stats.totalFiles * 10) / 10
            : 0;

        return stats;
    }

    /**
     * Visit AST node recursively
     */
    private visitNode(node: ts.Node, filePath: string, result: ASTParseResult) {
        // Check for imports
        if (ts.isImportDeclaration(node)) {
            const importPath = (node.moduleSpecifier as ts.StringLiteral).text;
            result.imports.push(importPath);
        }

        // Check for exports
        if (ts.canHaveModifiers(node)) {
            const modifiers = ts.getModifiers(node);
            if (modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
                result.exports.push(this.getNodeName(node) || 'default');
            }
        }

        // Extract elements
        const element = this.extractElement(node, filePath);
        if (element) {
            result.elements.push(element);
        }

        // Visit children
        ts.forEachChild(node, child => this.visitNode(child, filePath, result));
    }

    /**
     * Extract code element from AST node
     */
    private extractElement(node: ts.Node, filePath: string): CodeElement | null {
        const sourceFile = node.getSourceFile();
        const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

        const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
        const isExported = modifiers?.some(m =>
            m.kind === ts.SyntaxKind.ExportKeyword ||
            m.kind === ts.SyntaxKind.DefaultKeyword
        ) || false;

        // Class declaration
        if (ts.isClassDeclaration(node) && node.name) {
            return {
                name: node.name.text,
                type: this.isReactComponent(node) ? 'component' : 'class',
                filePath,
                startLine: startLine + 1,
                endLine: endLine + 1,
                exported: isExported,
                dependencies: this.extractDependencies(node),
                description: this.extractJSDocDescription(node)
            };
        }

        // Function declaration
        if (ts.isFunctionDeclaration(node) && node.name) {
            return {
                name: node.name.text,
                type: this.isReactComponent(node) ? 'component' : 'function',
                filePath,
                startLine: startLine + 1,
                endLine: endLine + 1,
                exported: isExported,
                dependencies: this.extractDependencies(node),
                description: this.extractJSDocDescription(node)
            };
        }

        // Arrow function (variable declaration)
        if (ts.isVariableStatement(node)) {
            const declaration = node.declarationList.declarations[0];
            if (declaration?.initializer &&
                (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))) {
                const name = (declaration.name as ts.Identifier).text;
                return {
                    name,
                    type: this.isReactComponent(declaration.initializer) ? 'component' : 'function',
                    filePath,
                    startLine: startLine + 1,
                    endLine: endLine + 1,
                    exported: isExported,
                    dependencies: this.extractDependencies(declaration.initializer),
                    description: this.extractJSDocDescription(node)
                };
            }
        }

        // Interface declaration
        if (ts.isInterfaceDeclaration(node)) {
            return {
                name: node.name.text,
                type: 'interface',
                filePath,
                startLine: startLine + 1,
                endLine: endLine + 1,
                exported: isExported,
                dependencies: [],
                description: this.extractJSDocDescription(node)
            };
        }

        // Type alias
        if (ts.isTypeAliasDeclaration(node)) {
            return {
                name: node.name.text,
                type: 'type',
                filePath,
                startLine: startLine + 1,
                endLine: endLine + 1,
                exported: isExported,
                dependencies: [],
                description: this.extractJSDocDescription(node)
            };
        }

        // Enum declaration
        if (ts.isEnumDeclaration(node)) {
            return {
                name: node.name.text,
                type: 'enum',
                filePath,
                startLine: startLine + 1,
                endLine: endLine + 1,
                exported: isExported,
                dependencies: [],
                description: this.extractJSDocDescription(node)
            };
        }

        return null;
    }

    /**
     * Check if node is a React component
     */
    private isReactComponent(node: ts.Node): boolean {
        const text = node.getText();

        // Check for JSX return
        if (text.includes('return') && (text.includes('<') && text.includes('/>'))) {
            return true;
        }

        // Check for React.FC, React.Component
        if (text.includes('React.FC') || text.includes('React.Component')) {
            return true;
        }

        return false;
    }

    /**
     * Extract dependencies from node (imports used in the code)
     */
    private extractDependencies(node: ts.Node): string[] {
        const dependencies: Set<string> = new Set();
        const text = node.getText();

        // Simple heuristic: look for common import patterns
        const importMatches = text.match(/from ['"]([^'"]+)['"]/g);
        if (importMatches) {
            importMatches.forEach(match => {
                const dep = match.match(/from ['"]([^'"]+)['"]/)?.[1];
                if (dep && !dep.startsWith('.')) {
                    // Only external dependencies (not relative imports)
                    dependencies.add(dep.split('/')[0]); // Get package name
                }
            });
        }

        return Array.from(dependencies);
    }

    /**
     * Extract JSDoc description
     */
    private extractJSDocDescription(node: ts.Node): string | undefined {
        const jsDocTags = (node as any).jsDoc;
        if (jsDocTags && jsDocTags.length > 0) {
            const comment = jsDocTags[0].comment;
            if (typeof comment === 'string') {
                return comment.split('\n')[0]; // First line only
            }
        }
        return undefined;
    }

    /**
     * Get node name (for exports)
     */
    private getNodeName(node: ts.Node): string | null {
        if (ts.isClassDeclaration(node) || ts.isFunctionDeclaration(node) ||
            ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) ||
            ts.isEnumDeclaration(node)) {
            return node.name?.getText() || null;
        }
        return null;
    }

    /**
     * Map element type to entity type
     */
    private mapElementTypeToEntityType(elementType: string): string {
        const mapping: Record<string, string> = {
            'class': 'Component',
            'function': 'Function',
            'component': 'Component',
            'interface': 'Type',
            'type': 'Type',
            'enum': 'Type'
        };
        return mapping[elementType] || 'Component';
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.fileCache.clear();
    }
}
