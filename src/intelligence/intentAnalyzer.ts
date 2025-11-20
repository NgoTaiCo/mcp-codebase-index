/**
 * Intent Analyzer - Gemini Flash 2.5 Integration
 * Analyzes user queries to extract structured intent
 * Supports multilingual queries (Vietnamese, English, Chinese, Mixed)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';
import type {
    Intent,
    IntentAnalysisResult,
    IntentType,
    Priority,
    Language
} from './types.js';

/**
 * Simple query patterns that don't need Gemini analysis
 */
const SIMPLE_PATTERNS = [
    /^(hi|hello|hey|chào|xin chào)/i,
    /^(thanks|thank you|cảm ơn)/i,
    /^(bye|goodbye|tạm biệt)/i,
    /^(yes|no|ok|được|không)/i,
];

/**
 * LRU Cache implementation
 */
class LRUCache<K, V> {
    private cache = new Map<K, V>();
    private maxSize: number;

    constructor(maxSize: number) {
        this.maxSize = maxSize;
    }

    get(key: K): V | undefined {
        const value = this.cache.get(key);
        if (value !== undefined) {
            // Move to end (most recently used)
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }

    set(key: K, value: V): void {
        // Delete if exists (will re-add at end)
        this.cache.delete(key);

        // Remove oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, value);
    }

    size(): number {
        return this.cache.size;
    }
}

/**
 * Intent Analyzer using Gemini Flash 2.5
 */
export class IntentAnalyzer {
    private gemini: GoogleGenerativeAI;
    private model: string;
    private cache: LRUCache<string, Intent>;

    constructor(apiKey?: string, model?: string) {
        const key = apiKey || process.env.GEMINI_API_KEY;
        if (!key) {
            throw new Error('GEMINI_API_KEY is required for Intent Analyzer');
        }

        this.gemini = new GoogleGenerativeAI(key);
        this.model = model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

        // LRU cache: max 1000 items
        this.cache = new LRUCache(1000);

        console.log(`[IntentAnalyzer] Initialized with model: ${this.model}`);
    }

    /**
     * Analyze user query to extract intent
     */
    async analyze(query: string): Promise<IntentAnalysisResult> {
        const startTime = Date.now();

        // 1. Check cache first
        const cacheKey = this.getCacheKey(query);
        const cached = this.cache.get(cacheKey);

        if (cached) {
            return {
                intent: cached,
                cached: true,
                analysis_time_ms: Date.now() - startTime
            };
        }

        // 2. Skip simple queries (no API call)
        if (this.isSimpleQuery(query)) {
            const intent = this.createSimpleIntent(query);
            this.cache.set(cacheKey, intent);

            return {
                intent,
                cached: false,
                analysis_time_ms: Date.now() - startTime
            };
        }

        // 3. Use Gemini to analyze complex queries
        const intent = await this.analyzeWithGemini(query);

        // 4. Cache result
        this.cache.set(cacheKey, intent);

        return {
            intent,
            cached: false,
            analysis_time_ms: Date.now() - startTime
        };
    }

    /**
     * Analyze query using Gemini API
     */
    private async analyzeWithGemini(query: string): Promise<Intent> {
        const model = this.gemini.getGenerativeModel({ model: this.model });

        const prompt = `You are an expert software engineering assistant. Analyze the following user query and extract structured intent.

User Query: "${query}"

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "intent": "implement_feature" | "fix_bug" | "refactor" | "question" | "other",
  "subject": "brief_snake_case_topic",
  "action": "specific action to take",
  "priority": "high" | "medium" | "low",
  "original_language": "vi" | "en" | "zh" | "mixed",
  "related": ["keyword1", "keyword2"],
  "context_needed": ["context1", "context2"],
  "success_criteria": ["criteria1", "criteria2"]
}

Guidelines:
- intent: What the user wants to do
- subject: Main topic in snake_case (e.g., "google_oauth_login")
- action: Specific action in English
- priority: Based on urgency/importance
- original_language: Detect language (vi=Vietnamese, en=English, mixed=both)
- related: Related keywords/topics
- context_needed: What context is needed (e.g., "auth_service", "oauth_config")
- success_criteria: How to know when done

Examples:
Query: "Làm tính năng đăng nhập bằng Google OAuth"
→ {
  "intent": "implement_feature",
  "subject": "google_oauth_login",
  "action": "implement Google OAuth authentication",
  "priority": "high",
  "original_language": "vi",
  "related": ["auth", "oauth", "google", "login"],
  "context_needed": ["auth_service", "oauth_config", "user_entity"],
  "success_criteria": ["users can login with Google", "tokens are stored securely"]
}

Query: "Fix memory leak in chat service"
→ {
  "intent": "fix_bug",
  "subject": "chat_service_memory_leak",
  "action": "fix memory leak in chat service",
  "priority": "high",
  "original_language": "en",
  "related": ["memory", "leak", "chat", "performance"],
  "context_needed": ["chat_service", "recent_changes"],
  "success_criteria": ["memory usage stable", "no memory growth over time"]
}

Now analyze the user query above.`;

        try {
            const result = await model.generateContent(prompt);
            const response = result.response.text();

            // Parse JSON response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Invalid JSON response from Gemini');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            // Create Intent object
            return {
                id: this.generateIntentId(),
                intent: parsed.intent as IntentType,
                subject: parsed.subject,
                action: parsed.action,
                priority: parsed.priority as Priority,
                original_language: parsed.original_language as Language,
                related: parsed.related || [],
                context_needed: parsed.context_needed || [],
                success_criteria: parsed.success_criteria || [],
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('[IntentAnalyzer] Error analyzing with Gemini:', error);

            // Fallback to simple intent
            return this.createSimpleIntent(query);
        }
    }

    /**
     * Check if query is simple (doesn't need Gemini)
     */
    private isSimpleQuery(query: string): boolean {
        const trimmed = query.trim();

        // Very short queries
        if (trimmed.length < 5) {
            return true;
        }

        // Match simple patterns
        return SIMPLE_PATTERNS.some(pattern => pattern.test(trimmed));
    }

    /**
     * Create simple intent without API call
     */
    private createSimpleIntent(query: string): Intent {
        return {
            id: this.generateIntentId(),
            intent: 'other',
            subject: 'simple_query',
            action: query,
            priority: 'low',
            original_language: this.detectSimpleLanguage(query),
            related: [],
            context_needed: [],
            timestamp: Date.now()
        };
    }

    /**
     * Detect language for simple queries
     */
    private detectSimpleLanguage(query: string): Language {
        // Vietnamese characters
        if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(query)) {
            return 'vi';
        }
        // Chinese characters
        if (/[\u4e00-\u9fff]/.test(query)) {
            return 'zh';
        }
        // Default to English
        return 'en';
    }

    /**
     * Generate cache key from query
     */
    private getCacheKey(query: string): string {
        return crypto
            .createHash('md5')
            .update(query.trim().toLowerCase())
            .digest('hex');
    }

    /**
     * Generate unique intent ID
     */
    private generateIntentId(): string {
        return `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; maxSize: number } {
        return {
            size: this.cache.size(),
            maxSize: 1000
        };
    }
}
