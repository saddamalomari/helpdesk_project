document.addEventListener('DOMContentLoaded', async function() {
    // 1. البحث عن التوكن بجميع المسميات المحتملة لضمان الحصول عليه
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('userToken') || 
                  localStorage.getItem('authToken');
    
    // 2. الحصول على معرف الشكوى من الرابط
    const urlParams = new URLSearchParams(window.location.search);
    const complaintId = urlParams.get('id');

    console.log("Token status:", token ? "Found" : "Missing");
    console.log("Complaint ID:", complaintId);

    // 3. التحقق من البيانات (بدون تحويل تلقائي سريع)
    if (!complaintId) {
        document.getElementById('loading-msg').innerHTML = '<span style="color:red;">خطأ: لم يتم تحديد رقم الشكوى في الرابط.</span>';
        return;
    }

    if (!token) {
        alert("انتهت الجلسة أو لم يتم العثور على بيانات الدخول، سيتم توجيهك لصفحة الدخول.");
        window.location.href = 'login.html';
        return;
    }

    try {
        // 4. جلب البيانات من السيرفر
        const response = await fetch(`/api/complaints/${complaintId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            
            // تعبئة البيانات في الصفحة
            document.getElementById('view-ticket-id').textContent = `TIC_${data.id}`;
            document.getElementById('view-type').textContent = data.complaint_type;
            document.getElementById('view-date').textContent = new Date(data.date_submitted).toLocaleDateString('ar-EG');
            document.getElementById('view-description').textContent = data.description;
            
            const statusLabel = document.getElementById('view-status');
            statusLabel.textContent = data.status;
            statusLabel.className = `status-badge status-${data.status}`;

            // إخفاء رسالة التحميل وإظهار التفاصيل
            document.getElementById('loading-msg').style.display = 'none';
            document.getElementById('complaint-details').style.display = 'block';
        } else {
            const errorData = await response.json();
            document.getElementById('loading-msg').innerHTML = 
                `<span style="color:red;">عذراً: ${errorData.message || 'تعذر جلب بيانات هذه الشكوى.'}</span>`;
        }
    } catch (error) {
        console.error("Fetch error:", error);
        document.getElementById('loading-msg').innerHTML = '<span style="color:red;">حدث خطأ في الاتصال بالسيرفر.</span>';
    }
});