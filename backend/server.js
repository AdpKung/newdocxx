const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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
    const docType = req.body.docType || 'full';
    
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

    let chaptersFound = 0;
    let structure_pass = false;
    let score = 0;

    if (docType === 'full') {
        chaptersFound = [result.chapters.chap1, result.chapters.chap2, result.chapters.chap3, result.chapters.chap4, result.chapters.chap5].filter(Boolean).length;
        structure_pass = chaptersFound >= 5; 
        score += (chaptersFound * 8); // up to 40
    } else {
        const hasRequestedChap = result.chapters[docType];
        chaptersFound = hasRequestedChap ? 1 : 0;
        structure_pass = hasRequestedChap;
        if (hasRequestedChap) {
            score += 40; // Full 40 points for structure if the required chapter is present
        }
    }

    const font_pass = result.formatting.fontPass;
    const fontsize_pass = result.formatting.fontSizePass;
    const margin_pass = result.formatting.marginPass;
    
    // Calculate dynamic score
    if (font_pass) score += 20;
    if (fontsize_pass) score += 20;
    if (margin_pass) score += 20;
    
    // Filter subtopics based on docType
    let subtopics_chap1 = null;
    let subtopics_chap3 = null;
    let subtopics_chap4 = null;
    let subtopics_chap5 = null;
    let formulas = null;

    if (result.subtopics) {
        subtopics_chap1 = {
            bg: result.subtopics.bg,
            obj: result.subtopics.obj,
            scope: result.subtopics.scope,
            benefit: result.subtopics.benefit,
            method: result.subtopics.method,
            vocab: result.subtopics.vocab
        };
        subtopics_chap3 = {
            population: result.subtopics.population,
            tools: result.subtopics.tools,
            collect: result.subtopics.collect,
            analyze: result.subtopics.analyze
        };
        subtopics_chap4 = {
            experiment: result.subtopics.experiment,
            result: result.subtopics.result
        };
        subtopics_chap5 = {
            conclusion: result.subtopics.conclusion,
            problems: result.subtopics.problems,
            suggestions: result.subtopics.suggestions
        };
    }
    
    if (docType === 'full' || docType === 'chap3') {
        formulas = result.formulas;
    }

    const responseData = {
        scorePercent: score,
        status: score >= 80 ? 'success' : (score >= 50 ? 'warning' : 'failed'),
        message: score >= 80 ? 'เอกสารสมบูรณ์และถูกต้อง' : (score >= 50 ? 'พบจุดที่ต้องแก้ไขบางส่วน' : 'โครงสร้างเอกสารมีข้อผิดพลาดมาก'),
        docType: docType,
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
        subtopics_chap1: (docType === 'full' || docType === 'chap1') ? subtopics_chap1 : null,
        subtopics_chap3: (docType === 'full' || docType === 'chap3') ? subtopics_chap3 : null,
        subtopics_chap4: (docType === 'full' || docType === 'chap4') ? subtopics_chap4 : null,
        subtopics_chap5: (docType === 'full' || docType === 'chap5') ? subtopics_chap5 : null,
        formulas: formulas
    };

    if (userId) {
        db.run(`INSERT INTO history (user_id, file_name, score_percent, status, message, details) VALUES (?, ?, ?, ?, ?, ?)`, 
        [userId, originalName, responseData.scorePercent, responseData.status, responseData.message, JSON.stringify(responseData.details)], function(err) {
            if (err) console.error("Failed to save history", err);
            
            // Add historyId to response
            responseData.historyId = this ? this.lastID : null;
            res.json(responseData);
        });
    } else {
        res.json(responseData);
    }
});

// --- AUTH API ---
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Please provide all fields' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const role = email === 'admin@gmail.com' ? 'admin' : 'user';
    
    db.run(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`, [name, email, hashedPassword, role], function(err) {
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
    const adminId = req.headers['admin-id'] || req.query.adminId;
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

app.get('/api/admin/stats', checkAdmin, (req, res) => {
    db.get(`SELECT COUNT(*) as c FROM users`, (err, userRow) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        
        db.get(`SELECT COUNT(*) as c FROM history`, (err, historyRow) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            
            db.get(`SELECT COUNT(*) as c FROM history WHERE status = 'success'`, (err, passedRow) => {
                if (err) return res.status(500).json({ error: 'Database error' });
                
                const totalUsers = userRow ? (userRow.c ?? userRow.C ?? userRow['COUNT(*)'] ?? 0) : 0;
                const totalDocs = historyRow ? (historyRow.c ?? historyRow.C ?? historyRow['COUNT(*)'] ?? 0) : 0;
                const totalPassed = passedRow ? (passedRow.c ?? passedRow.C ?? passedRow['COUNT(*)'] ?? 0) : 0;
                
                res.json({
                    totalUsers: Number(totalUsers),
                    totalDocs: Number(totalDocs),
                    totalPassed: Number(totalPassed),
                    totalFailed: Math.max(0, Number(totalDocs) - Number(totalPassed))
                });
            });
        });
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


// --- DOCX SUBMISSION ENDPOINTS ---
app.post('/api/submit-docx', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const { userId, historyId } = req.body;
    if (!userId || !historyId) return res.status(400).json({ error: 'Missing required fields' });

    let originalName = req.file.originalname;
    try { originalName = Buffer.from(originalName, 'latin1').toString('utf8'); } catch (e) {}

    if (!originalName.toLowerCase().endsWith('.docx')) {
        return res.status(400).json({ error: 'ต้องเป็นไฟล์ .docx เท่านั้น' });
    }

    // Verify 100% score
    db.get(`SELECT score_percent FROM history WHERE id = ? AND user_id = ?`, [historyId, userId], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'History not found' });
        if (row.score_percent < 100) return res.status(403).json({ error: 'ต้องได้คะแนน 100% ถึงจะส่งเอกสารได้' });

        // Save file
        const timestamp = Date.now();
        const safeName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const filename = `${historyId}_${timestamp}_${safeName}`;
        const submissionsDir = path.join(__dirname, 'uploads', 'submissions');
        const filepath = path.join(submissionsDir, filename);

        // Ensure directory exists
        if (!fs.existsSync(submissionsDir)) {
            fs.mkdirSync(submissionsDir, { recursive: true });
        }

        fs.writeFile(filepath, req.file.buffer, (err) => {
            if (err) {
                console.error("Write error:", err);
                return res.status(500).json({ error: 'Failed to save file: ' + err.message });
            }

            db.run(`INSERT INTO submissions (user_id, history_id, pdf_name, pdf_path) VALUES (?, ?, ?, ?)`, 
            [userId, historyId, originalName, filepath], function(err) {
                if (err) {
                    console.error("DB error:", err);
                    return res.status(500).json({ error: 'Failed to save submission record' });
                }
                res.json({ message: 'Submission successful', submissionId: this.lastID });
            });
        });
    });
});

app.get('/api/admin/submissions', checkAdmin, (req, res) => {
    const query = `
        SELECT s.id, s.pdf_name, s.created_at, u.name as user_name, u.email as user_email, h.file_name as docx_name 
        FROM submissions s 
        JOIN users u ON s.user_id = u.id 
        JOIN history h ON s.history_id = h.id 
        ORDER BY s.created_at DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

app.get('/api/download-pdf/:id', checkAdmin, (req, res) => {
    db.get(`SELECT pdf_path, pdf_name FROM submissions WHERE id = ?`, [req.params.id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Submission not found' });
        
        if (fs.existsSync(row.pdf_path)) {
            res.download(row.pdf_path, row.pdf_name);
        } else {
            res.status(404).json({ error: 'File not found on disk' });
        }
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
