const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const { getDatabase } = require('../src/db/database');
const MemberService = require('../src/services/memberService');
const GuardianService = require('../src/services/guardianService');
const RegistrationService = require('../src/services/registrationService');

describe('Registration & Junior Guardian Rule Verification', () => {
    let db;
    let memberService;
    let guardianService;
    let registrationService;

    beforeEach(() => {
        // Use in-memory SQLite database for test isolation
        db = getDatabase(':memory:');
        memberService = new MemberService(db);
        guardianService = new GuardianService(db);
        registrationService = new RegistrationService(db);

        // Ensure 2026 Season exists
        db.prepare('INSERT INTO seasons (id, year, is_active) VALUES (1, 2026, 1)').run();
    });

    it('should refuse registration for an under-18 junior if no guardian is linked', () => {
        // Mia is 11 on 2026-12-31 (born 2014-09-03)
        const junior = memberService.createMember({
            firstName: 'Mia',
            lastName: 'Kelleher',
            dob: '2014-09-03',
            gender: 'F'
        });

        assert.strictEqual(junior.id, 1);

        // Attempting to complete registration with no guardian linked
        assert.throws(
            () => {
                registrationService.createRegistration({
                    memberId: junior.id,
                    seasonId: 1,
                    ageGroup: 'U13',
                    status: 'complete',
                    notes: 'Sign-on attempt without guardian'
                });
            },
            (err) => {
                assert.match(err.message, /Registration refused: Member Mia Kelleher is under 18 years old/);
                assert.match(err.message, /must carry verified parent\/guardian consent/);
                return true;
            }
        );
    });

    it('should allow junior registration once a valid parent/guardian is linked', () => {
        const junior = memberService.createMember({
            firstName: 'Mia',
            lastName: 'Kelleher',
            dob: '2014-09-03',
            gender: 'F'
        });

        const guardian = guardianService.createGuardian({
            firstName: 'Dani',
            lastName: 'Kelleher',
            relationship: 'mother',
            mobile: '0417 662 908',
            email: 'd.kelleher@example.com',
            address: '22 Marlin Street, Bald Hills 4036'
        });

        // Link parent to child
        guardianService.linkGuardianToMember(junior.id, guardian.id, 1);

        // Now registration must succeed
        const reg = registrationService.createRegistration({
            memberId: junior.id,
            seasonId: 1,
            ageGroup: 'U13',
            status: 'complete',
            notes: 'Asthma puffer in bag'
        });

        assert.strictEqual(reg.status, 'complete');
        assert.strictEqual(reg.age_group, 'U13');
        assert.strictEqual(reg.member_id, junior.id);
    });

    it('should allow an adult (18+) member to register without requiring any guardian', () => {
        // Jayden is 18 in 2026 (born 2008-01-15)
        const senior = memberService.createMember({
            firstName: 'Jayden',
            lastName: 'Marsh',
            dob: '2008-01-15',
            gender: 'M',
            phone: '0412 999 888',
            email: 'j.marsh@example.com'
        });

        const reg = registrationService.createRegistration({
            memberId: senior.id,
            seasonId: 1,
            ageGroup: 'Senior',
            status: 'complete',
            notes: 'Senior Men squad'
        });

        assert.strictEqual(reg.status, 'complete');
        assert.strictEqual(reg.age_group, 'Senior');
    });

    it('should support sibling guardian sharing and update contact across all siblings', () => {
        // Create shared parent Dani
        const parent = guardianService.createGuardian({
            firstName: 'Dani',
            lastName: 'Kelleher',
            relationship: 'mother',
            mobile: '0417 662 908',
            address: '22 Marlin Street'
        });

        // Child 1: Mia (U13)
        const mia = memberService.createMember({
            firstName: 'Mia',
            lastName: 'Kelleher',
            dob: '2014-09-03',
            gender: 'F'
        });

        // Child 2: Rory (U8)
        const rory = memberService.createMember({
            firstName: 'Rory',
            lastName: 'Kelleher',
            dob: '2018-05-12',
            gender: 'M'
        });

        // Link both children to the exact same parent record
        guardianService.linkGuardianToMember(mia.id, parent.id, 1);
        guardianService.linkGuardianToMember(rory.id, parent.id, 1);

        // Update Dani's phone number
        guardianService.updateGuardian(parent.id, {
            mobile: '0499 888 777'
        });

        // Verify the update is immediately reflected when querying either child
        const miaGuardians = guardianService.getGuardiansForMember(mia.id);
        const roryGuardians = guardianService.getGuardiansForMember(rory.id);

        assert.strictEqual(miaGuardians[0].mobile, '0499 888 777');
        assert.strictEqual(roryGuardians[0].mobile, '0499 888 777');

        // Verify reverse lookup: all children linked to parent Dani
        const daniChildren = guardianService.getMembersForGuardian(parent.id);
        assert.strictEqual(daniChildren.length, 2);
        assert.strictEqual(daniChildren[0].first_name, 'Mia');
        assert.strictEqual(daniChildren[1].first_name, 'Rory');
    });
});
