const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:68319100021AoF@db.jzvdddtckdkgvffkssmr.supabase.co:5432/postgres';

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

pool.connect((err) => {
    if (err) {
        console.error('Error connecting to PostgreSQL:', err.message);
    } else {
        console.log('Connected to PostgreSQL database (Supabase).');
        
        // Initialize tables
        pool.query(`CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error("Error creating users table", err);
            else {
                // Ensure admin@gmail.com gets admin privileges automatically
                pool.query(`UPDATE users SET role = 'admin' WHERE email = 'admin@gmail.com'`).catch(() => {});
            }
        });

        pool.query(`CREATE TABLE IF NOT EXISTS history (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            file_name VARCHAR(255) NOT NULL,
            score_percent INTEGER NOT NULL,
            status VARCHAR(50) NOT NULL,
            message TEXT,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error("Error creating history table", err);
        });
    }
});

// Helper function to convert SQLite parameter '?' to Postgres '$1, $2'
function convertQuery(sql) {
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
}

const db = {
    run: (sql, params, callback) => {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        let pgSql = convertQuery(sql);
        
        // SQLite returns the last inserted ID via `this.lastID`.
        // To mock this, we append RETURNING id for INSERT statements in Postgres.
        let isInsert = pgSql.trim().toUpperCase().startsWith('INSERT');
        if (isInsert && !pgSql.toUpperCase().includes('RETURNING')) {
            pgSql += ' RETURNING id';
        }

        pool.query(pgSql, params, (err, res) => {
            if (err && err.code === '23505') {
                // Map Postgres unique violation to SQLite error message so server.js works without changes
                err.message = 'UNIQUE constraint failed: ' + err.message;
            }
            if (callback) {
                const context = {};
                if (isInsert && res && res.rows && res.rows.length > 0 && res.rows[0].id) {
                    context.lastID = res.rows[0].id;
                }
                callback.call(context, err);
            }
        });
    },
    get: (sql, params, callback) => {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        pool.query(convertQuery(sql), params, (err, result) => {
            if (err) return callback(err);
            callback(null, result.rows[0]);
        });
    },
    all: (sql, params, callback) => {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        pool.query(convertQuery(sql), params, (err, result) => {
            if (err) return callback(err);
            callback(null, result.rows);
        });
    }
};

module.exports = db;
