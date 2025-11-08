#!/usr/bin/env node
// src/index.ts
import { config } from 'dotenv';
import { CodebaseIndexMCPServer } from './server.js';

config();

// Validate required environment variables
if (!process.env.GEMINI_API_KEY) {
    console.error('[Error] GEMINI_API_KEY is required');
    process.exit(1);
}

if (!process.env.QDRANT_URL) {
    console.error('[Error] QDRANT_URL is required');
    process.exit(1);
}

if (!process.env.QDRANT_API_KEY) {
    console.error('[Error] QDRANT_API_KEY is required');
    process.exit(1);
}

const server = new CodebaseIndexMCPServer({
    repoPath: process.env.REPO_PATH || process.cwd(),
    codebaseMemoryPath: process.env.MEMORY_FILE_PATH || './memory',
    qdrant: {
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
        collectionName: process.env.QDRANT_COLLECTION || 'codebase'
    },
    embedding: {
        apiKey: process.env.GEMINI_API_KEY,
        model: 'text-embedding-004',
        dimension: 768
    },
    watchMode: process.env.WATCH_MODE !== 'false',
    batchSize: parseInt(process.env.BATCH_SIZE || '50'),
    ignorePaths: [
        '.git', '.venv', 'node_modules', '__pycache__',
        '.env', 'build', 'dist', '.next', 'target',
        'vendor', 'coverage', '.pytest_cache',
        '.fvm', '.dart_tool', 'ios/Pods', 'android/.gradle'
    ]
});

server.start().catch(console.error);
