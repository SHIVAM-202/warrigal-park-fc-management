const express = require('express');
const GuardianService = require('../services/guardianService');

const router = express.Router();
const guardianService = new GuardianService();

router.get('/:id', (req, res) => {
    try {
        const guardian = guardianService.getGuardianById(req.params.id);
        if (!guardian) {
            return res.status(404).json({ success: false, error: 'Guardian not found' });
        }
        res.json({ success: true, data: guardian });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/', (req, res) => {
    try {
        const { firstName, lastName, relationship, mobile, email, address } = req.body;
        const newGuardian = guardianService.createGuardian({ firstName, lastName, relationship, mobile, email, address });
        res.status(201).json({ success: true, data: newGuardian });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

router.put('/:id', (req, res) => {
    try {
        const updated = guardianService.updateGuardian(req.params.id, req.body);
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

router.post('/link', (req, res) => {
    try {
        const { memberId, guardianId, isPrimary } = req.body;
        guardianService.linkGuardianToMember(memberId, guardianId, isPrimary !== undefined ? isPrimary : 1);
        res.json({ success: true, message: 'Guardian successfully linked to member' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

router.delete('/unlink', (req, res) => {
    try {
        const { memberId, guardianId } = req.body;
        guardianService.unlinkGuardianFromMember(memberId, guardianId);
        res.json({ success: true, message: 'Guardian unlinked from member' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

router.get('/member/:memberId', (req, res) => {
    try {
        const guardians = guardianService.getGuardiansForMember(req.params.memberId);
        res.json({ success: true, data: guardians });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
