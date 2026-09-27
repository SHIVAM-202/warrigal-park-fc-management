const { getDatabase } = require('../db/database');

class ExportService {
    constructor(db = null) {
        this.db = db || getDatabase();
    }

    calculateAgeAtCutoff(dobString, seasonYear) {
        const dob = new Date(dobString);
        if (isNaN(dob.getTime())) {
            return null;
        }
        const cutoffDate = new Date(seasonYear, 11, 31);
        let age = cutoffDate.getFullYear() - dob.getFullYear();
        const monthDiff = cutoffDate.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && cutoffDate.getDate() < dob.getDate())) {
            age--;
        }
        return age;
    }

    escapeCsvField(value) {
        if (value === null || value === undefined) {
            return '';
        }
        const stringVal = String(value);
        if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n') || stringVal.includes('\r')) {
            return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
    }

    getRegistrationExportData({ seasonId, status = null, ageGroup = null }) {
        if (!seasonId) {
            throw new Error('Season ID is required for export');
        }

        let query = `
            SELECT 
                r.id as registration_id,
                r.member_id,
                r.season_id,
                r.age_group,
                r.status,
                r.notes,
                r.created_at as registered_at,
                s.year as season_year,
                m.first_name,
                m.last_name,
                m.dob as member_dob,
                m.gender,
                m.email as member_email,
                m.phone as member_phone,
                g.first_name as guardian_first_name,
                g.last_name as guardian_last_name,
                g.relationship as guardian_relationship,
                g.mobile as guardian_mobile,
                g.email as guardian_email,
                g.address as guardian_address
            FROM registrations r
            JOIN members m ON r.member_id = m.id
            JOIN seasons s ON r.season_id = s.id
            LEFT JOIN member_guardians mg ON m.id = mg.member_id AND mg.is_primary = 1
            LEFT JOIN guardians g ON mg.guardian_id = g.id
            WHERE r.season_id = ?
        `;

        const params = [seasonId];

        if (status && status !== 'all') {
            query += ` AND r.status = ?`;
            params.push(status);
        }

        if (ageGroup && ageGroup !== 'all') {
            query += ` AND r.age_group = ?`;
            params.push(ageGroup);
        }

        query += ` ORDER BY r.age_group, m.last_name, m.first_name`;

        const stmt = this.db.prepare(query);
        return stmt.all(...params);
    }

    generatePlayRegisterCSV({ seasonId, status = null, ageGroup = null }) {
        const rows = this.getRegistrationExportData({ seasonId, status, ageGroup });

        const headers = [
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

        const csvLines = [headers.map(h => this.escapeCsvField(h)).join(',')];

        for (const row of rows) {
            const ageAtCutoff = this.calculateAgeAtCutoff(row.member_dob, row.season_year);
            const isJunior = ageAtCutoff !== null && ageAtCutoff < 18;

            const category = isJunior ? 'Junior' : 'Senior';
            const fullName = `${row.first_name} ${row.last_name}`;

            let contactName;
            let relationship;
            let contactMobile;
            let contactEmail;
            let address;

            if (isJunior) {
                contactName = row.guardian_first_name 
                    ? `${row.guardian_first_name} ${row.guardian_last_name}` 
                    : 'Missing Guardian';
                relationship = row.guardian_relationship || 'Parent/Guardian';
                contactMobile = row.guardian_mobile || '';
                contactEmail = row.guardian_email || '';
                address = row.guardian_address || '';
            } else {
                contactName = fullName;
                relationship = 'Self';
                contactMobile = row.member_phone || '';
                contactEmail = row.member_email || '';
                address = '';
            }

            const record = [
                row.registration_id,
                row.season_year,
                row.member_id,
                row.first_name,
                row.last_name,
                fullName,
                row.member_dob,
                ageAtCutoff !== null ? ageAtCutoff : '',
                row.gender || '',
                category,
                row.age_group,
                row.status,
                contactName,
                relationship,
                contactMobile,
                contactEmail,
                address,
                row.notes || '',
                row.registered_at || ''
            ];

            csvLines.push(record.map(val => this.escapeCsvField(val)).join(','));
        }

        return csvLines.join('\r\n');
    }
}

module.exports = ExportService;
