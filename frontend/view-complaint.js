document.addEventListener('DOMContentLoaded', async function() {
    const token = localStorage.getItem('token') || localStorage.getItem('userToken');
    
    // الحصول على معرف الشكوى من الرابط (URL Params)
    const urlParams = new URLSearchParams(window.location.search);
    const complaintId = urlParams.get('id');

    if (!complaintId || !token) {
        window.location.href = 'citizen-dashboard.html';
        return;
    }

    try {
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

            // إظهار الكارت وإخفاء رسالة التحميل
            document.getElementById('loading-msg').style.display = 'none';
            document.getElementById('complaint-details').style.display = 'block';
        } else {
            alert("تعذر العثور على الشكوى");
        }
    } catch (error) {
        console.error("خطأ في جلب البيانات:", error);
    }
});