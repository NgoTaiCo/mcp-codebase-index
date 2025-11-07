#!/usr/bin/env node
// src/index.ts
import { config } from 'dotenv';
import { CodebaseIndexMCPServer } from './server.js';

config();

// Determine vector store type
const vectorStoreType = (process.env.VECTOR_STORE_TYPE || 'memory') as 'qdrant' | 'memory' | 'cloud';

const server = new CodebaseIndexMCPServer({
    repoPath: process.env.REPO_PATH || process.cwd(),
    codebaseMemoryPath: process.env.MEMORY_FILE_PATH || './memory/index-metadata.json',
    vectorStoreType,
    qdrant: {
        url: vectorStoreType === 'memory'
            ? './vector_storage'  // Local file storage for memory mode
            : process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY,
        collectionName: process.env.QDRANT_COLLECTION || 'codebase'
    },
    embedding: {
        apiKey: process.env.GEMINI_API_KEY || '',
        model: 'text-embedding-004',
        dimension: 768
    },
    watchMode: process.env.WATCH_MODE !== 'false',
    batchSize: parseInt(process.env.BATCH_SIZE || '50'),
    ignorePaths: [
        '.git', '.venv', 'node_modules', '__pycache__',
        '.env', 'build', 'dist', '.next', 'target',
        'vendor', 'coverage', '.pytest_cache'
    ]
});

server.start().catch(console.error);
