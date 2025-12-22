document.addEventListener('DOMContentLoaded', async function() {
    
    // --- 1. الإعدادات والتحقق من الهوية ---
    const API_BASE_URL = 'http://localhost:3000';
    
    // البحث عن التوكن بكل الأسماء المحتملة لضمان استمرار الجلسة
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('userToken') || 
                  localStorage.getItem('authToken');

    if (!token) {
        console.warn("لم يتم العثور على توكن، قد تحتاج لتسجيل الدخول.");
        // window.location.href = 'login.html'; // فعل هذا السطر لاحقاً لتأمين الصفحة
    }

    // عرض التاريخ الحالي في واجهة المستخدم
    const dateBox = document.getElementById('current-date');
    if (dateBox) {
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateBox.textContent = new Date().toLocaleDateString('ar-EG', dateOptions);
    }

    // --- 2. التحكم في القوائم الجانبية ---
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-btn');
    const contactToggle = document.getElementById('contact-toggle');
    const contactMenu = document.getElementById('contact-menu');

    if(toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    if(contactToggle && contactMenu) {
        contactToggle.addEventListener('click', (e) => {
            e.preventDefault();
            contactMenu.classList.toggle('active');
        });
    }

    // --- 3. برمجة خاصية "تغيير كلمة المرور" (الإضافة الجديدة) ---
    const changePassBtn = document.getElementById('change-password-toggle');
    const changePassModal = document.getElementById('change-password-modal');
    const closePassModal = document.getElementById('close-pass-modal');
    const changePassForm = document.getElementById('change-password-form');

    // فتح نافذة التغيير
    if (changePassBtn && changePassModal) {
        changePassBtn.addEventListener('click', (e) => {
            e.preventDefault();
            changePassModal.style.display = 'flex';
            // إغلاق القائمة في الموبايل عند فتح النافذة
            if (window.innerWidth <= 900 && sidebar) sidebar.classList.remove('active');
        });
    }

    // إغلاق نافذة التغيير
    if (closePassModal) {
        closePassModal.addEventListener('click', () => {
            changePassModal.style.display = 'none';
        });
    }

    // إغلاق النافذة عند الضغط خارج المحتوى
    window.addEventListener('click', (e) => {
        if (e.target == changePassModal) changePassModal.style.display = 'none';
    });

    // معالجة إرسال النموذج للسيرفر
    if (changePassForm) {
        changePassForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const old_password = document.getElementById('old-password').value;
            const new_password = document.getElementById('new-password').value;

            try {
                const response = await fetch(`${API_BASE_URL}/api/change-password`, {
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

    // --- 4. نظام الشات بوت الذكي ---
    const chatbotBtn = document.getElementById('chatbot-btn');
    const chatbotWindow = document.getElementById('chatbot-window');
    const closeChat = document.getElementById('close-chat');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');
    const chatBody = document.querySelector('.chat-body');

    if (chatbotBtn && chatbotWindow) {
        chatbotBtn.addEventListener('click', (e) => {
            e.preventDefault();
            chatbotWindow.style.display = 'flex';
            if (window.innerWidth <= 900 && sidebar) sidebar.classList.remove('active');
        });
        if (closeChat) {
            closeChat.addEventListener('click', () => chatbotWindow.style.display = 'none');
        }
    }

    const botKnowledge = [
        { keywords: ["مرحبا", "هلا", "سلام"], reply: "أهلاً بك! 😊 كيف أساعدك اليوم؟" },
        { keywords: ["شكوى", "تقديم"], reply: "لتقديم شكوى، استخدم زر 'تقديم شكوى جديدة' في الشاشة الرئيسية." },
        { keywords: ["كلمة السر", "مرور"], reply: "يمكنك تغييرها من خيار 'تغيير كلمة المرور' في القائمة الجانبية." },
        { keywords: ["شكرا", "يسلمو"], reply: "في خدمتك دائماً! 🌹" }
    ];

    function appendMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', sender);
        const p = document.createElement('p');
        p.textContent = text;
        msgDiv.appendChild(p);
        chatBody.appendChild(msgDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function botReply(userText) {
        let reply = "عذراً، لم أفهم سؤالك جيداً. يمكنك التواصل مع الدعم الفني.";
        const lowerText = userText.toLowerCase();
        for (let item of botKnowledge) {
            if (item.keywords.some(k => lowerText.includes(k))) {
                reply = item.reply;
                break;
            }
        }
        setTimeout(() => appendMessage(reply, 'bot'), 600);
    }

    if (sendBtn && chatInput) {
        sendBtn.addEventListener('click', () => {
            const text = chatInput.value.trim();
            if (text) {
                appendMessage(text, 'user');
                chatInput.value = '';
                botReply(text);
            }
        });
        chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendBtn.click(); });
    }

    // --- 5. جلب بيانات الداشبورد (الشكاوى والملف الشخصي) ---
    if (token) {
        try {
            // جلب بيانات الملف الشخصي
            const profileRes = await fetch(`${API_BASE_URL}/api/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (profileRes.ok) {
                const userData = await profileRes.json();
                const welcomeMsg = document.getElementById('welcome-msg');
                if(welcomeMsg && userData.full_name) {
                    welcomeMsg.textContent = `مرحباً بك، ${userData.full_name.split(' ')[0]} 👋`;
                }
            }

            // جلب قائمة الشكاوى الخاصة بالمواطن
            const complaintsRes = await fetch(`${API_BASE_URL}/api/my-complaints`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (complaintsRes.ok) {
                const complaints = await complaintsRes.json();
                
                // تحديث العدادات في الواجهة
                if(document.getElementById('stat-total')) document.getElementById('stat-total').textContent = complaints.length;
                if(document.getElementById('stat-pending')) document.getElementById('stat-pending').textContent = complaints.filter(c => c.status !== 'completed').length;
                if(document.getElementById('stat-completed')) document.getElementById('stat-completed').textContent = complaints.filter(c => c.status === 'completed').length;

                // تحديث جدول الشكاوى الأخيرة
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