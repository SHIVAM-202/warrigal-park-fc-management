const app = require('./app');
const config = require('./config');
const { getDatabase } = require('./db/database');
const { seedDatabase } = require('./db/seed');

// Initialize database
const db = getDatabase();

// Check if seasons exist; if not, seed with case study data
const seasonCheck = db.prepare('SELECT COUNT(*) as count FROM seasons').get();
if (seasonCheck.count === 0) {
    console.log('Seeding database with Warrigal Park FC initial data...');
    seedDatabase(db);
}

const server = app.listen(config.port, () => {
    console.log(`====================================================`);
    console.log(` Warrigal Park Football Club Management System`);
    console.log(` Environment: ${config.env}`);
    console.log(` Server running on http://localhost:${config.port}`);
    console.log(` Health Check: http://localhost:${config.port}/api/health`);
    console.log(`====================================================`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});

module.exports = server;
