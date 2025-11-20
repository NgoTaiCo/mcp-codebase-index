/**
 * Test Index Analyzer
 * Run: npx tsx scripts/bootstrap/test-index-analyzer.ts
 */

import { config } from 'dotenv';
import { IndexAnalyzer } from './index-analyzer.js';

config();

const QDRANT_URL = process.env.QDRANT_URL!;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY!;
const COLLECTION = 'test'; // Use test collection from mcp.json

async function testIndexAnalyzer() {
    console.log('🧪 Testing Index Analyzer\n');
    console.log('📋 Configuration:');
    console.log(`   - Qdrant URL: ${QDRANT_URL}`);
    console.log(`   - Collection: ${COLLECTION}\n`);

    try {
        // Create analyzer
        console.log('1️⃣ Creating IndexAnalyzer...');
        const analyzer = new IndexAnalyzer(QDRANT_URL, QDRANT_API_KEY, COLLECTION);
        console.log('✅ Analyzer created\n');

        // Test 1: Analyze index
        console.log('2️⃣ Test: Analyze index (sample 100 vectors, 5 clusters)');
        const startTime = Date.now();
        const result = await analyzer.analyze({
            maxVectors: 100,
            clusterCount: 5,
            minClusterSize: 2
        });
        const duration = Date.now() - startTime;
        
        console.log(`✅ Analysis complete in ${duration}ms:`);
        console.log(`   - Total vectors in collection: ${result.totalVectors}`);
        console.log(`   - Clusters found: ${result.clusters.length}`);
        console.log(`   - Patterns detected: ${result.patterns.length}`);
        console.log(`   - Analysis time: ${result.analysisTime}ms\n`);

        // Test 2: Show clusters
        if (result.clusters.length > 0) {
            console.log('3️⃣ Test: Cluster details');
            console.log(`✅ Found ${result.clusters.length} clusters:\n`);
            
            result.clusters.forEach((cluster, i) => {
                console.log(`   Cluster ${i + 1}: "${cluster.label}"`);
                console.log(`   - Files: ${cluster.files.length}`);
                console.log(`   - Avg similarity: ${(cluster.files.reduce((sum, f) => sum + f.similarity, 0) / cluster.files.length * 100).toFixed(1)}%`);
                console.log(`   - Sample files:`);
                cluster.files.slice(0, 3).forEach(f => {
                    const fileName = f.path.split('/').pop() || f.path;
                    console.log(`     • ${fileName} (${(f.similarity * 100).toFixed(1)}%)`);
                });
                console.log();
            });
        }

        // Test 3: Show patterns
        if (result.patterns.length > 0) {
            console.log('4️⃣ Test: Pattern details');
            console.log(`✅ Detected ${result.patterns.length} patterns:\n`);
            
            result.patterns.forEach((pattern, i) => {
                console.log(`   Pattern ${i + 1}: "${pattern.name}"`);
                console.log(`   - Type: ${pattern.type}`);
                console.log(`   - Confidence: ${(pattern.confidence * 100).toFixed(1)}%`);
                console.log(`   - Files: ${pattern.files.length}`);
                console.log(`   - Description: ${pattern.description}`);
                if (pattern.relatedPatterns && pattern.relatedPatterns.length > 0) {
                    console.log(`   - Related: ${pattern.relatedPatterns.join(', ')}`);
                }
                console.log();
            });
        }

        // Test 4: Convert to memory entities
        console.log('5️⃣ Test: Convert patterns to memory entities');
        const entities = analyzer.toMemoryEntities(result.patterns);
        console.log(`✅ Created ${entities.length} memory entities:`);
        entities.slice(0, 3).forEach((entity, i) => {
            console.log(`   ${i + 1}. ${entity.name}`);
            console.log(`      Type: ${entity.entityType}`);
            console.log(`      Observations: ${entity.observations.length}`);
            console.log(`      Files: ${entity.relatedFiles?.length || 0}`);
            console.log(`      Tags: ${entity.tags?.join(', ')}`);
        });
        console.log();

        // Test 5: Performance summary
        console.log('6️⃣ Performance Summary');
        console.log(`✅ Metrics:`);
        console.log(`   - Total time: ${duration}ms`);
        console.log(`   - Vectors analyzed: ${Math.min(100, result.totalVectors)}`);
        console.log(`   - Clusters created: ${result.clusters.length}`);
        console.log(`   - Patterns detected: ${result.patterns.length}`);
        console.log(`   - Memory entities: ${entities.length}`);
        console.log(`   - Time per pattern: ${result.patterns.length > 0 ? Math.round(result.analysisTime / result.patterns.length) : 0}ms\n`);

        console.log('🎉 All Index Analyzer tests passed!\n');

    } catch (error) {
        console.error('❌ Test failed:', error);
        if (error instanceof Error) {
            console.error(`   ${error.message}`);
            console.error(`   Stack: ${error.stack}`);
        }
        process.exit(1);
    }
}

testIndexAnalyzer();
