const express = require('express');
const MemberService = require('../services/memberService');

const router = express.Router();
const memberService = new MemberService();

router.get('/', (req, res) => {
    try {
        const { search } = req.query;
        const members = memberService.searchMembers(search);
        res.json({ success: true, data: members });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/:id', (req, res) => {
    try {
        const member = memberService.getMemberById(req.params.id);
        if (!member) {
            return res.status(404).json({ success: false, error: 'Member not found' });
        }
        res.json({ success: true, data: member });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/', (req, res) => {
    try {
        const { firstName, lastName, dob, gender, email, phone } = req.body;
        const newMember = memberService.createMember({ firstName, lastName, dob, gender, email, phone });
        res.status(201).json({ success: true, data: newMember });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

router.put('/:id', (req, res) => {
    try {
        const updated = memberService.updateMember(req.params.id, req.body);
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

module.exports = router;
