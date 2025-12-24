document.addEventListener('DOMContentLoaded', () => {
    // ✅ 1. التحقق من التوكن لضمان صلاحية الجلسة
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('userToken') || 
                  localStorage.getItem('authToken');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // =================================================
    // ✅ 2. ميزة الوضع الليلي (Dark Mode) المطور
    // =================================================
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.setAttribute('aria-label', 'تبديل الوضع الليلي');
        themeToggle.tabIndex = 0;

        const toggleTheme = () => {
            const isDark = document.body.getAttribute('data-theme') === 'dark';
            if (isDark) {
                document.body.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                themeToggle.innerHTML = '<i class="fas fa-moon" aria-hidden="true"></i>';
            } else {
                document.body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeToggle.innerHTML = '<i class="fas fa-sun" aria-hidden="true"></i>';
            }
            loadAdminStats(); 
        };

        themeToggle.addEventListener('click', toggleTheme);
        themeToggle.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleTheme();
            }
        });
    }

    if (localStorage.getItem('theme') === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun" aria-hidden="true"></i>';
    }

    // =================================================
    // ✅ 3. تفعيل الرسوم البيانية (Charts)
    // =================================================
    let deptChart, perfChart;
    function initCharts(stats) {
        if (deptChart) deptChart.destroy();
        if (perfChart) perfChart.destroy();

        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#e0e0e0' : '#2c3e50';

        const deptCtx = document.getElementById('departmentChart').getContext('2d');
        deptChart = new Chart(deptCtx, {
            type: 'doughnut',
            data: {
                labels: stats.departments_labels || ['IT', 'HR', 'المالية', 'الاستقبال', 'الصيانة'],
                datasets: [{
                    data: stats.departments_data || [12, 19, 3, 5, 2], 
                    backgroundColor: ['#bf953f', '#1a1a2e', '#e74c3c', '#3498db', '#2ecc71'],
                    hoverOffset: 10
                }]
            },
            options: {
                plugins: { legend: { labels: { color: textColor, font: { family: 'Segoe UI' } } } }
            }
        });

        const perfCtx = document.getElementById('performanceChart').getContext('2d');
        perfChart = new Chart(perfCtx, {
            type: 'line',
            data: {
                labels: stats.performance_labels || ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
                datasets: [{
                    label: 'الشكاوى المنجزة',
                    data: stats.performance_data || [5, 15, 10, 25, 20],
                    borderColor: '#bf953f',
                    backgroundColor: 'rgba(191, 149, 63, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                scales: {
                    y: { ticks: { color: textColor } },
                    x: { ticks: { color: textColor } }
                }
            }
        });
    }

    // =================================================
    // ✅ 4. جلب الإحصائيات (Stats)
    // =================================================
    async function loadAdminStats() {
        try {
            const response = await fetch(`/api/admin/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const stats = await response.json();
                document.getElementById('total-employees').textContent = stats.employees || 0;
                document.getElementById('active-complaints').textContent = stats.active_complaints || 0;
                initCharts(stats);
            }
        } catch (error) {
            console.error("فشل تحميل الإحصائيات:", error);
        }
    }

    // =================================================
    // ✅ 5. جلب الموظفين (Fetch Employees)
    // =================================================
    async function fetchEmployees() {
        try {
            const response = await fetch(`/api/employees?t=${Date.now()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const employees = await response.json();
            const tbody = document.getElementById('employees-tbody');
            if (tbody) tbody.innerHTML = ''; 

            employees.forEach(emp => {
                if(emp.role?.toLowerCase() === 'admin') return;

                const employeeCode = emp.employee_code || emp.employee_id || emp.code || '#';

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${employeeCode}</td>
                    <td>
                        <div class="user-info" style="display:flex; align-items:center; gap:10px;">
                            <div class="avatar" style="width:30px; height:30px; background:#bf953f; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px;">
                                ${emp.name ? emp.name.charAt(0).toUpperCase() : '?'}
                            </div>
                            ${emp.name}
                        </div>
                    </td>
                    <td><span class="badge" style="background:#eee; padding:4px 8px; border-radius:4px; font-size:12px; color:#333;">${emp.department || 'غير محدد'}</span></td>
                    <td>${emp.email}</td>
                    <td>${emp.phone || 'غير متوفر'}</td>
                    <td>
                        <button class="icon-btn edit-btn" data-id="${emp.id}" aria-label="تعديل الموظف ${emp.name}">
                            <i class="fas fa-edit" style="color:#3498db;" aria-hidden="true"></i>
                        </button>
                        <button class="icon-btn delete-btn" data-id="${emp.id}" aria-label="حذف الموظف ${emp.name}">
                            <i class="fas fa-trash-alt" style="color:#e74c3c;" aria-hidden="true"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
            attachEventListeners();
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    }

    // =================================================
    // ✅ 6. إدارة الموظفين (إضافة، تعديل، حذف)
    // =================================================
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

            try {
                const response = await fetch(`/api/employees`, {
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
                    const result = await response.json();
                    alert('❌ خطأ: ' + result.message);
                }
            } catch (error) { alert('حدث خطأ في الاتصال بالسيرفر'); }
        });
    }

    function attachEventListeners() {
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.onclick = async function() {
                const id = this.getAttribute('data-id');
                if(confirm('هل أنت متأكد من حذف هذا الموظف؟')) {
                    const res = await fetch(`/api/employees/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if(res.ok) {
                        fetchEmployees(); 
                        loadAdminStats(); 
                    }
                }
            };
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.onclick = async function() {
                const id = this.getAttribute('data-id');
                const res = await fetch(`/api/employees/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if(res.ok) {
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

    const editForm = document.getElementById('edit-employee-form');
    if(editForm) {
        editForm.onsubmit = async (e) => {
            e.preventDefault();
            const dbId = document.getElementById('edit-employee-db-id').value;
            const payload = {
                name: document.getElementById('edit-employee-name').value,
                id: document.getElementById('edit-employee-id').value,
                department: document.getElementById('edit-department').value,
                email: document.getElementById('edit-employee-email').value,
                phone: document.getElementById('edit-phone').value,
                password: document.getElementById('edit-password').value
            };

            const res = await fetch(`/api/employees/${dbId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            if(res.ok) {
                alert('✅ تم تحديث بيانات الموظف بنجاح');
                document.getElementById('edit-employee-modal').style.display = 'none';
                fetchEmployees();
            }
        };
    }

    // =================================================
    // ✅ 7. نظام الإشعارات والتنبيهات
    // =================================================
    function updateNotificationBadge() {
        fetch('/api/admin/notifications/unread', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(response => response.json())
        .then(data => {
            const badge = document.querySelector('.notify-badge');
            if (badge) {
                badge.textContent = data.count;
                badge.style.display = data.count > 0 ? 'flex' : 'none';
            }
        })
        .catch(err => console.error("Notification Error:", err));
    }
    updateNotificationBadge();
    setInterval(updateNotificationBadge, 60000);

    // =================================================
    // ✅ 8. تسجيل الخروج
    // =================================================
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.setAttribute('aria-label', 'تسجيل الخروج');
        logoutBtn.tabIndex = 0;
        
        const performLogout = () => {
            if(confirm('هل تريد تسجيل الخروج؟')) {
                localStorage.clear();
                window.location.href = 'login.html';
            }
        };

        logoutBtn.addEventListener('click', performLogout);
        logoutBtn.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                performLogout();
            }
        });
    }

    const closeBtn = document.querySelector('.close-btn');
    if(closeBtn) closeBtn.onclick = () => document.getElementById('edit-employee-modal').style.display = "none";

    loadAdminStats();
    fetchEmployees();
});