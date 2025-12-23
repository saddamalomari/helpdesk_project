document.addEventListener('DOMContentLoaded', () => {
    // ✅ التحقق من التوكن لضمان صلاحية الجلسة
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('userToken') || 
                  localStorage.getItem('authToken');

    if (!token) {
        console.error("لم يتم العثور على توكن، يتم التحويل لصفحة الدخول...");
        window.location.href = 'login.html';
        return;
    }

    // =================================================
    // ✅ التعديل الجديد: تفعيل بطاقة "الشكاوى النشطة" كزر للانتقال لصفحة عرض الكل
    // =================================================
    const activeComplaintsCard = document.getElementById('active-complaints')?.closest('.stat-card');
    
    if (activeComplaintsCard) {
        activeComplaintsCard.style.cursor = 'pointer'; // تغيير شكل الماوس ليد عند الوقوف على البطاقة
        
        activeComplaintsCard.addEventListener('click', () => {
            window.location.href = 'all-complaints.html'; // التوجه لصفحة جميع الشكاوى
        });
        
        // إضافة تأثير حركي بسيط عند مرور الماوس لزيادة التفاعل
        activeComplaintsCard.addEventListener('mouseenter', () => {
            activeComplaintsCard.style.transform = 'translateY(-8px)';
            activeComplaintsCard.style.boxShadow = '0 10px 25px rgba(191, 149, 63, 0.3)';
            activeComplaintsCard.style.transition = 'all 0.3s ease';
        });
        
        activeComplaintsCard.addEventListener('mouseleave', () => {
            activeComplaintsCard.style.transform = 'translateY(0)';
            activeComplaintsCard.style.boxShadow = '';
        });
    }

    // =================================================
    // دالة: جلب الإحصائيات (عدد الموظفين، الشكاوى، الأقسام)
    // =================================================
    async function loadAdminStats() {
        try {
            const response = await fetch(`/api/admin/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const stats = await response.json();
                
                // تحديث الأرقام الحية في الواجهة
                if (document.getElementById('total-employees')) 
                    document.getElementById('total-employees').textContent = stats.employees || 0;
                
                if (document.getElementById('active-complaints')) 
                    document.getElementById('active-complaints').textContent = stats.active_complaints || 0;

                if (document.getElementById('active-departments')) 
                    document.getElementById('active-departments').textContent = stats.departments || 0;
            }
        } catch (error) {
            console.error("فشل تحميل الإحصائيات:", error);
        }
    }

    // =================================================
    // دالة: جلب وعرض قائمة الموظفين (مع منع الكاش)
    // =================================================
    async function fetchEmployees() {
        try {
            const response = await fetch(`/api/employees?t=${new Date().getTime()}`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });
            
            const employees = await response.json();
            const tbody = document.getElementById('employees-tbody');
            if (tbody) tbody.innerHTML = ''; 

            if (employees.length === 0) {
                if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا يوجد موظفين حالياً.</td></tr>';
                return;
            }

            employees.forEach(emp => {
                // منع عرض حسابات المديرين في قائمة الموظفين العاديين
                if(emp.role === 'Admin' || emp.role === 'admin') return;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${emp.employee_code || emp.employee_id || '#'}</td>
                    <td>
                        <div class="user-info">
                            <div class="avatar">${emp.name ? emp.name.charAt(0).toUpperCase() : '?'}</div>
                            ${emp.name}
                        </div>
                    </td>
                    <td><span class="badge">${emp.department || 'غير محدد'}</span></td>
                    <td>${emp.email}</td>
                    <td>${emp.phone || 'غير متوفر'}</td>
                    <td>
                        <button class="icon-btn edit-btn" data-id="${emp.id}"><i class="fas fa-edit"></i></button>
                        <button class="icon-btn delete-btn" data-id="${emp.id}"><i class="fas fa-trash-alt"></i></button>
                    </td>
                `;
                if (tbody) tbody.appendChild(row);
            });

            attachEventListeners(); // ربط أزرار الحذف والتعديل بعد إنشاء الصفوف
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    }

    // =================================================
    // دالة: إضافة موظف جديد
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
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
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
            } catch (error) {
                alert('حدث خطأ في الاتصال بالسيرفر');
            }
        });
    }

    // =================================================
    // دالة: ربط أزرار الحذف والتعديل
    // =================================================
    function attachEventListeners() {
        // أزرار الحذف
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

        // أزرار التعديل
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

    // حفظ تعديلات الموظف
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
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if(res.ok) {
                alert('✅ تم تحديث بيانات الموظف بنجاح');
                document.getElementById('edit-employee-modal').style.display = 'none';
                fetchEmployees();
            }
        };
    }

    // إغلاق نافذة التعديل (Modal)
    const closeBtn = document.querySelector('.close-btn');
    if(closeBtn) {
        closeBtn.onclick = () => document.getElementById('edit-employee-modal').style.display = "none";
    }

    // تسجيل الخروج
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            if(confirm('هل تريد تسجيل الخروج؟')) {
                localStorage.clear();
                window.location.href = 'login.html';
            }
        };
    }

    // استدعاء البيانات عند تحميل الصفحة
    loadAdminStats();
    fetchEmployees();
});