# Issue #8: Data Transparency and GDPR Compliance Documentation

## Label
`documentation`, `privacy`, `compliance`

## Description

Create comprehensive privacy documentation explaining data retention policies, GDPR compliance, and data management options.

## Problem

Current state:
- No privacy policy documentation
- Unclear data retention policies
- Unknown GDPR compliance status
- No data deletion instructions
- Users don't know where their data is stored

## Proposed Solution

Create comprehensive privacy documentation:

### PRIVACY.md Document
1. **Data Storage Locations**
   - Google Gemini API (transient, not stored)
   - Qdrant Cloud (persistent until deleted)
   - Local metadata (file hashes)

2. **Data Retention Policies**
   - How long data is kept
   - Deletion procedures
   - Automatic vs manual cleanup

3. **Data Usage**
   - Google's usage (abuse detection only)
   - Qdrant's usage (none)
   - This tool's usage (none)

4. **GDPR Compliance**
   - Right to erasure
   - Data portability
   - Data location control
   - Privacy by design

5. **Security Measures**
   - Encryption in transit (TLS)
   - Encryption at rest (Qdrant)
   - API key security

### Data Management Tools

Add MCP tools for privacy compliance:

**`delete_collection`** - Permanently delete all indexed data
**`clear_metadata`** - Clear local metadata
**`privacy_report`** - Generate report on stored data

## Acceptance Criteria

### Documentation
- [ ] `PRIVACY.md` file created
- [ ] Data storage locations clearly listed
- [ ] Retention policies explained
- [ ] GDPR rights documented
- [ ] Security measures detailed
- [ ] Data deletion instructions provided
- [ ] Terms of Service links (Gemini, Qdrant)
- [ ] Contact info for privacy questions

### README Updates
- [ ] Privacy section added
- [ ] Links to PRIVACY.md
- [ ] Data retention summary
- [ ] EU data residency options mentioned

### MCP Tools
- [ ] `delete_collection` tool (with confirmation)
- [ ] `clear_metadata` tool
- [ ] `privacy_report` tool
- [ ] All tools properly documented

## PRIVACY.md Sections

1. **Overview** - Quick summary
2. **Data We Store** - What and where
3. **Data Retention** - How long
4. **Data Usage** - Who uses it and why
5. **GDPR Compliance** - Your rights
6. **Security** - How we protect data
7. **Third-Party Services** - Gemini & Qdrant ToS
8. **Your Controls** - How to manage/delete data
9. **Contact** - Privacy questions

## Privacy Report Example

```
🔒 Privacy & Data Report

Data Stored:
- Qdrant Cloud: 940 vectors (12.3 MB)
- Local Metadata: 470 file hashes (85 KB)
- Total: 12.4 MB

Storage Location:
- Qdrant: us-east4 (GCP) [Can change to EU]
- Local: ~/.mcp-codebase-index/

Data Retention:
- Qdrant: Indefinite (until manual deletion)
- Local: Until tool uninstalled

Your Rights:
✅ Right to access (privacy_report tool)
✅ Right to erasure (delete_collection tool)
✅ Right to portability (export_index tool)
✅ Data location control (EU regions available)

Third-Party Usage:
- Google Gemini: No data retention
- Qdrant Cloud: No training/analysis use
- This tool: No telemetry, no sharing
```

## Benefits

- Legal compliance (GDPR ready)
- User trust and transparency
- Clear data management
- Easy privacy audits
- Professional documentation

## Related

- Part of IMPROVEMENT_PLAN.md Section 6: Data Transparency
- Related: #9 (backup system for data portability)
