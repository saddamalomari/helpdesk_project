/**
 * ============================================================
 * مشروع نظام إدارة الشكاوى والدعم الفني (Help Desk)
 * المبرمج: صدام العمري
 * التعديل: نظام حماية متقدم ومعالجة أخطاء الصلاحيات
 * التاريخ: ديسمبر 2025
 * ============================================================
 */

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

// --- إعدادات البيئة والمجلدات ---

// كود إنشاء مجلد uploads تلقائياً لضمان عدم حدوث خطأ عند الرفع
const uploadsDir = path.join(__dirname, 'frontend/uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("✅ [System] Created uploads directory successfully.");
}

// إعداد CORS للسماح بالطلبات من المتصفح
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// إعداد السيرفر لقراءة الملفات الثابتة (Frontend)
app.use(express.static(path.join(__dirname, 'frontend')));

/**
 * إعداد Multer لرفع الملفات (صور وفيديو)
 * يتم تخزين الملفات بأسماء فريدة لمنع التداخل
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'FILE-' + uniqueSuffix + ext);
    }
});

// فلترة الملفات المرفوعة للتأكد من أنها صور أو فيديو فقط
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('نوع الملف غير مدعوم! يسمح فقط بالصور والفيديوهات.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // حد أقصى 50 ميجابايت
});

// --- برمجيات التحقق والحماية (Middlewares) ---

/**
 * نظام تسجيل العمليات (Logger)
 * يقوم بطباعة كل طلب يصل للسيرفر لمراقبة النشاط
 */
app.use((req, res, next) => {
    const now = new Date().toISOString();
    console.log(`[${now}] ${req.method} request to: ${req.url}`);
    next();
});

/**
 * Middleware للتحقق من التوكن (JWT)
 * تم تحديثه ليعالج مشكلة الصلاحيات (Role Normalization)
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 
    
    if (token == null) {
        return res.status(401).json({ message: 'غير مصرح: يجب تسجيل الدخول للوصول لهذه الخدمة.' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'YOUR_SECRET_KEY', (err, user) => {
        if (err) {
            console.error('❌ JWT Verification Error:', err.message);
            return res.status(403).json({ message: 'جلسة العمل انتهت أو الرمز غير صالح.' });
        }
        
        // تحويل الدور دائماً إلى حروف صغيرة لمنع أخطاء المقارنة (Admin vs admin)
        req.user = {
            ...user,
            role: user.role ? user.role.toLowerCase() : 'guest'
        };
        next();
    });
};

/**
 * Middleware للتحقق من صلاحية المدير (Admin)
 */
const checkAdminRole = (req, res, next) => {
    if (req.user.role !== 'admin') {
        console.warn(`⚠️ Unauthorized access attempt by user ID: ${req.user.id}`);
        return res.status(403).json({ message: 'ممنوع: هذه العملية تتطلب صلاحيات المدير فقط.' });
    }
    next();
};

/**
 * Middleware للتحقق من صلاحية الموظف أو المدير
 */
const checkStaffRole = (req, res, next) => {
    if (req.user.role !== 'employee' && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'ممنوع: هذه الصفحة مخصصة للموظفين فقط.' });
    }
    next();
};

// --- ROUTES: المصادقة (Authentication) ---

// الصفحة الرئيسية (تحويل لصفحة تسجيل الدخول)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'login.html')); 
});

/**
 * تسجيل الدخول
 */
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' });
    }

    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
        }

        const user = rows[0];
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
        }

        // إنشاء التوكن مع تضمين الدور والمعلومات الأساسية
        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            process.env.JWT_SECRET || 'YOUR_SECRET_KEY',
            { expiresIn: '7d' } 
        );

        console.log(`✅ User Logged In: ${user.email} (Role: ${user.role})`);

        res.json({
            message: 'تم تسجيل الدخول بنجاح',
            role: user.role.toLowerCase(), // نرسله بصيغة صغيرة للفرونت إند
            token: token,
            full_name: user.full_name
        });

    } catch (err) {
        console.error("❌ Login Error:", err);
        res.status(500).json({ message: 'حدث خطأ في السيرفر أثناء محاولة تسجيل الدخول' });
    }
});

/**
 * إنشاء حساب جديد
 */
app.post('/api/signup', async (req, res) => {
    const { name, email, password, province, role, employee_id, phone } = req.body; 
    
    if (!password || !name || !email || !role) { 
        return res.status(400).json({ message: 'جميع الحقول الأساسية مطلوبة' });
    }

    try {
        // فحص وجود الحساب مسبقاً
        const [existing] = await db.execute('SELECT id FROM users WHERE email=?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'هذا البريد الإلكتروني مسجل بالفعل' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // التعامل مع منطق الموظف
        if (role.toLowerCase() === 'employee') {
            if (!employee_id) return res.status(400).json({ message: 'الرقم الوظيفي مطلوب للموظفين.' });
            
            const [empRows] = await db.execute('SELECT * FROM employees WHERE employee_code = ?', [employee_id]);
            if (empRows.length === 0) return res.status(401).json({ message: 'الرقم الوظيفي غير موجود في قاعدة بيانات الموظفين المعتمدين.' });
            
            const [userCheck] = await db.execute('SELECT id FROM users WHERE employee_id = ?', [employee_id]);
            if (userCheck.length > 0) return res.status(400).json({ message: 'هذا الرقم الوظيفي مرتبط بحساب مستخدم آخر.' });
            
            await db.execute(
                'INSERT INTO users (full_name, email, password, role, employee_id, phone) VALUES (?, ?, ?, ?, ?, ?)', 
                [name, email, hashedPassword, 'Employee', employee_id, phone] 
            );
        } 
        // التعامل مع منطق المواطن
        else if (role.toLowerCase() === 'citizen') {
            if (!province || !phone) return res.status(400).json({ message: 'المحافظة ورقم الهاتف مطلوبان للمواطن.' });
            
            await db.execute(
                'INSERT INTO users (full_name, email, password, province, role, phone) VALUES (?, ?, ?, ?, ?, ?)', 
                [name, email, hashedPassword, province, 'Citizen', phone] 
            );
        } else {
            return res.status(400).json({ message: 'نوع المستخدم غير صالح' });
        }
        
        res.status(201).json({ message: 'تم إنشاء الحساب بنجاح، يمكنك الآن تسجيل الدخول' });
    } catch (err) {
        console.error('❌ Signup Error:', err);
        res.status(500).json({ message: 'حدث خطأ غير متوقع أثناء إنشاء الحساب' });
    }
});

// --- ROUTES: الملف الشخصي (Profile) ---

app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const sql = `
            SELECT 
                u.full_name, u.email, u.phone, u.province, u.role,
                e.department, e.employee_code
            FROM users u
            LEFT JOIN employees e ON u.employee_id = e.employee_id
            WHERE u.id = ?
        `;
        
        const [rows] = await db.execute(sql, [req.user.id]);
        
        if (rows.length === 0) return res.status(404).json({ message: 'المستخدم غير موجود.' });
        
        // تنظيف البيانات قبل الإرسال
        const data = rows[0];
        data.role = data.role.toLowerCase();
        res.json(data);

    } catch (err) {
        console.error('❌ Profile Error:', err);
        res.status(500).json({ message: 'فشل في جلب بيانات الملف الشخصي.' });
    }
});

app.post('/api/change-password', authenticateToken, async (req, res) => {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password) return res.status(400).json({ message: 'يرجى ملء الحقول المطلوبة' });

    try {
        const [rows] = await db.execute('SELECT password FROM users WHERE id=?', [req.user.id]);
        const isValid = await bcrypt.compare(old_password, rows[0].password);
        
        if (!isValid) return res.status(401).json({ message: 'كلمة المرور القديمة غير صحيحة' });

        const hashed = await bcrypt.hash(new_password, 10);
        await db.execute('UPDATE users SET password=? WHERE id=?', [hashed, req.user.id]);

        res.json({ message: 'تم تحديث كلمة المرور بنجاح' });
    } catch (err) {
        res.status(500).json({ message: 'خطأ في تحديث كلمة المرور' });
    }
});

// --- ROUTES: إدارة الشكاوى (Complaints) ---

/**
 * تقديم شكوى جديدة (متاح للجميع)
 */
app.post('/api/complaints', upload.fields([
    { name: 'photo_attachment', maxCount: 1 },
    { name: 'video_attachment', maxCount: 1 }
]), async (req, res) => {
    const { full_name, phone, province, area, complaint_type, description, privacy } = req.body;
    
    const photo = req.files['photo_attachment'] ? req.files['photo_attachment'][0].filename : null;
    const video = req.files['video_attachment'] ? req.files['video_attachment'][0].filename : null;

    if (!full_name || !phone || !description) {
        return res.status(400).json({ message: 'يرجى ملء البيانات الأساسية للشكوى' });
    }

    try {
        const [result] = await db.execute(
            `INSERT INTO complaints
             (full_name, phone, province, area, complaint_type, privacy, description, photo_path, video_path, status, date_submitted)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', NOW())`,
            [full_name, phone, province, area, complaint_type, privacy, description, photo, video]
        );
        
        res.json({ 
            id: result.insertId, 
            message: 'تم تسجيل الشكوى بنجاح، سيتم التواصل معك قريباً',
            reference: `TIC-${Date.now().toString().slice(-6)}-${result.insertId}`
        });
    } catch (err) {
        console.error('❌ Database Complaint Error:', err);
        res.status(500).json({ message: 'فشل في حفظ الشكوى في قاعدة البيانات' });
    }
});

/**
 * جلب شكاوى المواطن (المستخدم الحالي)
 */
app.get('/api/my-complaints', authenticateToken, async (req, res) => {
    try {
        const [user] = await db.execute('SELECT phone FROM users WHERE id = ?', [req.user.id]);
        
        if (user.length === 0 || !user[0].phone) return res.json([]);

        const [rows] = await db.execute(
            'SELECT * FROM complaints WHERE phone = ? ORDER BY date_submitted DESC', 
            [user[0].phone]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'حدث خطأ أثناء جلب شكاواك' });
    }
});

/**
 * جلب جميع الشكاوى (للموظفين والمديرين فقط)
 * هذا المسار تم تحديثه لمعالجة مشكلة الـ 403
 */
app.get('/api/admin/complaints', authenticateToken, checkStaffRole, async (req, res) => {
    try {
        console.log(`🔍 [Access Log] Staff Member ${req.user.email} is fetching all complaints.`);
        
        // جلب البيانات الأساسية للجدول
        const [rows] = await db.execute('SELECT * FROM complaints ORDER BY date_submitted DESC');
        
        res.json(rows);
    } catch (err) {
        console.error('❌ Staff Complaints Fetch Error:', err);
        res.status(500).json({ message: 'فشل السيرفر في جلب البيانات' });
    }
});

/**
 * جلب تفاصيل شكوى محددة
 */
app.get('/api/complaints/:id', authenticateToken, async (req, res) => {
    const { role, id: userId } = req.user;
    const complaintId = req.params.id; 
    
    try {
        const [rows] = await db.execute('SELECT * FROM complaints WHERE id = ?', [complaintId]);
        if (rows.length === 0) return res.status(404).json({ message: 'الشكوى غير موجودة' });

        const complaint = rows[0];

        // التحقق من الملكية إذا كان المستخدم مواطناً
        if (role === 'citizen') {
            const [u] = await db.execute('SELECT phone FROM users WHERE id = ?', [userId]);
            if (u[0].phone !== complaint.phone) {
                return res.status(403).json({ message: 'غير مصرح لك بعرض شكوى لا تخصك' });
            }
        }

        res.json(complaint);
    } catch (err) {
        res.status(500).json({ message: 'خطأ في جلب تفاصيل الشكوى' });
    }
});

/**
 * تحديث حالة الشكوى (للموظفين والمديرين)
 */
app.put('/api/complaints/:id/status', authenticateToken, checkStaffRole, async (req, res) => {
    const { status } = req.body;
    const complaintId = req.params.id;

    const validStatuses = ['new', 'in_progress', 'completed', 'refused'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'الحالة المدخلة غير صحيحة' });
    }

    try {
        const [result] = await db.execute(
            'UPDATE complaints SET status = ?, date_updated = NOW() WHERE id = ?',
            [status, complaintId]
        );

        if (result.affectedRows === 0) return res.status(404).json({ message: 'الشكوى غير موجودة' });

        res.json({ message: 'تم تحديث الحالة بنجاح', newStatus: status });
    } catch (err) {
        res.status(500).json({ message: 'فشل تحديث الحالة' });
    }
});

// --- ROUTES: متابعة الشكوى بدون تسجيل دخول (Follow-up) ---

app.get('/api/follow-up/:refNumber', async (req, res) => {
    let refNumber = req.params.refNumber;
    let complaintId = refNumber; 

    // منطق استخراج الـ ID إذا كان الرقم المرجعي بصيغة TIC_...
    const match = refNumber.match(/TIC_.*?_(\d+)$/);
    if (match) complaintId = match[1];
    
    try {
        const [rows] = await db.execute('SELECT id, status, complaint_type, date_submitted FROM complaints WHERE id=?', [complaintId]);
        
        if (rows.length === 0) return res.status(404).json({ message: 'لم يتم العثور على شكوى بهذا الرقم المرجعي' });
        
        res.json(rows[0]); 
    } catch (err) {
        res.status(500).json({ message: 'خطأ في نظام المتابعة' });
    }
});

// --- ROUTES: إدارة الموظفين (Employee Management - Admin Only) ---

app.get('/api/employees', authenticateToken, checkAdminRole, async (req, res) => {
    try {
        const sql = `
            SELECT 
                u.id, u.full_name AS name, u.email, u.phone, u.role,
                e.department, e.employee_code
            FROM users u
            LEFT JOIN employees e ON u.employee_id = e.employee_id 
            WHERE LOWER(u.role) IN ('employee', 'admin')
            ORDER BY u.full_name ASC
        `;
        const [rows] = await db.execute(sql);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: "فشل جلب قائمة الموظفين" });
    }
});

app.post('/api/employees', authenticateToken, checkAdminRole, async (req, res) => {
    const { name, id: employeeCode, email, password, department, phone } = req.body; 

    if (!name || !employeeCode || !email || !password) {
        return res.status(400).json({ message: 'يرجى إكمال كافة بيانات الموظف' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [exists] = await connection.execute('SELECT id FROM users WHERE email=?', [email]);
        if (exists.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'البريد الإلكتروني مسجل مسبقاً' });
        }

        const hashed = await bcrypt.hash(password, 10);
        
        // 1. إضافة سجل في جدول الموظفين
        const [empResult] = await connection.execute(
            'INSERT INTO employees (full_name, employee_code, department) VALUES (?, ?, ?)',
            [name, employeeCode, department] 
        );

        // 2. إضافة سجل في جدول المستخدمين
        await connection.execute(
            'INSERT INTO users (full_name, email, password, role, employee_id, phone) VALUES (?, ?, ?, "Employee", ?, ?)',
            [name, email, hashed, employeeCode, phone] 
        );

        await connection.commit();
        res.status(201).json({ message: 'تم إضافة الموظف وتفعيل حسابه بنجاح' });

    } catch (err) {
        await connection.rollback();
        console.error('❌ Transaction Error:', err);
        res.status(500).json({ message: 'حدث خطأ أثناء إضافة الموظف' });
    } finally {
        connection.release();
    }
});

app.delete('/api/employees/:id', authenticateToken, checkAdminRole, async (req, res) => {
    try {
        const [result] = await db.execute('DELETE FROM users WHERE id=? AND role != "Admin"', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'الموظف غير موجود أو لا يمكن حذفه' });
        res.json({ message: 'تم حذف حساب الموظف بنجاح' });
    } catch (err) {
        res.status(500).json({ message: 'فشل حذف الموظف' });
    }
});

// --- ROUTES: الإحصائيات ولوحة التحكم (Dashboard Stats) ---

app.get('/api/admin/stats', authenticateToken, checkAdminRole, async (req, res) => {
    try {
        // حساب الإجماليات
        const [uCount] = await db.execute('SELECT COUNT(*) as count FROM users WHERE LOWER(role) = "employee"');
        const [cCount] = await db.execute('SELECT COUNT(*) as count FROM complaints WHERE status IN ("new", "in_progress")');
        const [dCount] = await db.execute('SELECT COUNT(DISTINCT department) as count FROM employees');

        // إحصائيات للرسم البياني
        const [types] = await db.execute('SELECT complaint_type as label, COUNT(*) as total FROM complaints GROUP BY complaint_type');
        
        // أداء الأسبوع الأخير
        const [perf] = await db.execute(`
            SELECT DATE_FORMAT(date_submitted, '%W') as day, COUNT(*) as count 
            FROM complaints 
            WHERE date_submitted >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY day ORDER BY date_submitted ASC
        `);

        res.json({
            employees: uCount[0].count,
            active_complaints: cCount[0].count,
            departments: dCount[0].count,
            departments_labels: types.map(r => r.label),
            departments_data: types.map(r => r.total),
            performance_labels: perf.map(r => r.day),
            performance_data: perf.map(r => r.count)
        });

    } catch (err) {
        res.status(500).json({ message: "فشل جلب إحصائيات الإدارة" });
    }
});

app.get('/api/admin/notifications/unread', authenticateToken, checkStaffRole, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT COUNT(*) as count FROM complaints WHERE status = "new"');
        res.json({ count: rows[0].count });
    } catch (err) {
        res.status(500).json({ message: "خطأ في الإشعارات" });
    }
});

// --- تشغيل السيرفر ---

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ============================================================
    🚀 Alomari Help Desk Server is running!
    📡 URL: http://localhost:${PORT}
    📅 System Time: ${new Date().toLocaleString()}
    🔒 Security: JWT & Role-Based Access Control Active
    ============================================================
    `);
});