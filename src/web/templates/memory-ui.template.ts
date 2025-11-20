/**
 * Memory UI HTML Template
 * Interactive visualization for memory entities and relations
 */

export interface MemoryUITemplateConfig {
    title: string;
    port: number;
}

export function generateMemoryUITemplate(config: MemoryUITemplateConfig): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.title}</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            height: 100vh;
            overflow: hidden;
        }

        .container {
            display: flex;
            height: 100vh;
        }

        /* Sidebar */
        .sidebar {
            width: 320px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            padding: 20px;
            overflow-y: auto;
            box-shadow: 2px 0 10px rgba(0,0,0,0.1);
        }

        .sidebar h1 {
            font-size: 24px;
            margin-bottom: 20px;
            color: #667eea;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .stats-card {
            background: white;
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 15px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .stats-card h3 {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .stat-value {
            font-size: 32px;
            font-weight: bold;
            color: #667eea;
        }

        .search-box {
            width: 100%;
            padding: 12px 15px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            margin-bottom: 15px;
            transition: all 0.3s;
        }

        .search-box:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .filter-group {
            margin-bottom: 15px;
        }

        .filter-group label {
            display: block;
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
            font-weight: 600;
        }

        .filter-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .chip {
            padding: 6px 12px;
            background: #f5f5f5;
            border: 1px solid #e0e0e0;
            border-radius: 20px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .chip:hover {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }

        .chip.active {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }

        .entity-list {
            max-height: 400px;
            overflow-y: auto;
        }

        .entity-item {
            background: white;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.2s;
            border: 2px solid transparent;
        }

        .entity-item:hover {
            border-color: #667eea;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        }

        .entity-item.selected {
            border-color: #667eea;
            background: #f8f9ff;
        }

        .entity-name {
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
        }

        .entity-type {
            display: inline-block;
            padding: 3px 8px;
            background: #e3f2fd;
            color: #1976d2;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
        }

        /* Main Content */
        .main-content {
            flex: 1;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .graph-container {
            flex: 1;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            position: relative;
            overflow: hidden;
        }

        .graph-controls {
            position: absolute;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 10;
        }

        .btn {
            padding: 10px 16px;
            background: white;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .btn:hover {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }

        .btn.primary {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }

        .btn.primary:hover {
            background: #5568d3;
        }

        .detail-panel {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 16px;
            padding: 20px;
            max-height: 300px;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .detail-panel h2 {
            margin-bottom: 15px;
            color: #667eea;
        }

        .detail-section {
            margin-bottom: 15px;
        }

        .detail-section h4 {
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .detail-section p {
            font-size: 14px;
            line-height: 1.6;
        }

        .tag {
            display: inline-block;
            padding: 4px 10px;
            background: #f0f0f0;
            border-radius: 4px;
            font-size: 12px;
            margin: 2px;
        }

        .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 18px;
            color: #667eea;
        }

        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #999;
        }

        .empty-state svg {
            width: 100px;
            height: 100px;
            margin-bottom: 20px;
            opacity: 0.3;
        }

        /* Graph Styles */
        .node circle {
            stroke: #fff;
            stroke-width: 2px;
            cursor: pointer;
        }

        .node text {
            font-size: 11px;
            pointer-events: none;
            user-select: none;
        }

        .link {
            stroke: #999;
            stroke-opacity: 0.6;
            stroke-width: 1.5px;
        }

        .node:hover circle {
            stroke-width: 3px;
        }

        /* Scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
        }

        ::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
            background: #667eea;
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: #5568d3;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Sidebar -->
        <div class="sidebar">
            <h1>
                <span>🧠</span>
                Memory Explorer
            </h1>

            <!-- Stats -->
            <div class="stats-card">
                <h3>Total Entities</h3>
                <div class="stat-value" id="totalEntities">-</div>
            </div>

            <!-- Search -->
            <input 
                type="text" 
                class="search-box" 
                id="searchBox"
                placeholder="Search memory..."
            />

            <!-- Filters -->
            <div class="filter-group">
                <label>Entity Types</label>
                <div class="filter-chips" id="typeFilters"></div>
            </div>

            <div class="filter-group">
                <label>Categories</label>
                <div class="filter-chips" id="categoryFilters"></div>
            </div>

            <!-- Entity List -->
            <h3 style="margin: 20px 0 10px; font-size: 14px; color: #666;">ENTITIES</h3>
            <div class="entity-list" id="entityList"></div>
        </div>

        <!-- Main Content -->
        <div class="main-content">
            <!-- Graph -->
            <div class="graph-container" id="graphContainer">
                <div class="graph-controls">
                    <button class="btn" onclick="resetZoom()">🔍 Reset Zoom</button>
                    <button class="btn" onclick="refreshData()">🔄 Refresh</button>
                </div>
                <svg id="graph"></svg>
            </div>

            <!-- Detail Panel -->
            <div class="detail-panel" id="detailPanel" style="display: none;">
                <h2 id="detailTitle">Select an entity</h2>
                <div id="detailContent"></div>
            </div>
        </div>
    </div>

    <script>
        const API_BASE = '';
        let allEntities = [];
        let filteredEntities = [];
        let selectedEntity = null;
        let simulation = null;

        // Load data on page load
        window.addEventListener('DOMContentLoaded', () => {
            loadData();
        });

        async function loadData() {
            try {
                // Load stats
                const statsRes = await fetch(\`\${API_BASE}/api/memory/stats\`);
                const stats = await statsRes.json();
                
                document.getElementById('totalEntities').textContent = stats.totalEntities || 0;

                // Populate filters
                populateFilters(stats.typeDistribution, 'typeFilters');
                populateFilters(stats.categoryDistribution, 'categoryFilters');

                // Load entities
                const entitiesRes = await fetch(\`\${API_BASE}/api/memory/entities?limit=1000\`);
                const data = await entitiesRes.json();
                
                allEntities = data.entities || [];
                filteredEntities = allEntities;

                renderEntityList();
                renderGraph();
            } catch (error) {
                console.error('Failed to load data:', error);
                showError('Failed to load memory data. Make sure the server is running.');
            }
        }

        function populateFilters(distribution, containerId) {
            const container = document.getElementById(containerId);
            container.innerHTML = '';

            Object.entries(distribution || {}).forEach(([key, count]) => {
                const chip = document.createElement('div');
                chip.className = 'chip';
                chip.textContent = \`\${key} (\${count})\`;
                chip.onclick = () => toggleFilter(chip, key, containerId);
                container.appendChild(chip);
            });
        }

        function toggleFilter(chip, value, type) {
            chip.classList.toggle('active');
            applyFilters();
        }

        function applyFilters() {
            const activeTypes = Array.from(document.querySelectorAll('#typeFilters .chip.active'))
                .map(chip => chip.textContent.split(' (')[0]);
            const activeCategories = Array.from(document.querySelectorAll('#categoryFilters .chip.active'))
                .map(chip => chip.textContent.split(' (')[0]);
            const searchQuery = document.getElementById('searchBox').value.toLowerCase();

            filteredEntities = allEntities.filter(entity => {
                const matchesType = activeTypes.length === 0 || activeTypes.includes(entity.type);
                const matchesCategory = activeCategories.length === 0 || activeCategories.includes(entity.category);
                const matchesSearch = !searchQuery || 
                    entity.name.toLowerCase().includes(searchQuery) ||
                    (entity.observations || []).some(o => o.toLowerCase().includes(searchQuery));

                return matchesType && matchesCategory && matchesSearch;
            });

            renderEntityList();
            renderGraph();
        }

        // Search box
        document.getElementById('searchBox').addEventListener('input', applyFilters);

        function renderEntityList() {
            const container = document.getElementById('entityList');
            container.innerHTML = '';

            if (filteredEntities.length === 0) {
                container.innerHTML = '<div class="empty-state">No entities found</div>';
                return;
            }

            filteredEntities.slice(0, 50).forEach(entity => {
                const item = document.createElement('div');
                item.className = 'entity-item';
                if (selectedEntity && selectedEntity.id === entity.id) {
                    item.classList.add('selected');
                }

                item.innerHTML = \`
                    <div class="entity-name">\${entity.name}</div>
                    <span class="entity-type">\${entity.type}</span>
                \`;

                item.onclick = () => selectEntity(entity);
                container.appendChild(item);
            });
        }

        function selectEntity(entity) {
            selectedEntity = entity;
            renderEntityList();
            showEntityDetails(entity);
            highlightNode(entity.id);
        }

        function showEntityDetails(entity) {
            const panel = document.getElementById('detailPanel');
            const title = document.getElementById('detailTitle');
            const content = document.getElementById('detailContent');

            panel.style.display = 'block';
            title.textContent = entity.name;

            content.innerHTML = \`
                <div class="detail-section">
                    <h4>Type</h4>
                    <p>\${entity.type}</p>
                </div>
                <div class="detail-section">
                    <h4>Category</h4>
                    <p>\${entity.category || 'N/A'}</p>
                </div>
                <div class="detail-section">
                    <h4>Observations</h4>
                    <p>\${(entity.observations || []).join('<br>')}</p>
                </div>
                \${entity.relatedFiles && entity.relatedFiles.length > 0 ? \`
                <div class="detail-section">
                    <h4>Related Files</h4>
                    <p>\${entity.relatedFiles.join('<br>')}</p>
                </div>
                \` : ''}
                \${entity.dependencies && entity.dependencies.length > 0 ? \`
                <div class="detail-section">
                    <h4>Dependencies</h4>
                    <p>\${entity.dependencies.map(d => \`<span class="tag">\${d}</span>\`).join(' ')}</p>
                </div>
                \` : ''}
                \${entity.tags && entity.tags.length > 0 ? \`
                <div class="detail-section">
                    <h4>Tags</h4>
                    <p>\${entity.tags.map(t => \`<span class="tag">\${t}</span>\`).join(' ')}</p>
                </div>
                \` : ''}
            \`;
        }

        function renderGraph() {
            const container = document.getElementById('graphContainer');
            const svg = d3.select('#graph');
            svg.selectAll('*').remove();

            const width = container.clientWidth;
            const height = container.clientHeight;

            svg.attr('width', width).attr('height', height);

            // Prepare nodes
            const nodes = filteredEntities.map(e => ({
                id: e.id,
                name: e.name,
                type: e.type,
                category: e.category
            }));

            // Prepare links (based on related components)
            const links = [];
            filteredEntities.forEach(entity => {
                (entity.relatedComponents || []).forEach(comp => {
                    const target = filteredEntities.find(e => e.name === comp);
                    if (target) {
                        links.push({
                            source: entity.id,
                            target: target.id
                        });
                    }
                });
            });

            // Color scale
            const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

            // Force simulation
            simulation = d3.forceSimulation(nodes)
                .force('link', d3.forceLink(links).id(d => d.id).distance(100))
                .force('charge', d3.forceManyBody().strength(-300))
                .force('center', d3.forceCenter(width / 2, height / 2))
                .force('collision', d3.forceCollide().radius(30));

            // Add zoom
            const g = svg.append('g');
            const zoom = d3.zoom()
                .scaleExtent([0.1, 4])
                .on('zoom', (event) => {
                    g.attr('transform', event.transform);
                });
            svg.call(zoom);

            // Add links
            const link = g.append('g')
                .selectAll('line')
                .data(links)
                .join('line')
                .attr('class', 'link');

            // Add nodes
            const node = g.append('g')
                .selectAll('g')
                .data(nodes)
                .join('g')
                .attr('class', 'node')
                .call(drag(simulation));

            node.append('circle')
                .attr('r', 10)
                .attr('fill', d => colorScale(d.type))
                .on('click', (event, d) => {
                    const entity = filteredEntities.find(e => e.id === d.id);
                    if (entity) selectEntity(entity);
                });

            node.append('text')
                .attr('x', 15)
                .attr('y', 4)
                .text(d => d.name);

            simulation.on('tick', () => {
                link
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);

                node.attr('transform', d => \`translate(\${d.x},\${d.y})\`);
            });

            // Store zoom for reset
            window.currentZoom = zoom;
            window.currentSvg = svg;
        }

        function drag(simulation) {
            function dragstarted(event) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
            }

            function dragged(event) {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            }

            function dragended(event) {
                if (!event.active) simulation.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
            }

            return d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended);
        }

        function highlightNode(nodeId) {
            d3.selectAll('.node circle').attr('stroke-width', 2);
            d3.select(\`.node circle[data-id="\${nodeId}"]\`).attr('stroke-width', 4);
        }

        function resetZoom() {
            if (window.currentSvg && window.currentZoom) {
                window.currentSvg.transition().duration(750).call(
                    window.currentZoom.transform,
                    d3.zoomIdentity
                );
            }
        }

        function refreshData() {
            loadData();
        }

        function showError(message) {
            alert(message);
        }
    </script>
</body>
</html>`;
}
