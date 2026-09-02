# Backend

This directory is reserved for Backend logic, database schemas, and server APIs.

### Proposed Tech Stack:
- Supabase (PostgreSQL, Edge Functions, Row-Level Security, Realtime)
- Server-authoritative logic for timing, ranking, and validation

### Main Responsibilities:
- **Round 1:**
  - Team authentication and parameter mapping (assigning team-specific question instances)
  - Code validation & atomic ranking (1–20 qualification logic)
  - Server-authoritative timer and cutoff enforcement
  - Realtime hint releases and organizer global announcements
- **Round 2:**
  - Checkpoint verification & sequence enforcement (scanned QR validation)
  - Predefined path routing per team
  - Question pool retrieval per destination
  - Answer verification & step progression
  - Final ranking based on server completion timestamps
