const refInput = document.getElementById('ref-number');
const checkBtn = document.getElementById('check-btn');
const tableBody = document.querySelector('#complaints-table tbody');

checkBtn.addEventListener('click', async () => {
    const ref = refInput.value.trim();
    if (!ref) return alert('أدخل الرقم المرجعي');

    if (!ref.startsWith('TIC_')) {
        return alert('صيغة الرقم المرجعي غير صحيحة. يجب أن يبدأ بـ TIC_');
    }

    try {
 
        const res = await fetch(`http://localhost:3000/api/follow-up/${ref}`);
        const data = await res.json();
        
        tableBody.innerHTML = '';
        
        const columnCount = 8;

        if (res.ok) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${ref}</td> 
                <td>${data.full_name}</td>
                <td>${data.province}</td>
                <td>${data.area}</td>
                <td>${data.complaint_type}</td>
                <td>${data.status || 'قيد المعالجة'}</td>
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
        console.error(err);
        const columnCount = 8;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="${columnCount}" style="text-align: center; color: red;">❌ حدث خطأ في الاتصال بالسيرفر. يرجى التأكد من تشغيل الخادم.</td>`;
        tableBody.innerHTML = '';
        tableBody.appendChild(tr);
    }
});