const express = require('express');
const TeamService = require('../services/teamService');

const router = express.Router();
const teamService = new TeamService();

router.get('/season/:seasonId', (req, res) => {
    try {
        const { ageGroup } = req.query;
        let teams;
        if (ageGroup) {
            teams = teamService.getTeamsByAgeGroup(req.params.seasonId, ageGroup);
        } else {
            teams = teamService.getTeamsBySeason(req.params.seasonId);
        }
        res.json({ success: true, data: teams });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Club-wide WWCC compliance audit endpoint
router.get('/season/:seasonId/compliance', (req, res) => {
    try {
        const { checkDate } = req.query;
        const summary = teamService.getClubComplianceSummary(req.params.seasonId, checkDate);
        res.json({ success: true, data: summary });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Single team WWCC compliance check
router.get('/:id/compliance', (req, res) => {
    try {
        const { checkDate } = req.query;
        const compliance = teamService.getTeamCompliance(req.params.id, checkDate);
        res.json({ success: true, data: compliance });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/:id', (req, res) => {
    try {
        const team = teamService.getTeamById(req.params.id);
        if (!team) {
            return res.status(404).json({ success: false, error: 'Team not found' });
        }
        res.json({ success: true, data: team });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/', (req, res) => {
    try {
        const newTeam = teamService.createTeam(req.body);
        res.status(201).json({ success: true, data: newTeam });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

router.put('/:id', (req, res) => {
    try {
        const updated = teamService.updateTeam(req.params.id, req.body);
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

router.delete('/:id', (req, res) => {
    try {
        teamService.deleteTeam(req.params.id);
        res.json({ success: true, message: 'Team successfully removed' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/:id/roster', (req, res) => {
    try {
        const rosterData = teamService.getTeamRosterWithContacts(req.params.id);
        res.json({ success: true, data: rosterData });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/:id/roster', (req, res) => {
    try {
        const { memberId } = req.body;
        teamService.addPlayerToTeam(req.params.id, memberId);
        res.json({ success: true, message: 'Player successfully placed on team roster' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

router.delete('/:id/roster/:memberId', (req, res) => {
    try {
        teamService.removePlayerFromTeam(req.params.id, req.params.memberId);
        res.json({ success: true, message: 'Player removed from team roster' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/move-player', (req, res) => {
    try {
        const { memberId, fromTeamId, toTeamId } = req.body;
        teamService.movePlayerBetweenTeams(memberId, fromTeamId, toTeamId);
        res.json({ success: true, message: 'Player successfully moved between teams' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

module.exports = router;
