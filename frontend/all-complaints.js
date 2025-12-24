document.addEventListener('DOMContentLoaded', async () => {
    // 1. جلب التوكن للأمان
    const token = localStorage.getItem('token') || localStorage.getItem('userToken');
    if (!token) { window.location.href = 'login.html'; return; }

    try {
        // 2. طلب قائمة الشكاوى من المسار الذي برمجناه في index.js
        const response = await fetch('/api/admin/complaints', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const complaints = await response.json();
            const tbody = document.getElementById('complaints-list-tbody');
            tbody.innerHTML = ''; // تفريغ رسالة التحميل

            if (complaints.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا توجد شكاوى مسجلة حالياً.</td></tr>';
                return;
            }

            // 3. بناء الجدول ديناميكياً
            complaints.forEach(complaint => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>#${complaint.id}</td>
                    <td><strong>${complaint.full_name}</strong></td>
                    <td>${complaint.province} - ${complaint.area}</td>
                    <td><span class="badge">${complaint.status}</span></td>
                    <td>${new Date(complaint.date_submitted).toLocaleDateString('ar-JO')}</td>
                    <td>
                        <a href="admin-view-complaint.html?id=${complaint.id}" class="icon-btn" title="عرض التفاصيل">
                            <i class="fas fa-eye" style="color:#bf953f;"></i> عرض
                        </a>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (err) {
        console.error("❌ فشل في جلب الشكاوى:", err);
        alert("حدث خطأ أثناء الاتصال بالقاعدة.");
    }
});