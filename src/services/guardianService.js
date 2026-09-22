const { getDatabase } = require('../db/database');

class GuardianService {
    constructor(db = null) {
        this.db = db || getDatabase();
    }

    createGuardian({ firstName, lastName, relationship, mobile, email = null, address = null }) {
        if (!firstName || !lastName || !mobile || !relationship) {
            throw new Error('Guardian first name, last name, mobile number, and relationship are required');
        }

        const stmt = this.db.prepare(`
            INSERT INTO guardians (first_name, last_name, relationship, mobile, email, address)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(firstName.trim(), lastName.trim(), relationship.trim(), mobile.trim(), email, address);
        return this.getGuardianById(Number(result.lastInsertRowid));
    }

    getGuardianById(id) {
        const stmt = this.db.prepare(`SELECT * FROM guardians WHERE id = ?`);
        const guardian = stmt.get(id);
        if (!guardian) return null;

        // Fetch all linked children/juniors
        const childrenStmt = this.db.prepare(`
            SELECT m.*, mg.is_primary
            FROM members m
            JOIN member_guardians mg ON m.id = mg.member_id
            WHERE mg.guardian_id = ?
            ORDER BY m.dob ASC
        `);
        const children = childrenStmt.all(id);

        return {
            ...guardian,
            children
        };
    }

    updateGuardian(id, updates) {
        const fields = [];
        const values = [];

        if (updates.firstName !== undefined) { fields.push('first_name = ?'); values.push(updates.firstName); }
        if (updates.lastName !== undefined) { fields.push('last_name = ?'); values.push(updates.lastName); }
        if (updates.relationship !== undefined) { fields.push('relationship = ?'); values.push(updates.relationship); }
        if (updates.mobile !== undefined) { fields.push('mobile = ?'); values.push(updates.mobile); }
        if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
        if (updates.address !== undefined) { fields.push('address = ?'); values.push(updates.address); }

        if (fields.length === 0) return this.getGuardianById(id);

        values.push(id);
        const query = `UPDATE guardians SET ${fields.join(', ')} WHERE id = ?`;
        this.db.prepare(query).run(...values);
        return this.getGuardianById(id);
    }

    linkGuardianToMember(memberId, guardianId, isPrimary = 1) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO member_guardians (member_id, guardian_id, is_primary)
            VALUES (?, ?, ?)
        `);
        stmt.run(memberId, guardianId, isPrimary ? 1 : 0);
        return true;
    }

    unlinkGuardianFromMember(memberId, guardianId) {
        const stmt = this.db.prepare(`
            DELETE FROM member_guardians WHERE member_id = ? AND guardian_id = ?
        `);
        stmt.run(memberId, guardianId);
        return true;
    }

    getGuardiansForMember(memberId) {
        const stmt = this.db.prepare(`
            SELECT g.*, mg.is_primary
            FROM guardians g
            JOIN member_guardians mg ON g.id = mg.guardian_id
            WHERE mg.member_id = ?
            ORDER BY mg.is_primary DESC, g.last_name ASC
        `);
        return stmt.all(memberId);
    }

    getMembersForGuardian(guardianId) {
        const stmt = this.db.prepare(`
            SELECT m.*, mg.is_primary
            FROM members m
            JOIN member_guardians mg ON m.id = mg.member_id
            WHERE mg.guardian_id = ?
            ORDER BY m.dob ASC
        `);
        return stmt.all(guardianId);
    }
}

module.exports = GuardianService;
