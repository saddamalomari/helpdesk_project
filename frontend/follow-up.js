const refInput = document.getElementById('ref-number');
const checkBtn = document.getElementById('check-btn');
const tableBody = document.querySelector('#complaints-table tbody');

checkBtn.addEventListener('click', async () => {
    const ref = refInput.value.trim();
    if (!ref) return alert('أدخل الرقم المرجعي');

    // التأكد من أن الرقم يبدأ بالصيغة الصحيحة
    if (!ref.startsWith('TIC_')) {
        return alert('صيغة الرقم المرجعي غير صحيحة. يجب أن يبدأ بـ TIC_');
    }

    try {
        // ✅ التعديل الجوهري: استخدام مسار نسبي ليعمل على الرابط العالمي تلقائياً
        const res = await fetch(`/api/follow-up/${ref}`);
        const data = await res.json();
        
        tableBody.innerHTML = '';
        const columnCount = 8;

        if (res.ok) {
            const tr = document.createElement('tr');
            // ✅ قمت بإضافة ترجمة لحالات الشكوى لتظهر بشكل مفهوم للمواطن
            const statusMap = {
                'new': 'جديدة',
                'in_progress': 'قيد المعالجة',
                'completed': 'تمت المعالجة ✅',
                'refused': 'تم الرفض ❌'
            };
            
            const displayStatus = statusMap[data.status] || data.status || 'قيد المعالجة';

            tr.innerHTML = `
                <td>${ref}</td> 
                <td>${data.full_name}</td>
                <td>${data.province}</td>
                <td>${data.area}</td>
                <td>${data.complaint_type}</td>
                <td><span class="status-badge">${displayStatus}</span></td>
                <td>${data.note || '-'}</td>
                <td>${data.description || '-'}</td>
            `;
            tableBody.appendChild(tr);
        } else {
            const message = data.message || 'لم يتم العثور على شكوى بهذا الرقم المرجعي.';
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="${columnCount}" style="text-align: center; color: red; font-weight: bold;">${message}</td>`; 
            tableBody.appendChild(tr);
        }
    } catch (err) {
        console.error("Follow-up connection error:", err);
        const columnCount = 8;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="${columnCount}" style="text-align: center; color: red;">❌ حدث خطأ في الاتصال بالسيرفر. يرجى المحاولة لاحقاً.</td>`;
        tableBody.innerHTML = '';
        tableBody.appendChild(tr);
    }
});