#!/usr/bin/env tsx
/**
 * Integration Test - All Phases
 * 
 * Tests complete workflow:
 * 1. Bootstrap: Generate entities from codebase (Phase 3)
 * 2. Memory Sync: Sync entities to vector store (Phase 2)
 * 3. Enhanced Search: Search with vector store (Phase 1)
 */

import dotenv from 'dotenv';
import { BootstrapOrchestrator } from '../scripts/bootstrap/orchestrator.js';
import { MemoryVectorStore } from '../src/memory/vector-store.js';
import { MemorySyncManager } from '../src/memory/sync/sync-manager.js';
import { QdrantVectorStore } from '../src/storage/qdrantClient.js';
import { CodeEmbedder } from '../src/core/embedder.js';
import type { MemoryEntity } from '../src/memory/types.js';

dotenv.config();

// Test configuration
const TEST_CONFIG = {
    sourceDir: 'src/memory',
    collection: 'test',
    qdrantUrl: process.env.QDRANT_URL!,
    qdrantApiKey: process.env.QDRANT_API_KEY!,
    geminiApiKey: process.env.GEMINI_API_KEY!,
    tokenBudget: 5_000,  // Small budget for testing
    topCandidates: 3,     // Analyze top 3 only
};

async function testIntegration() {
    console.log('🧪 Integration Test - All Phases\n');
    console.log('Testing complete workflow: Bootstrap → Sync → Search\n');
    
    const results = {
        bootstrap: { success: false, entities: 0, time: 0 },
        sync: { success: false, synced: 0, time: 0 },
        search: { success: false, results: 0, time: 0 },
    };
    
    try {
        // ============================================================
        // PHASE 3: Bootstrap - Generate entities from codebase
        // ============================================================
        console.log('📊 Step 1: Bootstrap System');
        console.log('─'.repeat(60));
        
        const bootstrapStart = Date.now();
        const orchestrator = new BootstrapOrchestrator({
            ...TEST_CONFIG,
            verbose: false,
        });
        
        const bootstrapResult = await orchestrator.bootstrap();
        results.bootstrap.time = Date.now() - bootstrapStart;
        
        if (!bootstrapResult.success) {
            throw new Error('Bootstrap failed: ' + bootstrapResult.errors.join(', '));
        }
        
        results.bootstrap.success = true;
        results.bootstrap.entities = bootstrapResult.entities.length;
        
        console.log(`✅ Bootstrap completed`);
        console.log(`   Entities: ${results.bootstrap.entities}`);
        console.log(`   Time: ${results.bootstrap.time}ms\n`);
        
        // ============================================================
        // PHASE 2: Memory Sync - Sync entities to vector store
        // ============================================================
        console.log('🔄 Step 2: Memory Sync System');
        console.log('─'.repeat(60));
        
        const syncStart = Date.now();
        
        // Initialize Qdrant client and embedder
        const qdrantStore = new QdrantVectorStore(
            {
                url: TEST_CONFIG.qdrantUrl,
                apiKey: TEST_CONFIG.qdrantApiKey,
                collectionName: 'memory',
            },
            768
        );
        
        const embedder = new CodeEmbedder(TEST_CONFIG.geminiApiKey);
        
        // Initialize vector store
        const vectorStore = new MemoryVectorStore(
            qdrantStore,
            embedder,
            'memory'  // Memory collection
        );
        
        await vectorStore.initialize();
        
        // Initialize sync manager
        const syncManager = new MemorySyncManager(vectorStore);
        
        // Sync bootstrap entities
        const syncResult = await syncManager.syncAll(bootstrapResult.entities);
        results.sync.time = Date.now() - syncStart;
        
        if (syncResult.errors.length > 0) {
            throw new Error('Sync failed: ' + syncResult.errors.join(', '));
        }
        
        results.sync.success = true;
        results.sync.synced = syncResult.created + syncResult.updated;
        
        console.log(`✅ Sync completed`);
        console.log(`   Created: ${syncResult.created}`);
        console.log(`   Updated: ${syncResult.updated}`);
        console.log(`   Deleted: ${syncResult.deleted}`);
        console.log(`   Time: ${results.sync.time}ms\n`);
        
        // ============================================================
        // PHASE 1: Enhanced Search - Search with vector store
        // ============================================================
        console.log('🔍 Step 3: Enhanced Search (Vector Store)');
        console.log('─'.repeat(60));
        
        const searchStart = Date.now();
        
        // Test search queries
        const queries = [
            'memory synchronization',
            'vector store',
            'update detection',
        ];
        
        let totalResults = 0;
        for (const query of queries) {
            const searchResults = await vectorStore.search(query, { limit: 3 });
            totalResults += searchResults.length;
            
            console.log(`   Query: "${query}"`);
            console.log(`   Results: ${searchResults.length}`);
            if (searchResults.length > 0) {
                console.log(`   Top: ${searchResults[0].entityName} (${(searchResults[0].similarity * 100).toFixed(1)}%)`);
            }
        }
        
        results.search.time = Date.now() - searchStart;
        results.search.success = totalResults > 0;
        results.search.results = totalResults;
        
        console.log(`\n✅ Search completed`);
        console.log(`   Total results: ${totalResults}`);
        console.log(`   Time: ${results.search.time}ms\n`);
        
        // ============================================================
        // Verification
        // ============================================================
        console.log('🔍 Integration Test Results');
        console.log('='.repeat(60));
        
        const checks = [
            { name: 'Bootstrap succeeded', pass: results.bootstrap.success },
            { name: 'Entities generated', pass: results.bootstrap.entities > 0 },
            { name: 'Sync succeeded', pass: results.sync.success },
            { name: 'Entities synced', pass: results.sync.synced > 0 },
            { name: 'Search succeeded', pass: results.search.success },
            { name: 'Search results found', pass: results.search.results > 0 },
            { name: 'Sync matched entities', pass: results.sync.synced === results.bootstrap.entities },
            { name: 'Fast execution', pass: (results.bootstrap.time + results.sync.time + results.search.time) < 60_000 },
        ];
        
        let passed = 0;
        checks.forEach(check => {
            const status = check.pass ? '✅' : '❌';
            console.log(`${status} ${check.name}`);
            if (check.pass) passed++;
        });
        
        // Summary
        const totalTime = results.bootstrap.time + results.sync.time + results.search.time;
        
        console.log('\n' + '─'.repeat(60));
        console.log('📊 Summary:');
        console.log(`   Bootstrap: ${results.bootstrap.entities} entities in ${results.bootstrap.time}ms`);
        console.log(`   Sync: ${results.sync.synced} entities in ${results.sync.time}ms`);
        console.log(`   Search: ${results.search.results} results in ${results.search.time}ms`);
        console.log(`   Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)`);
        console.log('─'.repeat(60));
        console.log(`Result: ${passed}/${checks.length} checks passed\n`);
        
        if (passed === checks.length) {
            console.log('🎉 All integration tests passed!\n');
            process.exit(0);
        } else {
            console.log('⚠️  Some integration tests failed\n');
            process.exit(1);
        }
        
    } catch (error: any) {
        console.error('\n❌ Integration test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run test
testIntegration();
