/**
 * Test Gemini Analyzer
 * Run: npx tsx scripts/bootstrap/test-gemini-analyzer.ts
 */

import { config } from 'dotenv';
import { GeminiAnalyzer } from './gemini-analyzer.js';
import { ASTParser } from './ast-parser.js';
import { IndexAnalyzer } from './index-analyzer.js';
import * as path from 'path';

config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const QDRANT_URL = process.env.QDRANT_URL!;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY!;

async function testGeminiAnalyzer() {
    console.log('🧪 Testing Gemini Analyzer\n');

    try {
        // Step 1: Get code elements from AST Parser
        console.log('1️⃣ Extracting code elements with AST Parser...');
        const astParser = new ASTParser();
        const srcDir = path.join(process.cwd(), 'src/memory');
        const astResults = astParser.parseDirectory(srcDir);
        const stats = astParser.getStats(astResults);
        
        console.log(`✅ Extracted ${stats.totalElements} elements from ${stats.totalFiles} files`);
        console.log(`   - By type:`, stats.byType);
        console.log();

        // Get all elements
        const allElements = astResults.flatMap(r => r.elements);

        // Step 2: Get patterns from Index Analyzer
        console.log('2️⃣ Detecting patterns with Index Analyzer...');
        const indexAnalyzer = new IndexAnalyzer(QDRANT_URL, QDRANT_API_KEY, 'test');
        const indexResult = await indexAnalyzer.analyze({
            maxVectors: 50,
            clusterCount: 3,
            minClusterSize: 2
        });
        
        console.log(`✅ Detected ${indexResult.patterns.length} patterns`);
        console.log();

        // Step 3: Create Gemini Analyzer
        console.log('3️⃣ Creating Gemini Analyzer...');
        const geminiAnalyzer = new GeminiAnalyzer(GEMINI_API_KEY, {
            model: 'gemini-2.5-flash', // Use 2.5-flash with better quota (4M TPM)
            tokenBudget: 10000 // Small budget for testing
        });
        console.log('✅ Analyzer created with 10k token budget\n');

        // Step 4: Prioritize candidates
        console.log('4️⃣ Prioritizing candidates for analysis...');
        const candidates = geminiAnalyzer.prioritizeCandidates(allElements, indexResult.patterns);
        
        console.log(`✅ Found ${candidates.length} candidates:`);
        console.log(`   - Elements: ${candidates.filter(c => c.element).length}`);
        console.log(`   - Patterns: ${candidates.filter(c => c.pattern).length}`);
        
        // Show top 5 priorities
        console.log(`\n   Top 5 by priority:`);
        candidates.slice(0, 5).forEach((c, i) => {
            if (c.element) {
                console.log(`   ${i + 1}. [Priority ${c.priority}] ${c.element.type} "${c.element.name}"`);
            } else if (c.pattern) {
                console.log(`   ${i + 1}. [Priority ${c.priority}] Pattern "${c.pattern.name}"`);
            }
        });
        console.log();

        // Step 5: Analyze top candidates
        console.log('5️⃣ Analyzing top candidates with Gemini...');
        const topCandidates = candidates.slice(0, 5); // Analyze top 5 only
        const analysisResult = await geminiAnalyzer.analyze(topCandidates);
        
        console.log(`✅ Analysis complete:`);
        console.log(`   - Items analyzed: ${analysisResult.itemsAnalyzed}`);
        console.log(`   - Tokens used: ${analysisResult.tokensUsed.toLocaleString()}`);
        console.log(`   - Time: ${analysisResult.analysisTime}ms`);
        console.log(`   - Avg time/item: ${Math.round(analysisResult.analysisTime / analysisResult.itemsAnalyzed)}ms\n`);

        // Step 6: Show analysis results
        if (analysisResult.analyses.size > 0) {
            console.log('6️⃣ Analysis Results:\n');
            
            let i = 1;
            for (const [key, analysis] of analysisResult.analyses.entries()) {
                console.log(`   Result ${i}: ${key.split('_').slice(0, 3).join('_')}...`);
                console.log(`   - Description: ${analysis.description}`);
                console.log(`   - Purpose: ${analysis.purpose}`);
                console.log(`   - Complexity: ${analysis.complexity}`);
                console.log(`   - Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
                console.log(`   - Tags: ${analysis.tags.join(', ')}`);
                if (analysis.usage.length > 0) {
                    console.log(`   - Usage: ${analysis.usage.join(', ')}`);
                }
                console.log();
                i++;
            }
        }

        // Step 7: Convert to memory entities
        console.log('7️⃣ Converting to memory entities...');
        const entities = geminiAnalyzer.toMemoryEntities(analysisResult.analyses, topCandidates);
        
        console.log(`✅ Created ${entities.length} memory entities:`);
        entities.forEach((entity, i) => {
            console.log(`   ${i + 1}. ${entity.name}`);
            console.log(`      Type: ${entity.entityType}`);
            console.log(`      Observations: ${entity.observations.length}`);
            console.log(`      Tags: ${entity.tags?.slice(0, 5).join(', ')}${(entity.tags?.length || 0) > 5 ? '...' : ''}`);
        });
        console.log();

        // Step 8: Token budget summary
        console.log('8️⃣ Token Budget Summary:');
        console.log(`✅ Budget management:`);
        console.log(`   - Budget: 10,000 tokens`);
        console.log(`   - Used: ${analysisResult.tokensUsed.toLocaleString()} tokens`);
        console.log(`   - Remaining: ${geminiAnalyzer.getRemainingBudget().toLocaleString()} tokens`);
        console.log(`   - Utilization: ${(analysisResult.tokensUsed / 10000 * 100).toFixed(1)}%`);
        console.log(`   - Tokens/item: ${Math.round(analysisResult.tokensUsed / analysisResult.itemsAnalyzed)}\n`);

        console.log('🎉 All Gemini Analyzer tests passed!\n');

    } catch (error) {
        console.error('❌ Test failed:', error);
        if (error instanceof Error) {
            console.error(`   ${error.message}`);
            console.error(`   Stack: ${error.stack}`);
        }
        process.exit(1);
    }
}

testGeminiAnalyzer();
