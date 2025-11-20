#!/usr/bin/env tsx
/**
 * Test Bootstrap Orchestrator
 * 
 * Quick end-to-end test with small dataset
 */

import dotenv from 'dotenv';
import { BootstrapOrchestrator } from './orchestrator.js';

dotenv.config();

async function testOrchestrator() {
    console.log('🧪 Testing Bootstrap Orchestrator\n');
    
    // Get config from env
    const QDRANT_URL = process.env.QDRANT_URL!;
    const QDRANT_API_KEY = process.env.QDRANT_API_KEY!;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
    
    if (!QDRANT_URL || !QDRANT_API_KEY || !GEMINI_API_KEY) {
        console.error('❌ Missing environment variables');
        process.exit(1);
    }
    
    try {
        // Create orchestrator with small test config
        const orchestrator = new BootstrapOrchestrator({
            sourceDir: 'src/memory',          // Small directory
            collection: 'test',                // Test collection
            qdrantUrl: QDRANT_URL,
            qdrantApiKey: QDRANT_API_KEY,
            geminiApiKey: GEMINI_API_KEY,
            geminiModel: 'gemini-2.5-flash',
            tokenBudget: 10_000,               // Small budget for testing
            maxVectors: 50,                    // Sample few vectors
            clusterCount: 3,                   // Few clusters
            topCandidates: 5,                  // Top 5 only
            verbose: true,                     // Show all logs
        });
        
        // Run bootstrap
        const result = await orchestrator.bootstrap();
        
        // Verify results
        console.log('\n🔍 Verification:');
        console.log('─'.repeat(60));
        
        const checks = [
            { name: 'Bootstrap succeeded', pass: result.success },
            { name: 'AST elements extracted', pass: result.astElements.length > 0 },
            { name: 'Patterns detected', pass: result.patterns.length > 0 },
            { name: 'Gemini analyses done', pass: result.analyses > 0 },
            { name: 'Entities created', pass: result.entities.length > 0 },
            { name: 'Within token budget', pass: result.geminiStats.tokensUsed <= 10_000 },
            { name: 'Good confidence', pass: result.geminiStats.avgConfidence > 0.8 },
            { name: 'Fast execution', pass: result.totalTime < 60_000 }, // < 1 min
        ];
        
        let passed = 0;
        checks.forEach(check => {
            const status = check.pass ? '✅' : '❌';
            console.log(`${status} ${check.name}`);
            if (check.pass) passed++;
        });
        
        console.log('\n' + '─'.repeat(60));
        console.log(`Result: ${passed}/${checks.length} checks passed`);
        
        if (passed === checks.length) {
            console.log('\n🎉 All tests passed!');
            process.exit(0);
        } else {
            console.log('\n⚠️  Some tests failed');
            process.exit(1);
        }
        
    } catch (error: any) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testOrchestrator();
