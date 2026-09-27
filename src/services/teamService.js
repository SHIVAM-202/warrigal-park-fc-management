const { getDatabase } = require('../db/database');

class TeamService {
    constructor(db = null) {
        this.db = db || getDatabase();
    }

    createTeam({ name, seasonId, ageGroup, coachName = null, coachPhone = null, coachWwcc = null, coachWwccExpiry = null, managerName = null, managerPhone = null, managerWwcc = null, managerWwccExpiry = null, trainingSchedule = null }) {
        if (!name || !seasonId || !ageGroup) {
            throw new Error('Team name, season, and age group are required');
        }

        const stmt = this.db.prepare(`
            INSERT INTO teams (name, season_id, age_group, coach_name, coach_phone, coach_wwcc, coach_wwcc_expiry, manager_name, manager_phone, manager_wwcc, manager_wwcc_expiry, training_schedule)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(name.trim(), seasonId, ageGroup.trim(), coachName, coachPhone, coachWwcc, coachWwccExpiry, managerName, managerPhone, managerWwcc, managerWwccExpiry, trainingSchedule);
        return this.getTeamById(Number(result.lastInsertRowid));
    }

    getTeamById(id) {
        const stmt = this.db.prepare(`
            SELECT t.*, s.year as season_year
            FROM teams t
            JOIN seasons s ON t.season_id = s.id
            WHERE t.id = ?
        `);
        return stmt.get(id) || null;
    }

    getTeamsBySeason(seasonId) {
        const stmt = this.db.prepare(`
            SELECT t.*, s.year as season_year,
                   (SELECT COUNT(*) FROM team_rosters tr WHERE tr.team_id = t.id) as player_count
            FROM teams t
            JOIN seasons s ON t.season_id = s.id
            WHERE t.season_id = ?
            ORDER BY t.age_group, t.name
        `);
        return stmt.all(seasonId);
    }

    getTeamsByAgeGroup(seasonId, ageGroup) {
        const stmt = this.db.prepare(`
            SELECT t.*, s.year as season_year,
                   (SELECT COUNT(*) FROM team_rosters tr WHERE tr.team_id = t.id) as player_count
            FROM teams t
            JOIN seasons s ON t.season_id = s.id
            WHERE t.season_id = ? AND t.age_group = ?
            ORDER BY t.name
        `);
        return stmt.all(seasonId, ageGroup);
    }

    updateTeam(id, updates) {
        const fields = [];
        const values = [];

        if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
        if (updates.ageGroup !== undefined) { fields.push('age_group = ?'); values.push(updates.ageGroup); }
        if (updates.coachName !== undefined) { fields.push('coach_name = ?'); values.push(updates.coachName); }
        if (updates.coachPhone !== undefined) { fields.push('coach_phone = ?'); values.push(updates.coachPhone); }
        if (updates.coachWwcc !== undefined) { fields.push('coach_wwcc = ?'); values.push(updates.coachWwcc); }
        if (updates.coachWwccExpiry !== undefined) { fields.push('coach_wwcc_expiry = ?'); values.push(updates.coachWwccExpiry); }
        if (updates.managerName !== undefined) { fields.push('manager_name = ?'); values.push(updates.managerName); }
        if (updates.managerPhone !== undefined) { fields.push('manager_phone = ?'); values.push(updates.managerPhone); }
        if (updates.managerWwcc !== undefined) { fields.push('manager_wwcc = ?'); values.push(updates.managerWwcc); }
        if (updates.managerWwccExpiry !== undefined) { fields.push('manager_wwcc_expiry = ?'); values.push(updates.managerWwccExpiry); }
        if (updates.trainingSchedule !== undefined) { fields.push('training_schedule = ?'); values.push(updates.trainingSchedule); }

        if (fields.length === 0) return this.getTeamById(id);

        values.push(id);
        const query = `UPDATE teams SET ${fields.join(', ')} WHERE id = ?`;
        this.db.prepare(query).run(...values);
        return this.getTeamById(id);
    }

    deleteTeam(id) {
        // Deleting a team cascades and removes roster entries, but does NOT delete members or registrations
        const stmt = this.db.prepare(`DELETE FROM teams WHERE id = ?`);
        stmt.run(id);
        return true;
    }

    addPlayerToTeam(teamId, memberId) {
        const team = this.getTeamById(teamId);
        if (!team) {
            throw new Error(`Team with ID ${teamId} not found`);
        }

        // Rule: Verify player is registered for this team's season
        const regStmt = this.db.prepare(`
            SELECT * FROM registrations 
            WHERE member_id = ? AND season_id = ? AND status IN ('started', 'complete')
        `);
        const reg = regStmt.get(memberId, team.season_id);
        if (!reg) {
            throw new Error(`Cannot place player on team: Player is not registered for season ${team.season_year}.`);
        }

        // Add to team roster
        const insertStmt = this.db.prepare(`
            INSERT OR REPLACE INTO team_rosters (team_id, member_id)
            VALUES (?, ?)
        `);
        insertStmt.run(teamId, memberId);
        return true;
    }

    movePlayerBetweenTeams(memberId, fromTeamId, toTeamId) {
        const fromTeam = this.getTeamById(fromTeamId);
        const toTeam = this.getTeamById(toTeamId);

        if (!fromTeam || !toTeam) {
            throw new Error('Both source and destination teams must exist');
        }
        if (fromTeam.season_id !== toTeam.season_id) {
            throw new Error('Cannot move player between teams in different seasons');
        }

        // Remove from old team
        this.removePlayerFromTeam(fromTeamId, memberId);
        // Add to new team
        this.addPlayerToTeam(toTeamId, memberId);
        return true;
    }

    removePlayerFromTeam(teamId, memberId) {
        const stmt = this.db.prepare(`
            DELETE FROM team_rosters WHERE team_id = ? AND member_id = ?
        `);
        stmt.run(teamId, memberId);
        return true;
    }

    getTeamRosterWithContacts(teamId) {
        const team = this.getTeamById(teamId);
        if (!team) {
            throw new Error(`Team with ID ${teamId} not found`);
        }

        const rosterStmt = this.db.prepare(`
            SELECT 
                m.id as member_id,
                m.first_name,
                m.last_name,
                m.dob,
                m.gender,
                m.phone as member_phone,
                m.email as member_email,
                g.first_name as guardian_first_name,
                g.last_name as guardian_last_name,
                g.relationship as guardian_relationship,
                g.mobile as guardian_mobile,
                g.email as guardian_email,
                r.notes as registration_notes,
                tr.added_at
            FROM team_rosters tr
            JOIN members m ON tr.member_id = m.id
            LEFT JOIN member_guardians mg ON m.id = mg.member_id AND mg.is_primary = 1
            LEFT JOIN guardians g ON mg.guardian_id = g.id
            LEFT JOIN registrations r ON r.member_id = m.id AND r.season_id = ?
            WHERE tr.team_id = ?
            ORDER BY m.last_name, m.first_name
        `);

        const players = rosterStmt.all(team.season_id, teamId);

        // Format contact details cleanly for coach/manager view
        const roster = players.map(p => {
            const isJunior = new Date(p.dob).getFullYear() > (team.season_year - 18);
            return {
                memberId: p.member_id,
                name: `${p.first_name} ${p.last_name}`,
                dob: p.dob,
                gender: p.gender,
                notes: p.registration_notes || '',
                isJunior,
                contactName: isJunior 
                    ? (p.guardian_first_name ? `${p.guardian_first_name} ${p.guardian_last_name} (${p.guardian_relationship})` : 'No Guardian')
                    : `${p.first_name} ${p.last_name} (Self)`,
                contactPhone: isJunior 
                    ? (p.guardian_mobile || 'No Phone') 
                    : (p.member_phone || 'No Phone'),
                contactEmail: isJunior ? p.guardian_email : p.member_email
            };
        });

        // Attach WWCC compliance status for team sheet display
        const compliance = this.getTeamCompliance(teamId);

        return {
            team,
            players: roster,
            totalPlayers: roster.length,
            compliance
        };
    }

    evaluateOfficialCompliance({ role, name, wwcc, expiry, ageGroup, checkDate = new Date() }) {
        const isJuniorTeam = ageGroup !== 'Senior' && ageGroup !== 'Over 35';

        if (!name || name.trim() === '' || name.toUpperCase() === 'TBA') {
            return {
                role,
                name: name || 'TBA',
                wwcc: null,
                expiry: null,
                status: isJuniorTeam ? 'VACANT' : 'EXEMPT',
                isCompliant: !isJuniorTeam,
                daysRemaining: null,
                message: isJuniorTeam ? `${role} position is vacant (must be filled before Round 1)` : 'No official assigned'
            };
        }

        if (!wwcc || !wwcc.trim()) {
            return {
                role,
                name: name.trim(),
                wwcc: null,
                expiry: null,
                status: isJuniorTeam ? 'MISSING' : 'EXEMPT',
                isCompliant: !isJuniorTeam,
                daysRemaining: null,
                message: isJuniorTeam ? `WWCC / Blue Card missing for junior team ${role} (Ineligible to coach)` : 'Adult team official - WWCC optional'
            };
        }

        if (!expiry) {
            return {
                role,
                name: name.trim(),
                wwcc: wwcc.trim(),
                expiry: null,
                status: 'PENDING_VERIFICATION',
                isCompliant: false,
                daysRemaining: null,
                message: 'Card number recorded but expiry date unverified'
            };
        }

        const today = typeof checkDate === 'string' ? new Date(checkDate) : checkDate;
        const expDate = new Date(expiry);
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return {
                role,
                name: name.trim(),
                wwcc: wwcc.trim(),
                expiry,
                status: 'EXPIRED',
                isCompliant: false,
                daysRemaining: diffDays,
                message: `Card EXPIRED on ${expiry} (${Math.abs(diffDays)} days ago) - strictly ineligible`
            };
        } else if (diffDays <= 60) {
            return {
                role,
                name: name.trim(),
                wwcc: wwcc.trim(),
                expiry,
                status: 'EXPIRING_SOON',
                isCompliant: true,
                daysRemaining: diffDays,
                message: `Card expires soon on ${expiry} (${diffDays} days remaining)`
            };
        } else {
            return {
                role,
                name: name.trim(),
                wwcc: wwcc.trim(),
                expiry,
                status: 'VALID',
                isCompliant: true,
                daysRemaining: diffDays,
                message: `Valid until ${expiry}`
            };
        }
    }

    getTeamCompliance(teamId, checkDate = new Date()) {
        const team = this.getTeamById(teamId);
        if (!team) {
            throw new Error(`Team with ID ${teamId} not found`);
        }

        const coachCompliance = this.evaluateOfficialCompliance({
            role: 'Coach',
            name: team.coach_name,
            wwcc: team.coach_wwcc,
            expiry: team.coach_wwcc_expiry,
            ageGroup: team.age_group,
            checkDate
        });

        const managerCompliance = this.evaluateOfficialCompliance({
            role: 'Manager',
            name: team.manager_name,
            wwcc: team.manager_wwcc,
            expiry: team.manager_wwcc_expiry,
            ageGroup: team.age_group,
            checkDate
        });

        const isTeamCompliant = coachCompliance.isCompliant && managerCompliance.isCompliant;

        return {
            teamId: team.id,
            teamName: team.name,
            ageGroup: team.age_group,
            seasonYear: team.season_year,
            isTeamCompliant,
            coach: coachCompliance,
            manager: managerCompliance
        };
    }

    getClubComplianceSummary(seasonId, checkDate = new Date()) {
        const teams = this.getTeamsBySeason(seasonId);
        const auditList = teams.map(t => this.getTeamCompliance(t.id, checkDate));

        let totalOfficials = 0;
        let validCount = 0;
        let expiringSoonCount = 0;
        let expiredCount = 0;
        let missingCount = 0;

        auditList.forEach(item => {
            [item.coach, item.manager].forEach(official => {
                if (official.name && official.name !== 'TBA') {
                    totalOfficials++;
                    if (official.status === 'VALID' || official.status === 'EXEMPT') validCount++;
                    else if (official.status === 'EXPIRING_SOON') expiringSoonCount++;
                    else if (official.status === 'EXPIRED') expiredCount++;
                    else if (official.status === 'MISSING' || official.status === 'VACANT') missingCount++;
                }
            });
        });

        return {
            seasonId,
            totalTeams: teams.length,
            totalOfficials,
            validCount,
            expiringSoonCount,
            expiredCount,
            missingCount,
            isFullyCompliant: expiredCount === 0 && missingCount === 0,
            teams: auditList
        };
    }
}

module.exports = TeamService;
