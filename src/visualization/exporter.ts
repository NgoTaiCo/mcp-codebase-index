// src/visualization/exporter.ts

import { VisualizationData, ExportOptions } from './types.js';

/**
 * Export visualization data to various formats
 */
export class VisualizationExporter {
    /**
     * Export to JSON format
     */
    static exportToJSON(data: VisualizationData): string {
        try {
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('[Exporter] Error exporting to JSON:', error);
            throw new Error(`Failed to export to JSON: ${error}`);
        }
    }

    /**
     * Export to compact JSON (for MCP response)
     */
    static exportToCompactJSON(data: VisualizationData): string {
        try {
            // Create a more compact version for MCP
            const compact = {
                points: data.points.map(p => ({
                    id: p.id,
                    x: Math.round(p.x * 1000) / 1000, // Round to 3 decimals
                    y: Math.round(p.y * 1000) / 1000,
                    z: p.z ? Math.round(p.z * 1000) / 1000 : undefined,
                    file: p.filePath,
                    content: p.chunkContent.substring(0, 200), // Truncate content
                    lines: `${p.startLine}-${p.endLine}`,
                    lang: p.language,
                    cat: p.category,
                    cluster: p.clusterId,
                    score: p.similarityScore ? Math.round(p.similarityScore * 1000) / 1000 : undefined
                })),
                clusters: data.clusters?.map(c => ({
                    id: c.id,
                    size: c.size,
                    files: c.topFiles,
                    langs: c.topLanguages
                })),
                query: data.queryPoint ? {
                    x: Math.round(data.queryPoint.x * 1000) / 1000,
                    y: Math.round(data.queryPoint.y * 1000) / 1000,
                    z: data.queryPoint.z ? Math.round(data.queryPoint.z * 1000) / 1000 : undefined,
                    text: data.queryPoint.chunkContent
                } : undefined,
                retrieved: data.retrievedPoints?.map(p => p.id),
                meta: {
                    total: data.metadata.totalVectors,
                    dims: data.metadata.dimensions,
                    reduced: data.metadata.reducedDimensions,
                    collection: data.metadata.collectionName,
                    time: data.metadata.performanceMetrics?.totalTime
                }
            };

            return JSON.stringify(compact);
        } catch (error) {
            console.error('[Exporter] Error exporting to compact JSON:', error);
            throw new Error(`Failed to export to compact JSON: ${error}`);
        }
    }

    /**
     * Export to Plotly-compatible format
     */
    static exportToPlotlyFormat(data: VisualizationData): any {
        try {
            const traces: any[] = [];

            // Group points by category
            const categories = ['chunk', 'query', 'retrieved'];
            const colors = {
                chunk: 'rgba(100, 100, 100, 0.5)',
                query: 'rgba(255, 0, 0, 1)',
                retrieved: 'rgba(0, 255, 0, 0.8)'
            };
            const sizes = {
                chunk: 5,
                query: 15,
                retrieved: 10
            };

            categories.forEach(category => {
                const categoryPoints = data.points.filter(p => p.category === category);
                
                if (categoryPoints.length > 0) {
                    const trace: any = {
                        x: categoryPoints.map(p => p.x),
                        y: categoryPoints.map(p => p.y),
                        mode: 'markers',
                        type: data.metadata.reducedDimensions === 3 ? 'scatter3d' : 'scatter',
                        name: category.charAt(0).toUpperCase() + category.slice(1),
                        marker: {
                            color: colors[category as keyof typeof colors],
                            size: sizes[category as keyof typeof sizes],
                            line: {
                                width: 0
                            }
                        },
                        text: categoryPoints.map(p => 
                            `${p.filePath}<br>Lines: ${p.startLine}-${p.endLine}<br>${p.chunkContent.substring(0, 100)}...`
                        ),
                        hoverinfo: 'text'
                    };

                    if (data.metadata.reducedDimensions === 3) {
                        trace.z = categoryPoints.map(p => p.z);
                    }

                    traces.push(trace);
                }
            });

            // Add query point if exists
            if (data.queryPoint) {
                const queryTrace: any = {
                    x: [data.queryPoint.x],
                    y: [data.queryPoint.y],
                    mode: 'markers',
                    type: data.metadata.reducedDimensions === 3 ? 'scatter3d' : 'scatter',
                    name: 'Query',
                    marker: {
                        color: 'rgba(255, 0, 0, 1)',
                        size: 15,
                        symbol: 'diamond',
                        line: {
                            width: 2,
                            color: 'white'
                        }
                    },
                    text: [`Query: ${data.queryPoint.chunkContent}`],
                    hoverinfo: 'text'
                };

                if (data.metadata.reducedDimensions === 3) {
                    queryTrace.z = [data.queryPoint.z];
                }

                traces.push(queryTrace);
            }

            const layout: any = {
                title: `Vector Visualization - ${data.metadata.collectionName}`,
                hovermode: 'closest',
                showlegend: true,
                legend: {
                    x: 0.5,
                    y: 1,
                    xanchor: 'center',
                    yanchor: 'top',
                    orientation: 'h'
                }
            };

            if (data.metadata.reducedDimensions === 3) {
                layout.scene = {
                    xaxis: { title: 'UMAP 1' },
                    yaxis: { title: 'UMAP 2' },
                    zaxis: { title: 'UMAP 3' }
                };
            } else {
                layout.xaxis = { title: 'UMAP 1' };
                layout.yaxis = { title: 'UMAP 2' };
            }

            return {
                data: traces,
                layout
            };
        } catch (error) {
            console.error('[Exporter] Error exporting to Plotly format:', error);
            throw new Error(`Failed to export to Plotly format: ${error}`);
        }
    }

    /**
     * Export summary statistics
     */
    static exportSummary(data: VisualizationData): string {
        try {
            const lines: string[] = [];

            lines.push('=== Vector Visualization Summary ===');
            lines.push('');
            lines.push(`Collection: ${data.metadata.collectionName}`);
            lines.push(`Total Vectors: ${data.metadata.totalVectors}`);
            lines.push(`Visualized Points: ${data.points.length}`);
            lines.push(`Original Dimensions: ${data.metadata.dimensions}`);
            lines.push(`Reduced Dimensions: ${data.metadata.reducedDimensions}`);
            lines.push('');

            if (data.metadata.performanceMetrics) {
                lines.push('Performance Metrics:');
                lines.push(`  Reduction Time: ${data.metadata.performanceMetrics.reductionTime}ms`);
                if (data.metadata.performanceMetrics.clusteringTime) {
                    lines.push(`  Clustering Time: ${data.metadata.performanceMetrics.clusteringTime}ms`);
                }
                lines.push(`  Total Time: ${data.metadata.performanceMetrics.totalTime}ms`);
                lines.push('');
            }

            if (data.clusters && data.clusters.length > 0) {
                lines.push(`Clusters: ${data.clusters.length}`);
                data.clusters.forEach(cluster => {
                    lines.push(`  Cluster ${cluster.id}: ${cluster.size} points`);
                    lines.push(`    Top Files: ${cluster.topFiles.join(', ')}`);
                    lines.push(`    Top Languages: ${cluster.topLanguages.join(', ')}`);
                });
                lines.push('');
            }

            if (data.queryPoint) {
                lines.push('Query:');
                lines.push(`  "${data.queryPoint.chunkContent.substring(0, 100)}..."`);
                lines.push('');
            }

            if (data.retrievedPoints && data.retrievedPoints.length > 0) {
                lines.push(`Retrieved Documents: ${data.retrievedPoints.length}`);
                data.retrievedPoints.forEach((point, i) => {
                    lines.push(`  ${i + 1}. ${point.filePath} (lines ${point.startLine}-${point.endLine})`);
                    if (point.similarityScore) {
                        lines.push(`     Similarity: ${(point.similarityScore * 100).toFixed(2)}%`);
                    }
                });
                lines.push('');
            }

            // Category breakdown
            const categoryCount = new Map<string, number>();
            data.points.forEach(p => {
                categoryCount.set(p.category, (categoryCount.get(p.category) || 0) + 1);
            });

            lines.push('Category Breakdown:');
            categoryCount.forEach((count, category) => {
                lines.push(`  ${category}: ${count} points`);
            });

            return lines.join('\n');
        } catch (error) {
            console.error('[Exporter] Error exporting summary:', error);
            throw new Error(`Failed to export summary: ${error}`);
        }
    }

    /**
     * Check if export size is within limit
     */
    static checkSizeLimit(data: string, maxSizeBytes: number = 1024 * 1024): boolean {
        const sizeBytes = Buffer.byteLength(data, 'utf8');
        return sizeBytes <= maxSizeBytes;
    }

    /**
     * Get export size in bytes
     */
    static getExportSize(data: string): number {
        return Buffer.byteLength(data, 'utf8');
    }
}

