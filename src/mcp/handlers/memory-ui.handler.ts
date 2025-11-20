/**
 * Memory UI Handler
 * Handles open_memory_ui MCP tool
 */

import { z } from 'zod';
import { MemoryUIServer } from '../../web/memory-ui-server.js';
import type { QdrantVectorStore } from '../../storage/qdrantClient.js';
import type { MemoryVectorStore } from '../../memory/vector-store.js';

export interface MemoryUIHandlerContext {
    vectorStore: QdrantVectorStore;
    memoryVectorStore?: MemoryVectorStore;
}

// Global server instance (singleton)
let memoryUIServerInstance: MemoryUIServer | null = null;

export async function handleOpenMemoryUI(
    args: any,
    context: MemoryUIHandlerContext
): Promise<{ content: Array<{ type: string; text: string }> }> {
    const schema = z.object({
        port: z.number().int().min(1024).max(65535).default(3001),
        host: z.string().default('localhost')
    });

    try {
        const validated = schema.parse(args);

        // Check if server is already running
        if (memoryUIServerInstance && memoryUIServerInstance.isRunning()) {
            const url = memoryUIServerInstance.getURL();
            return {
                content: [
                    {
                        type: 'text',
                        text: `✅ Memory UI is already running at: ${url}\n\nOpen this URL in your browser to explore memory.`
                    }
                ]
            };
        }

        // Create new server instance
        memoryUIServerInstance = new MemoryUIServer(
            context.vectorStore,
            context.memoryVectorStore,
            {
                port: validated.port,
                host: validated.host
            }
        );

        // Start server
        const url = await memoryUIServerInstance.start();

        return {
            content: [
                {
                    type: 'text',
                    text: `🌐 Memory UI Server started successfully!

**URL:** ${url}

**Features:**
- 📊 Interactive graph visualization
- 🔍 Search and filter entities
- 📈 Real-time statistics
- 🎨 Category and type filtering
- 💡 Detailed entity inspection

**Quick Actions:**
1. Open ${url} in your browser
2. Explore entity relationships in the graph
3. Search for specific entities
4. Click on nodes to see details

The server will keep running in the background. To stop it, you can close the MCP server or use the stop command.`
                }
            ]
        };
    } catch (error: any) {
        // Handle port already in use
        if (error.message && error.message.includes('already in use')) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Port ${args.port || 3001} is already in use.

Try one of these solutions:
1. Use a different port: open_memory_ui({ port: 3002 })
2. Stop the process using port ${args.port || 3001}
3. The Memory UI might already be running - check http://localhost:${args.port || 3001}`
                    }
                ]
            };
        }

        console.error('[MemoryUI] Error starting server:', error);
        return {
            content: [
                {
                    type: 'text',
                    text: `❌ Failed to start Memory UI Server

**Error:** ${error.message}

**Troubleshooting:**
1. Make sure the port is available
2. Check that memory vector store is initialized
3. Verify Qdrant connection is working

If the problem persists, check the server logs for details.`
                }
            ]
        };
    }
}

export async function handleCloseMemoryUI(): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
        if (!memoryUIServerInstance || !memoryUIServerInstance.isRunning()) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'ℹ️ Memory UI Server is not running.'
                    }
                ]
            };
        }

        await memoryUIServerInstance.stop();
        memoryUIServerInstance = null;

        return {
            content: [
                {
                    type: 'text',
                    text: '✅ Memory UI Server stopped successfully.'
                }
            ]
        };
    } catch (error: any) {
        console.error('[MemoryUI] Error stopping server:', error);
        return {
            content: [
                {
                    type: 'text',
                    text: `❌ Failed to stop Memory UI Server: ${error.message}`
                }
            ]
        };
    }
}

export function getMemoryUIServer(): MemoryUIServer | null {
    return memoryUIServerInstance;
}
