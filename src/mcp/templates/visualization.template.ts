/**
 * HTML template for visualization with all fixes applied
 */

export function generateVisualizationHTML(
    plotlyData: any,
    data: any,
    collectionName: string
): string {
    const totalPoints = data.points?.length || 0;
    const numClusters = data.clusters?.length || 0;

    console.log('[Template] Generating HTML:', { totalPoints, numClusters, traces: plotlyData.data?.length });

    // Enhanced color palette for clusters
    const clusterColors = [
        '#667eea', '#764ba2', '#f093fb', '#4facfe',
        '#43e97b', '#fa709a', '#fee140', '#30cfd0',
        '#a8edea', '#fed6e3', '#c471f5', '#fa8bff'
    ];

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Codebase Visualization - ${collectionName}</title>
    <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
    <style>
        * { box-sizing: border-box; }
        
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "SF Pro Display", sans-serif;
            background: linear-gradient(135deg, #0a0e1a 0%, #1a1f35 100%);
            color: #e6edf3;
            overflow: hidden;
        }
        
        .container {
            display: grid;
            grid-template-columns: 320px 1fr;
            grid-template-rows: auto 1fr;
            height: 100vh;
            gap: 0;
        }
        
        .header {
            grid-column: 1 / -1;
            background: rgba(22, 27, 34, 0.95);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(48, 54, 61, 0.5);
            padding: 20px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        
        .header-left h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .header-left .subtitle {
            margin: 5px 0 0 0;
            font-size: 13px;
            color: #8b949e;
        }
        
        .header-right { display: flex; gap: 10px; }
        
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        
        .btn-secondary {
            background: rgba(48, 54, 61, 0.8);
            box-shadow: none;
        }
        
        .btn-secondary:hover {
            background: rgba(48, 54, 61, 1);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        
        .sidebar {
            background: rgba(22, 27, 34, 0.95);
            backdrop-filter: blur(20px);
            border-right: 1px solid rgba(48, 54, 61, 0.5);
            padding: 20px;
            overflow-y: auto;
            box-shadow: 4px 0 20px rgba(0, 0, 0, 0.2);
        }
        
        .sidebar::-webkit-scrollbar { width: 8px; }
        .sidebar::-webkit-scrollbar-track { background: rgba(13, 17, 23, 0.5); border-radius: 4px; }
        .sidebar::-webkit-scrollbar-thumb { background: rgba(88, 166, 255, 0.3); border-radius: 4px; }
        .sidebar::-webkit-scrollbar-thumb:hover { background: rgba(88, 166, 255, 0.5); }
        
        .stats-card {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
            border: 1px solid rgba(102, 126, 234, 0.2);
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 20px;
        }
        
        .stat-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid rgba(48, 54, 61, 0.3);
        }
        
        .stat-item:last-child { border-bottom: none; }
        
        .stat-label {
            font-size: 12px;
            color: #8b949e;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .stat-value {
            font-size: 18px;
            font-weight: 600;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .section-title {
            font-size: 14px;
            font-weight: 600;
            color: #e6edf3;
            margin: 20px 0 10px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .cluster-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .cluster-item {
            background: rgba(13, 17, 23, 0.6);
            border: 1px solid rgba(48, 54, 61, 0.5);
            border-radius: 8px;
            padding: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            animation: fadeIn 0.3s ease forwards;
        }
        
        .cluster-item:hover {
            border-color: rgba(102, 126, 234, 0.5);
            background: rgba(22, 27, 34, 0.8);
            transform: translateX(5px);
        }
        
        .cluster-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
        }
        
        .cluster-color {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            box-shadow: 0 0 10px currentColor;
            flex-shrink: 0;
        }
        
        .cluster-name {
            font-size: 13px;
            font-weight: 600;
            color: #e6edf3;
            flex: 1;
        }
        
        .cluster-count {
            font-size: 11px;
            color: #8b949e;
            background: rgba(48, 54, 61, 0.5);
            padding: 2px 8px;
            border-radius: 12px;
        }
        
        .cluster-files {
            font-size: 11px;
            color: #6e7681;
            line-height: 1.6;
            font-family: 'SF Mono', 'Monaco', monospace;
            margin-top: 6px;
        }
        
        .main-content {
            position: relative;
            background: rgba(13, 17, 23, 0.5);
        }
        
        #plot { width: 100%; height: 100%; }
        
        /* Modal for vector details */
        .modal-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            z-index: 1000;
            animation: fadeIn 0.2s ease;
        }
        
        .modal-overlay.active { display: flex; justify-content: center; align-items: center; }
        
        .modal-content {
            background: rgba(22, 27, 34, 0.98);
            border: 1px solid rgba(102, 126, 234, 0.3);
            border-radius: 16px;
            max-width: 800px;
            max-height: 80vh;
            width: 90%;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            display: flex;
            flex-direction: column;
        }
        
        .modal-header {
            padding: 20px 25px;
            border-bottom: 1px solid rgba(48, 54, 61, 0.5);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
        }
        
        .modal-title {
            font-size: 16px;
            font-weight: 600;
            color: #e6edf3;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .modal-close {
            background: none;
            border: none;
            color: #8b949e;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: all 0.2s ease;
        }
        
        .modal-close:hover {
            background: rgba(48, 54, 61, 0.5);
            color: #e6edf3;
        }
        
        .modal-body {
            padding: 25px;
            overflow-y: auto;
        }
        
        .modal-body::-webkit-scrollbar { width: 8px; }
        .modal-body::-webkit-scrollbar-track { background: rgba(13, 17, 23, 0.5); border-radius: 4px; }
        .modal-body::-webkit-scrollbar-thumb { background: rgba(88, 166, 255, 0.3); border-radius: 4px; }
        
        .detail-section {
            margin-bottom: 20px;
        }
        
        .detail-label {
            font-size: 11px;
            color: #8b949e;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }
        
        .detail-value {
            font-size: 14px;
            color: #e6edf3;
            line-height: 1.6;
        }
        
        .file-path {
            font-family: 'SF Mono', 'Monaco', monospace;
            background: rgba(13, 17, 23, 0.6);
            padding: 10px 15px;
            border-radius: 8px;
            border-left: 3px solid;
            word-break: break-all;
        }
        
        .code-preview {
            font-family: 'SF Mono', 'Monaco', monospace;
            font-size: 12px;
            background: rgba(13, 17, 23, 0.8);
            padding: 15px;
            border-radius: 8px;
            border: 1px solid rgba(48, 54, 61, 0.5);
            overflow-x: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
            line-height: 1.6;
            max-height: 300px;
            overflow-y: auto;
        }
        
        .cluster-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(13, 17, 23, 0.6);
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 13px;
        }
        
        .cluster-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            box-shadow: 0 0 8px currentColor;
        }
        
        /* Guide panel */
        .guide-panel {
            position: absolute;
            bottom: 20px;
            left: 20px;
            background: rgba(22, 27, 34, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(48, 54, 61, 0.5);
            border-radius: 12px;
            max-width: 350px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
            overflow: hidden;
        }
        
        .guide-header {
            padding: 15px 20px;
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
            border-bottom: 1px solid rgba(48, 54, 61, 0.5);
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
        }
        
        .guide-title {
            font-size: 13px;
            font-weight: 600;
            color: #e6edf3;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .guide-toggle {
            font-size: 18px;
            transition: transform 0.3s ease;
        }
        
        .guide-toggle.collapsed { transform: rotate(-90deg); }
        
        .guide-content {
            max-height: 400px;
            overflow-y: auto;
            transition: max-height 0.3s ease;
        }
        
        .guide-content.collapsed { max-height: 0; }
        
        .guide-content::-webkit-scrollbar { width: 6px; }
        .guide-content::-webkit-scrollbar-track { background: rgba(13, 17, 23, 0.5); }
        .guide-content::-webkit-scrollbar-thumb { background: rgba(88, 166, 255, 0.3); border-radius: 3px; }
        
        .guide-section {
            padding: 15px 20px;
            border-bottom: 1px solid rgba(48, 54, 61, 0.3);
        }
        
        .guide-section:last-child { border-bottom: none; }
        
        .guide-section-title {
            font-size: 12px;
            font-weight: 600;
            color: #667eea;
            margin-bottom: 8px;
        }
        
        .guide-item {
            font-size: 11px;
            color: #8b949e;
            margin: 8px 0;
            padding-left: 15px;
            position: relative;
            line-height: 1.6;
        }
        
        .guide-item strong {
            color: #667eea;
            font-weight: 600;
        }
        
        .guide-item:before {
            content: '→';
            position: absolute;
            left: 0;
            top: 0;
            color: #667eea;
        }
        
        .tooltip {
            position: relative;
            display: inline-flex;
            align-items: center;
            cursor: help;
        }
        
        .tooltip-icon {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: rgba(102, 126, 234, 0.2);
            color: #667eea;
            font-size: 11px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: 6px;
            transition: all 0.2s ease;
        }
        
        .tooltip-icon:hover {
            background: rgba(102, 126, 234, 0.3);
            transform: scale(1.1);
        }
        
        .tooltip-text {
            visibility: hidden;
            opacity: 0;
            position: absolute;
            bottom: 125%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(22, 27, 34, 0.98);
            color: #e6edf3;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 11px;
            line-height: 1.6;
            white-space: nowrap;
            max-width: 300px;
            border: 1px solid rgba(102, 126, 234, 0.3);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            z-index: 1001;
            transition: all 0.3s ease;
        }
        
        .tooltip:hover .tooltip-text {
            visibility: visible;
            opacity: 1;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @media (max-width: 1024px) {
            .container { grid-template-columns: 1fr; }
            .sidebar { display: none; }
            .guide-panel { max-width: calc(100% - 40px); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-left">
                <h1>
                    <span>&#x1F3A8;</span>
                    <span>Codebase Vector Visualization</span>
                </h1>
                <div class="subtitle">
                    ${collectionName} &bull; ${totalPoints.toLocaleString()} vectors &bull; ${numClusters} clusters
                </div>
            </div>
            <div class="header-right">
                <button class="btn btn-secondary" onclick="resetView()">
                    &#x1F504; Reset View
                </button>
                <button class="btn" onclick="downloadImage()">
                    &#x1F4BE; Export PNG
                </button>
            </div>
        </div>
        
        <div class="sidebar">
            <div class="stats-card">
                <div class="stat-item">
                    <span class="stat-label">Vectors</span>
                    <span class="stat-value">${totalPoints.toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Clusters</span>
                    <span class="stat-value">${numClusters}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Dimensions</span>
                    <span class="stat-value">${data.metadata.dimensions}D &rarr; ${data.metadata.reducedDimensions}D</span>
                    <div class="tooltip">
                        <span class="tooltip-icon">?</span>
                        <span class="tooltip-text">Reduced from ${data.metadata.dimensions}D embeddings to ${data.metadata.reducedDimensions}D using UMAP algorithm for visualization</span>
                    </div>
                </div>
            </div>
            
            <div class="section-title" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="toggleClusters()">
                <span>
                    &#x1F4CA; Semantic Clusters
                    <div class="tooltip" style="display: inline-flex;">
                        <span class="tooltip-icon">?</span>
                        <span class="tooltip-text">K-means clustering groups similar code vectors together based on semantic meaning</span>
                    </div>
                </span>
                <span class="cluster-toggle" id="clusterToggle" style="font-size: 16px; transition: transform 0.3s ease;">&#x25BC;</span>
            </div>
            <div class="cluster-list" id="clusterList" style="transition: max-height 0.3s ease, opacity 0.3s ease; overflow: hidden;"></div>
        </div>
        
        <div class="main-content">
            <div id="plot"></div>
            
            <!-- User Guide Panel -->
            <div class="guide-panel">
                <div class="guide-header" onclick="toggleGuide()">
                    <span class="guide-title">
                        <span>&#x1F4D6;</span>
                        <span>Quick Guide</span>
                    </span>
                    <span class="guide-toggle" id="guideToggle">&#x25BC;</span>
                </div>
                <div class="guide-content" id="guideContent">
                    <div class="guide-section">
                        <div class="guide-section-title">&#x1F50D; Interaction</div>
                        <div class="guide-item">Hover over points to see details</div>
                        <div class="guide-item">Click points to view full code</div>
                        <div class="guide-item">Click clusters to highlight them</div>
                    </div>
                    <div class="guide-section">
                        <div class="guide-section-title">&#x1F4CA; Understanding the Visualization</div>
                        <div class="guide-item"><strong>Proximity:</strong> Points closer together represent semantically similar code. The distance reflects how similar their functionality, structure, or purpose is.</div>
                        <div class="guide-item"><strong>Clusters:</strong> Same-colored points belong to the same cluster, indicating code with related patterns or functionalities discovered by k-means algorithm.</div>
                        <div class="guide-item"><strong>UMAP Algorithm:</strong> Your codebase is represented as 768-dimensional vectors (embeddings). UMAP reduces these to 2D while preserving the local neighborhood structure, making similar code stay close together.</div>
                        <div class="guide-item"><strong>Use Case:</strong> Identify code duplication, find related functionality, discover architectural patterns, or locate where specific features are implemented.</div>
                    </div>
                    <div class="guide-section">
                        <div class="guide-section-title">&#x2328; Keyboard Shortcuts</div>
                        <div class="guide-item">R - Reset view</div>
                        <div class="guide-item">ESC - Close modal</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Vector Details Modal -->
    <div class="modal-overlay" id="vectorModal" onclick="closeModal(event)">
        <div class="modal-content" onclick="event.stopPropagation()">
            <div class="modal-header">
                <div class="modal-title">
                    <span>&#x1F4C4;</span>
                    <span>Vector Details</span>
                </div>
                <button class="modal-close" onclick="closeModal()">&times;</button>
            </div>
            <div class="modal-body" id="modalBody">
                <!-- Content injected by JavaScript -->
            </div>
        </div>
    </div>

    <script>
        // PERFORMANCE: Debounce helper
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
        
        const plotlyData = ${JSON.stringify(plotlyData)};
        const clusterColors = ${JSON.stringify(clusterColors)};
        
        console.log('📊 Loaded data:', { traces: plotlyData.data.length, colors: clusterColors.length });
        
        // Apply colors to ALL traces properly + switch to WebGL for performance
        plotlyData.data.forEach((trace, i) => {
            if (!trace.x || trace.x.length === 0) {
                console.log(\`  ⏭️  Skipping empty trace \${i}\`);
                return;
            }
            
            const colorIndex = i % clusterColors.length;
            const color = clusterColors[colorIndex];
            
            // PERFORMANCE: Use scattergl (WebGL) instead of scatter (SVG) for 10x speed
            trace.type = 'scattergl';
            trace.mode = 'markers';
            
            // Force set marker color (critical fix!)
            trace.marker = {
                ...trace.marker,
                color: color,
                size: 10,
                opacity: 0.8,
                line: {
                    width: 1,
                    color: 'rgba(255, 255, 255, 0.4)'
                }
            };
            
            console.log(\`  ✅ Trace \${i} (\${trace.name}): \${trace.x.length} points, color: \${color}, type: scattergl\`);
        });
        
        const layout = {
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(13, 17, 23, 0.5)',
            font: { 
                color: '#e6edf3',
                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
                size: 12
            },
            hovermode: 'closest',
            showlegend: false,
            margin: { l: 60, r: 60, t: 60, b: 60 },
            // PERFORMANCE: Disable animations from the start
            transition: { duration: 0 },
            xaxis: {
                gridcolor: 'rgba(48, 54, 61, 0.3)',
                zerolinecolor: 'rgba(88, 166, 255, 0.2)',
                showgrid: true,
                zeroline: true,
                title: { text: 'UMAP Dimension 1', font: { size: 14, color: '#8b949e' } }
            },
            yaxis: {
                gridcolor: 'rgba(48, 54, 61, 0.3)',
                zerolinecolor: 'rgba(88, 166, 255, 0.2)',
                showgrid: true,
                zeroline: true,
                title: { text: 'UMAP Dimension 2', font: { size: 14, color: '#8b949e' } }
            },
            hoverlabel: {
                bgcolor: 'rgba(22, 27, 34, 0.95)',
                bordercolor: 'rgba(102, 126, 234, 0.5)',
                font: { 
                    family: 'SF Mono, Monaco, monospace',
                    size: 11,
                    color: '#e6edf3'
                }
            }
        };

        const config = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['lasso2d', 'select2d'],
            // PERFORMANCE: Disable animations for scattergl (huge speedup!)
            staticPlot: false,
            toImageButtonOptions: {
                format: 'png',
                filename: 'codebase-visualization',
                height: 1200,
                width: 1600,
                scale: 2
            }
        };

        Plotly.newPlot('plot', plotlyData.data, layout, config);
        console.log('📈 Plot created');
        
        // Add click handler for points
        document.getElementById('plot').on('plotly_click', function(eventData) {
            if (eventData.points && eventData.points.length > 0) {
                const point = eventData.points[0];
                const traceIndex = point.curveNumber;
                const pointIndex = point.pointIndex;
                const trace = plotlyData.data[traceIndex];
                
                // Extract details from hover text
                const hoverText = trace.text[pointIndex];
                const lines = hoverText.split('<br>');
                const filePath = lines[0] || 'Unknown';
                const linesInfo = lines[1] || '';
                const codePreview = lines[2] || '';
                
                // Get cluster info
                const clusterColor = clusterColors[traceIndex % clusterColors.length];
                const clusterName = trace.name || \`Cluster \${traceIndex + 1}\`;
                
                // Show modal with details
                showVectorDetails({
                    filePath,
                    linesInfo,
                    codePreview,
                    clusterName,
                    clusterColor,
                    x: point.x,
                    y: point.y
                });
            }
        });

        // Populate cluster list
        const clusterList = document.getElementById('clusterList');
        let clusterCount = 0;
        
        plotlyData.data.forEach((trace, i) => {
            if (!trace.x || trace.x.length === 0) return;
            
            const colorIndex = i % clusterColors.length;
            const color = clusterColors[colorIndex];
            const size = trace.x.length;
            
            // Extract files
            const files = new Set();
            if (trace.text && Array.isArray(trace.text)) {
                trace.text.forEach(t => {
                    if (typeof t === 'string') {
                        const match = t.match(/^([^<]+)/);
                        if (match) {
                            const filePath = match[1].trim();
                            const fileName = filePath.split('/').pop();
                            if (fileName) files.add(fileName);
                        }
                    }
                });
            }
            const topFiles = Array.from(files).slice(0, 3);
            
            const clusterItem = document.createElement('div');
            clusterItem.className = 'cluster-item';
            clusterItem.style.animationDelay = \`\${clusterCount * 0.05}s\`;
            clusterItem.innerHTML = \`
                <div class="cluster-header">
                    <div class="cluster-color" style="background: \${color};"></div>
                    <div class="cluster-name">\${trace.name || 'Cluster ' + (clusterCount + 1)}</div>
                    <div class="cluster-count">\${size}</div>
                </div>
                \${topFiles.length > 0 ? \`
                    <div class="cluster-files">&#x1F4C4; \${topFiles.join(', ')}</div>
                \` : ''}
            \`;
            
            // PERFORMANCE: Batch restyle with debouncing
            const highlightCluster = debounce(() => {
                const traceIndices = [];
                const sizes = [];
                const opacities = [];
                const colors = [];
                
                plotlyData.data.forEach((t, idx) => {
                    if (t.x && t.x.length > 0) {
                        traceIndices.push(idx);
                        if (idx === i) {
                            sizes.push(14);
                            opacities.push(1.0);
                            colors.push(color); // Brighter for selected
                        } else {
                            sizes.push(8);
                            opacities.push(0.3);
                            colors.push(clusterColors[idx % clusterColors.length]);
                        }
                    }
                });
                
                // FIX: Correct array syntax for Plotly.restyle
                Plotly.restyle('plot', {
                    'marker.size': sizes,
                    'marker.opacity': opacities,
                    'marker.color': colors
                }, traceIndices).then(() => {
                    // PERFORMANCE: Disable transition after restyle for smoother updates
                    Plotly.relayout('plot', { 'transition.duration': 0 });
                });
            }, 50); // 50ms debounce
            
            clusterItem.onclick = highlightCluster;
            
            clusterList.appendChild(clusterItem);
            clusterCount++;
        });
        
        console.log(\`✅ Created \${clusterCount} cluster items\`);
        
        // Initialize cluster list as expanded
        setTimeout(() => {
            const list = document.getElementById('clusterList');
            list.style.maxHeight = list.scrollHeight + 'px';
            list.style.opacity = '1';
        }, 100);

        // PERFORMANCE: Batch restyle for reset view with debouncing
        const resetView = debounce(() => {
            Plotly.relayout('plot', { 'xaxis.autorange': true, 'yaxis.autorange': true });
            
            const traceIndices = [];
            const sizes = [];
            const opacities = [];
            const colors = [];
            
            plotlyData.data.forEach((t, idx) => {
                if (t.x && t.x.length > 0) {
                    traceIndices.push(idx);
                    sizes.push(10);
                    opacities.push(0.8);
                    // CRITICAL: Restore original color from clusterColors
                    colors.push(clusterColors[idx % clusterColors.length]);
                }
            });
            
            // Single Plotly.restyle() call with COLOR restoration
            Plotly.restyle('plot', {
                'marker.size': sizes,
                'marker.opacity': opacities,
                'marker.color': colors  // FIX: Must restore colors!
            }, traceIndices).then(() => {
                // PERFORMANCE: Disable transition
                Plotly.relayout('plot', { 'transition.duration': 0 });
            });
        }, 100); // 100ms debounce

        function downloadImage() {
            Plotly.downloadImage('plot', {
                format: 'png',
                width: 1920,
                height: 1080,
                filename: 'codebase-visualization-${collectionName}'
            });
        }
        
        // Modal functions
        function showVectorDetails(details) {
            const modal = document.getElementById('vectorModal');
            const modalBody = document.getElementById('modalBody');
            
            modalBody.innerHTML = \`
                <div class="detail-section">
                    <div class="detail-label">File Path</div>
                    <div class="file-path" style="border-color: \${details.clusterColor};">
                        \${details.filePath}
                    </div>
                </div>
                
                <div class="detail-section">
                    <div class="detail-label">Cluster</div>
                    <div class="cluster-badge">
                        <div class="cluster-dot" style="background: \${details.clusterColor};"></div>
                        <span>\${details.clusterName}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <div class="detail-label">\${details.linesInfo}</div>
                    <div class="code-preview">\${details.codePreview}</div>
                </div>
                
                <div class="detail-section">
                    <div class="detail-label">Position in UMAP Space</div>
                    <div class="detail-value">
                        X: \${details.x.toFixed(2)} &nbsp;&nbsp;&nbsp; Y: \${details.y.toFixed(2)}
                    </div>
                </div>
            \`;
            
            modal.classList.add('active');
        }
        
        function closeModal(event) {
            if (!event || event.target.id === 'vectorModal') {
                document.getElementById('vectorModal').classList.remove('active');
            }
        }
        
        // Guide panel toggle
        function toggleGuide() {
            const content = document.getElementById('guideContent');
            const toggle = document.getElementById('guideToggle');
            content.classList.toggle('collapsed');
            toggle.classList.toggle('collapsed');
        }
        
        // Cluster list toggle
        function toggleClusters() {
            const list = document.getElementById('clusterList');
            const toggle = document.getElementById('clusterToggle');
            
            if (list.style.maxHeight && list.style.maxHeight !== '0px') {
                list.style.maxHeight = '0px';
                list.style.opacity = '0';
                toggle.style.transform = 'rotate(-90deg)';
            } else {
                list.style.maxHeight = list.scrollHeight + 'px';
                list.style.opacity = '1';
                toggle.style.transform = 'rotate(0deg)';
            }
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
            if (e.key === 'r' || e.key === 'R') resetView();
        });

        console.log('🎉 Visualization ready!', {
            points: ${totalPoints},
            clusters: clusterCount,
            colors: clusterColors.length
        });
    </script>
</body>
</html>`;
}
