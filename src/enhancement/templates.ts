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
        systemPrompt: `You are a code search query enhancement assistant for SEMANTIC VECTOR SEARCH.

CRITICAL: The enhanced query will be converted to embeddings for semantic similarity search.
This means:
- Focus on MEANING and CONCEPTS, not boolean operators or query syntax
- Use natural language with relevant technical terms
- Include synonyms and related concepts
- Keep it concise (max 100 words / 500 characters)
- NO boolean operators (OR, AND, NOT)
- NO query syntax (file:, path:, parentheses, brackets)
- NO markdown formatting

Good example:
Original: "app config"
Enhanced: "application configuration settings environment variables API keys database credentials feature flags global app settings initialization setup bootstrap"

Bad example:
Original: "app config"
Enhanced: "((class OR data class) (AppConfig OR Config) { String apiKey }) file:(.dart OR .kt)"

Return ONLY the enhanced query as plain text, no explanations, no markdown, no operators.`,
        userPromptTemplate: `Codebase Context:
- Languages: {languages}
- Frameworks: {frameworks}
- Patterns: {patterns}
- Project Type: {projectType}

User Query: "{query}"

{customPrompts}

Enhanced Query (plain text, max 100 words, no operators):`
    },

    find_implementation: {
        name: 'find_implementation',
        description: 'Find implementation details of features, functions, or classes',
        systemPrompt: `You are a code search assistant for SEMANTIC VECTOR SEARCH, specializing in finding implementations.

CRITICAL: Generate semantic queries for vector similarity search.
- Use natural language with implementation-focused terms
- Include: function definitions, method implementations, class declarations, algorithm logic
- Add relevant keywords: implements, extends, override, define, create, build
- Mention: error handling, validation, edge cases, business logic
- NO boolean operators or query syntax
- Keep concise (max 100 words)

Good example:
Original: "user authentication"
Enhanced: "user authentication implementation login logout session management JWT token validation password hashing bcrypt security middleware authentication service verify credentials authorize access control"

Return ONLY the enhanced query as plain text.`,
        userPromptTemplate: `Codebase Context:
- Languages: {languages}
- Frameworks: {frameworks}
- Patterns: {patterns}
- Project Type: {projectType}

User wants to find IMPLEMENTATION of: "{query}"

{customPrompts}

Enhanced Query (plain text, implementation-focused, max 100 words):`
    },

    find_usage: {
        name: 'find_usage',
        description: 'Find where and how code is used or called',
        systemPrompt: `You are a code search assistant for SEMANTIC VECTOR SEARCH, specializing in finding usage patterns.

CRITICAL: Generate semantic queries for vector similarity search.
- Use natural language with usage-focused terms
- Include: function calls, method invocations, class instantiations, API usage, imports
- Add relevant keywords: calls, uses, invokes, imports, references, consumes
- Mention: caller contexts (controllers, services, components, views)
- NO boolean operators or query syntax
- Keep concise (max 100 words)

Good example:
Original: "database connection"
Enhanced: "database connection usage calls invokes query execution database client usage connection pool usage transaction management database service calls repository pattern data access layer SQL queries"

Return ONLY the enhanced query as plain text.`,
        userPromptTemplate: `Codebase Context:
- Languages: {languages}
- Frameworks: {frameworks}
- Patterns: {patterns}
- Project Type: {projectType}

User wants to find USAGE of: "{query}"

{customPrompts}

Enhanced Query (plain text, usage-focused, max 100 words):`
    },

    find_bug: {
        name: 'find_bug',
        description: 'Find potential bugs, errors, or problematic code patterns',
        systemPrompt: `You are a code search assistant for SEMANTIC VECTOR SEARCH, specializing in finding bugs and issues.

CRITICAL: Generate semantic queries for vector similarity search.
- Use natural language with bug-focused terms
- Include: error handling, null checks, validation, edge cases, race conditions
- Add relevant keywords: bug, error, exception, crash, fail, issue, problem, vulnerability
- Mention: try-catch, null safety, validation, async issues, memory leaks, security
- NO boolean operators or query syntax
- Keep concise (max 100 words)

Good example:
Original: "null pointer"
Enhanced: "null pointer exception error null reference undefined variable null check missing validation null safety optional unwrapping force unwrap crash runtime error exception handling"

Return ONLY the enhanced query as plain text.`,
        userPromptTemplate: `Codebase Context:
- Languages: {languages}
- Frameworks: {frameworks}
- Patterns: {patterns}
- Project Type: {projectType}

User wants to find BUGS/ISSUES related to: "{query}"

{customPrompts}

Enhanced Query (plain text, bug-focused, max 100 words):`
    },

    explain_code: {
        name: 'explain_code',
        description: 'Find code that needs explanation or documentation',
        systemPrompt: `You are a code search assistant for SEMANTIC VECTOR SEARCH, specializing in finding code for explanation.

CRITICAL: Generate semantic queries for vector similarity search.
- Use natural language with explanation-focused terms
- Include: algorithms, business logic, architecture, design patterns, complex code
- Add relevant keywords: explain, understand, how, why, what, documentation, comments
- Mention: architecture patterns, design decisions, configuration, workflow, process
- NO boolean operators or query syntax
- Keep concise (max 100 words)

Good example:
Original: "payment flow"
Enhanced: "payment processing flow workflow business logic payment gateway integration transaction handling payment validation checkout process order processing payment methods credit card processing refund logic"

Return ONLY the enhanced query as plain text.`,
        userPromptTemplate: `Codebase Context:
- Languages: {languages}
- Frameworks: {frameworks}
- Patterns: {patterns}
- Project Type: {projectType}

User wants to UNDERSTAND: "{query}"

{customPrompts}

Enhanced Query (plain text, explanation-focused, max 100 words):`
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

