document.addEventListener('DOMContentLoaded', async () => {
    // 1. جلب التوكن والتأكد من وجوده في الكونسول
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('userToken') || 
                  localStorage.getItem('authToken');

    console.log("التحقق من التوكن:", token);

    // 2. شرط الحماية (إذا لم يوجد توكن يتم التحويل)
    if (!token) {
        console.error("❌ لا يوجد توكن! سيتم التحويل لصفحة الدخول خلال ثانيتين...");
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000); // تأخير بسيط لنرى رسالة الخطأ في الكونسول
        return;
    }

    // 3. إذا وجد التوكن، نبدأ بجلب البيانات
    try {
        console.log("✅ التوكن موجود، جاري جلب الشكاوى...");
        
        const response = await fetch('/api/admin/complaints', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const complaints = await response.json();
            const tbody = document.getElementById('complaints-list-tbody');
            
            if (!tbody) {
                console.error("❌ لم يتم العثور على عنصر 'complaints-list-tbody' في صفحة HTML");
                return;
            }

            tbody.innerHTML = ''; 

            if (complaints.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا توجد شكاوى مسجلة حالياً.</td></tr>';
                return;
            }

            // 4. بناء الجدول ديناميكياً
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
            console.log("✨ تم تحميل الجدول بنجاح");
        } else {
            console.error("❌ فشل السيرفر في الرد:", response.status);
        }
    } catch (err) {
        console.error("❌ فشل في الاتصال بـ API:", err);
        alert("حدث خطأ أثناء الاتصال بالقاعدة.");
    }
});