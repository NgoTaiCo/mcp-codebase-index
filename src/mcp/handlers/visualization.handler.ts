import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs';
import { VectorVisualizer } from '../../visualization/visualizer.js';
import { CodeEmbedder } from '../../core/embedder.js';
import { QdrantClient } from '@qdrant/js-client-rest';

export interface VisualizationHandlerContext {
    vectorStoreClient: QdrantClient;
    collectionName: string;
    embedder: CodeEmbedder;
    repoPath: string;
}

export async function handleVisualizeCollection(
    args: any,
    context: VisualizationHandlerContext
): Promise<{ content: Array<{ type: string; text: string }> }> {
    const schema = z.object({
        dimensions: z.union([z.literal(2), z.literal(3)]).default(2),
        enableClustering: z.boolean().default(true),
        maxVectors: z.number().int().min(100).max(5000).default(1000),
        format: z.enum(['json', 'summary', 'plotly']).default('summary')
    });

    try {
        const validated = schema.parse(args);

        console.log(`[VisualizeCollection] Starting visualization (${validated.dimensions}D, clustering: ${validated.enableClustering})`);

        // Import exporter
        const { VisualizationExporter } = await import('../../visualization/exporter.js');

        // Create visualizer
        const visualizer = new VectorVisualizer(
            context.vectorStoreClient,
            context.collectionName,
            context.embedder
        );

        // Visualize collection
        const result = await visualizer.visualizeCollection({
            dimensions: validated.dimensions,
            enableClustering: validated.enableClustering,
            maxVectors: validated.maxVectors
        });

        // Export to requested format
        let output: string;
        if (validated.format === 'summary') {
            output = VisualizationExporter.exportSummary(result);
        } else if (validated.format === 'plotly') {
            const plotlyData = VisualizationExporter.exportToPlotlyFormat(result);
            output = JSON.stringify(plotlyData, null, 2);
        } else {
            output = VisualizationExporter.exportToCompactJSON(result);
        }

        const totalTime = result.metadata.performanceMetrics?.totalTime || 0;
        console.log(`[VisualizeCollection] Completed in ${totalTime}ms`);

        return {
            content: [
                {
                    type: 'text',
                    text: output
                }
            ]
        };
    } catch (error: any) {
        console.error('[VisualizeCollection] Error:', error);

        // Check if it's a UMAP availability error
        if (error.message?.includes('umap-js')) {
            return {
                content: [
                    {
                        type: 'text',
                        text: '❌ Visualization requires umap-js to be installed.\n\nPlease run:\n```bash\nnpm install umap-js\n```\n\nThen restart the MCP server.'
                    }
                ]
            };
        }

        return {
            content: [
                {
                    type: 'text',
                    text: `Failed to visualize collection: ${error.message}`
                }
            ]
        };
    }
}

export async function handleVisualizeQuery(
    args: any,
    context: VisualizationHandlerContext
): Promise<{ content: Array<{ type: string; text: string }> }> {
    const schema = z.object({
        query: z.string(),
        dimensions: z.union([z.literal(2), z.literal(3)]).default(2),
        topK: z.number().int().min(1).max(50).default(10),
        enableClustering: z.boolean().default(true),
        maxVectors: z.number().int().min(100).max(2000).default(500),
        format: z.enum(['json', 'summary', 'plotly']).default('summary')
    });

    try {
        const validated = schema.parse(args);

        console.log(`[VisualizeQuery] Visualizing query: "${validated.query}"`);

        // Import exporter
        const { VisualizationExporter } = await import('../../visualization/exporter.js');

        // Create visualizer
        const visualizer = new VectorVisualizer(
            context.vectorStoreClient,
            context.collectionName,
            context.embedder
        );

        // Visualize query
        const result = await visualizer.visualizeQuery({
            query: validated.query,
            dimensions: validated.dimensions,
            topK: validated.topK,
            enableClustering: validated.enableClustering,
            maxVectors: validated.maxVectors
        });

        // Export to requested format
        let output: string;
        if (validated.format === 'summary') {
            output = VisualizationExporter.exportSummary(result);
        } else if (validated.format === 'plotly') {
            const plotlyData = VisualizationExporter.exportToPlotlyFormat(result);
            output = JSON.stringify(plotlyData, null, 2);
        } else {
            output = VisualizationExporter.exportToCompactJSON(result);
        }

        const totalTime = result.metadata.performanceMetrics?.totalTime || 0;
        console.log(`[VisualizeQuery] Completed in ${totalTime}ms`);

        return {
            content: [
                {
                    type: 'text',
                    text: output
                }
            ]
        };
    } catch (error: any) {
        console.error('[VisualizeQuery] Error:', error);

        // Check if it's a UMAP availability error
        if (error.message?.includes('umap-js')) {
            return {
                content: [
                    {
                        type: 'text',
                        text: '❌ Visualization requires umap-js to be installed.\n\nPlease run:\n```bash\nnpm install umap-js\n```\n\nThen restart the MCP server.'
                    }
                ]
            };
        }

        return {
            content: [
                {
                    type: 'text',
                    text: `Failed to visualize query: ${error.message}`
                }
            ]
        };
    }
}

export async function handleExportVisualizationHtml(
    args: any,
    context: VisualizationHandlerContext
): Promise<{ content: Array<{ type: string; text: string }> }> {
    const schema = z.object({
        dimensions: z.union([z.literal(2), z.literal(3)]).default(2),
        enableClustering: z.boolean().default(true),
        maxVectors: z.number().int().min(100).max(5000).default(1000),
        outputPath: z.string().optional()
    });

    try {
        const validated = schema.parse(args);

        console.log(`[ExportVisualizationHtml] Generating HTML visualization`);

        // Import dependencies
        const { VisualizationExporter } = await import('../../visualization/exporter.js');
        const { generateVisualizationHTML } = await import('../templates/visualization.template.js');

        // Create visualizer
        const visualizer = new VectorVisualizer(
            context.vectorStoreClient,
            context.collectionName,
            context.embedder
        );

        // Visualize collection
        const result = await visualizer.visualizeCollection({
            dimensions: validated.dimensions,
            enableClustering: validated.enableClustering,
            maxVectors: validated.maxVectors
        });

        // Generate Plotly data and HTML
        const plotlyData = VisualizationExporter.exportToPlotlyFormat(result);
        const html = generateVisualizationHTML(plotlyData, result, context.collectionName);

        console.log(`[ExportVisualizationHtml] Generated HTML (${html.length} bytes, ${plotlyData.data?.length || 0} traces)`);

        // Determine output path
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const defaultFilename = `codebase-viz-${context.collectionName}-${timestamp}.html`;
        const outputPath = validated.outputPath || path.join(context.repoPath, defaultFilename);

        // Save to file
        fs.writeFileSync(outputPath, html, 'utf-8');

        const fileSize = (html.length / 1024).toFixed(2);
        const totalPoints = result.points?.length || 0;
        const numClusters = result.clusters?.length || 0;

        console.log(`[ExportVisualizationHtml] Saved to: ${outputPath}`);

        return {
            content: [
                {
                    type: 'text',
                    text: `✅ **HTML Visualization Generated Successfully!**

📊 **Statistics:**
- Vectors: ${totalPoints.toLocaleString()}
- Clusters: ${numClusters}
- Dimensions: ${result.metadata.dimensions}D → ${result.metadata.reducedDimensions}D
- Traces: ${plotlyData.data?.length || 0}

📦 **File Info:**
- Size: ${fileSize} KB
- Path: \`${outputPath}\`

🌐 **Next Steps:**
1. Open the HTML file in your browser
2. Interactive features:
   - 🎨 Hover over points to see code details
   - 🖱️ Click clusters in sidebar to highlight
   - 📏 Drag to pan, scroll to zoom
   - 🔄 Use toolbar buttons for grid/reset
   - 💾 Export as PNG image

**Open in browser:**
\`\`\`bash
open "${outputPath}"
\`\`\`

Or on Linux/WSL:
\`\`\`bash
xdg-open "${outputPath}"
\`\`\`
`
                }
            ]
        };
    } catch (error: any) {
        console.error('[ExportVisualizationHtml] Error:', error);

        if (error.message?.includes('umap-js')) {
            return {
                content: [
                    {
                        type: 'text',
                        text: '❌ Visualization requires umap-js to be installed.\n\nPlease run:\n```bash\nnpm install umap-js\n```\n\nThen restart the MCP server.'
                    }
                ]
            };
        }

        return {
            content: [
                {
                    type: 'text',
                    text: `❌ Failed to generate HTML visualization: ${error.message}`
                }
            ]
        };
    }
}
