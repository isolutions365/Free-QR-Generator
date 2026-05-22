# Security Specification & Threat Model for Free QR Generator

This specification outlines the data invariants, threat vectors, and access controls governing the standard Firebase Firestore database collections: `/projects` and `/scans`.

## 1. Data Invariants

1. **Relation-Based Access Control**:
   - A `project` document is owned by a single user (`userId`).
   - Only the authenticated owner of a project can write, read, or modify their project document.
   - Any read/write queries to `projects` must be filtered by the current user's UID to prevent unauthorized data crawling.
   
2. **Scan Log Privacy**:
   - Individual tracking scans (`/scans/{scanId}`) can only be created by the tracking engine (or mock simulation clients).
   - Reading or listing scans is restricted to the owner of the related project. Anyone else attempting to query scans is denied list access.
   - Security cannot be delegated to client filters; Firestore rules must enforce ownership.

3. **Field Immutability**:
   - Critical audit fields `createdAt` and `userId` inside `projects` cannot be changed after creation. All update operations must restrict changes from modifying these fields.
   - Timestamps (`createdAt`, `updatedAt`, `timestamp`) must match the server's authoritative clock (`request.time`).

4. **Input Boundary Restrictions**:
   - Document ID path variables must match alphanumeric characters: `^[a-zA-Z0-9_\-]+$`.
   - All string attributes (such as names, contents) must have size boundaries enforced to protect against memory depletion or wallet attacks.

---

## 2. The "Dirty Dozen" (Malicious Attack Payloads)

Here are 12 specific payloads or operations designed to compromise the system and verify standard "PERMISSION_DENIED" guards:

1. **Identity Spoofing - Project Creator Hack**:
   - *Attack*: Create a project document under another user's `userId`.
   - *Payload*: `userId = "victim-123", name = "Spoofed Project"` while logged in as user `"attacker-456"`.

2. **Privilege Escalation - Project Update Theft**:
   - *Attack*: Modifying another user's project configurations.
   - *Target Document*: `/projects/proj-123` where `userId` is `"victim-456"`. Logged-in user is `"attacker-789"`.

3. **Immutable Leak - Overwriting ID Fields on Update**:
   - *Attack*: An authenticated owner tries to change the `userId` or `createdAt` of their project during an update.
   - *Payload*: `incoming().userId = "new-user-abc"`, changing `existing().userId = "original-owner"`.

4. **Resource Poisoning - Mass Buffer Overflow**:
   - *Attack*: Write a project with a 1MB string size payload in `name` to inflate index storage costs.
   - *Payload*: `name = "A" * 500000`, `content = "http://bad.g"`.

5. **Resource Poisoning - ID character Injection**:
   - *Attack*: Craft document ID path structures containing illegal characters (such as `%20` or `/`).
   - *Target Path*: `/projects/proj%20danger%2Fsub` to trigger query escaping issues. 

6. **State Hijacking - Zero Scan Counter Reset**:
   - *Attack*: An owner resets their tracking `scanCount` counter to zero or high fake value manually using client payload update.
   - *Payload*: `scanCount = 999999` while trying to bypass actual server redirect increments.

7. **PII Scraping - Read User Profiles Without Ownership**:
   - *Attack*: Read another user's projects or private lists without owning them.
   - *Victim Projects*: `/projects/proj-victim-987`. Reader is `"attacker-789"`.

8. **Bulk Scraping - Unfiltered List Fetch**:
   - *Attack*: Read all projects in the collection by querying `db.collection('projects')` without a where limit on `userId`.

9. **Ghost Logs - Inject Scans for Unregistered Projects**:
   - *Attack*: Inserting synthetic logs referencing invalid or other users' projects.
   - *Payload*: `projectId = "victim-project-abc"`, `userId = "attacker-123"`.

10. **Spoofed Auth Context - Client-provided Time Overwrites**:
    - *Attack*: Spoofing `createdAt` timestamp to be backdated in 2020.
    - *Payload*: `createdAt = "2020-01-01T00:00:00Z"`.

11. **Scan Deletion Sabotage - Wipe Analytics Logs**:
    - *Attack*: An attacker tries to purge logs from the database system of another user's scan dashboard.
    - *Target Path*: `/scans/scan-log-456` with writer as attacker.

12. **Double-Gate Bypass on Action state**:
    - *Attack*: Updating a terminal scan or trying to inject a field that is unapproved for updates.

---

## 3. Test Runner Design

We mock and assert these payloads securely using Firestore rules suite. All 12 unauthorized requests must result in `PERMISSION_DENIED` errors at runtime.
