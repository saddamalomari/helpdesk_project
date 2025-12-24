document.addEventListener('DOMContentLoaded', async () => {
    // 1. جلب التوكن من التخزين المحلي (LocalStorage) كما في الداشبورد
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('userToken') || 
                  localStorage.getItem('authToken');

    // 2. إذا لم يوجد توكن، إعادة الموجه لصفحة تسجيل الدخول
    if (!token) {
        console.error("Token not found, redirecting...");
        window.location.href = 'login.html';
        return;
    }

    // 3. استخراج الـ ID من رابط الصفحة (مثلاً: ?id=14)
    const urlParams = new URLSearchParams(window.location.search);
    const complaintId = urlParams.get('id');

    if (!complaintId) {
        alert("لم يتم تحديد رقم الشكوى!");
        window.location.href = 'admin-dashboard.html';
        return;
    }

    try {
        // 4. إرسال الطلب للسيرفر مع التوكن في الـ Authorization Header
        const response = await fetch(`/api/complaints/${complaintId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`, // التوافق مع authenticateToken في index.js
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();

            // 5. تعبئة البيانات في عناصر الـ HTML
            document.getElementById('display-id').textContent = data.id;
            document.getElementById('full_name').textContent = data.full_name;
            document.getElementById('phone').textContent = data.phone;
            document.getElementById('province').textContent = data.province;
            document.getElementById('area').textContent = data.area;
            document.getElementById('complaint_type').textContent = data.complaint_type;
            document.getElementById('description').textContent = data.description;
            document.getElementById('status').textContent = data.status;

            // تنسيق التاريخ ليظهر بشكل لائق
            if (data.created_at) {
                const date = new Date(data.created_at);
                document.getElementById('created_at').textContent = date.toLocaleString('ar-JO');
            }

        } else {
            // التعامل مع أخطاء السيرفر (مثل 401 أو 403 أو 404)
            const errorData = await response.json();
            alert(`خطأ: ${errorData.message}`);
            if (response.status === 401 || response.status === 403) {
                window.location.href = 'login.html';
            }
        }
    } catch (error) {
        console.error("فشل الاتصال بالسيرفر:", error);
        alert("حدث خطأ أثناء محاولة جلب البيانات من السيرفر.");
    }
});