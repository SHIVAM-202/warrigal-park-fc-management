# Warrigal Park Football Club Inc. (WPFC)
## Member Registration & Team Roster Management System

> **Unit:** ISYS3001 Managing Software Development (Southern Cross University)  
> **Client:** Warrigal Park Football Club Inc., 60 Kluver Street, Bald Hills QLD 4036  
> **Team:** Team 01 (Bald Hills Devs) — Shivam Patel (@SHIVAM-202), Kaveesha Akalanka (@kaveeaka), Sabin Neupane (@SABINNEUPANE-JARVIS)  
> **Current Release:** Version 1.1.1 (Production Ready — October 2026 Release)

---

## 1. What Was Delivered Across Sprints 1, 2 & 3

The delivered application provides a robust, single source of truth for the club's member register, compliance governance, and team rosters, replacing the error-prone 43-column Excel spreadsheet. All user stories were tracked in Jira Cloud (Project Key `WP` / `WPFC` — Board `MSD426MELB1`) across three iterative 1-week Scrum sprints:

### Sprint 1: Core MVP & Junior Safety (Release v1.0.0 — PM: Shivam Patel)
* **Member & Sibling Guardian Registry (Epic WPFC-E1 / Stories WP-01, WP-02)**:
  * Persistent storage and search for player member profiles (handles duplicates and same-name players via unique IDs).
  * Independent `guardians` entity with one-to-many relationship (`guardian_id`) to junior players. Sibling players share the same guardian record; editing parent details immediately updates across all children without duplicating data.
  * Reverse lookup: view all junior members linked to a specific guardian.
* **Registration Lifecycle & Junior Guardian Rule (Epic WPFC-E2 / Story WP-03)**:
  * 2026/2027 season registration workflow (`started`, `complete`, `withdrawn`).
  * **Strict Domain Rule Enforcement**: Per Association Circular 2026/03 and club insurance policy, any player under 18 years of age (calculated as of December 31 of the playing season) is strictly refused completed registration without at least one verified parent/guardian record linked.
  * Enforced at dual call sites: both initial registration creation and status update API endpoints.
  * Adults (18+) register independently without requiring guardian consent.
* **Teams & Squad Rosters (Epic WPFC-E3 / Stories WP-04, WP-05)**:
  * Team creation by season and age group (U8, U13, Senior, Over 35) with coach, manager, and training schedules.
  * Prerequisite-checked roster placement: unregistered players cannot be placed onto team rosters.
  * Squad transfers: moving a player between squads preserves registration history without affecting other team members.
* **DevOps & Containerization (Epic WPFC-E5 / Story WP-07)**:
  * Multi-stage Alpine `Dockerfile` and `docker-compose.yml` with persistent named volume storage.
  * Health check probe endpoint at `/api/health`.

### Sprint 2: External Compliance & Association Integration (Release v1.1.0 — PM: Kaveesha Akalanka)
* **Association PlayRegister CSV Export (Epic WPFC-E4 / Story WP-14)**:
  * 1-click export of registered members formatted to the Northside Football Association (NFA) PlayRegister schema, eliminating 40+ hours of manual data entry.
  * Automatically maps linked primary guardian contact information for junior players and self contact details for senior players.
  * Strict RFC 4180 compliance: properly escapes quotes, commas, and newlines in addresses and text fields.
  * Filterable by season and registration status.
* **Blue Card / WWCC Compliance & Expiry Tracker (Epic WPFC-E4 / Story WP-15)**:
  * Automated SQLite schema migration adding Working with Children Check (Blue Card) numbers and expiry dates to team coaches and managers.
  * Automated real-time status evaluation against season kickoff:
    * `COMPLIANT`: Blue Card expiry is more than 60 days post-kickoff.
    * `EXPIRING_SOON`: Blue Card expires within 60 days of kickoff (alerts official for early renewal).
    * `NON_COMPLIANT / INELIGIBLE`: Expired or missing Blue Card on junior team officials (strictly flagged as ineligible to take the field).
    * Adult senior team officials are automatically exempted per state child protection regulations.
  * Club-wide audit API (`/api/wwcc/audit`) and UI badge indicators.
* **Coach Emergency Contact Sheets (Epic WPFC-E3 / Story WP-06)**:
  * Dedicated roster view for coaches and team managers displaying player emergency contacts (primary guardian name, relationship, and mobile number).
* **Automated Test Expansion**: Expanded automated unit and integration tests from 9 to 21 passing tests.

### Sprint 3: Governance, Architecture & Security Hardening (Release v1.1.1 — PM: Sabin Neupane)
* **Technical Documentation & Decision Logs (Epic WPFC-E5 / Stories WP-12, WP-13)**:
  * Complete 4-layer system architecture overview in `architecture.md`.
  * Technology trade-offs and rationale documented in `decisions.md` (Node 22 native `node:sqlite` selection, foreign key constraints, branching workflow).
* **Hotfix v1.1.1: Security & CI Hardening (Epic WPFC-E5 / Story WP-08)**:
  * Security untracking: executed `git rm --cached` on `.env.development`, `.env.test`, and `.env.production` files.
  * Rotated production session secrets and enforced blanket `.gitignore` rules.
  * Aligned `package.json` with `package-lock.json` and pinned GitHub Actions CI matrix to Node 22.x, restoring 100% green CI builds across all 21 automated tests.

---

## 2. What Was Parked in the Product Backlog (Future Sprints)

In accordance with agile best practices and the case study scope boundary, secondary requirements were deliberately logged in the Jira Product Backlog and parked for post-release sprints:

| Backlog Key | Feature Summary | Requesting Stakeholder | Reason Parked for Future Sprints | Story Points |
| :--- | :--- | :--- | :--- | :--- |
| **PBI-01** | **Stripe Online Payment Gateway & Sibling Discount Reconciliation** | Vanessa Ostrowski & Robyn Iyer | High compliance overhead (PCI-DSS); requires merchant banking API integration outside core registration sprint. | 8 |
| **PBI-02** | **Direct NFA PlayRegister Two-Way API Sync** | Vanessa Ostrowski | PlayRegister is a closed third-party association platform with no public write API. Addressed via RFC 4180 CSV export (WP-14). | 13 |
| **PBI-03** | **Visual Drag-and-Drop Age Group Grading Board** | Danny Sok | Trial grading workflow optimization; table-based squad transfers satisfy current operational needs. Deferred to Sprint 4. | 5 |
| **PBI-04** | **Council Participation & Grant Demographics Reporting** | Robyn Iyer | Annual grant reporting feature; non-critical for sign-on day. Deferred to post-season Sprint 4. | 3 |
| **PBI-05** | **Automated SMS & Email Weather Cancellation Broadcast** | Danny Sok | Requires external Twilio / SendGrid procurement and operational SMS fee budget. | 5 |

---

## 3. Setup and Run Instructions from GitHub

### Prerequisites
* **Node.js**: v22.13 or later (the application requires the native built-in `node:sqlite` module)
* **Git**: v2.40+
* **Docker & Docker Compose** (Optional, for containerized execution)

### Local Development Setup
1. **Clone the repository**:
   ```bash
   git clone https://github.com/SHIVAM-202/warrigal-park-fc-management.git
   cd warrigal-park-fc-management
   ```
2. **Install dependencies**:
   ```bash
   npm ci
   ```
3. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   *(Ensure `SESSION_SECRET` is set in your local `.env` file; local `.env*` files are strictly git-ignored).*
4. **Seed initial case study data**:
   ```bash
   npm run seed
   ```
5. **Run automated test suite (21 automated tests)**:
   ```bash
   npm test
   ```
6. **Start the application**:
   ```bash
   npm start
   ```
7. **Access the portal**:
   Open your browser at `http://localhost:3000`.

### Running with Docker Compose
```bash
docker compose up --build -d
```
Access the application at `http://localhost:3000` and verify the health check at `http://localhost:3000/api/health`.

---

## 4. Automated Testing and Quality Verification

The test harness leverages the native Node.js Test Runner (`node:test`) and assertion library (`node:assert/strict`) with isolated in-memory SQLite instances:

```bash
npm test
```

* **Test Suites**: 4 test files (`tests/registration.test.js`, `tests/team-roster.test.js`, `tests/csv-export.test.js`, `tests/wwcc-compliance.test.js`)
* **Total Tests**: 21 passing test cases (0 failures, 0 skipped)
* **Execution Duration**: ~280ms
* **Traceability**: 100% of functional requirements mapped to automated unit/integration tests.

---

## 5. Technology Stack & Architecture

* **Runtime**: Node.js v22.13+ (LTS)
* **Database**: Native SQLite via `node:sqlite` (ACID compliant, zero external daemon)
* **Server**: Express.js 5.x
* **Frontend**: Responsive HTML5 / CSS3 / Vanilla JavaScript portal
* **Containerization**: Multi-stage Alpine Linux Dockerfile & Docker Compose
* **CI/CD**: GitHub Actions automated pipeline (`.github/workflows/ci-cd.yml`)
* **Agile Management**: Atlassian Jira Cloud (Scrum Board `MSD426MELB1`)

---

## 6. Git Branching & Release History

* `v1.0.0`: Sprint 1 Release — Member registration, sibling guardian linking, Junior Guardian Rule enforcement, Docker setup.
* `v1.1.0`: Sprint 2 Release — NFA PlayRegister CSV export, Blue Card / WWCC compliance tracker, 21 automated tests.
* `v1.1.1`: Sprint 3 Release — Hotfix v1.1.1 (security untracking of `.env` files, session secret rotation, package-lock CI alignment).
