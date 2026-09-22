/**
 * Configuration Management Loader
 * Adheres to 12-Factor App methodology for environment-driven configuration.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment-specific .env file if present
const nodeEnv = process.env.NODE_ENV || 'development';
const envFilePath = path.resolve(process.cwd(), `.env.${nodeEnv}`);

if (fs.existsSync(envFilePath)) {
    dotenv.config({ path: envFilePath });
} else {
    dotenv.config(); // fallback to .env
}

// Hierarchical configuration values
const config = {
    env: nodeEnv,
    port: parseInt(process.env.PORT || '3000', 10),
    dbPath: process.env.DB_PATH || (nodeEnv === 'test' ? ':memory:' : path.resolve(process.cwd(), 'data', 'warrigal_park.sqlite')),
    logLevel: process.env.LOG_LEVEL || 'info',
    appName: 'Warrigal Park FC Management System',
    version: '1.0.0',
    associationRules: {
        cutoffDateMonth: 12,
        cutoffDateDay: 31,
        juniorMaxAgeExclusive: 18,
        squadMaxLimit: 16
    }
};

module.exports = config;
