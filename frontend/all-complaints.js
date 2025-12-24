document.addEventListener('DOMContentLoaded', async () => {
    // 1. جلب التوكن
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('userToken') || 
                  localStorage.getItem('authToken');

    console.log("التحقق من التوكن:", token);

    // 2. حماية الصفحة
    if (!token) {
        console.error("❌ لا يوجد توكن!");
        window.location.href = 'login.html';
        return;
    }

    try {
        console.log("✅ جاري طلب البيانات...");
        
        // ملاحظة: إذا استمر خطأ 404، جرب تغيير المسار إلى '/api/complaints'
        const response = await fetch('/api/admin/complaints', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const complaints = await response.json();
            // تأكد أن هذا الـ ID مطابق لما هو موجود في الـ HTML (tbody)
            const tbody = document.getElementById('complaints-table-body') || document.getElementById('complaints-list-tbody');
            
            if (!tbody) {
                console.error("❌ لم يتم العثور على عنصر الجدول في HTML");
                return;
            }

            tbody.innerHTML = ''; 

            if (complaints.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">لا توجد شكاوى مسجلة حالياً.</td></tr>';
                return;
            }

            // 3. بناء الجدول مع تطبيق التنسيقات الذهبية
            complaints.forEach(complaint => {
                const row = document.createElement('tr');
                
                // تحديد لون الحالة
                let statusClass = '';
                if (complaint.status === 'new') statusClass = 'status-new';
                else if (complaint.status === 'in_progress') statusClass = 'status-progress';
                else if (complaint.status === 'completed') statusClass = 'status-completed';

                row.innerHTML = `
                    <td>TIC_${complaint.id}</td>
                    <td><strong>${complaint.full_name}</strong></td>
                    <td>${complaint.province} - ${complaint.area}</td>
                    <td><span class="${statusClass}">${translateStatus(complaint.status)}</span></td>
                    <td>${new Date(complaint.date_submitted).toLocaleDateString('ar-EG')}</td>
                    <td>
                        <button class="action-button view-details" onclick="window.location.href='admin-view-complaint.html?id=${complaint.id}'">
                            <i class="fas fa-eye"></i> عرض
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
            console.log("✨ تم تحميل الجدول بنجاح");
        } else {
            console.error("❌ فشل السيرفر برقم:", response.status);
            if(response.status === 404) {
                alert("خطأ 404: المسار غير موجود بالسيرفر. تأكد من عنوان الـ API.");
            }
        }
    } catch (err) {
        console.error("❌ فشل الاتصال:", err);
    }
});

// دالة مساعدة لترجمة الحالة للعربية
function translateStatus(status) {
    const statuses = {
        'new': 'جديدة',
        'in_progress': 'قيد المعالجة',
        'completed': 'تمت المعالجة',
        'refused': 'مرفوضة'
    };
    return statuses[status] || status;
}