const { getDatabase } = require('../db/database');

class MemberService {
    constructor(db = null) {
        this.db = db || getDatabase();
    }

    createMember({ firstName, lastName, dob, gender = 'Other', email = null, phone = null }) {
        if (!firstName || !lastName || !dob) {
            throw new Error('Member name and date of birth (DOB) are required');
        }

        const stmt = this.db.prepare(`
            INSERT INTO members (first_name, last_name, dob, gender, email, phone, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)
        `);
        const result = stmt.run(firstName.trim(), lastName.trim(), dob.trim(), gender, email, phone);
        return this.getMemberById(Number(result.lastInsertRowid));
    }

    getMemberById(id) {
        const stmt = this.db.prepare(`SELECT * FROM members WHERE id = ?`);
        const member = stmt.get(id);
        if (!member) return null;

        // Fetch guardians
        const guardianStmt = this.db.prepare(`
            SELECT g.*, mg.is_primary
            FROM guardians g
            JOIN member_guardians mg ON g.id = mg.guardian_id
            WHERE mg.member_id = ?
        `);
        const guardians = guardianStmt.all(id);

        // Fetch registrations
        const regStmt = this.db.prepare(`
            SELECT r.*, s.year as season_year
            FROM registrations r
            JOIN seasons s ON r.season_id = s.id
            WHERE r.member_id = ?
            ORDER BY s.year DESC
        `);
        const registrations = regStmt.all(id);

        return {
            ...member,
            guardians,
            registrations
        };
    }

    searchMembers(query) {
        if (!query || !query.trim()) {
            const stmt = this.db.prepare(`SELECT * FROM members ORDER BY last_name, first_name`);
            return stmt.all();
        }
        const term = `%${query.trim()}%`;
        const stmt = this.db.prepare(`
            SELECT * FROM members 
            WHERE first_name LIKE ? OR last_name LIKE ? OR (first_name || ' ' || last_name) LIKE ?
            ORDER BY last_name, first_name
        `);
        return stmt.all(term, term, term);
    }

    updateMember(id, updates) {
        const fields = [];
        const values = [];

        if (updates.firstName !== undefined) { fields.push('first_name = ?'); values.push(updates.firstName); }
        if (updates.lastName !== undefined) { fields.push('last_name = ?'); values.push(updates.lastName); }
        if (updates.dob !== undefined) { fields.push('dob = ?'); values.push(updates.dob); }
        if (updates.gender !== undefined) { fields.push('gender = ?'); values.push(updates.gender); }
        if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
        if (updates.phone !== undefined) { fields.push('phone = ?'); values.push(updates.phone); }
        if (updates.isActive !== undefined) { fields.push('is_active = ?'); values.push(updates.isActive ? 1 : 0); }

        if (fields.length === 0) return this.getMemberById(id);

        values.push(id);
        const query = `UPDATE members SET ${fields.join(', ')} WHERE id = ?`;
        this.db.prepare(query).run(...values);
        return this.getMemberById(id);
    }
}

module.exports = MemberService;
