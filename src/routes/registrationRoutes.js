const express = require('express');
const RegistrationService = require('../services/registrationService');

const router = express.Router();
const registrationService = new RegistrationService();

router.get('/season/:seasonId', (req, res) => {
    try {
        const registrations = registrationService.getRegistrationsBySeason(req.params.seasonId);
        res.json({ success: true, data: registrations });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/member/:memberId', (req, res) => {
    try {
        const history = registrationService.getMemberRegistrationHistory(req.params.memberId);
        res.json({ success: true, data: history });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/', (req, res) => {
    try {
        const { memberId, seasonId, ageGroup, status, notes } = req.body;
        const reg = registrationService.createRegistration({ memberId, seasonId, ageGroup, status, notes });
        res.status(201).json({ success: true, data: reg });
    } catch (err) {
        // Enforces refusal of junior registration with clear error message
        res.status(400).json({ success: false, error: err.message });
    }
});

router.patch('/:id/status', (req, res) => {
    try {
        const { status } = req.body;
        const updated = registrationService.updateRegistrationStatus(req.params.id, status);
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

module.exports = router;
