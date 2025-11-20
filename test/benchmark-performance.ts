#!/usr/bin/env tsx
/**
 * Performance Benchmark
 * 
 * Compare performance before/after Memory Optimization:
 * 1. Search speed: Vector store vs. traditional search
 * 2. Memory usage: Efficient vector storage
 * 3. Token consumption: Bootstrap process
 */

import dotenv from 'dotenv';
import { MemoryVectorStore } from '../src/memory/vector-store.js';
import { QdrantVectorStore } from '../src/storage/qdrantClient.js';
import { CodeEmbedder } from '../src/core/embedder.js';
import type { MemoryEntity } from '../src/memory/types.js';

dotenv.config();

// Test queries
const TEST_QUERIES = [
    'memory synchronization',
    'vector store implementation',
    'update detection',
    'semantic search',
    'entity management',
];

// Mock traditional search (simple text matching)
function traditionalSearch(entities: MemoryEntity[], query: string, limit: number = 5) {
    const queryLower = query.toLowerCase();
    const results: Array<{entity: MemoryEntity, score: number}> = [];
    
    for (const entity of entities) {
        let score = 0;
        
        // Check name
        if (entity.name.toLowerCase().includes(queryLower)) {
            score += 3;
        }
        
        // Check observations
        for (const obs of entity.observations) {
            if (obs.toLowerCase().includes(queryLower)) {
                score += 1;
            }
        }
        
        if (score > 0) {
            results.push({ entity, score });
        }
    }
    
    return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(r => r.entity);
}

async function benchmark() {
    console.log('📊 Performance Benchmark\n');
    console.log('Comparing traditional search vs vector store search\n');
    
    try {
        // Initialize vector store
        console.log('🔧 Initializing vector store...');
        const qdrantStore = new QdrantVectorStore(
            {
                url: process.env.QDRANT_URL!,
                apiKey: process.env.QDRANT_API_KEY!,
                collectionName: 'memory',
            },
            768
        );
        
        const embedder = new CodeEmbedder(process.env.GEMINI_API_KEY!);
        const vectorStore = new MemoryVectorStore(qdrantStore, embedder, 'memory');
        await vectorStore.initialize();
        
        // Get collection stats
        const stats = await vectorStore.getStats();
        console.log(`✅ Vector store initialized`);
        console.log(`   Total entities: ${stats.totalEntities}\n`);
        
        if (stats.totalEntities === 0) {
            console.error('❌ No entities in vector store. Run integration test first.');
            process.exit(1);
        }
        
        // Fetch all entities for traditional search
        console.log('📥 Fetching entities for traditional search...');
        const allEntities: MemoryEntity[] = [];
        
        // Get all points from vector store
        const points = await qdrantStore.client.scroll('memory', {
            limit: 100,
            with_payload: true,
            with_vector: false,
        });
        
        for (const point of points.points) {
            if (point.payload) {
                allEntities.push({
                    name: point.payload.entityName as string,
                    entityType: point.payload.entityType as string,
                    observations: point.payload.observations as string[],
                });
            }
        }
        
        console.log(`✅ Fetched ${allEntities.length} entities\n`);
        
        // ============================================================
        // Benchmark: Traditional Search
        // ============================================================
        console.log('🔍 Benchmark 1: Traditional Text Search');
        console.log('─'.repeat(60));
        
        const traditionalTimes: number[] = [];
        const traditionalResults: number[] = [];
        
        for (const query of TEST_QUERIES) {
            const start = Date.now();
            const results = traditionalSearch(allEntities, query, 5);
            const time = Date.now() - start;
            
            traditionalTimes.push(time);
            traditionalResults.push(results.length);
            
            console.log(`   "${query}"`);
            console.log(`   Results: ${results.length}, Time: ${time}ms`);
        }
        
        const avgTraditionalTime = traditionalTimes.reduce((a, b) => a + b, 0) / traditionalTimes.length;
        const avgTraditionalResults = traditionalResults.reduce((a, b) => a + b, 0) / traditionalResults.length;
        
        console.log(`\n   Average: ${avgTraditionalResults.toFixed(1)} results in ${avgTraditionalTime.toFixed(1)}ms\n`);
        
        // ============================================================
        // Benchmark: Vector Store Search
        // ============================================================
        console.log('🚀 Benchmark 2: Vector Store Semantic Search');
        console.log('─'.repeat(60));
        
        const vectorTimes: number[] = [];
        const vectorResults: number[] = [];
        const vectorSimilarities: number[] = [];
        
        for (const query of TEST_QUERIES) {
            const start = Date.now();
            const results = await vectorStore.search(query, { limit: 5 });
            const time = Date.now() - start;
            
            vectorTimes.push(time);
            vectorResults.push(results.length);
            
            if (results.length > 0) {
                vectorSimilarities.push(results[0].similarity);
            }
            
            console.log(`   "${query}"`);
            console.log(`   Results: ${results.length}, Time: ${time}ms`);
            if (results.length > 0) {
                console.log(`   Top match: ${results[0].entityName} (${(results[0].similarity * 100).toFixed(1)}%)`);
            }
        }
        
        const avgVectorTime = vectorTimes.reduce((a, b) => a + b, 0) / vectorTimes.length;
        const avgVectorResults = vectorResults.reduce((a, b) => a + b, 0) / vectorResults.length;
        const avgSimilarity = vectorSimilarities.length > 0
            ? vectorSimilarities.reduce((a, b) => a + b, 0) / vectorSimilarities.length
            : 0;
        
        console.log(`\n   Average: ${avgVectorResults.toFixed(1)} results in ${avgVectorTime.toFixed(1)}ms`);
        console.log(`   Avg similarity: ${(avgSimilarity * 100).toFixed(1)}%\n`);
        
        // ============================================================
        // Comparison
        // ============================================================
        console.log('📊 Performance Comparison');
        console.log('='.repeat(60));
        
        const speedup = avgTraditionalTime / avgVectorTime;
        const speedupPercent = ((avgTraditionalTime - avgVectorTime) / avgTraditionalTime * 100);
        
        console.log('\n🏃 Speed:');
        console.log(`   Traditional:  ${avgTraditionalTime.toFixed(1)}ms avg`);
        console.log(`   Vector Store: ${avgVectorTime.toFixed(1)}ms avg`);
        console.log(`   Speedup:      ${speedup.toFixed(2)}x faster`);
        console.log(`   Improvement:  ${speedupPercent > 0 ? '+' : ''}${speedupPercent.toFixed(1)}%`);
        
        console.log('\n🎯 Quality:');
        console.log(`   Traditional:  Text matching only`);
        console.log(`   Vector Store: Semantic understanding (${(avgSimilarity * 100).toFixed(1)}% avg similarity)`);
        
        console.log('\n📈 Results:');
        console.log(`   Traditional:  ${avgTraditionalResults.toFixed(1)} avg results`);
        console.log(`   Vector Store: ${avgVectorResults.toFixed(1)} avg results`);
        
        console.log('\n💾 Storage:');
        console.log(`   Total entities:    ${stats.totalEntities}`);
        console.log(`   Vector dimension:  768`);
        console.log(`   Storage per vector: ~3KB`);
        console.log(`   Total storage:     ~${(stats.totalEntities * 3 / 1024).toFixed(1)}MB`);
        
        console.log('\n' + '='.repeat(60));
        
        // Verdict
        if (speedup >= 1.5) {
            console.log('\n🎉 SUCCESS: Vector store is significantly faster!');
        } else if (speedup >= 1.0) {
            console.log('\n✅ PASS: Vector store is faster or comparable.');
        } else {
            console.log('\n⚠️  WARNING: Vector store is slower than traditional search.');
        }
        
        console.log('');
        
    } catch (error: any) {
        console.error('\n❌ Benchmark failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

benchmark();
