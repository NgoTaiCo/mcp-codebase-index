# Issue #9: Local Backup and Export System

## Label
`feature`, `backup`, `data-portability`

## Description

Implement local backup system for vector data export/import, enabling data portability and disaster recovery.

## Problem

Current state:
- No way to export indexed data
- Cannot migrate between Qdrant instances
- No disaster recovery mechanism
- Can't backup before major changes
- Difficult to share indexes with team

## Proposed Solution

Add backup/export/import capabilities to preserve investment in indexed data.

### Export System

**`export_index`** MCP tool:
- Exports vectors + metadata to local JSON
- Includes file mappings
- Compresses output (gzip)
- Shows export statistics

Export file format:
- Vectors with IDs
- Metadata (file paths, timestamps)
- Configuration (model, dimensions)
- Schema version for compatibility

### Import System

**`import_index`** MCP tool:
- Restores vectors to Qdrant
- Validates schema compatibility
- Handles conflicts (skip/overwrite/merge)
- Progress reporting

### Automatic Backup

Optional scheduled backups:
- Before re-indexing
- Daily/weekly schedules
- Rotation (keep N backups)
- Configurable location

### MCP Tools

1. **`export_index`**
   - Parameters: output_path (optional), compress (default: true)
   - Returns: Export stats, file size, vector count

2. **`import_index`**
   - Parameters: input_path, conflict_strategy
   - Returns: Import stats, new/updated/skipped counts

3. **`list_backups`**
   - Returns: Available backups with metadata

4. **`restore_backup`**
   - Parameters: backup_name, conflict_strategy
   - Returns: Restore stats

## Acceptance Criteria

### Export Functionality
- [ ] `export_index` tool creates valid JSON
- [ ] Exports include vectors + metadata
- [ ] Compression works (gzip)
- [ ] Export validates before writing
- [ ] Shows progress for large exports
- [ ] Handles export failures gracefully

### Import Functionality
- [ ] `import_index` tool restores data
- [ ] Schema validation (dimensions, model)
- [ ] Conflict strategies work (skip/overwrite/merge)
- [ ] Shows progress for large imports
- [ ] Validates data before import
- [ ] Handles import failures gracefully

### Backup Management
- [ ] `list_backups` shows available backups
- [ ] Metadata includes: date, vector count, size
- [ ] `restore_backup` tool works
- [ ] Backup rotation configurable
- [ ] Old backups auto-deleted (if configured)

### Configuration
- [ ] Backup location configurable
- [ ] Compression toggleable
- [ ] Schedule configurable (optional)
- [ ] Retention policy configurable

## Export File Format

JSON structure (conceptual):
- `version`: Schema version (e.g., "1.0")
- `metadata`:
  - `exported_at`: ISO timestamp
  - `model`: Embedding model used
  - `dimensions`: Vector dimensions
  - `total_vectors`: Count
- `vectors`: Array of objects:
  - `id`: Vector ID
  - `vector`: Float array
  - `payload`: Metadata (file path, hash, etc.)

Compressed size: ~10x smaller than raw JSON

## Use Cases

1. **Disaster Recovery**
   - Export before major changes
   - Quick restore if something breaks

2. **Migration**
   - Export from free Qdrant tier
   - Import to paid tier or self-hosted

3. **Team Collaboration**
   - Export index for team members
   - Skip re-indexing large codebases

4. **Testing**
   - Export production index
   - Import to test environment

5. **Data Portability**
   - GDPR right to data portability
   - Switch vector DB providers

## Benefits

- Protects indexing investment (time/quota)
- Enables disaster recovery
- Facilitates team collaboration
- GDPR compliance (data portability)
- Zero-downtime migrations
- Testing with real data

## Performance Targets

- Export: 1000 vectors/second
- Import: 500 vectors/second (with API calls)
- Compression: 10x size reduction
- Validation: <5s for 10K vectors

## Related

- Part of IMPROVEMENT_PLAN.md Section 6: Data Transparency
- Related: #8 (privacy documentation)
- Related: #5 (verification can use backups)
