/**
 * نظام إدارة لوحة تحكم المدير - وكالة العمري للسفريات
 * المبرمج: صدام (CIS Expert)
 */

document.addEventListener('DOMContentLoaded', async () => {
    // =================================================
    // 1. التحقق من الهوية والأمان
    // =================================================
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('userToken') || 
                  localStorage.getItem('authToken');

    if (!token) {
        console.error("Access Denied: No token found.");
        window.location.href = 'login.html';
        return;
    }

    // =================================================
    // 2. إدارة الثيم (الوضع الليلي/النهاري)
    // =================================================
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    const applyTheme = (theme) => {
        if (theme === 'dark') {
            body.setAttribute('data-theme', 'dark');
            if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun" aria-hidden="true"></i>';
        } else {
            body.removeAttribute('data-theme');
            if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon" aria-hidden="true"></i>';
        }
    };

    // استعادة الثيم المحفوظ عند التحميل
    applyTheme(localStorage.getItem('theme'));

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = body.getAttribute('data-theme') === 'dark';
            const newTheme = isDark ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
            loadAdminStats(); // إعادة رسم المخططات لتناسب ألوان الثيم الجديد
        });
    }

    // =================================================
    // 3. إدارة المخططات البيانية (Chart.js)
    // =================================================
    let deptChart, perfChart;

    function initCharts(stats) {
        // تدمير المخططات القديمة لتجنب تداخل البيانات عند التحديث
        if (deptChart) deptChart.destroy();
        if (perfChart) perfChart.destroy();

        const isDark = body.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#e0e0e0' : '#2c3e50';

        // مخطط توزيع الأقسام (Doughnut)
        const deptCtx = document.getElementById('departmentChart').getContext('2d');
        deptChart = new Chart(deptCtx, {
            type: 'doughnut',
            data: {
                labels: stats.departments_labels || ['IT', 'HR', 'Finance', 'Reception', 'Housekeeping'],
                datasets: [{
                    data: stats.departments_data || [0, 0, 0, 0, 0],
                    backgroundColor: ['#bf953f', '#1a1a2e', '#e74c3c', '#3498db', '#2ecc71'],
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: textColor, font: { family: 'Segoe UI', size: 14 } } }
                }
            }
        });

        // مخطط الأداء الأسبوعي (Line)
        const perfCtx = document.getElementById('performanceChart').getContext('2d');
        perfChart = new Chart(perfCtx, {
            type: 'line',
            data: {
                labels: stats.performance_labels || ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
                datasets: [{
                    label: 'إغلاق الشكاوى',
                    data: stats.performance_data || [0, 0, 0, 0, 0],
                    borderColor: '#bf953f',
                    backgroundColor: 'rgba(191, 149, 63, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5
                }]
            },
            options: {
                scales: {
                    y: { ticks: { color: textColor }, grid: { color: isDark ? '#333' : '#eee' } },
                    x: { ticks: { color: textColor }, grid: { display: false } }
                }
            }
        });
    }

    // =================================================
    // 4. جلب البيانات من السيرفر (Stats & Employees)
    // =================================================
    
    async function loadAdminStats() {
        try {
            const response = await fetch('/api/admin/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const stats = await response.json();
                document.getElementById('total-employees').textContent = stats.employees || 0;
                document.getElementById('active-complaints').textContent = stats.active_complaints || 0;
                initCharts(stats);
            }
        } catch (error) { console.error("Stats Error:", error); }
    }

    async function fetchEmployees() {
        try {
            const response = await fetch(`/api/employees?t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const employees = await response.json();
            const tbody = document.getElementById('employees-tbody');
            if (!tbody) return;
            
            tbody.innerHTML = '';
            if (employees.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا يوجد موظفين حالياً.</td></tr>';
                return;
            }

            employees.forEach(emp => {
                if (emp.role?.toLowerCase() === 'admin') return;
                
                const employeeCode = emp.employee_code || emp.employee_id || emp.code || '#';
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${employeeCode}</td>
                    <td>
                        <div class="user-info" style="display:flex; align-items:center; gap:10px;">
                            <div class="avatar" style="width:35px; height:35px; background:#bf953f; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center;">
                                ${emp.name.charAt(0).toUpperCase()}
                            </div>
                            ${emp.name}
                        </div>
                    </td>
                    <td><span class="badge">${emp.department || 'عام'}</span></td>
                    <td>${emp.email}</td>
                    <td>${emp.phone || '---'}</td>
                    <td>
                        <button class="icon-btn edit-btn" data-id="${emp.id}" title="تعديل"><i class="fas fa-edit" style="color:#3498db;"></i></button>
                        <button class="icon-btn delete-btn" data-id="${emp.id}" title="حذف"><i class="fas fa-trash-alt" style="color:#e74c3c;"></i></button>
                    </td>
                `;
                tbody.appendChild(row);
            });
            attachEventListeners();
        } catch (error) { console.error('Fetch Employees Error:', error); }
    }

    // =================================================
    // 5. إدارة الموظفين (إضافة، تعديل، حذف)
    // =================================================

    // إضافة موظف جديد
    const addForm = document.getElementById('add-employee-form');
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                name: document.getElementById('employee-name').value,
                department: document.getElementById('department').value,
                id: document.getElementById('employee-id').value,
                email: document.getElementById('employee-email').value,
                phone: document.getElementById('phone').value,
                password: document.getElementById('employee-password').value
            };

            const response = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert('✅ تم إضافة الموظف بنجاح!');
                addForm.reset();
                fetchEmployees();
                loadAdminStats();
            } else {
                const err = await response.json();
                alert('❌ فشل: ' + err.message);
            }
        });
    }

    // ربط أزرار الحذف والتعديل بعد بناء الجدول
    function attachEventListeners() {
        // أزرار الحذف
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = async function() {
                const id = this.getAttribute('data-id');
                if (confirm('هل أنت متأكد من حذف هذا الموظف نهائياً؟')) {
                    const res = await fetch(`/api/employees/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        fetchEmployees();
                        loadAdminStats();
                    }
                }
            };
        });

        // أزرار التعديل (فتح المودال)
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.onclick = async function() {
                const id = this.getAttribute('data-id');
                const res = await fetch(`/api/employees/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (res.ok) {
                    document.getElementById('edit-employee-db-id').value = data.id;
                    document.getElementById('edit-employee-name').value = data.name;
                    document.getElementById('edit-employee-id').value = data.code || '';
                    document.getElementById('edit-department').value = data.department || '';
                    document.getElementById('edit-employee-email').value = data.email;
                    document.getElementById('edit-phone').value = data.phone || '';
                    document.getElementById('edit-employee-modal').style.display = 'flex';
                }
            };
        });
    }

    // حفظ تعديلات الموظف (PUT)
    const editForm = document.getElementById('edit-employee-form');
    if (editForm) {
        editForm.onsubmit = async (e) => {
            e.preventDefault();
            const dbId = document.getElementById('edit-employee-db-id').value;
            const payload = {
                name: document.getElementById('edit-employee-name').value,
                id: document.getElementById('edit-employee-id').value,
                department: document.getElementById('edit-department').value,
                email: document.getElementById('edit-employee-email').value,
                phone: document.getElementById('edit-phone').value,
                password: document.getElementById('edit-password').value // اختياري
            };

            const res = await fetch(`/api/employees/${dbId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('✅ تم تحديث البيانات بنجاح');
                document.getElementById('edit-employee-modal').style.display = 'none';
                fetchEmployees();
            }
        };
    }

    // =================================================
    // 6. نظام الإشعارات والتنبيهات
    // =================================================
    function updateNotificationBadge() {
        fetch('/api/admin/notifications/unread', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            const badge = document.querySelector('.notify-badge');
            if (badge) {
                badge.textContent = data.count || 0;
                badge.style.display = data.count > 0 ? 'flex' : 'none';
            }
        })
        .catch(err => console.error("Notification Error:", err));
    }

    // تحديث الإشعارات كل دقيقة
    updateNotificationBadge();
    setInterval(updateNotificationBadge, 60000);

    // =================================================
    // 7. تسجيل الخروج وإغلاق النوافذ
    // =================================================
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            if (confirm('هل تود تسجيل الخروج من النظام؟')) {
                localStorage.clear();
                window.location.href = 'login.html';
            }
        };
    }

    const closeBtn = document.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.onclick = () => {
            document.getElementById('edit-employee-modal').style.display = 'none';
        };
    }

    // إغلاق المودال عند الضغط خارجه
    window.onclick = (event) => {
        const modal = document.getElementById('edit-employee-modal');
        if (event.target == modal) modal.style.display = 'none';
    };

    // =================================================
    // 8. التشغيل الأولي للنظام
    // =================================================
    await loadAdminStats();
    await fetchEmployees();
});