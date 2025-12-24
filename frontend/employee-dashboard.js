document.addEventListener('DOMContentLoaded', function() {

    // --- العناصر الأساسية من الواجهة ---
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

    let allComplaintsData = []; 
    
    // ✅ التعديل الأهم: مسار نسبي ليعمل السيرفر في أي مكان (Render / Local)
    const API_BASE_URL = ''; 

    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    // تأكد أنك تقرأ الروول (Role) بشكل صحيح من localStorage
    const userRole = localStorage.getItem('role') || 'admin'; // أضف admin كاحتياط

    // ✅ 1. التحقق من الهوية والصلاحيات
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    if (!userRole || !['employee', 'admin'].includes(userRole.toLowerCase())) {
        alert('❌ غير مصرح لك بالوصول. هذه الصفحة مخصصة للموظفين فقط.');
        localStorage.clear();
        window.location.href = 'login.html';
        return;
    }

    // ✅ 2. التحكم بالـ Sidebar والقوائم
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('closed');
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

    // ✅ 3. إدارة الملف الشخصي (Profile)
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
        profileBtn.onclick = async (e) => {
            e.preventDefault();
            try {
                const response = await fetch(`/api/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
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

    // ✅ 4. تغيير كلمة المرور
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

    // ✅ 5. تسجيل الخروج
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

    // ✅ 6. جلب وعرض الشكاوى
    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        const date = new Date(dateString);
        return isNaN(date) || dateString === null ? 'غير متوفر' : date.toLocaleDateString('ar-EG', options);
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
            const statusDropdownHtml = `
                <select class="status-dropdown form-control" data-id="${complaint.id}" style="padding: 5px; width: auto;">
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
        
        // التعديل: التأكد من المسار الصحيح (جرب إضافة /admin إذا لم يعمل الأساسي)
        const response = await fetch('/api/admin/complaints', { 
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log("Response Status:", response.status); // سيعطيك 200 إذا نجح و 404 إذا فشل

        if (!response.ok) throw new Error(`فشل جلب البيانات: ${response.status}`);
        
        allComplaintsData = await response.json();
        console.log("Data Received:", allComplaintsData); // للتأكد من وصول المصفوفة

        if(loadingRow) loadingRow.style.display = 'none';
        renderComplaintsTable(allComplaintsData);
    } catch (error) {
        console.error("Fetch Error:", error);
        if(loadingRow) loadingRow.style.display = 'none';
        tableBody.innerHTML = `<tr><td colspan="7" style="color: red; text-align: center;">❌ ${error.message}</td></tr>`;
    }
};

    // ✅ 7. عرض التفاصيل والوسائط (صور/فيديو)
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
            
            // روابط نسبية للمرفقات
            if (complaint.photo_path) {
                photoLink.href = `/uploads/${complaint.photo_path}`;
                photoLink.textContent = 'عرض الصورة المرفقة';
                photoLink.style.pointerEvents = 'auto';
            } else {
                photoLink.textContent = 'لا يوجد صورة';
                photoLink.style.pointerEvents = 'none';
            }

            if (complaint.video_path) {
                videoLink.href = `/uploads/${complaint.video_path}`;
                videoLink.textContent = 'عرض الفيديو المرفق';
                videoLink.style.pointerEvents = 'auto';
            } else {
                videoLink.textContent = 'لا يوجد فيديو';
                videoLink.style.pointerEvents = 'none';
            }
            detailsModal.style.display = 'block';
        } catch (error) {
            alert('❌ فشل في عرض التفاصيل');
        }
    };

    // ✅ 8. الفلترة والبحث
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
                (c.complaint_type || '').toLowerCase().includes(searchTerm)
            );
        }
        renderComplaintsTable(filteredList);
    };

    // --- تشغيل الدوال والـ Listeners ---
    fetchComplaints();

    if(statusFilter) statusFilter.addEventListener('change', filterAndSearchComplaints);
    if(searchInput) searchInput.addEventListener('input', filterAndSearchComplaints);

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-details')) {
            showComplaintDetails(e.target.getAttribute('data-id'));
        }
        if (e.target.classList.contains('close') || e.target.classList.contains('close-modal')) {
            detailsModal.style.display = 'none';
            profileModal.style.display = 'none';
            changePassModal.style.display = 'none';
        }
        if (e.target === detailsModal || e.target === profileModal || e.target === changePassModal) {
            e.target.style.display = 'none';
        }
    });

    // تحديث الحالة عند تغيير الـ Dropdown
    document.addEventListener('change', async (e) => {
        if (e.target.classList.contains('status-dropdown')) {
            const id = e.target.getAttribute('data-id');
            const newStatus = e.target.value;
            try {
                e.target.disabled = true; 
                const res = await fetch(`/api/complaints/${id}/status`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ status: newStatus })
                });
                if (res.ok) {
                    alert("✔ تم تحديث الحالة.");
                    const idx = allComplaintsData.findIndex(c => c.id == id);
                    if (idx > -1) allComplaintsData[idx].status = newStatus;
                }
            } catch (error) {
                alert("❌ فشل التحديث.");
            } finally {
                e.target.disabled = false;
            }
        }
    });
});