const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('../config');

let dbInstance = null;

function getDatabase(customPath = null) {
    if (dbInstance && !customPath) {
        return dbInstance;
    }

    const targetPath = customPath || config.dbPath;

    if (targetPath !== ':memory:') {
        const dir = path.dirname(targetPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    const db = new DatabaseSync(targetPath);
    // Enable foreign keys
    db.exec('PRAGMA foreign_keys = ON;');

    // Load and execute schema
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schemaSql);

    if (!customPath) {
        dbInstance = db;
    }
    return db;
}

function closeDatabase() {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
}

module.exports = {
    getDatabase,
    closeDatabase
};
