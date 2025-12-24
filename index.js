const express = require('express');
const app = express();
const db = require('./db'); 
const cors = require('cors');
require('dotenv').config();
const path = require('path'); 
const fs = require('fs');     
const multer = require('multer'); 
const jwt = require('jsonwebtoken'); 
const bcrypt = require('bcrypt');

// ✅ كود إنشاء مجلد uploads تلقائياً إذا لم يكن موجوداً
const dir = path.join(__dirname, 'frontend/uploads');
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
    console.log("✅ Created uploads directory successfully.");
}

app.use(cors());
app.use(express.json());

// إعداد Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, dir); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '-'));
    }
});

const upload = multer({ storage: storage });

// تأكد من أن السيرفر يقرأ مجلد frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// تعديل المسار لفتح صفحة login.html بدلاً من index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'login.html')); 
});

// Middleware للتحقق من التوكن
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 
    
    if (token == null) {
        return res.status(401).json({ message: 'غير مصرح: يجب تسجيل الدخول.' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'YOUR_SECRET_KEY', (err, user) => {
        if (err) {
            console.error('JWT Verification Error:', err);
            return res.status(403).json({ message: 'رمز الدخول غير صالح أو منتهي الصلاحية.' });
        }
        req.user = user; 
        next();
    });
};

// Middleware للتحقق من الآدمن
const checkAdminRole = (req, res, next) => {
    const userRole = req.user.role ? req.user.role.toLowerCase() : '';

    if (userRole !== 'admin') {
        return res.status(403).json({ message: 'ممنوع: هذه العملية تتطلب صلاحيات المدير (admin).' });
    }
    next();
};

// --- ROUTES ---

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'جميع الحقول مطلوبة' });
    }

    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        const user = rows[0];
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            return res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            process.env.JWT_SECRET || 'YOUR_SECRET_KEY',
            { expiresIn: '7d' } 
        );

        res.json({
            message: 'تم تسجيل الدخول بنجاح',
            role: user.role,
            token: token,
        });

    } catch (err) {
        console.error("❌ Login Error:", err);
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id; 
        
        const sql = `
            SELECT 
                users.full_name, 
                users.email,
                users.phone,
                employees.department,
                employees.employee_code,
                users.province
            FROM users
            LEFT JOIN employees ON users.employee_id = employees.employee_id
            WHERE users.id = ?
        `;
        
        const [rows] = await db.execute(sql, [userId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'المستخدم غير موجود.' });
        }
        
        const userData = rows[0];

        if (!userData.phone) userData.phone = 'غير متوفر';
        if (!userData.department) userData.department = 'غير محدد';
        if (!userData.employee_code) userData.employee_code = 'غير متوفر';

        res.json(userData);

    } catch (err) {
        console.error('❌ Profile Fetch Error:', err);
        res.status(500).json({ message: 'فشل في جلب بيانات الملف الشخصي.' });
    }
});

app.post('/api/signup', async (req, res) => {
    const { name, email, password, province, role, employee_id, phone } = req.body; 
    
    if (!password) return res.status(400).json({ message: 'كلمة المرور مطلوبة.' });
    if (!name || !email || !role) { 
        return res.status(400).json({ message: 'الاسم، البريد، والدور مطلوبة' });
    }

    try {
        const saltRounds = 10;
        const finalPassword = await bcrypt.hash(password, saltRounds);

        const [existing] = await db.execute('SELECT * FROM users WHERE email=?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'البريد الإلكتروني موجود مسبقاً' });
        }

        if (role === 'employee') {
            if (!employee_id) return res.status(400).json({ message: 'الرجاء إدخال الرقم الوظيفي.' });
            
            const [employeeRows] = await db.execute('SELECT * FROM employees WHERE employee_code = ?', [employee_id]);
            if (employeeRows.length === 0) return res.status(401).json({ message: 'الرقم الوظيفي غير صحيح أو غير معتمد.' });
            
            const [userCheck] = await db.execute('SELECT * FROM users WHERE employee_id = ?', [employee_id]);
            if (userCheck.length > 0) return res.status(400).json({ message: 'هذا الرقم الوظيفي مسجل بالفعل بحساب آخر.' });
            
            await db.execute(
                'INSERT INTO users (full_name, email, password, province, role, employee_id, phone) VALUES (?, ?, ?, ?, ?, ?, ?)', 
                [name, email, finalPassword, null, role, employee_id, phone] 
            );
        } else if (role === 'citizen') {
            if (!province) return res.status(400).json({ message: 'الرجاء اختيار المحافظة.' });
            if (!phone) return res.status(400).json({ message: 'الرجاء إدخال رقم الهاتف.' });
            
            await db.execute(
                'INSERT INTO users (full_name, email, password, province, role, employee_id, phone) VALUES (?, ?, ?, ?, ?, ?, ?)', 
                [name, email, finalPassword, province, role, null, phone] 
            );
        } else {
            await db.execute(
                'INSERT INTO users (full_name, email, password, province, role, employee_id, phone) VALUES (?, ?, ?, ?, ?, ?, ?)', 
                [name, email, finalPassword, null, role, null, phone] 
            );
        }
        
        res.json({ message: 'تم إنشاء الحساب بنجاح' });
    } catch (err) {
        console.error('❌ Signup Error:', err);
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

app.post('/api/change-password', authenticateToken, async (req, res) => {
    const { old_password, new_password } = req.body;
    const email = req.user.email; 

    if (!old_password || !new_password) return res.status(400).json({ message: 'الرجاء ملء جميع الحقول المطلوبة.' });

    try {
        const [rows] = await db.execute('SELECT password FROM users WHERE email=?', [email]);
        if (rows.length === 0) return res.status(404).json({ message: 'المستخدم غير موجود.' });
        
        const hashedPasswordStored = rows[0].password;
        const isMatch = await bcrypt.compare(old_password, hashedPasswordStored);
        if (!isMatch) {
            return res.status(401).json({ message: 'كلمة المرور القديمة غير صحيحة.' });
        }

        if (old_password === new_password) {
            return res.status(400).json({ message: 'كلمة المرور الجديدة يجب أن تختلف عن القديمة.' });
        }

        const newHashedPassword = await bcrypt.hash(new_password, 10);
        await db.execute('UPDATE users SET password=? WHERE email=?', [newHashedPassword, email]);

        res.json({ message: 'تم تغيير كلمة المرور بنجاح!' });
    } catch (err) {
        console.error('❌ Database Error during password change:', err);
        res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء تغيير كلمة المرور.' });
    }
});

app.post('/api/complaints', upload.fields([
    { name: 'photo_attachment', maxCount: 1 },
    { name: 'video_attachment', maxCount: 1 }
]), async (req, res) => {
    const { full_name, phone, province, area, complaint_type, description, privacy } = req.body;
    
    const photoPath = req.files && req.files['photo_attachment'] ? req.files['photo_attachment'][0].filename : null;
    const videoPath = req.files && req.files['video_attachment'] ? req.files['video_attachment'][0].filename : null;

    const requiredFields = { full_name, phone, province, area, complaint_type, description, privacy };
    for (const key in requiredFields) {
        if (!requiredFields[key] || requiredFields[key].trim() === '') {
            return res.status(400).json({ message: `بيانات ناقصة: لم يتم استلام حقل ${key}` });
        }
    }

    try {
        const [result] = await db.execute(
            `INSERT INTO complaints
             (full_name, phone, province, area, complaint_type, privacy, description, photo_path, video_path, status, date_submitted)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', NOW())`,
            [full_name, phone, province, area, complaint_type, privacy, description, photoPath, videoPath]
        );
        
        res.json({ 
            id: result.insertId, 
            message: 'تم إضافة الشكوى بنجاح',
            province: province,
            area: area
        });
    } catch (err) {
        console.error('❌ Database Error:', err);
        res.status(500).json({ message: 'حدث خطأ في قاعدة البيانات: ' + err.message });
    }
});

app.get('/api/my-complaints', authenticateToken, async (req, res) => {
    try {
        const [userRows] = await db.execute('SELECT phone FROM users WHERE id = ?', [req.user.id]);
        
        if (userRows.length === 0 || !userRows[0].phone) {
            return res.json([]); 
        }

        const userPhone = userRows[0].phone;

        const [complaints] = await db.execute(
            'SELECT * FROM complaints WHERE phone = ? ORDER BY date_submitted DESC', 
            [userPhone]
        );
        
        res.json(complaints);
    } catch (err) {
        console.error('❌ Error fetching user complaints:', err);
        res.status(500).json({ message: 'فشل في جلب قائمة الشكاوى الخاصة بك.' });
    }
});
// ✅ أضف هذا الكود هنا (تقريباً سطر 243) ليتمكن الموظف من جلب البيانات
app.get('/api/complaints', authenticateToken, async (req, res) => {
    try {
        const userRole = req.user.role ? req.user.role.toLowerCase() : '';
        
        // التحقق: الموظف والمدير فقط مسموح لهما برؤية كل الشكاوى
        if (userRole !== 'employee' && userRole !== 'admin') {
            return res.status(403).json({ message: 'غير مصرح لك بالوصول لهذه البيانات.' });
        }

        const [rows] = await db.execute('SELECT * FROM complaints ORDER BY date_submitted DESC');
        res.json(rows);
    } catch (err) {
        console.error('❌ Error fetching complaints:', err);
        res.status(500).json({ message: 'فشل في جلب قائمة الشكاوى' });
    }
});
app.get('/api/complaints/:id', authenticateToken, async (req, res) => {
    const userRole = req.user.role ? req.user.role.toLowerCase() : '';
    const userId = req.user.id;
    const complaintId = req.params.id; 
    
    try {
        const [rows] = await db.execute('SELECT * FROM complaints WHERE id = ?', [complaintId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'الشكوى المطلوبة غير موجودة.' });
        }

        const complaint = rows[0];

        if (userRole === 'admin' || userRole === 'employee') {
            return res.json(complaint);
        } 
        else if (userRole === 'citizen') {
            const [userRows] = await db.execute('SELECT phone FROM users WHERE id = ?', [userId]);
            const userPhone = userRows[0]?.phone;

            if (userPhone && complaint.phone === userPhone) {
                return res.json(complaint);
            } else {
                return res.status(403).json({ message: 'غير مصرح لك بالوصول لشكوى لا تخصك.' });
            }
        } else {
            return res.status(403).json({ message: 'غير مصرح لك بالوصول.' });
        }
    } catch (err) {
        console.error('❌ Error fetching complaint:', err);
        res.status(500).json({ message: 'فشل في جلب بيانات الشكوى.' });
    }
});

app.put('/api/complaints/:id/status', authenticateToken, async (req, res) => {
    const complaintId = req.params.id; 
    const { status } = req.body; 

    const userRole = req.user.role ? req.user.role.toLowerCase() : '';

    if (userRole !== 'employee' && userRole !== 'admin') {
        return res.status(403).json({ message: 'غير مصرح لك بالوصول لهذه العملية.' });
    }

    if (!status) return res.status(400).json({ message: "حالة الشكوى مطلوبة." });

    const validStatuses = ['new', 'in_progress', 'completed', 'refused'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `قيمة الحالة غير صالحة: ${status}.` });
    }

    try {
        const [result] = await db.execute(
            `UPDATE complaints SET status = ?, date_updated = NOW() WHERE id = ?`,
            [status, complaintId] 
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "الشكوى غير موجودة أو لم يتم تحديثها." });
        }

        res.status(200).json({ message: "تم تحديث حالة الشكوى بنجاح.", newStatus: status });

    } catch (err) {
        console.error('❌ Database Update Error:', err);
        res.status(500).json({ message: "حدث خطأ داخلي في الخادم." });
    }
});

app.get('/api/follow-up/:refNumber', async (req, res) => {
    let refNumber = req.params.refNumber;
    let complaintId = refNumber; 

    const match = refNumber.match(/TIC_\d+_\d+_(\d+)/);
    if (match && match[1]) {
        complaintId = match[1]; 
    } else if (refNumber.startsWith('TIC_') && !match) {
        return res.status(400).json({ message: 'صيغة الرقم المرجعي غير صحيحة. يجب أن تكون TIC_M_A_S' });
    }
    
    try {
        const [rows] = await db.execute('SELECT * FROM complaints WHERE id=?', [complaintId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'الشكوى غير موجودة' });
        }
        
        res.json(rows[0]); 
    } catch (err) {
        console.error('❌ Follow-up Error:', err);
        res.status(500).json({ message: 'حدث خطأ في السيرفر' });
    }
});

app.get('/api/employees', async (req, res) => {
    try {
        const sql = `
            SELECT 
                users.id, 
                users.full_name AS name, 
                users.email, 
                users.phone,
                users.role,
                employees.department,
                employees.employee_code
            FROM users 
            LEFT JOIN employees ON users.employee_id = employees.employee_id 
            WHERE users.role = "Employee" OR users.role = "Admin" 
            ORDER BY users.full_name ASC
        `;
        
        const [rows] = await db.execute(sql);
        res.json(rows);
    } catch (err) {
        console.error("❌ Error fetching employees:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.get('/api/employees/:id', authenticateToken, checkAdminRole, async (req, res) => {
    const userId = req.params.id;
    try {
        const sql = `
            SELECT 
                users.id, 
                users.full_name AS name, 
                users.email, 
                users.phone,
                users.employee_id,
                employees.employee_code AS code,
                employees.department
            FROM users 
            LEFT JOIN employees ON users.employee_id = employees.employee_id 
            WHERE users.id = ?
        `;
        const [rows] = await db.execute(sql, [userId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'الموظف غير موجود.' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error('❌ Error fetching single employee:', err);
        res.status(500).json({ message: 'فشل في جلب بيانات الموظف.' });
    }
});

app.post('/api/employees', authenticateToken, checkAdminRole, async (req, res) => {
    const { name, id, email, password, department, phone } = req.body; 

    if (!name || !id || !email || !password || !department || !phone) {
        return res.status(400).json({ message: 'جميع حقول الموظف مطلوبة.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [existingUser] = await connection.execute('SELECT email FROM users WHERE email=?', [email]);
        const [existingEmp] = await connection.execute('SELECT employee_code FROM employees WHERE employee_code=?', [id]);
        
        if (existingUser.length > 0 || existingEmp.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'البريد الإلكتروني أو الرقم الوظيفي موجود مسبقاً.' });
        }

        const finalPassword = await bcrypt.hash(password, 10);
        
        const [empResult] = await connection.execute(
            'INSERT INTO employees (full_name, employee_code, department) VALUES (?, ?, ?)',
            [name, id, department] 
        );

        const realEmployeeId = empResult.insertId;

        const [userResult] = await connection.execute(
            'INSERT INTO users (full_name, email, password, role, employee_id, phone) VALUES (?, ?, ?, "Employee", ?, ?)',
            [name, email, finalPassword, realEmployeeId, phone] 
        );

        await connection.commit();
        res.status(201).json({ message: 'تم إضافة الموظف بنجاح.', userId: userResult.insertId });

    } catch (err) {
        await connection.rollback();
        console.error('❌ Employee Add Error:', err);
        res.status(500).json({ message: 'فشل في إضافة الموظف: ' + err.message });
    } finally {
        connection.release();
    }
});

app.put('/api/employees/:id', authenticateToken, checkAdminRole, async (req, res) => {
    const userId = req.params.id;
    const { name, id, email, department, phone, password } = req.body; 

    if (!name || !id || !email || !department || !phone) {
        return res.status(400).json({ message: 'جميع الحقول مطلوبة.' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        let userUpdateQuery = 'UPDATE users SET full_name=?, email=?, phone=?';
        let userParams = [name, email, phone];

        if (password && password.trim() !== "") {
            const hashedPassword = await bcrypt.hash(password, 10);
            userUpdateQuery += ', password=?';
            userParams.push(hashedPassword);
        }

        userUpdateQuery += ' WHERE id=?';
        userParams.push(userId);

        await connection.execute(userUpdateQuery, userParams);

        const [userRows] = await connection.execute('SELECT employee_id FROM users WHERE id=?', [userId]);
        const employeeRefId = userRows[0].employee_id;

        if (employeeRefId) {
            await connection.execute(
                'UPDATE employees SET full_name=?, employee_code=?, department=? WHERE employee_id=?',
                [name, id, department, employeeRefId]
            );
        }

        await connection.commit();
        res.json({ message: 'تم تحديث بيانات الموظف بنجاح.' });

    } catch (err) {
        await connection.rollback();
        console.error('❌ Employee Update Error:', err);
        res.status(500).json({ message: 'فشل في تحديث بيانات الموظف.' });
    } finally {
        connection.release();
    }
});

app.delete('/api/employees/:id', authenticateToken, checkAdminRole, async (req, res) => {
    const userId = req.params.id;
    try {
        const [result] = await db.execute('DELETE FROM users WHERE id=? AND role != "Admin"', [userId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'الموظف غير موجود أو لا يمكن حذفه.' });
        }
        res.json({ message: 'تم حذف الموظف بنجاح.' });
    } catch (err) {
        console.error('❌ Employee Delete Error:', err);
        res.status(500).json({ message: 'فشل في حذف الموظف.' });
    }
});

// ✅ [محدث] نقطة اتصال الإحصائيات (تدعم الرسوم البيانية)
app.get('/api/admin/stats', authenticateToken, checkAdminRole, async (req, res) => {
    try {
        const [empResult] = await db.execute('SELECT COUNT(*) as count FROM users WHERE role = "Employee"');
        const [complaintResult] = await db.execute('SELECT COUNT(*) as count FROM complaints WHERE status IN ("new", "in_progress")');
        const [deptResult] = await db.execute('SELECT COUNT(DISTINCT department) as count FROM employees');

        // إحصائيات الرسوم البيانية (Charts)
        const [typeRows] = await db.execute('SELECT complaint_type as label, COUNT(*) as total FROM complaints GROUP BY complaint_type');
        const [perfRows] = await db.execute(`
            SELECT DATE_FORMAT(date_submitted, '%W') as day, COUNT(*) as count 
            FROM complaints 
            WHERE date_submitted >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY day 
            ORDER BY date_submitted ASC
        `);

        res.json({
            employees: empResult[0].count,
            active_complaints: complaintResult[0].count,
            departments: deptResult[0].count,
            departments_labels: typeRows.map(r => r.label),
            departments_data: typeRows.map(r => r.total),
            performance_labels: perfRows.map(r => r.day),
            performance_data: perfRows.map(r => r.count)
        });

    } catch (err) {
        console.error("❌ Error fetching admin stats:", err);
        res.status(500).json({ message: "فشل في جلب الإحصائيات" });
    }
});

app.get('/api/admin/complaints', authenticateToken, checkAdminRole, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM complaints ORDER BY date_submitted DESC');
        res.json(rows);
    } catch (err) {
        console.error('❌ Error fetching all complaints:', err);
        res.status(500).json({ message: 'فشل في جلب قائمة الشكاوى للمدير' });
    }
});

const PORT = process.env.PORT || 3000;
// ✅ جلب عدد الشكاوى الجديدة غير المقروءة للإشعارات
app.get('/api/admin/notifications/unread', authenticateToken, checkAdminRole, async (req, res) => {
    try {
        // نعد فقط الشكاوى التي حالتها 'new'
        const [rows] = await db.execute('SELECT COUNT(*) as unreadCount FROM complaints WHERE status = "new"');
        
        res.json({ count: rows[0].unreadCount });
    } catch (err) {
        console.error("❌ Notification Error:", err);
        res.status(500).json({ message: "فشل جلب الإشعارات" });
    }
});
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));