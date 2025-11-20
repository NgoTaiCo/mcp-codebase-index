#!/usr/bin/env tsx
/**
 * Bootstrap CLI
 * 
 * Command-line interface for running the bootstrap process.
 * 
 * Usage:
 *   npx tsx scripts/bootstrap-cli.ts --source=src/ --collection=test
 * 
 * Options:
 *   --source       Source directory to parse (required)
 *   --collection   Qdrant collection name (required)
 *   --budget       Token budget for Gemini (default: 100000)
 *   --top          Top candidates for Gemini analysis (default: 50)
 *   --vectors      Max vectors to sample from index (default: 1000)
 *   --clusters     Number of clusters to detect (default: 5)
 *   --output       Save results to JSON file (optional)
 *   --verbose      Show detailed logs
 *   --help         Show help
 */

import dotenv from 'dotenv';
import { BootstrapOrchestrator } from '../src/bootstrap/orchestrator.js';

// Load environment
dotenv.config();

// Parse CLI arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options: Record<string, string | boolean> = {};

    for (const arg of args) {
        if (arg.startsWith('--')) {
            const [key, value] = arg.substring(2).split('=');
            options[key] = value || true;
        }
    }

    return options;
}

function showHelp() {
    console.log(`
🚀 MCP Codebase Bootstrap CLI

Bootstrap your codebase into MCP Memory with AI-powered analysis.

Usage:
  npx tsx scripts/bootstrap-cli.ts --source=<dir> --collection=<name> [options]

Required Options:
  --source <dir>        Source directory to parse (e.g., src/)
  --collection <name>   Qdrant collection name (e.g., test, codebase)

Optional Settings:
  --budget <num>        Token budget for Gemini analysis (default: 100000)
  --top <num>          Top N candidates for Gemini (default: 50)
  --vectors <num>      Max vectors to sample from index (default: 1000)
  --clusters <num>     Number of clusters to detect (default: 5)
  --model <name>       Gemini model to use (default: gemini-2.5-flash)
  --output <path>      Save results to JSON file
  --verbose            Show detailed logs

Examples:
  # Basic usage
  npx tsx scripts/bootstrap-cli.ts --source=src/ --collection=test

  # With custom settings
  npx tsx scripts/bootstrap-cli.ts \\
    --source=src/ \\
    --collection=codebase \\
    --budget=50000 \\
    --top=30 \\
    --output=bootstrap-results.json

  # Verbose mode
  npx tsx scripts/bootstrap-cli.ts \\
    --source=src/ \\
    --collection=test \\
    --verbose

Environment Variables (required):
  QDRANT_URL          Qdrant server URL
  QDRANT_API_KEY      Qdrant API key
  GEMINI_API_KEY      Google Gemini API key

Documentation:
  See docs/guides/BOOTSTRAP.md for detailed usage guide
`);
}

async function main() {
    const options = parseArgs();

    // Show help
    if (options.help) {
        showHelp();
        process.exit(0);
    }

    // Validate required options
    if (!options.source || !options.collection) {
        console.error('❌ Error: Missing required options\n');
        console.error('   Required: --source and --collection\n');
        console.error('   Run with --help for usage information');
        process.exit(1);
    }

    // Validate environment variables
    const qdrantUrl = process.env.QDRANT_URL;
    const qdrantApiKey = process.env.QDRANT_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!qdrantUrl || !qdrantApiKey || !geminiApiKey) {
        console.error('❌ Error: Missing environment variables\n');
        console.error('   Required in .env:');
        console.error('   - QDRANT_URL');
        console.error('   - QDRANT_API_KEY');
        console.error('   - GEMINI_API_KEY');
        process.exit(1);
    }

    // Parse numeric options
    const tokenBudget = options.budget ? parseInt(options.budget as string) : 100_000;
    const topCandidates = options.top ? parseInt(options.top as string) : 50;
    const maxVectors = options.vectors ? parseInt(options.vectors as string) : 1000;
    const clusterCount = options.clusters ? parseInt(options.clusters as string) : 5;

    // Create orchestrator
    const orchestrator = new BootstrapOrchestrator({
        sourceDir: options.source as string,
        collection: options.collection as string,
        qdrantUrl,
        qdrantApiKey,
        geminiApiKey,
        geminiModel: (options.model as string) || 'gemini-2.5-flash',
        tokenBudget,
        topCandidates,
        maxVectors,
        clusterCount,
        outputPath: options.output as string,
        verbose: !!options.verbose,
    });

    // Run bootstrap
    try {
        const result = await orchestrator.bootstrap();

        if (result.success) {
            console.log('\n✅ Bootstrap completed successfully!');
            console.log(`\n📦 Created ${result.entities.length} memory entities`);
            console.log('   Next steps:');
            console.log('   1. Review generated entities');
            console.log('   2. Import to MCP Memory: npx tsx cli/memory-cli.ts import <file>');
            console.log('   3. Start using enhanced search!');
            process.exit(0);
        } else {
            console.error('\n❌ Bootstrap failed');
            result.errors.forEach(err => {
                console.error(`   - ${err}`);
            });
            process.exit(1);
        }
    } catch (error: any) {
        console.error('\n❌ Fatal error:', error.message);
        if (options.verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Run CLI
main();
