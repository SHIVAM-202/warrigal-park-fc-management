const { getDatabase } = require('../db/database');

class RegistrationService {
    constructor(db = null) {
        this.db = db || getDatabase();
    }

    calculateAgeAtCutoff(dobString, seasonYear) {
        const dob = new Date(dobString);
        if (isNaN(dob.getTime())) {
            throw new Error(`Invalid date of birth format: ${dobString}`);
        }
        // Cutoff is December 31 of the season playing year per Association Circular 2026/03
        const cutoffDate = new Date(seasonYear, 11, 31);
        let age = cutoffDate.getFullYear() - dob.getFullYear();
        const monthDiff = cutoffDate.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && cutoffDate.getDate() < dob.getDate())) {
            age--;
        }
        return age;
    }

    createRegistration({ memberId, seasonId, ageGroup, status = 'complete', notes = null }) {
        // Retrieve member and season details
        const memberStmt = this.db.prepare(`SELECT * FROM members WHERE id = ?`);
        const member = memberStmt.get(memberId);
        if (!member) {
            throw new Error(`Member with ID ${memberId} not found`);
        }

        const seasonStmt = this.db.prepare(`SELECT * FROM seasons WHERE id = ?`);
        const season = seasonStmt.get(seasonId);
        if (!season) {
            throw new Error(`Season with ID ${seasonId} not found`);
        }

        const ageAtCutoff = this.calculateAgeAtCutoff(member.dob, season.year);

        // Core Domain Rule: Junior Guardian Rule
        // A member under 18 cannot hold a completed registration without a linked guardian
        if (ageAtCutoff < 18 && status === 'complete') {
            const guardianCountStmt = this.db.prepare(`
                SELECT COUNT(*) as count FROM member_guardians WHERE member_id = ?
            `);
            const { count } = guardianCountStmt.get(memberId);
            if (count === 0) {
                throw new Error(
                    `Registration refused: Member ${member.first_name} ${member.last_name} is under 18 years old ` +
                    `(Age ${ageAtCutoff} as of 31 Dec ${season.year}) and has no parent/guardian linked. ` +
                    `Under association rules, all junior registrations must carry verified parent/guardian consent.`
                );
            }
        }

        const insertStmt = this.db.prepare(`
            INSERT INTO registrations (member_id, season_id, age_group, status, notes)
            VALUES (?, ?, ?, ?, ?)
        `);

        try {
            const result = insertStmt.run(memberId, seasonId, ageGroup, status, notes);
            return this.getRegistrationById(Number(result.lastInsertRowid));
        } catch (err) {
            if (err.message && err.message.includes('UNIQUE constraint failed')) {
                throw new Error(`Member ${member.first_name} ${member.last_name} is already registered for the ${season.year} season.`);
            }
            throw err;
        }
    }

    updateRegistrationStatus(registrationId, newStatus) {
        if (!['started', 'complete', 'withdrawn'].includes(newStatus)) {
            throw new Error(`Invalid status: ${newStatus}. Must be 'started', 'complete', or 'withdrawn'.`);
        }

        const reg = this.getRegistrationById(registrationId);
        if (!reg) {
            throw new Error(`Registration with ID ${registrationId} not found`);
        }

        // Validate junior guardian rule if transitioning to 'complete'
        if (newStatus === 'complete') {
            const ageAtCutoff = this.calculateAgeAtCutoff(reg.member_dob, reg.season_year);
            if (ageAtCutoff < 18) {
                const guardianCountStmt = this.db.prepare(`
                    SELECT COUNT(*) as count FROM member_guardians WHERE member_id = ?
                `);
                const { count } = guardianCountStmt.get(reg.member_id);
                if (count === 0) {
                    throw new Error(
                        `Registration refused: Cannot complete registration. Member ${reg.first_name} ${reg.last_name} ` +
                        `is under 18 (Age ${ageAtCutoff}) and has no linked parent/guardian.`
                    );
                }
            }
        }

        const stmt = this.db.prepare(`UPDATE registrations SET status = ? WHERE id = ?`);
        stmt.run(newStatus, registrationId);
        return this.getRegistrationById(registrationId);
    }

    getRegistrationById(id) {
        const stmt = this.db.prepare(`
            SELECT r.*, m.first_name, m.last_name, m.dob as member_dob, m.gender, s.year as season_year
            FROM registrations r
            JOIN members m ON r.member_id = m.id
            JOIN seasons s ON r.season_id = s.id
            WHERE r.id = ?
        `);
        return stmt.get(id);
    }

    getRegistrationsBySeason(seasonId) {
        const stmt = this.db.prepare(`
            SELECT r.*, m.first_name, m.last_name, m.dob as member_dob, m.gender, s.year as season_year
            FROM registrations r
            JOIN members m ON r.member_id = m.id
            JOIN seasons s ON r.season_id = s.id
            WHERE r.season_id = ?
            ORDER BY r.age_group, m.last_name, m.first_name
        `);
        return stmt.all(seasonId);
    }

    getMemberRegistrationHistory(memberId) {
        const stmt = this.db.prepare(`
            SELECT r.*, s.year as season_year
            FROM registrations r
            JOIN seasons s ON r.season_id = s.id
            WHERE r.member_id = ?
            ORDER BY s.year DESC
        `);
        return stmt.all(memberId);
    }
}

module.exports = RegistrationService;
