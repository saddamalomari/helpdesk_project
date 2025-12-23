document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('token') || localStorage.getItem('userToken') || localStorage.getItem('authToken');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    async function loadAllComplaints() {
        try {
            const response = await fetch('/api/admin/complaints', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const complaints = await response.json();
                renderTable(complaints);
            }
        } catch (error) {
            console.error("خطأ في جلب شكاوى المدير:", error);
        }
    }

    function renderTable(data) {
        const tbody = document.getElementById('all-complaints-tbody');
        tbody.innerHTML = data.length ? '' : '<tr><td colspan="6" style="text-align:center;">لا توجد شكاوى حالياً.</td></tr>';

        data.forEach(c => {
            tbody.innerHTML += `
                <tr>
                    <td>TIC_${c.id}</td>
                    <td>${c.full_name || 'غير معروف'}</td>
                    <td>${c.complaint_type}</td>
                    <td>${new Date(c.date_submitted).toLocaleDateString('ar-EG')}</td>
                    <td><span class="badge status-${c.status}">${c.status}</span></td>
                    <td>
                        <button class="gold-btn" onclick="viewDetails(${c.id})" style="padding: 5px 10px; font-size: 0.8rem;">
                            <i class="fas fa-eye"></i> تفاصيل
                        </button>
                    </td>
                </tr>`;
        });
    }

    loadAllComplaints();
});

// دالة للانتقال لصفحة تفاصيل الشكوى (للمدير)
function viewDetails(id) {
    window.location.href = `admin-view-complaint.html?id=${id}`;
}