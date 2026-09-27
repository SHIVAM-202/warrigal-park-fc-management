# Changelog

All notable changes to the Warrigal Park Football Club Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Association PlayRegister CSV Export Formatter (WP-14 / PBI-1)**:
  - Added `ExportService` generating RFC 4180-compliant CSV exports for Northside Football Association (NFA) PlayRegister bulk upload.
  - Formatted junior member records with verified primary guardian details (contact name, relationship, mobile, email, address).
  - Formatted senior member records with direct contact details.
  - Added `GET /api/registrations/export/csv` endpoint with season, status, and age group query filtering.
  - Added one-click "Export PlayRegister CSV" download button on the Registration Desk web interface.
  - Added comprehensive automated test suite `tests/csv-export.test.js` covering RFC 4180 delimiter escaping, guardian linkage, and category formatting.

## [1.0.0] - 2026-09-22

### Added
- **Core Member & Guardian Management**:
  - Member creation, search by name with duplicate handling, and profile updates.
  - Parent/Legal Guardian registration with multi-child linkage (sibling sharing).
  - Sibling contact synchronization: updating a guardian's mobile number updates all linked juniors.
- **Registration Desk & Domain Rule Enforcement**:
  - Northside Football Association (NFA) 2026 season registration workflow.
  - Strict enforcement of the **Junior Guardian Rule**: refusal of registration completion for any player under 18 years of age without at least one linked verified guardian.
  - Support for independent senior (18+) player registrations.
- **Teams & Squad Allocation**:
  - Team creation with age groups, coach contact, manager contact, and training schedules.
  - Roster allocation with prerequisite check (only registered players can be rostered).
  - Roster movement: transfer players between squads without deleting registrations.
  - Coach emergency contact view displaying player name, DOB, and primary guardian name and mobile.
- **Configuration & Deployment Management**:
  - 12-Factor App environment configuration management (`.env.example`, `.env.development`, `.env.test`, `.env.production`).
  - Production-grade multi-stage `Dockerfile` and `docker-compose.yml` service specification.
  - Automated CI/CD pipeline via GitHub Actions (`.github/workflows/ci-cd.yml`) executing quality gates and container smoke tests.
  - Comprehensive automated test suite (`tests/registration.test.js`, `tests/team-roster.test.js`) verifying all acceptance criteria.
