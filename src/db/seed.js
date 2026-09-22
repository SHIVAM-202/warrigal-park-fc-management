const { getDatabase } = require('./database');

function seedDatabase(db) {
    // 1. Ensure Season 2026 exists
    db.prepare(`INSERT OR IGNORE INTO seasons (id, year, is_active) VALUES (1, 2026, 1)`).run();

    // 2. Insert Guardians
    const insertGuardian = db.prepare(`
        INSERT OR IGNORE INTO guardians (id, first_name, last_name, relationship, mobile, email, address)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertGuardian.run(1, 'Dani', 'Kelleher', 'mother', '0417 662 908', 'd.kelleher@example.com', '22 Marlin Street, Bald Hills 4036');
    insertGuardian.run(2, 'Spiros', 'Antonopoulos', 'father', '0438 771 226', 's.antonopoulos@example.com', '14 Kluver Street, Bald Hills 4036');
    insertGuardian.run(3, 'Geoff', 'Boon', 'father', '0402 559 118', 'g.boon@example.com', '5 Pine River Rd, Bald Hills 4036');
    insertGuardian.run(4, 'Amira', 'Osman', 'mother', '0431 220 665', 'a.osman@example.com', '19 Lacey Rd, Bald Hills 4036');
    insertGuardian.run(5, 'Mark', 'Delahunty', 'father', '0417 003 442', 'm.delahunty@example.com', '8 Barcoo Cct, Bald Hills 4036');
    insertGuardian.run(6, 'Jun', 'Nakamura', 'father', '0455 118 070', 'j.nakamura@example.com', '33 Canterbury Dr, Bald Hills 4036');
    insertGuardian.run(7, 'Beverley', 'Ferris', 'grandmother', '0408 226 913', 'b.ferris@example.com', '40 Paladin St, Bald Hills 4036');
    insertGuardian.run(8, 'Paul', 'Achterberg', 'father', '0410 774 502', 'p.achterberg@example.com', '12 Kooringal Ave, Bald Hills 4036');
    insertGuardian.run(9, 'Naveed', 'Rehman', 'father', '0427 663 819', 'n.rehman@example.com', '7 Bracken Ridge Rd, Bald Hills 4036');
    insertGuardian.run(10, 'Tracey', 'Clarke', 'mother', '0438 220 907', 't.clarke@example.com', '28 Strathpine Rd, Bald Hills 4036');
    insertGuardian.run(11, 'Kostas', 'Petrides', 'father', '0405 118 663', 'k.petrides@example.com', '9 Norris Rd, Bald Hills 4036');

    // 3. Insert Members
    const insertMember = db.prepare(`
        INSERT OR IGNORE INTO members (id, first_name, last_name, dob, gender, email, phone)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // U13 Girls players
    insertMember.run(1, 'Mia', 'Kelleher', '2014-09-03', 'F', null, null);
    insertMember.run(2, 'Ruby', 'Antonopoulos', '2014-02-11', 'F', null, null);
    insertMember.run(3, 'Harriet', 'Boon', '2014-06-27', 'F', null, null);
    insertMember.run(4, 'Zainab', 'Osman', '2014-11-14', 'F', null, null);
    insertMember.run(5, 'Frankie', 'Delahunty', '2014-04-02', 'F', null, null);
    insertMember.run(6, 'Ivy', 'Nakamura', '2014-08-09', 'F', null, null);
    insertMember.run(7, 'Chloe', 'Ferris', '2014-01-30', 'F', null, null);
    insertMember.run(8, 'Sienna', 'Achterberg', '2014-05-19', 'F', null, null);
    insertMember.run(9, 'Tilly', 'Rehman', '2014-12-07', 'F', null, null);
    insertMember.run(10, 'Bo', 'Nguyen-Clarke', '2014-03-23', 'F', null, null);
    insertMember.run(11, 'Ana', 'Petrides', '2014-10-16', 'F', null, null);
    // Sibling of Mia: Rory Kelleher (U8)
    insertMember.run(12, 'Rory', 'Kelleher', '2018-05-12', 'M', null, null);
    // Senior player: Jayden Marsh
    insertMember.run(13, 'Jayden', 'Marsh', '2008-01-15', 'M', 'j.marsh@example.com', '0412 999 888');

    // 4. Link Members to Guardians
    const linkMemberGuardian = db.prepare(`
        INSERT OR IGNORE INTO member_guardians (member_id, guardian_id, is_primary)
        VALUES (?, ?, ?)
    `);

    // Mia and Rory share guardian Dani Kelleher (id: 1)
    linkMemberGuardian.run(1, 1, 1);
    linkMemberGuardian.run(12, 1, 1);
    // Other U13 girls
    linkMemberGuardian.run(2, 2, 1);
    linkMemberGuardian.run(3, 3, 1);
    linkMemberGuardian.run(4, 4, 1);
    linkMemberGuardian.run(5, 5, 1);
    linkMemberGuardian.run(6, 6, 1);
    linkMemberGuardian.run(7, 7, 1); // Grandmother is primary contact
    linkMemberGuardian.run(8, 8, 1);
    linkMemberGuardian.run(9, 9, 1);
    linkMemberGuardian.run(10, 10, 1);
    linkMemberGuardian.run(11, 11, 1);

    // 5. Insert Completed Registrations for 2026
    const insertReg = db.prepare(`
        INSERT OR IGNORE INTO registrations (member_id, season_id, age_group, status, notes)
        VALUES (?, 1, ?, 'complete', ?)
    `);

    insertReg.run(1, 'U13', 'Mild asthma - puffer in bag');
    insertReg.run(2, 'U13', 'Wants to be with Mia');
    insertReg.run(3, 'U13', null);
    insertReg.run(4, 'U13', null);
    insertReg.run(5, 'U13', 'Fee payment chasing');
    insertReg.run(6, 'U13', null);
    insertReg.run(7, 'U13', 'Grandmother primary contact');
    insertReg.run(8, 'U13', null);
    insertReg.run(9, 'U13', 'Goalkeeper');
    insertReg.run(10, 'U13', null);
    insertReg.run(11, 'U13', 'Moved from Gold after grading');
    insertReg.run(12, 'U8', 'Sibling of Mia');
    insertReg.run(13, 'Senior', 'Senior Men squad');

    // 6. Insert Teams
    const insertTeam = db.prepare(`
        INSERT OR IGNORE INTO teams (id, name, season_id, age_group, coach_name, coach_phone, coach_wwcc, manager_name, manager_phone, manager_wwcc, training_schedule)
        VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertTeam.run(1, 'U13G Navy', 'U13', 'Danny Sok', '0402 337 116', '1188-4472', 'S. Antonopoulos', '0438 771 226', '1204-9911', 'Tue & Thu 5:00–6:15, Field 2');
    insertTeam.run(2, 'U13G Gold', 'U13', 'TBA', null, null, 'TBA', null, null, 'Tue & Thu 5:00–6:15, Field 2');
    insertTeam.run(3, 'U8 Cubs', 'U8', 'Parent Volunteer', '0411 222 333', '1554-3321', 'Parent Manager', '0422 333 444', '1554-3322', 'Wed 4:30-5:30, Field 1');

    // 7. Place U13G Navy players on Roster
    const insertRoster = db.prepare(`
        INSERT OR IGNORE INTO team_rosters (team_id, member_id)
        VALUES (?, ?)
    `);

    for (let id = 1; id <= 11; id++) {
        insertRoster.run(1, id);
    }
    // Place Rory in U8 Cubs
    insertRoster.run(3, 12);
}

if (require.main === module) {
    const db = getDatabase();
    seedDatabase(db);
    console.log('Database successfully seeded with Warrigal Park FC case study data.');
}

module.exports = { seedDatabase };
