const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { checkDocx } = require('./checker');

const app = express();
app.use(cors());
app.use(express.json());

const db = require('./database');
const bcrypt = require('bcryptjs');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/api/check', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const userId = req.body.userId;
    
    // Fix multer UTF-8 filename encoding issue
    let originalName = req.file.originalname;
    try {
        originalName = Buffer.from(originalName, 'latin1').toString('utf8');
    } catch (e) {}
    
    const originalNameLower = originalName.toLowerCase();
    const isImage = originalNameLower.endsWith('.jpg') || originalNameLower.endsWith('.jpeg') || originalNameLower.endsWith('.png');

    if (!originalNameLower.endsWith('.docx') && !isImage) {
        return res.status(400).json({ error: 'รองรับเฉพาะไฟล์ .docx หรือรูปภาพเท่านั้น' });
    }

    if (isImage) {
        return res.json({
            scorePercent: 0,
            status: 'failed',
            message: 'กำลังพัฒนาระบบสแกนรูปภาพ (OCR)',
            error: 'ขณะนี้ระบบรองรับการตรวจสอบจากไฟล์ .docx เป็นหลัก กรุณาอัปโหลดไฟล์ Word เพื่อการวิเคราะห์ที่แม่นยำ',
            details: {
                structure_pass: false,
                chapters_found: 0,
                font_pass: false,
                fontsize_pass: false,
                margin_pass: false
            }
        });
    }

    const result = checkDocx(req.file.buffer);
    
    if (result.isBlank) {
        return res.json({
            scorePercent: 0,
            status: 'failed',
            message: 'เอกสารว่างเปล่า หรือมีข้อความน้อยเกินไป (ไม่พบเนื้อหาโครงงาน)',
            details: null
        });
    }

    const chaptersFound = [result.chapters.chap1, result.chapters.chap2, result.chapters.chap3, result.chapters.chap4, result.chapters.chap5].filter(Boolean).length;
    const structure_pass = chaptersFound >= 5; 
    const font_pass = result.formatting.fontPass;
    const fontsize_pass = result.formatting.fontSizePass;
    const margin_pass = result.formatting.marginPass;
    
    // Calculate dynamic score
    let score = 0;
    score += (chaptersFound * 8); // up to 40
    if (font_pass) score += 20;
    if (fontsize_pass) score += 20;
    if (margin_pass) score += 20;
    
    const responseData = {
        scorePercent: score,
        status: score >= 80 ? 'success' : (score >= 50 ? 'warning' : 'failed'),
        message: score >= 80 ? 'เอกสารสมบูรณ์และถูกต้อง' : (score >= 50 ? 'พบจุดที่ต้องแก้ไขบางส่วน' : 'โครงสร้างเอกสารมีข้อผิดพลาดมาก'),
        details: {
            structure_pass: structure_pass,
            chapters_found: chaptersFound,
            chapters_list: result.chapters,
            font_pass: font_pass,
            font_details: result.formatting.fontDetails,
            fontsize_pass: fontsize_pass,
            fontsize_details: result.formatting.sizeDetails,
            margin_pass: margin_pass,
            margin_details: result.formatting.marginDetails
        },
        subtopics: result.subtopics
    };

    if (userId) {
        db.run(`INSERT INTO history (user_id, file_name, score_percent, status, message, details) VALUES (?, ?, ?, ?, ?, ?)`, 
        [userId, originalName, responseData.scorePercent, responseData.status, responseData.message, JSON.stringify(responseData.details)], function(err) {
            if (err) console.error("Failed to save history", err);
        });
    }

    res.json(responseData);
});

// --- AUTH API ---
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Please provide all fields' });

    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(`INSERT INTO users (name, email, password) VALUES (?, ?, ?)`, [name, email, hashedPassword], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Email already exists' });
            }
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Registration successful', userId: this.lastID });
    });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        res.json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    });
});

// --- HISTORY API ---
app.get('/api/history', (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'Missing userId parameter' });

    db.all(`SELECT * FROM history WHERE user_id = ? ORDER BY created_at DESC`, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows.map(row => ({
            ...row,
            details: row.details ? JSON.parse(row.details) : null
        })));
    });
});

// --- ADMIN API ---
// Middleware to check if user is admin would normally go here, but for simplicity we rely on frontend sending role (or in production, use JWT)
// Since we don't have JWT, we will check the role by userId in the DB for security
const checkAdmin = (req, res, next) => {
    const adminId = req.headers['admin-id'];
    if (!adminId) return res.status(403).json({ error: 'Unauthorized' });
    
    db.get(`SELECT role FROM users WHERE id = ?`, [adminId], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized, admin only' });
        next();
    });
};

app.get('/api/admin/users', checkAdmin, (req, res) => {
    db.all(`SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

app.put('/api/admin/users/:id/role', checkAdmin, (req, res) => {
    const { role } = req.body;
    if (role !== 'admin' && role !== 'user') return res.status(400).json({ error: 'Invalid role' });
    
    db.run(`UPDATE users SET role = ? WHERE id = ?`, [role, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Role updated successfully' });
    });
});

app.delete('/api/admin/users/:id', checkAdmin, (req, res) => {
    db.run(`DELETE FROM users WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        // Also delete history
        db.run(`DELETE FROM history WHERE user_id = ?`, [req.params.id]);
        res.json({ message: 'User deleted successfully' });
    });
});


// --- DEPLOYMENT: Serve Frontend ---
app.use(express.static(path.join(__dirname, '../dist')));
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend API running on port ${PORT}`);
});
