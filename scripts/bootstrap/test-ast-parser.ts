/**
 * Test AST Parser
 * Run: npx tsx scripts/bootstrap/test-ast-parser.ts
 */

import { ASTParser } from './ast-parser.js';
import * as path from 'path';

async function testASTParser() {
    console.log('🧪 Testing AST Parser\n');

    const parser = new ASTParser();

    try {
        // Test 1: Parse single file
        console.log('1️⃣ Test: Parse single TypeScript file');
        const testFile = path.join(process.cwd(), 'src/memory/vector-store.ts');
        const result = parser.parseFile(testFile);
        
        console.log('✅ Parse complete:');
        console.log(`   - Elements found: ${result.elements.length}`);
        console.log(`   - Imports: ${result.imports.length}`);
        console.log(`   - Exports: ${result.exports.length}`);
        console.log(`   - Total lines: ${result.totalLines}\n`);

        if (result.elements.length > 0) {
            console.log('   Top elements:');
            result.elements.slice(0, 3).forEach((el, i) => {
                console.log(`   ${i + 1}. ${el.type} "${el.name}" (lines ${el.startLine}-${el.endLine})`);
                console.log(`      Exported: ${el.exported}, Dependencies: ${el.dependencies.join(', ') || 'none'}`);
            });
            console.log();
        }

        // Test 2: Parse directory
        console.log('2️⃣ Test: Parse directory (src/memory)');
        const memoryDir = path.join(process.cwd(), 'src/memory');
        const results = parser.parseDirectory(memoryDir);
        
        console.log(`✅ Parsed ${results.length} files:`);
        results.forEach(r => {
            console.log(`   - ${r.elements.length} elements, ${r.totalLines} lines`);
        });
        console.log();

        // Test 3: Get statistics
        console.log('3️⃣ Test: Get statistics');
        const stats = parser.getStats(results);
        console.log('✅ Statistics:');
        console.log(`   - Total files: ${stats.totalFiles}`);
        console.log(`   - Total elements: ${stats.totalElements}`);
        console.log(`   - Total lines: ${stats.totalLines}`);
        console.log(`   - Avg elements/file: ${stats.avgElementsPerFile}`);
        console.log('   - By type:');
        Object.entries(stats.byType).forEach(([type, count]) => {
            console.log(`     • ${type}: ${count}`);
        });
        console.log();

        // Test 4: Convert to memory entities
        console.log('4️⃣ Test: Convert to memory entities');
        const entities = parser.toMemoryEntities(results);
        console.log(`✅ Created ${entities.length} memory entities:`);
        entities.slice(0, 3).forEach((entity, i) => {
            console.log(`   ${i + 1}. ${entity.name}`);
            console.log(`      Type: ${entity.entityType}`);
            console.log(`      Observations: ${entity.observations.length}`);
            console.log(`      Tags: ${entity.tags?.join(', ')}`);
        });
        console.log();

        // Test 5: Performance test (larger directory)
        console.log('5️⃣ Test: Performance (parse src/ directory)');
        const srcDir = path.join(process.cwd(), 'src');
        const startTime = Date.now();
        const srcResults = parser.parseDirectory(srcDir);
        const duration = Date.now() - startTime;
        
        const srcStats = parser.getStats(srcResults);
        console.log(`✅ Parsed in ${duration}ms:`);
        console.log(`   - Files: ${srcStats.totalFiles}`);
        console.log(`   - Elements: ${srcStats.totalElements}`);
        console.log(`   - Lines: ${srcStats.totalLines}`);
        console.log(`   - Speed: ${Math.round(srcStats.totalFiles / (duration / 1000))} files/sec`);
        console.log();

        console.log('🎉 All AST Parser tests passed!\n');

    } catch (error) {
        console.error('❌ Test failed:', error);
        if (error instanceof Error) {
            console.error(`   ${error.message}`);
            console.error(`   Stack: ${error.stack}`);
        }
        process.exit(1);
    }
}

testASTParser();
