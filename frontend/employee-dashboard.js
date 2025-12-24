/* ===========================================================
    لوحة تحكم الموظف - وكالة العمري (Help Desk Project)
    المبرمج: صدام العمري (CIS Graduate)
    الوظيفة: إدارة الشكاوى، الملف الشخصي، وتغيير الحالات
    ===========================================================
*/

document.addEventListener('DOMContentLoaded', function() {

    // --- 1. العناصر الأساسية من الواجهة ---
    const tableBody = document.getElementById('complaints-table-body');
    const loadingRow = document.querySelector('.loading-row');
    const noComplaintsMessage = document.getElementById('no-complaints-message');
    const statusFilter = document.getElementById('status-filter');
    const searchInput = document.getElementById('complaint-search');
    const toggleBtn = document.getElementById('toggle-btn');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const contactToggle = document.getElementById('contact-toggle');
    const contactMenu = document.getElementById('contact-menu');
    const arrow = document.querySelector('.arrow');
    const detailsModal = document.getElementById('details-modal');
    const profileModal = document.getElementById('profileModal');
    const changePassModal = document.getElementById('changePassModal');
    const changePassBtn = document.getElementById('changePassBtn');

    let allComplaintsData = []; 
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    const userRole = localStorage.getItem('role') || 'employee';

    // --- 2. التحقق من الهوية والصلاحيات ---
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    if (!userRole || !['employee', 'admin'].includes(userRole.toLowerCase())) {
        alert('❌ غير مصرح لك بالوصول.');
        localStorage.clear();
        window.location.href = 'login.html';
        return;
    }

    // --- 3. وظائف الواجهة (Sidebar & Menus) ---
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('closed');
            sidebar.classList.toggle('active'); // للموبايل
            mainContent.classList.toggle('expanded');
            toggleBtn.classList.toggle('moved', sidebar.classList.contains('closed'));
        });
    }

    if (contactToggle) {
        contactToggle.addEventListener('click', (e) => {
            e.preventDefault();
            contactMenu.classList.toggle('active');
            if(arrow) arrow.classList.toggle('rotate');
        });
    }

    // فتح مودال تغيير كلمة المرور
    if (changePassBtn) {
        changePassBtn.onclick = (e) => {
            e.preventDefault();
            changePassModal.style.display = "block";
        };
    }

    // --- 4. إدارة الملف الشخصي (Profile) ---
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.onclick = async (e) => {
            e.preventDefault();
            try {
                const response = await fetch(`/api/profile`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                const data = await response.json();
                
                if (response.ok) {
                    document.getElementById('profileData').innerHTML = `
                        <div style="text-align: right; padding: 10px;">
                            <p><strong>الاسم:</strong> ${data.full_name}</p>
                            <p><strong>البريد:</strong> ${data.email || 'غير متوفر'}</p> 
                            <p><strong>القسم:</strong> ${data.department || 'غير محدد'}</p>
                            <p><strong>الرقم الوظيفي:</strong> ${data.employee_code || 'غير متوفر'}</p>
                            <p><strong>الهاتف:</strong> ${data.phone || 'غير متوفر'}</p>
                        </div>`;
                    profileModal.style.display = "block";
                }
            } catch (error) {
                alert('خطأ في الاتصال بالسيرفر');
            }
        };
    }

    // --- 5. تغيير كلمة المرور ---
    const changePassForm = document.getElementById('changePassForm');
    if (changePassForm) {
        changePassForm.onsubmit = async (e) => {
            e.preventDefault();
            const oldPass = document.getElementById('oldPass').value;
            const newPass = document.getElementById('newPass').value;

            try {
                const response = await fetch(`/api/change-password`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ old_password: oldPass, new_password: newPass })
                });
                const data = await response.json();
                alert(data.message);
                if (response.ok) {
                    changePassModal.style.display = "none";
                    e.target.reset();
                }
            } catch (error) {
                alert('حدث خطأ أثناء الاتصال بالسيرفر');
            }
        };
    }

    // --- 6. تسجيل الخروج ---
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            if(confirm('هل أنت متأكد من تسجيل الخروج؟')) {
                localStorage.clear();
                window.location.href = 'login.html';
            }
        };
    }

    // --- 7. دوال المعالجة والعرض (Logic) ---
    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        const date = new Date(dateString);
        return isNaN(date) || dateString === null ? 'غير متوفر' : date.toLocaleDateString('ar-EG', options);
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'new': return 'status-new';
            case 'in_progress': return 'status-progress';
            case 'completed': return 'status-completed';
            case 'refused': return 'status-refused';
            default: return '';
        }
    };

    const renderComplaintsTable = (complaintsToRender) => {
        tableBody.innerHTML = '';
        if (complaintsToRender.length === 0) {
            if(noComplaintsMessage) noComplaintsMessage.style.display = 'block';
            return;
        }
        if(noComplaintsMessage) noComplaintsMessage.style.display = 'none';

        complaintsToRender.forEach(complaint => {
            const row = tableBody.insertRow();
            const sentDate = formatDate(complaint.date_submitted); 
            const statusClass = getStatusClass(complaint.status);

            const statusDropdownHtml = `
                <select class="status-dropdown form-control ${statusClass}" data-id="${complaint.id}" style="padding: 5px; width: auto;">
                    <option value="new" ${complaint.status === 'new' ? 'selected' : ''}>جديدة</option>
                    <option value="in_progress" ${complaint.status === 'in_progress' ? 'selected' : ''}>قيد المعالجة</option>
                    <option value="completed" ${complaint.status === 'completed' ? 'selected' : ''}>تمت المعالجة</option>
                    <option value="refused" ${complaint.status === 'refused' ? 'selected' : ''}>رفض المعالجة</option>
                </select>`;

            row.innerHTML = `
                <td>TIC_${complaint.id}</td>
                <td>${sentDate}</td>
                <td>${complaint.complaint_type || 'عامة'}</td>
                <td>${complaint.province} - ${complaint.area}</td>
                <td>${statusDropdownHtml}</td> 
                <td><button class="action-button view-details" data-id="${complaint.id}">عرض التفاصيل</button></td>`;
        });
    };

    const fetchComplaints = async () => {
        try {
            if(loadingRow) loadingRow.style.display = 'table-row';
            const response = await fetch('/api/admin/complaints', { 
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error(`فشل جلب البيانات: ${response.status}`);
            
            allComplaintsData = await response.json();
            if(loadingRow) loadingRow.style.display = 'none';
            renderComplaintsTable(allComplaintsData);
        } catch (error) {
            if(loadingRow) loadingRow.style.display = 'none';
            tableBody.innerHTML = `<tr><td colspan="6" style="color: red; text-align: center;">❌ ${error.message}</td></tr>`;
        }
    };

    const showComplaintDetails = async (id) => {
        try {
            const response = await fetch(`/api/complaints/${id}`, { 
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const complaint = await response.json();

            document.getElementById('detail-ref-number').textContent = `TIC_${complaint.id}`;
            document.getElementById('detail-full_name').value = complaint.full_name || 'غير متوفر';
            document.getElementById('detail-phone').value = complaint.phone || 'غير متوفر';
            document.getElementById('detail-complaint_type').value = complaint.complaint_type || 'عامة';
            document.getElementById('detail-location').value = `${complaint.province} - ${complaint.area}`;
            document.getElementById('detail-description').value = complaint.description || 'لا يوجد وصف.';
            document.getElementById('detail-date-submitted').value = formatDate(complaint.date_submitted);

            const photoLink = document.getElementById('detail-photo-link');
            const videoLink = document.getElementById('detail-video-link');
            
            if (complaint.photo_path) {
                photoLink.href = `/uploads/${complaint.photo_path}`;
                photoLink.textContent = 'عرض الصورة المرفقة';
                photoLink.style.display = 'inline-block';
            } else {
                photoLink.style.display = 'none';
            }

            if (complaint.video_path) {
                videoLink.href = `/uploads/${complaint.video_path}`;
                videoLink.textContent = 'عرض الفيديو المرفق';
                videoLink.style.display = 'inline-block';
            } else {
                videoLink.style.display = 'none';
            }
            detailsModal.style.display = 'block';
        } catch (error) {
            alert('❌ فشل في عرض التفاصيل');
        }
    };

    const filterAndSearchComplaints = () => {
        const selectedStatus = statusFilter.value;
        const searchTerm = searchInput.value.toLowerCase().trim();
        let filteredList = allComplaintsData;

        if (selectedStatus !== 'all') {
            filteredList = filteredList.filter(c => c.status === selectedStatus);
        }
        if (searchTerm) {
            filteredList = filteredList.filter(c => 
                `tic_${c.id}`.includes(searchTerm) || 
                (c.complaint_type || '').toLowerCase().includes(searchTerm) ||
                (c.full_name || '').toLowerCase().includes(searchTerm)
            );
        }
        renderComplaintsTable(filteredList);
    };

    // --- 8. إدارة الأحداث (Event Listeners) ---
    fetchComplaints();

    if(statusFilter) statusFilter.addEventListener('change', filterAndSearchComplaints);
    if(searchInput) searchInput.addEventListener('input', filterAndSearchComplaints);

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-details')) {
            showComplaintDetails(e.target.getAttribute('data-id'));
        }
        // إغلاق المودالات
        if (e.target.classList.contains('close') || e.target.classList.contains('close-modal')) {
            detailsModal.style.display = 'none';
            profileModal.style.display = 'none';
            changePassModal.style.display = 'none';
        }
        if (e.target === detailsModal || e.target === profileModal || e.target === changePassModal) {
            e.target.style.display = 'none';
        }
    });

    // تحديث الحالة فوراً مع تغيير اللون
    document.addEventListener('change', async (e) => {
        if (e.target.classList.contains('status-dropdown')) {
            const id = e.target.getAttribute('data-id');
            const newStatus = e.target.value;
            const dropdown = e.target;

            try {
                dropdown.disabled = true; 
                const res = await fetch(`/api/complaints/${id}/status`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ status: newStatus })
                });

                if (res.ok) {
                    // تحديث كلاس اللون فوراً
                    dropdown.classList.remove('status-new', 'status-progress', 'status-completed', 'status-refused');
                    dropdown.classList.add(getStatusClass(newStatus));
                    
                    const idx = allComplaintsData.findIndex(c => c.id == id);
                    if (idx > -1) allComplaintsData[idx].status = newStatus;
                } else {
                    alert("❌ فشل التحديث في السيرفر.");
                }
            } catch (error) {
                alert("❌ خطأ في الاتصال.");
            } finally {
                dropdown.disabled = false;
            }
        }
    });
});