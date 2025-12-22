document.addEventListener('DOMContentLoaded', async function() {
    
    // ✅ التعديل الأول: جعل الرابط نسبياً لضمان العمل على Render
    const API_BASE_URL = ''; 
    
    // البحث عن التوكن لضمان استمرار الجلسة
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('userToken') || 
                  localStorage.getItem('authToken');

    if (!token) {
        console.warn("لم يتم العثور على توكن، قد تحتاج لتسجيل الدخول.");
        // window.location.href = 'login.html'; // فعل هذا السطر لاحقاً لتأمين الصفحة
    }

    // عرض التاريخ الحالي
    const dateBox = document.getElementById('current-date');
    if (dateBox) {
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateBox.textContent = new Date().toLocaleDateString('ar-EG', dateOptions);
    }

    // --- التحكم في القوائم الجانبية ---
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-btn');
    if(toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => sidebar.classList.toggle('active'));
    }

    // --- برمجة خاصية "تغيير كلمة المرور" ---
    const changePassForm = document.getElementById('change-password-form');
    if (changePassForm) {
        changePassForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const old_password = document.getElementById('old-password').value;
            const new_password = document.getElementById('new-password').value;

            try {
                // ✅ التعديل الثاني: استخدام المسار النسبي /api/change-password
                const response = await fetch(`/api/change-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ old_password, new_password })
                });

                const result = await response.json();
                if (response.ok) {
                    alert('✅ تم تغيير كلمة المرور بنجاح!');
                    document.getElementById('change-password-modal').style.display = 'none';
                    changePassForm.reset();
                } else {
                    alert('❌ خطأ: ' + result.message);
                }
            } catch (error) {
                console.error("Password Change Error:", error);
                alert('حدث خطأ أثناء الاتصال بالسيرفر');
            }
        });
    }

    // --- نظام الشات بوت الذكي ---
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');
    const chatBody = document.querySelector('.chat-body');

    function appendMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', sender);
        msgDiv.innerHTML = `<p>${text}</p>`;
        chatBody.appendChild(msgDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    if (sendBtn && chatInput) {
        sendBtn.addEventListener('click', () => {
            const text = chatInput.value.trim();
            if (text) {
                appendMessage(text, 'user');
                chatInput.value = '';
                setTimeout(() => appendMessage("أهلاً بك! 😊 كيف أساعدك اليوم؟", 'bot'), 600);
            }
        });
    }

    // --- جلب بيانات الداشبورد (الشكاوى والملف الشخصي) ---
    if (token) {
        try {
            // ✅ التعديل الثالث: استخدام المسار النسبي /api/profile
            const profileRes = await fetch(`/api/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (profileRes.ok) {
                const userData = await profileRes.json();
                const welcomeMsg = document.getElementById('welcome-msg');
                if(welcomeMsg && userData.full_name) {
                    welcomeMsg.textContent = `مرحباً بك، ${userData.full_name.split(' ')[0]} 👋`;
                }
            }

            // ✅ التعديل الرابع: استخدام المسار النسبي /api/my-complaints
            const complaintsRes = await fetch(`/api/my-complaints`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (complaintsRes.ok) {
                const complaints = await complaintsRes.json();
                
                if(document.getElementById('stat-total')) document.getElementById('stat-total').textContent = complaints.length;
                if(document.getElementById('stat-pending')) document.getElementById('stat-pending').textContent = complaints.filter(c => c.status !== 'completed').length;
                if(document.getElementById('stat-completed')) document.getElementById('stat-completed').textContent = complaints.filter(c => c.status === 'completed').length;

                const tbody = document.getElementById('recent-complaints-body');
                if (tbody) {
                    tbody.innerHTML = complaints.length ? '' : '<tr><td colspan="4">لا توجد شكاوى.</td></tr>';
                    complaints.slice(0, 5).forEach(c => {
                        const date = new Date(c.date_submitted).toLocaleDateString('ar-EG');
                        tbody.innerHTML += `
                            <tr>
                                <td>TIC_${c.id}</td>
                                <td>${c.complaint_type}</td>
                                <td>${date}</td>
                                <td><span class="status-badge status-${c.status}">${c.status}</span></td>
                            </tr>`;
                    });
                }
            }
        } catch (err) { console.error("Error loading dashboard data:", err); }
    }
});