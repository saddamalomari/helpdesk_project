document.addEventListener('DOMContentLoaded', async function() {
    
    // ✅ التعديل الأول: جعل الرابط نسبياً لضمان العمل على Render
    const API_BASE_URL = ''; 
    
    // البحث عن التوكن لضمان استمرار الجلسة
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('userToken') || 
                  localStorage.getItem('authToken');

    if (!token) {
        console.warn("لم يتم العثور على توكن، قد تحتاج لتسجيل الدخول.");
    }

    // عرض التاريخ الحالي
    const dateBox = document.getElementById('current-date');
    if (dateBox) {
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateBox.textContent = new Date().toLocaleDateString('ar-EG', dateOptions);
    }

    // --- 1. التحكم في القائمة الجانبية (Sidebar) ---
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-btn');
    if(toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => sidebar.classList.toggle('active'));
    }

    // --- 2. حل مشكلة قائمة "تواصل معنا" ---
    const contactToggle = document.getElementById('contact-toggle');
    const contactMenu = document.getElementById('contact-menu');
    if (contactToggle && contactMenu) {
        contactToggle.addEventListener('click', function(e) {
            e.preventDefault();
            contactMenu.classList.toggle('active'); // CSS الخاص بك يستخدم كلاس active لإظهارها
        });
    }

    // --- 3. التحكم في نافذة "تغيير كلمة المرور" (فتح وإغلاق) ---
    const changePassToggle = document.getElementById('change-password-toggle');
    const changePassModal = document.getElementById('change-password-modal');
    const closePassModal = document.getElementById('close-pass-modal');

    if (changePassToggle && changePassModal) {
        changePassToggle.addEventListener('click', (e) => {
            e.preventDefault();
            changePassModal.style.display = 'flex'; // إظهار النافذة
        });
    }

    if (closePassModal) {
        closePassModal.addEventListener('click', () => {
            changePassModal.style.display = 'none'; // إغلاق النافذة
        });
    }

    // --- 4. التحكم في نافذة "الشات بوت" (فتح وإغلاق) ---
    const chatbotBtn = document.getElementById('chatbot-btn');
    const chatbotWindow = document.getElementById('chatbot-window');
    const closeChat = document.getElementById('close-chat');

    if (chatbotBtn && chatbotWindow) {
        chatbotBtn.addEventListener('click', (e) => {
            e.preventDefault();
            chatbotWindow.style.display = 'flex'; // فتح نافذة الشات
            if (contactMenu) contactMenu.classList.remove('active'); // إغلاق القائمة بعد الضغط
        });
    }

    if (closeChat) {
        closeChat.addEventListener('click', () => {
            chatbotWindow.style.display = 'none'; // إغلاق نافذة الشات
        });
    }

    // --- 5. نظام الشات بوت الذكي (محدث بالإجابة الخاصة) ---
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
                
                let botResponse = "أهلاً بك! 😊 كيف أساعدك اليوم في تقديم شكوى؟";
                
                // إضافة الرد المخصص بناءً على طلبك
                if (text.includes("حسام الرفايعة")) {
                    botResponse = "شخص يأكله بالمتر.";
                }

                setTimeout(() => appendMessage(botResponse, 'bot'), 600);
            }
        });
    }

    // --- 6. معالجة نموذج "تغيير كلمة المرور" ---
    const changePassForm = document.getElementById('change-password-form');
    if (changePassForm) {
        changePassForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const old_password = document.getElementById('old-password').value;
            const new_password = document.getElementById('new-password').value;

            try {
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
                    changePassModal.style.display = 'none';
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

    // --- 7. جلب بيانات الداشبورد (الشكاوى والملف الشخصي) ---
    if (token) {
        try {
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