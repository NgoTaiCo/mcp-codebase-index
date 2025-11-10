// src/enhancement/templates.ts
import { EnhancementTemplate } from '../types/index.js';

/**
 * Built-in prompt enhancement templates
 * These templates guide Gemini to enhance user queries with codebase context
 */
export const BUILTIN_TEMPLATES: Record<string, EnhancementTemplate> = {
    general: {
        name: 'general',
        description: 'General purpose query enhancement for any search intent',
        systemPrompt: `You are a code search query enhancement assistant. Your task is to improve user queries by adding relevant technical context from their codebase.

Guidelines:
- Expand vague queries with specific technical terms
- Add relevant programming languages, frameworks, and patterns
- Include common implementation details (error handling, validation, etc.)
- Keep the enhanced query concise and focused
- Return ONLY the enhanced query, no explanations or markdown`,
        userPromptTemplate: `Codebase Context:
- Languages: {languages}
- Frameworks: {frameworks}
- Patterns: {patterns}
- Project Type: {projectType}

User Query: "{query}"

{customPrompts}

Enhanced Query:`
    },

    find_implementation: {
        name: 'find_implementation',
        description: 'Find implementation details of features, functions, or classes',
        systemPrompt: `You are a code search assistant specializing in finding implementations. Enhance queries to find specific code implementations including:
- Function/method definitions
- Class implementations
- Algorithm logic
- Business logic
- API implementations

Guidelines:
- Focus on WHERE and HOW the code is implemented
- Include file types, class names, function signatures
- Add implementation-specific keywords (implements, extends, override)
- Mention error handling, validation, edge cases
- Return ONLY the enhanced query, no explanations`,
        userPromptTemplate: `Codebase Context:
- Languages: {languages}
- Frameworks: {frameworks}
- Patterns: {patterns}
- Project Type: {projectType}

User wants to find IMPLEMENTATION of: "{query}"

{customPrompts}

Enhanced Query:`
    },

    find_usage: {
        name: 'find_usage',
        description: 'Find where and how code is used or called',
        systemPrompt: `You are a code search assistant specializing in finding usage patterns. Enhance queries to find:
- Function/method calls
- Class instantiations
- API usage
- Library usage
- Variable references

Guidelines:
- Focus on WHERE the code is USED/CALLED
- Include caller contexts (controllers, services, components)
- Add usage-specific keywords (calls, uses, invokes, imports)
- Mention common usage patterns
- Return ONLY the enhanced query, no explanations`,
        userPromptTemplate: `Codebase Context:
- Languages: {languages}
- Frameworks: {frameworks}
- Patterns: {patterns}
- Project Type: {projectType}

User wants to find USAGE of: "{query}"

{customPrompts}

Enhanced Query:`
    },

    find_bug: {
        name: 'find_bug',
        description: 'Find potential bugs, errors, or problematic code patterns',
        systemPrompt: `You are a code search assistant specializing in finding bugs and issues. Enhance queries to find:
- Error-prone code patterns
- Missing error handling
- Potential null/undefined issues
- Race conditions
- Memory leaks
- Security vulnerabilities

Guidelines:
- Focus on problematic patterns and anti-patterns
- Include error-related keywords (try-catch, null check, validation)
- Mention common bug sources (async issues, state management)
- Add language-specific bug patterns
- Return ONLY the enhanced query, no explanations`,
        userPromptTemplate: `Codebase Context:
- Languages: {languages}
- Frameworks: {frameworks}
- Patterns: {patterns}
- Project Type: {projectType}

User wants to find BUGS/ISSUES related to: "{query}"

{customPrompts}

Enhanced Query:`
    },

    explain_code: {
        name: 'explain_code',
        description: 'Find code that needs explanation or documentation',
        systemPrompt: `You are a code search assistant specializing in finding code for explanation. Enhance queries to find:
- Complex algorithms
- Business logic
- Architecture patterns
- Design decisions
- Configuration code

Guidelines:
- Focus on code that requires understanding
- Include architectural keywords (pattern, design, structure)
- Mention documentation-worthy aspects (why, how, what)
- Add complexity indicators (algorithm, logic, flow)
- Return ONLY the enhanced query, no explanations`,
        userPromptTemplate: `Codebase Context:
- Languages: {languages}
- Frameworks: {frameworks}
- Patterns: {patterns}
- Project Type: {projectType}

User wants to UNDERSTAND: "{query}"

{customPrompts}

Enhanced Query:`
    }
};

/**
 * Get template by name, fallback to general if not found
 */
export function getTemplate(templateName?: string): EnhancementTemplate {
    if (!templateName || !BUILTIN_TEMPLATES[templateName]) {
        return BUILTIN_TEMPLATES.general;
    }
    return BUILTIN_TEMPLATES[templateName];
}

/**
 * List all available templates
 */
export function listTemplates(): string[] {
    return Object.keys(BUILTIN_TEMPLATES);
}

/**
 * Format template with context and query
 */
export function formatTemplate(
    template: EnhancementTemplate,
    context: {
        languages: string;
        frameworks: string;
        patterns: string;
        projectType: string;
        query: string;
        customPrompts: string;
    }
): { systemPrompt: string; userPrompt: string } {
    const userPrompt = template.userPromptTemplate
        .replace('{languages}', context.languages)
        .replace('{frameworks}', context.frameworks)
        .replace('{patterns}', context.patterns)
        .replace('{projectType}', context.projectType)
        .replace('{query}', context.query)
        .replace('{customPrompts}', context.customPrompts);

    return {
        systemPrompt: template.systemPrompt,
        userPrompt
    };
}

