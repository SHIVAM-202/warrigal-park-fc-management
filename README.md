# Warrigal Park Football Club Inc. (WPFC)
## Member Registration & Team Roster Management System

> **Unit:** ISYS3001 Managing Software Development (Southern Cross University)  
> **Client:** Warrigal Park Football Club Inc., 60 Kluver Street, Bald Hills QLD 4036  
> **Target Release:** Version 1.0.0 (Production Ready for February Sign-On)

---

## 1. What Was Delivered Against Scope

The delivered application provides a single source of truth for the club's member register and team rosters, directly addressing the core pain points identified by Vanessa Ostrowski (Registrar) and Danny Sok (Junior Coordinator):

* **Members & Sibling Guardians (Epic 1 / Stories WP-1 to WP-4)**:
  * Persistent storage and search for member profiles (handles duplicates and same-name players).
  * Separate Guardian entity with one-to-many relationship to junior players (siblings share the same guardian record; editing parent details immediately updates across all children).
  * Reverse lookup: view all junior members linked to a specific guardian.
* **Registration Lifecycle & Junior Guardian Rule (Epic 2 / Stories WP-5 to WP-7)**:
  * Full 2026 season registration management (`started`, `complete`, `withdrawn`).
  * **Strict Domain Rule Enforcement**: Per Association Circular 2026/03 and club policy, any player under 18 years of age (calculated as of December 31 of playing season) is strictly refused completed registration without at least one verified parent/guardian record linked.
  * Adults (18+) register independently without requiring guardian consent.
* **Teams & Squad Rosters (Epic 3 / Stories WP-8 to WP-11)**:
  * Team creation by season and age group (U8, U13, Senior, Over 35) with coach, manager, and training schedules.
  * Player placement with prerequisite verification (unregistered players cannot be placed on rosters).
  * Squad transfers (moving a player between teams preserves registration history and does not perturb other players).
  * Coach & Manager Emergency Roster View: Lists players with primary emergency contact name, relationship, and mobile number.
* **Configuration Management & Deployment**:
  * 12-Factor App environment configuration management (`.env.example`, `.env.development`, `.env.test`, `.env.production`).
  * Multi-stage `Dockerfile` and `docker-compose.yml` for isolated deployment.
  * Automated GitHub Actions CI/CD pipeline (`.github/workflows/ci-cd.yml`).
  * Comprehensive automated test suite (`tests/`) achieving 100% pass rate.

---

## 2. What Was Not Delivered, and Why (Product Backlog)

As mandated by Section 4 of the case study, the sprint boundary strictly excluded secondary and peripheral features to guarantee a stable, defect-free release:

| Feature Requested | Requesting Stakeholder | Reason Parked for Future Sprints | Backlog Ref |
| :--- | :--- | :--- | :--- |
| **Payment Gateway Integration** (Stripe/Bank transfer matching) | Vanessa Ostrowski & Robyn Iyer | High compliance overhead (PCI-DSS); requires banking API integration outside core sprint. | `PBI-PAY-01` |
| **PlayRegister Association Sync** (API / CSV export) | Vanessa Ostrowski | PlayRegister is a proprietary third-party system with no public write API; requires formal NFA data format agreement. | `PBI-NFA-02` |
| **Working with Children Check (Blue Card) Expiry Tracker** | Robyn Iyer & Danny Sok | Compliance tracking is an administrative governance feature to be built in Sprint 2. | `PBI-GOV-03` |
| **Automated Squad Limit Warning (16/18 players)** | Danny Sok | Informal trial grading requires flexible soft limits; hard enforcement would hinder Danny's pencil-drafting workflow. | `PBI-TMS-04` |
| **Public Self-Service Sign-On Portal** | Vanessa Ostrowski | Requires public authentication, rate-limiting, and reCAPTCHA; risk of incorrect DOB entry noted by Vanessa. | `PBI-PUB-05` |
| **SMS / Email Bulk Notifications** | Danny Sok & Vanessa | Requires external Twilio / SendGrid procurement and operational SMS costs. | `PBI-COM-06` |
| **Canteen Roster & Volunteer Levy Tracking** | Robyn Iyer | Ancillary operational task unrelated to core player eligibility and insurance liability. | `PBI-OPS-07` |
| **Club Website & Sponsorship Kit Management** | Robyn Iyer | Non-core marketing function. | `PBI-MKT-08` |

---

## 3. Setup and Run Instructions from GitHub

### Prerequisites
* **Node.js**: v20.x or v22.x (or v25.x)
* **Git**: v2.40+
* **Docker & Docker Compose** (Optional, for containerized execution)

### Local Development Setup
1. **Clone the repository**:
   ```bash
   git clone https://github.com/YourGitHubUsername/warrigal-park-fc-management.git
   cd warrigal-park-fc-management
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
4. **Seed initial case study data**:
   ```bash
   npm run seed
   ```
5. **Run automated test suite**:
   ```bash
   npm test
   ```
6. **Start the application**:
   ```bash
   npm start
   ```
7. **Access the portal**:
   Open browser at `http://localhost:3000`.

### Running with Docker Compose
```bash
docker-compose up --build -d
```
Access the application at `http://localhost:3000` and verify health at `http://localhost:3000/api/health`.

---

## 4. Known Issues and Limitations

1. **Association Cutoff Rule Static Configuration**: Age cutoff is set to 31 December of the playing year per NFA Rule 2. If NFA alters this cutoff to mid-year, `src/config/index.js` must be updated.
2. **Local SQLite File Locking in Multi-Instance Deployments**: SQLite is optimized for single-instance container deployments. For horizontally scaled cloud environments, the database adapter should point to managed PostgreSQL.
3. **Manual Sibling Linking Interface**: Guardians can be shared across multiple children via the UI dropdown, but automated heuristic matching based on residential address is not yet implemented.

---

## 5. Credentials, Configuration and Environment

All configuration follows the Twelve-Factor App specification:

* `PORT`: Server listening port (Default: `3000`).
* `NODE_ENV`: Runtime mode (`development`, `test`, `production`).
* `DB_PATH`: SQLite database storage file path or `:memory:` for automated testing.
* `LOG_LEVEL`: Application logging verbosity (`debug`, `info`, `warn`, `error`).
* `SESSION_SECRET`: Secret key for session/token verification (use vault-managed secrets in production).

> [!NOTE]
> All sample data in `src/db/seed.js` uses fictional names and test phone numbers compliant with the assignment brief. No real personal data is ever committed to source control.

---

## 6. Recommended Next-Sprint Backlog (Prioritized)

1. **PBI-1: Association PlayRegister CSV Export Formatter (Priority 1 — High)**: Enable Vanessa to export 2026 registered players into NFA-compliant CSV with a single click, eliminating 40+ hours of double-typing.
2. **PBI-2: WWCC / Blue Card Verification & Expiry Warnings (Priority 2 — High)**: Track coach and manager WWCC numbers on age group working sheets with expiry alerts before Round 1 kick-off.
3. **PBI-3: Visual Drag-and-Drop Age Group Grading Board (Priority 3 — High)**: Allow Danny Sok to view 40+ players in an age group and drag them between teams (e.g. Navy vs Gold) mimicking his paper trial sheets.
4. **PBI-4: Participation & Demographics Reporting for Council Grants (Priority 4 — Medium)**: Generate instant 1-click reports of registered players broken down by age group and gender to satisfy the $42,000 lighting grant criteria.
5. **PBI-5: Sibling Discount & Fee Reconciliation Ledger (Priority 5 — Medium)**: Automatically detect siblings sharing a guardian record to calculate the $50 discount and record bank transfer references.
6. **PBI-6: Automated SMS Game & Training Cancellation Dispatch (Priority 6 — Low)**: Integrate Twilio API to allow coaches to broadcast wet weather cancellations directly to primary guardian mobile numbers.
