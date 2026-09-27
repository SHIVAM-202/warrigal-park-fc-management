const express = require('express');
const RegistrationService = require('../services/registrationService');
const ExportService = require('../services/exportService');

const router = express.Router();
const registrationService = new RegistrationService();
const exportService = new ExportService();

router.get('/export/csv', (req, res) => {
    try {
        const seasonId = req.query.seasonId ? Number(req.query.seasonId) : 1;
        const status = req.query.status || null;
        const ageGroup = req.query.ageGroup || null;

        const csvData = exportService.generatePlayRegisterCSV({ seasonId, status, ageGroup });
        const dateStamp = new Date().toISOString().slice(0, 10);
        const filename = `WPFC-PlayRegister-${seasonId}-${dateStamp}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csvData);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

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
