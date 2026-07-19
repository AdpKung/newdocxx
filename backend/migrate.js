const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'data', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

async function insertAdmin() {
    const password = '68319100021';
    const email = 'admin@gmail.com';
    const name = 'Admin';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')`, [name, email, hashedPassword], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                console.log('Email already exists, updating role to admin...');
                db.run(`UPDATE users SET role = 'admin' WHERE email = ?`, [email], function(err) {
                    if (err) console.error(err);
                    else console.log('Successfully updated role.');
                });
            } else {
                console.error(err);
            }
        } else {
            console.log('Successfully created admin user.');
        }
    });
}
insertAdmin();
