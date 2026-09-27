const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { getDatabase } = require('../src/db/database');
const MemberService = require('../src/services/memberService');
const GuardianService = require('../src/services/guardianService');
const RegistrationService = require('../src/services/registrationService');
const ExportService = require('../src/services/exportService');

describe('Association PlayRegister CSV Export Tests (WP-14)', () => {
    let db;
    let memberService;
    let guardianService;
    let registrationService;
    let exportService;

    beforeEach(() => {
        db = getDatabase(':memory:');
        memberService = new MemberService(db);
        guardianService = new GuardianService(db);
        registrationService = new RegistrationService(db);
        exportService = new ExportService(db);

        // Seed 2026 Season
        db.prepare('INSERT INTO seasons (id, year, is_active) VALUES (1, 2026, 1)').run();
    });

    it('should include all required NFA PlayRegister header columns', () => {
        const csv = exportService.generatePlayRegisterCSV({ seasonId: 1 });
        const lines = csv.split('\r\n');
        assert.ok(lines.length >= 1);

        const expectedHeaders = [
            'Registration ID',
            'Season',
            'Member ID',
            'First Name',
            'Last Name',
            'Full Name',
            'Date of Birth',
            'Age at Cutoff (31 Dec)',
            'Gender',
            'Category',
            'Age Group',
            'Registration Status',
            'Primary Contact Name',
            'Relationship',
            'Contact Mobile',
            'Contact Email',
            'Residential Address',
            'Medical / Special Notes',
            'Registration Date'
        ];

        for (const header of expectedHeaders) {
            assert.ok(lines[0].includes(header), `Header row missing expected column: ${header}`);
        }
    });

    it('should format junior player registrations with linked primary guardian information', () => {
        // Create Junior Player (Age 11 at 31 Dec 2026)
        const junior = memberService.createMember({
            firstName: 'Mia',
            lastName: 'Kelleher',
            dob: '2014-09-03',
            gender: 'F'
        });

        // Create Guardian
        const guardian = guardianService.createGuardian({
            firstName: 'Dani',
            lastName: 'Kelleher',
            relationship: 'mother',
            mobile: '0417 662 908',
            email: 'd.kelleher@example.com',
            address: '22 Marlin Street, Bald Hills 4036'
        });

        guardianService.linkGuardianToMember(junior.id, guardian.id, 1);

        registrationService.createRegistration({
            memberId: junior.id,
            seasonId: 1,
            ageGroup: 'U13',
            status: 'complete',
            notes: 'Asthma puffer in bag'
        });

        const csv = exportService.generatePlayRegisterCSV({ seasonId: 1, status: 'complete' });
        const lines = csv.split('\r\n');
        assert.strictEqual(lines.length, 2); // Header + 1 record

        const row = lines[1];
        assert.ok(row.includes('Mia'), 'Should include first name');
        assert.ok(row.includes('Kelleher'), 'Should include last name');
        assert.ok(row.includes('2014-09-03'), 'Should include DOB');
        assert.ok(row.includes('Junior'), 'Should be categorized as Junior');
        assert.ok(row.includes('U13'), 'Should include age group');
        assert.ok(row.includes('Dani Kelleher'), 'Should include primary guardian name');
        assert.ok(row.includes('mother'), 'Should include guardian relationship');
        assert.ok(row.includes('0417 662 908'), 'Should include guardian phone');
        assert.ok(row.includes('d.kelleher@example.com'), 'Should include guardian email');
        assert.ok(row.includes('22 Marlin Street'), 'Should include residential address');
    });

    it('should format senior (18+) players with Self contact details', () => {
        const senior = memberService.createMember({
            firstName: 'Jayden',
            lastName: 'Marsh',
            dob: '2008-01-15',
            gender: 'M',
            email: 'j.marsh@example.com',
            phone: '0412 999 888'
        });

        registrationService.createRegistration({
            memberId: senior.id,
            seasonId: 1,
            ageGroup: 'Senior',
            status: 'complete',
            notes: 'Senior team player'
        });

        const csv = exportService.generatePlayRegisterCSV({ seasonId: 1 });
        const lines = csv.split('\r\n');
        const row = lines[1];

        assert.ok(row.includes('Senior'), 'Should identify as Senior');
        assert.ok(row.includes('Self'), 'Senior relationship should be Self');
        assert.ok(row.includes('0412 999 888'), 'Should include player phone');
        assert.ok(row.includes('j.marsh@example.com'), 'Should include player email');
    });

    it('should correctly escape fields with commas, quotes, and newlines per RFC 4180', () => {
        const junior = memberService.createMember({
            firstName: 'Bo',
            lastName: 'Nguyen-Clarke',
            dob: '2014-03-23',
            gender: 'F'
        });

        const guardian = guardianService.createGuardian({
            firstName: 'Tracey',
            lastName: 'Clarke',
            relationship: 'mother',
            mobile: '0438 220 907',
            address: 'Apt 4, 28 Strathpine Rd, Bald Hills'
        });

        guardianService.linkGuardianToMember(junior.id, guardian.id, 1);

        registrationService.createRegistration({
            memberId: junior.id,
            seasonId: 1,
            ageGroup: 'U13',
            status: 'complete',
            notes: 'Severe nut allergy, carry "EpiPen" at all times'
        });

        const csv = exportService.generatePlayRegisterCSV({ seasonId: 1 });
        const lines = csv.split('\r\n');
        const row = lines[1];

        // Address with comma should be wrapped in quotes
        assert.ok(row.includes('"Apt 4, 28 Strathpine Rd, Bald Hills"'), 'Address with comma must be quoted');
        // Notes with comma and inner quotes must be escaped with double quotes
        assert.ok(row.includes('"Severe nut allergy, carry ""EpiPen"" at all times"'), 'Notes with quotes must have escaped double quotes');
    });

    it('should respect status and age group filters when exporting', () => {
        const m1 = memberService.createMember({ firstName: 'Player1', lastName: 'U13', dob: '2014-01-01', gender: 'F' });
        const m2 = memberService.createMember({ firstName: 'Player2', lastName: 'U8', dob: '2018-01-01', gender: 'M' });
        const g = guardianService.createGuardian({ firstName: 'Parent', lastName: 'Test', relationship: 'father', mobile: '0400000000' });
        
        guardianService.linkGuardianToMember(m1.id, g.id, 1);
        guardianService.linkGuardianToMember(m2.id, g.id, 1);

        registrationService.createRegistration({ memberId: m1.id, seasonId: 1, ageGroup: 'U13', status: 'complete' });
        registrationService.createRegistration({ memberId: m2.id, seasonId: 1, ageGroup: 'U8', status: 'started' });

        // Filter by complete only
        const completeCsv = exportService.generatePlayRegisterCSV({ seasonId: 1, status: 'complete' });
        const completeLines = completeCsv.split('\r\n');
        assert.strictEqual(completeLines.length, 2); // Header + Player1
        assert.ok(completeLines[1].includes('Player1'));

        // Filter by age group U8
        const u8Csv = exportService.generatePlayRegisterCSV({ seasonId: 1, ageGroup: 'U8' });
        const u8Lines = u8Csv.split('\r\n');
        assert.strictEqual(u8Lines.length, 2); // Header + Player2
        assert.ok(u8Lines[1].includes('Player2'));
    });
});
