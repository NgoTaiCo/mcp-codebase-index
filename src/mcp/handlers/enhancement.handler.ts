import { z } from 'zod';
import { PromptEnhancer } from '../../enhancement/promptEnhancer.js';
import { IncrementalIndexState } from '../../types/index.js';

export interface EnhancementHandlerContext {
    promptEnhancer: PromptEnhancer | null;
    indexState: IncrementalIndexState;
}

export async function handleEnhancePrompt(
    args: any,
    context: EnhancementHandlerContext
): Promise<{ content: Array<{ type: string; text: string }> }> {
    // Check if prompt enhancement is enabled
    if (!context.promptEnhancer) {
        return {
            content: [
                {
                    type: 'text',
                    text: 'Prompt enhancement is not enabled. Set PROMPT_ENHANCEMENT=true in your MCP configuration to enable this feature.'
                }
            ]
        };
    }

    const schema = z.object({
        query: z.string(),
        customPrompts: z.array(z.string()).optional(),
        template: z.enum(['general', 'find_implementation', 'find_usage', 'find_bug', 'explain_code']).optional(),
        model: z.enum(['gemini-2.5-flash', 'gemini-2.5-flash-lite']).optional()
    });

    try {
        const validated = schema.parse(args);

        console.log(`[EnhancePrompt] Enhancing query: "${validated.query}"`);

        // Enhance the query
        const result = await context.promptEnhancer.enhance(validated, context.indexState);

        console.log(`[EnhancePrompt] Enhanced: "${result.enhancedQuery}"`);

        return {
            content: [
                {
                    type: 'text',
                    text: result.enhancedQuery
                }
            ]
        };
    } catch (error: any) {
        console.error('[EnhancePrompt] Error:', error);

        // Fallback: return original query
        return {
            content: [
                {
                    type: 'text',
                    text: args.query || 'Enhancement failed. Please try again.'
                }
            ]
        };
    }
}

export async function handleEnhancementTelemetry(
    args: any,
    context: EnhancementHandlerContext
): Promise<{ content: Array<{ type: string; text: string }> }> {
    if (!context.promptEnhancer) {
        return {
            content: [
                {
                    type: 'text',
                    text: 'Prompt enhancement is not enabled.'
                }
            ]
        };
    }

    try {
        const telemetry = context.promptEnhancer.getTelemetry();
        const config = context.promptEnhancer.getConfig();

        const report = `# Prompt Enhancement Telemetry

## Performance Metrics
- Total Enhancements: ${telemetry.totalEnhancements}
- Successful: ${telemetry.successfulEnhancements}
- Failed: ${telemetry.failedEnhancements}
- Success Rate: ${telemetry.successRate}

## Caching
- Cache Hits: ${telemetry.cacheHits}
- Cache Hit Rate: ${telemetry.cacheHitRate}
- Total API Calls: ${telemetry.totalApiCalls}

## Latency
- Average Latency: ${telemetry.avgLatency}
- Total Latency: ${telemetry.totalLatency}ms

## Configuration
- Enabled: ${config.enabled}
- Max Query Length: ${config.maxQueryLength} characters
- Cache TTL: ${config.cacheTTL / 1000}s
- Context Cache TTL: ${config.contextCacheTTL / 1000}s

## Cost Savings
- API Calls Saved: ${telemetry.cacheHits} (via caching)
- Estimated Cost Savings: ~$${(telemetry.cacheHits * 0.0001).toFixed(4)} (assuming $0.0001 per call)`;

        return {
            content: [
                {
                    type: 'text',
                    text: report
                }
            ]
        };
    } catch (error: any) {
        console.error('[EnhancementTelemetry] Error:', error);
        return {
            content: [
                {
                    type: 'text',
                    text: `Failed to get telemetry: ${error.message}`
                }
            ]
        };
    }
}
