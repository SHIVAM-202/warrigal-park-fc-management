const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { getDatabase } = require('../src/db/database');
const TeamService = require('../src/services/teamService');

describe('WWCC / Blue Card Compliance & Expiry Tracker Tests (WP-15)', () => {
    let db;
    let teamService;

    beforeEach(() => {
        db = getDatabase(':memory:');
        teamService = new TeamService(db);

        // Seed 2026 season
        db.prepare('INSERT INTO seasons (id, year, is_active) VALUES (1, 2026, 1)').run();
    });

    it('should store and retrieve coach and manager WWCC expiry dates', () => {
        const team = teamService.createTeam({
            name: 'U13G Navy',
            seasonId: 1,
            ageGroup: 'U13',
            coachName: 'Danny Sok',
            coachPhone: '0402 337 116',
            coachWwcc: '1188-4472',
            coachWwccExpiry: '2027-06-30',
            managerName: 'Spiros Antonopoulos',
            managerPhone: '0438 771 226',
            managerWwcc: '1204-9911',
            managerWwccExpiry: '2026-11-15'
        });

        assert.strictEqual(team.coach_wwcc, '1188-4472');
        assert.strictEqual(team.coach_wwcc_expiry, '2027-06-30');
        assert.strictEqual(team.manager_wwcc, '1204-9911');
        assert.strictEqual(team.manager_wwcc_expiry, '2026-11-15');
    });

    it('should correctly flag a valid WWCC card expiring more than 60 days ahead', () => {
        const result = teamService.evaluateOfficialCompliance({
            role: 'Coach',
            name: 'Danny Sok',
            wwcc: '1188-4472',
            expiry: '2027-06-30',
            ageGroup: 'U13',
            checkDate: '2026-03-01'
        });

        assert.strictEqual(result.status, 'VALID');
        assert.strictEqual(result.isCompliant, true);
        assert.ok(result.daysRemaining > 60);
    });

    it('should flag card as EXPIRING_SOON when within 60 days of season kickoff', () => {
        const result = teamService.evaluateOfficialCompliance({
            role: 'Coach',
            name: 'Danny Sok',
            wwcc: '1188-4472',
            expiry: '2026-03-25',
            ageGroup: 'U13',
            checkDate: '2026-03-01'
        });

        assert.strictEqual(result.status, 'EXPIRING_SOON');
        assert.strictEqual(result.isCompliant, true);
        assert.strictEqual(result.daysRemaining, 24);
        assert.match(result.message, /expires soon/i);
    });

    it('should strictly flag an expired WWCC as non-compliant and ineligible', () => {
        const result = teamService.evaluateOfficialCompliance({
            role: 'Manager',
            name: 'Jane Smith',
            wwcc: '9988-1122',
            expiry: '2026-01-15',
            ageGroup: 'U8',
            checkDate: '2026-03-01'
        });

        assert.strictEqual(result.status, 'EXPIRED');
        assert.strictEqual(result.isCompliant, false);
        assert.ok(result.daysRemaining < 0);
        assert.match(result.message, /strictly ineligible/i);
    });

    it('should flag a missing WWCC on a junior team official as non-compliant', () => {
        const result = teamService.evaluateOfficialCompliance({
            role: 'Coach',
            name: 'Unverified Parent',
            wwcc: null,
            expiry: null,
            ageGroup: 'U10',
            checkDate: '2026-03-01'
        });

        assert.strictEqual(result.status, 'MISSING');
        assert.strictEqual(result.isCompliant, false);
        assert.match(result.message, /missing for junior team/i);
    });

    it('should exempt adult senior team officials from mandatory junior WWCC rules', () => {
        const result = teamService.evaluateOfficialCompliance({
            role: 'Coach',
            name: 'Senior Coach',
            wwcc: null,
            expiry: null,
            ageGroup: 'Senior',
            checkDate: '2026-03-01'
        });

        assert.strictEqual(result.status, 'EXEMPT');
        assert.strictEqual(result.isCompliant, true);
    });

    it('should aggregate club-wide WWCC compliance statistics across teams', () => {
        // Team 1: Fully compliant
        teamService.createTeam({
            name: 'U13G Navy',
            seasonId: 1,
            ageGroup: 'U13',
            coachName: 'Danny Sok',
            coachWwcc: '1188-4472',
            coachWwccExpiry: '2027-06-30',
            managerName: 'Spiros Antonopoulos',
            managerWwcc: '1204-9911',
            managerWwccExpiry: '2027-08-01'
        });

        // Team 2: Expired coach
        teamService.createTeam({
            name: 'U8 Cubs',
            seasonId: 1,
            ageGroup: 'U8',
            coachName: 'Expired Coach',
            coachWwcc: '2233-4455',
            coachWwccExpiry: '2025-12-31'
        });

        const summary = teamService.getClubComplianceSummary(1, '2026-03-01');

        assert.strictEqual(summary.totalTeams, 2);
        assert.strictEqual(summary.totalOfficials, 3); // 2 in team 1 + 1 coach in team 2
        assert.strictEqual(summary.validCount, 2);
        assert.strictEqual(summary.expiredCount, 1);
        assert.strictEqual(summary.isFullyCompliant, false);
    });
});
