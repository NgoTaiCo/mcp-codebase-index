# MCP Visualizations

This folder contains interactive vector-space visualizations exported from the MCP codebase tools (UMAP 2D + clustering) using Plotly.

Files:
- `collection_figure.json` — Plotly JSON for the collection (Chunk points).
- `collection_plot.html` — Renders `collection_figure.json` in the browser using Plotly.
- `query_figure.json` — (original) may contain a truncated/large record; a clean small sample is available in `query_figure_small.json`.
- `query_figure_small.json` — Combined JSON containing the collection (subset) plus a sample overlay query marker (Query: "openim").
- `query_plot.html` — Renders `query_figure_small.json` in the browser; falls back to `collection_figure.json` and overlays a query marker if needed.

How to open:
1. Serve this folder or open the HTML file directly in a browser.
   - Direct open: Double-click `collection_plot.html` or `query_plot.html` to open in your default browser.
   - Or run a simple local server (recommended for fetch-based loading):
     - Python 3: `python3 -m http.server 8000` then open `http://localhost:8000/` and click the HTML files.
2. Interact with the plot: hover for chunk metadata, zoom, pan, or toggle traces in the legend.

Notes:
- The query overlay point is a red diamond labeled `Query: openim`.
- If a JSON file appears truncated or missing, the HTML will try the fallback path and overlay the query on `collection_figure.json`. `query_plot.html` first tries `query_figure_small.json`.
- If many points reference the same file chunk (e.g. reset_password_logic.dart), this suggests a dense cluster of similar embeddings for that file; consider using the MCP tools to filter or sample results for investigations.

If you'd like, I can also export static PNG or SVG snapshots from the Plotly JSON for easy sharing.
