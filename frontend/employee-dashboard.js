document.addEventListener('DOMContentLoaded', function() {

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
const API_BASE_URL = 'http://localhost:3000';

const token =
    localStorage.getItem('token') ||
    localStorage.getItem('authToken');

const userRole =
    localStorage.getItem('role') ||
    localStorage.getItem('userRole');

// ✅ التحقق من التوكن
if (!token) {
    window.location.href = 'index.html';
    return;
}

// ✅ التحقق من الصلاحيات
if (!userRole || !['employee', 'admin'].includes(userRole.toLowerCase())) {
    alert('❌ غير مصرح لك بالوصول. هذه الصفحة مخصصة للموظفين فقط.');
    localStorage.clear();
    window.location.href = 'index.html';
    return;
}

// ✅ التحكم بالـ Sidebar
if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('closed');
        mainContent.classList.toggle('expanded');

        toggleBtn.classList.toggle(
            'moved',
            sidebar.classList.contains('closed')
        );
    });
}


    if (contactToggle) {
        contactToggle.addEventListener('click', (e) => {
            e.preventDefault();
            contactMenu.classList.toggle('active');
            if(arrow) arrow.classList.toggle('rotate');
        });
    }
    const profileBtn = document.getElementById('profileBtn');
    const changePassBtn = document.getElementById('changePassBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (profileBtn) {
        profileBtn.onclick = async (e) => {
            e.preventDefault();
            try {
                const response = await fetch(`${API_BASE_URL}/api/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();

                console.log("بيانات الموظف القادمة من السيرفر:", data); 
                
                if (response.ok) {
                 document.getElementById('profileData').innerHTML = `
    <div style="text-align: right; padding: 10px;">
        <p><strong>الاسم:</strong> ${data.full_name}</p>
        
        <p><strong>البريد:</strong> ${data.email || 'غير متوفر'}</p> 

        <p><strong>القسم:</strong> ${data.department || 'غير محدد'}</p>

        <p><strong>الرقم الوظيفي:</strong> ${data.employee_code || 'غير متوفر'}</p>
        
        <p><strong>الهاتف:</strong> ${data.phone || 'غير متوفر'}</p>
    </div>
`;
                    profileModal.style.display = "block";
                } else {
                    alert('فشل جلب البيانات: ' + data.message);
                }
            } catch (error) {
                console.error(error);
                alert('خطأ في الاتصال بالسيرفر');
            }
        };
    }
    if (changePassBtn) {
        changePassBtn.onclick = (e) => {
            e.preventDefault();
            changePassModal.style.display = "block";
        };
    }

    const changePassForm = document.getElementById('changePassForm');
    if (changePassForm) {
        changePassForm.onsubmit = async (e) => {
            e.preventDefault();
            const oldPass = document.getElementById('oldPass').value;
            const newPass = document.getElementById('newPass').value;

            try {
                const response = await fetch(`${API_BASE_URL}/api/change-password`, {
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
                console.error(error);
                alert('حدث خطأ أثناء تغيير كلمة المرور');
            }
        };
    }

    if (logoutBtn) {
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            if(confirm('هل أنت متأكد من تسجيل الخروج؟')) {
                localStorage.removeItem('token');
                localStorage.removeItem('authToken');
                localStorage.removeItem('role');
                localStorage.removeItem('userRole');
                window.location.href = 'login.html';
            }
        };
    }

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
                </select>
            `;

            row.innerHTML = `
                <td>TIC_${complaint.id}</td>
                <td>${sentDate}</td>
                <td>${complaint.complaint_type || 'عامة'}</td>
                <td>${complaint.province} - ${complaint.area}</td>
                <td>${statusDropdownHtml}</td> 
                <td><button class="action-button view-details" data-id="${complaint.id}" style="background-color: #3498db; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">عرض التفاصيل</button></td>
            `;
        });
    };

    const fetchComplaints = async () => {
        try {
            if(loadingRow) loadingRow.style.display = 'table-row';

            const response = await fetch(`${API_BASE_URL}/api/complaints`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401 || response.status === 403) {
                throw new Error('جلسة العمل انتهت، يرجى إعادة تسجيل الدخول.');
            }

            if (!response.ok) {
                throw new Error('فشل الاستجابة من الخادم.');
            }

            const complaints = await response.json();
            allComplaintsData = complaints; 

            if(loadingRow) loadingRow.style.display = 'none';

            renderComplaintsTable(allComplaintsData);

        } catch (error) {
            console.error('Error fetching complaints:', error);
            if(loadingRow) loadingRow.style.display = 'none';
            tableBody.innerHTML = `<tr><td colspan="7" style="color: red; text-align: center; padding: 20px;">❌ ${error.message}</td></tr>`;
        }
    };

    const filterAndSearchComplaints = () => {
        const selectedStatus = statusFilter.value;
        const searchTerm = searchInput.value.toLowerCase().trim();

        let filteredList = allComplaintsData;

        if (selectedStatus !== 'all') {
            filteredList = filteredList.filter(complaint => complaint.status === selectedStatus);
        }
        if (searchTerm) {
            filteredList = filteredList.filter(complaint => {
                const complaintRef = `tic_${complaint.id}`;
                const type = (complaint.complaint_type || '').toLowerCase();
                return complaintRef.includes(searchTerm) || type.includes(searchTerm);
            });
        }

        renderComplaintsTable(filteredList);
    };
    const showComplaintDetails = async (id) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/complaints/${id}`, { 
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`, 
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('فشل جلب تفاصيل الشكوى.');

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
                photoLink.href = `${API_BASE_URL}/uploads/${complaint.photo_path}`;
                photoLink.textContent = 'عرض الصورة المرفقة';
                photoLink.classList.remove('disabled');
                photoLink.style.pointerEvents = 'auto';
            } else {
                photoLink.href = '#';
                photoLink.textContent = 'لا يوجد صورة';
                photoLink.classList.add('disabled');
                photoLink.style.pointerEvents = 'none';
            }

            if (complaint.video_path) {
                videoLink.href = `${API_BASE_URL}/uploads/${complaint.video_path}`;
                videoLink.textContent = 'عرض الفيديو المرفق';
                videoLink.classList.remove('disabled');
                videoLink.style.pointerEvents = 'auto';
            } else {
                videoLink.href = '#';
                videoLink.textContent = 'لا يوجد فيديو';
                videoLink.classList.add('disabled');
                videoLink.style.pointerEvents = 'none';
            }
            
            detailsModal.style.display = 'block';

        } catch (error) {
            console.error('Error displaying details:', error);
            alert('❌ فشل في عرض تفاصيل الشكوى.');
        }
    };

    fetchComplaints();

    if(statusFilter) statusFilter.addEventListener('change', filterAndSearchComplaints);
    if(searchInput) searchInput.addEventListener('input', filterAndSearchComplaints);
    document.addEventListener('click', (e) => {

        if (e.target.classList.contains('view-details')) {
            const id = e.target.getAttribute('data-id');
            showComplaintDetails(id);
        }
        
        if (e.target.classList.contains('close') || e.target.classList.contains('close-modal')) {
            detailsModal.style.display = 'none';
            profileModal.style.display = 'none';
            changePassModal.style.display = 'none';
        }

        if (e.target === detailsModal) detailsModal.style.display = 'none';
        if (e.target === profileModal) profileModal.style.display = 'none';
        if (e.target === changePassModal) changePassModal.style.display = 'none';
    });

    document.addEventListener('change', async (e) => {
        if (e.target.classList.contains('status-dropdown')) {
            const id = e.target.getAttribute('data-id');
            const newStatus = e.target.value;

            try {
                e.target.disabled = true; 
                const res = await fetch(`${API_BASE_URL}/api/complaints/${id}/status`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ status: newStatus })
                });

                if (!res.ok) throw new Error("فشل التحديث.");
                alert("✔ تم تحديث الحالة بنجاح.");

                const complaintIndex = allComplaintsData.findIndex(c => c.id == id);
                if (complaintIndex > -1) {
                    allComplaintsData[complaintIndex].status = newStatus;
                }

            } catch (error) {
                alert("❌ فشل تحديث الحالة.");
                console.error(error);
            } finally {
                e.target.disabled = false;
            }
        }
    });
});