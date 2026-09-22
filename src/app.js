const express = require('express');
const cors = require('cors');
const path = require('path');

const memberRoutes = require('./routes/memberRoutes');
const guardianRoutes = require('./routes/guardianRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const teamRoutes = require('./routes/teamRoutes');
const config = require('./config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static UI
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint for container monitoring & CI/CD
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: config.env,
        version: config.version,
        service: 'warrigal-park-fc-management'
    });
});

// API Routes
app.use('/api/members', memberRoutes);
app.use('/api/guardians', guardianRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/teams', teamRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({
        success: false,
        error: 'An internal server error occurred',
        details: config.env === 'development' ? err.message : undefined
    });
});

module.exports = app;
