document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:3000';
    
    // ✅ إصلاح مشكلة تسجيل الخروج: البحث عن التوكن بكل الأسماء المحتملة
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('userToken') || 
                  localStorage.getItem('authToken');

    // 1. التحقق من الصلاحيات
    if (!token) {
        console.error("لم يتم العثور على توكن، يتم التحويل لصفحة الدخول...");
        window.location.href = 'login.html';
        return;
    }

    // =================================================
    // دالة: جلب الإحصائيات (عدد الموظفين، الشكاوى، الأقسام)
    // =================================================
    async function loadAdminStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const stats = await response.json();
                
                // تحديث الأرقام في الصفحة
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
   // =================================================
    // دالة: جلب وعرض قائمة الموظفين (نسخة محسنة ضد الكاش)
    // =================================================
    async function fetchEmployees() {
        try {
            // 🔥 إضافة headers لمنع الكاش نهائياً + التوقيت الزمني
            const response = await fetch(`${API_BASE_URL}/api/employees?t=${new Date().getTime()}`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            const employees = await response.json();
            
            // تحقق في الكونسول لترى هل البيانات الجديدة وصلت أم لا
            console.log("البيانات القادمة من السيرفر:", employees); 

            const tbody = document.getElementById('employees-tbody');
            tbody.innerHTML = ''; 

            if (employees.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا يوجد موظفين حالياً.</td></tr>';
                return;
            }

            employees.forEach(emp => {
                if(emp.role === 'Admin' || emp.role === 'admin') return;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${emp.employee_code || emp.employee_id || '#'}</td>
                    <td>
                        <div class="user-info">
                            <div class="avatar">${emp.name.charAt(0).toUpperCase()}</div>
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
                tbody.appendChild(row);
            });

            attachEventListeners();

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
            
            const name = document.getElementById('employee-name').value;
            const department = document.getElementById('department').value;
            const id = document.getElementById('employee-id').value;
            const email = document.getElementById('employee-email').value;
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('employee-password').value;

            try {
                const response = await fetch(`${API_BASE_URL}/api/employees`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ name, id, department, email, phone, password })
                });

                const result = await response.json();

                if (response.ok) {
                    alert('✅ تم إضافة الموظف بنجاح!');
                    addForm.reset(); // تفريغ النموذج
                    fetchEmployees(); // تحديث الجدول فوراً
                    loadAdminStats(); // تحديث الإحصائيات
                } else {
                    alert('❌ خطأ: ' + result.message);
                }
            } catch (error) {
                console.error(error);
                alert('حدث خطأ في الاتصال بالسيرفر');
            }
        });
    }

    // =================================================
    // دالة: ربط أزرار الحذف والتعديل
    // =================================================
    function attachEventListeners() {
        // زر الحذف
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const id = this.getAttribute('data-id');
                if(confirm('هل أنت متأكد من حذف هذا الموظف؟ لا يمكن التراجع عن هذا الإجراء.')) {
                    try {
                        const res = await fetch(`${API_BASE_URL}/api/employees/${id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        
                        if(res.ok) {
                            alert('تم الحذف بنجاح');
                            fetchEmployees(); // تحديث الجدول
                            loadAdminStats(); // تحديث الأرقام
                        } else {
                            alert('فشل الحذف');
                        }
                    } catch (err) {
                        console.error(err);
                    }
                }
            });
        });

        // زر التعديل (يفتح المودال)
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const id = this.getAttribute('data-id');
                // جلب بيانات الموظف لتعبئتها في المودال
                try {
                    const res = await fetch(`${API_BASE_URL}/api/employees/${id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await res.json();
                    
                    if(res.ok) {
                        // تعبئة حقول المودال
                        document.getElementById('edit-employee-db-id').value = data.id;
                        document.getElementById('edit-employee-name').value = data.name;
                        document.getElementById('edit-employee-id').value = data.code || '';
                        document.getElementById('edit-department').value = data.department || '';
                        document.getElementById('edit-employee-email').value = data.email;
                        document.getElementById('edit-phone').value = data.phone || '';
                        
                        // إظهار المودال
                        document.getElementById('edit-employee-modal').style.display = 'flex';
                    }
                } catch (err) {
                    console.error("فشل جلب تفاصيل الموظف", err);
                }
            });
        });
    }

    // =================================================
    // دالة: حفظ التعديلات (تحديث الموظف)
    // =================================================
    const editForm = document.getElementById('edit-employee-form');
    if(editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const dbId = document.getElementById('edit-employee-db-id').value;
            const name = document.getElementById('edit-employee-name').value;
            const id = document.getElementById('edit-employee-id').value;
            const department = document.getElementById('edit-department').value;
            const email = document.getElementById('edit-employee-email').value;
            const phone = document.getElementById('edit-phone').value;
            const password = document.getElementById('edit-password').value;

            try {
                const res = await fetch(`${API_BASE_URL}/api/employees/${dbId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ name, id, department, email, phone, password })
                });

                const result = await res.json();
                if(res.ok) {
                    alert('✅ تم تحديث البيانات بنجاح');
                    document.getElementById('edit-employee-modal').style.display = 'none';
                    
                    // 🔥 السحر هنا: ننتظر نصف ثانية (500ms) قبل تحديث الجدول
                    // هذا يضمن أن قاعدة البيانات قد أنهت الحفظ تماماً
                    setTimeout(() => {
                        fetchEmployees();
                    }, 500); 

                } else {
                    alert('خطأ: ' + result.message);
                }
            } catch (err) {
                console.error(err);
                alert('حدث خطأ أثناء التحديث');
            }
        });
    }
    // إغلاق المودال
    const modal = document.getElementById('edit-employee-modal');
    const closeBtn = document.querySelector('.close-btn');
    if(closeBtn) {
        closeBtn.onclick = () => modal.style.display = "none";
    }
    window.onclick = (event) => {
        if (event.target == modal) modal.style.display = "none";
    }

    // تسجيل الخروج
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        if(confirm('هل تريد تسجيل الخروج؟')) {
            localStorage.clear();
            window.location.href = 'login.html';
        }
    });

    // استدعاء الدوال عند بدء التشغيل
    loadAdminStats();
    fetchEmployees();
});