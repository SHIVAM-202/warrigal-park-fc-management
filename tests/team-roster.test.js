const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { getDatabase } = require('../src/db/database');
const MemberService = require('../src/services/memberService');
const GuardianService = require('../src/services/guardianService');
const RegistrationService = require('../src/services/registrationService');
const TeamService = require('../src/services/teamService');

describe('Team & Squad Roster Allocation Tests', () => {
    let db;
    let memberService;
    let guardianService;
    let registrationService;
    let teamService;

    beforeEach(() => {
        db = getDatabase(':memory:');
        memberService = new MemberService(db);
        guardianService = new GuardianService(db);
        registrationService = new RegistrationService(db);
        teamService = new TeamService(db);

        // Seed 2026 season
        db.prepare('INSERT INTO seasons (id, year, is_active) VALUES (1, 2026, 1)').run();
    });

    it('should create teams and list them by season and age group', () => {
        const team1 = teamService.createTeam({
            name: 'U13G Navy',
            seasonId: 1,
            ageGroup: 'U13',
            coachName: 'Danny Sok',
            coachPhone: '0402 337 116'
        });

        const team2 = teamService.createTeam({
            name: 'U13G Gold',
            seasonId: 1,
            ageGroup: 'U13'
        });

        const u13Teams = teamService.getTeamsByAgeGroup(1, 'U13');
        assert.strictEqual(u13Teams.length, 2);
        assert.strictEqual(u13Teams[0].name, 'U13G Gold');
        assert.strictEqual(u13Teams[1].name, 'U13G Navy');
    });

    it('should allow placing a registered player into a team roster', () => {
        // Create player and guardian
        const player = memberService.createMember({
            firstName: 'Ruby',
            lastName: 'Antonopoulos',
            dob: '2014-02-11',
            gender: 'F'
        });
        const guardian = guardianService.createGuardian({
            firstName: 'Spiros',
            lastName: 'Antonopoulos',
            relationship: 'father',
            mobile: '0438 771 226'
        });
        guardianService.linkGuardianToMember(player.id, guardian.id, 1);

        // Register for 2026
        registrationService.createRegistration({
            memberId: player.id,
            seasonId: 1,
            ageGroup: 'U13',
            status: 'complete'
        });

        const team = teamService.createTeam({
            name: 'U13G Navy',
            seasonId: 1,
            ageGroup: 'U13'
        });

        teamService.addPlayerToTeam(team.id, player.id);

        const rosterData = teamService.getTeamRosterWithContacts(team.id);
        assert.strictEqual(rosterData.totalPlayers, 1);
        assert.strictEqual(rosterData.players[0].name, 'Ruby Antonopoulos');
        assert.strictEqual(rosterData.players[0].contactName, 'Spiros Antonopoulos (father)');
        assert.strictEqual(rosterData.players[0].contactPhone, '0438 771 226');
    });

    it('should reject placing an unregistered player into a team roster', () => {
        const unregisteredPlayer = memberService.createMember({
            firstName: 'Unregistered',
            lastName: 'Player',
            dob: '2014-05-01',
            gender: 'M'
        });

        const team = teamService.createTeam({
            name: 'U13G Navy',
            seasonId: 1,
            ageGroup: 'U13'
        });

        assert.throws(
            () => {
                teamService.addPlayerToTeam(team.id, unregisteredPlayer.id);
            },
            (err) => {
                assert.match(err.message, /Player is not registered for season 2026/);
                return true;
            }
        );
    });

    it('should move a player between squads without affecting other players', () => {
        const p1 = memberService.createMember({ firstName: 'Ana', lastName: 'Petrides', dob: '2008-01-01', gender: 'F' });
        const p2 = memberService.createMember({ firstName: 'Harriet', lastName: 'Boon', dob: '2008-01-01', gender: 'F' });

        registrationService.createRegistration({ memberId: p1.id, seasonId: 1, ageGroup: 'Senior' });
        registrationService.createRegistration({ memberId: p2.id, seasonId: 1, ageGroup: 'Senior' });

        const gold = teamService.createTeam({ name: 'Gold', seasonId: 1, ageGroup: 'Senior' });
        const navy = teamService.createTeam({ name: 'Navy', seasonId: 1, ageGroup: 'Senior' });

        // Add both to Gold initially
        teamService.addPlayerToTeam(gold.id, p1.id);
        teamService.addPlayerToTeam(gold.id, p2.id);

        assert.strictEqual(teamService.getTeamRosterWithContacts(gold.id).totalPlayers, 2);

        // Move Ana (p1) to Navy
        teamService.movePlayerBetweenTeams(p1.id, gold.id, navy.id);

        const goldRoster = teamService.getTeamRosterWithContacts(gold.id);
        const navyRoster = teamService.getTeamRosterWithContacts(navy.id);

        assert.strictEqual(goldRoster.totalPlayers, 1);
        assert.strictEqual(goldRoster.players[0].name, 'Harriet Boon');

        assert.strictEqual(navyRoster.totalPlayers, 1);
        assert.strictEqual(navyRoster.players[0].name, 'Ana Petrides');
    });

    it('should return an empty roster with zero players rather than an error for an empty team', () => {
        const emptyTeam = teamService.createTeam({
            name: 'U10 Roar',
            seasonId: 1,
            ageGroup: 'U10'
        });

        const rosterData = teamService.getTeamRosterWithContacts(emptyTeam.id);
        assert.strictEqual(rosterData.totalPlayers, 0);
        assert.deepStrictEqual(rosterData.players, []);
        assert.strictEqual(rosterData.team.name, 'U10 Roar');
    });
});
