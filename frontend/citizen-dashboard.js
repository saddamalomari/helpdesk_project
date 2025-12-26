document.addEventListener('DOMContentLoaded', async function () {

    /* =========================
       🔐 Session & Token
    ========================= */
    const token =
        localStorage.getItem('token') ||
        localStorage.getItem('userToken') ||
        localStorage.getItem('authToken');

    if (!token) {
        console.warn('لم يتم العثور على توكن، قد تحتاج لتسجيل الدخول.');
    }

    /* =========================
       📅 Current Date
    ========================= */
    const dateBox = document.getElementById('current-date');
    if (dateBox) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateBox.textContent = new Date().toLocaleDateString('ar-EG', options);
    }

    /* =========================
       🍔 Sidebar Toggle
    ========================= */
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-btn');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    /* =========================
       📞 Contact Menu
    ========================= */
    const contactToggle = document.getElementById('contact-toggle');
    const contactMenu = document.getElementById('contact-menu');

    if (contactMenu) {
        contactMenu.classList.remove('active'); 
    }

    if (contactToggle && contactMenu) {
        contactToggle.addEventListener('click', (e) => {
            e.preventDefault();
            contactMenu.classList.toggle('active');
            contactToggle.classList.toggle('active');
        });
    }

    /* =========================
       🔐 Change Password Modal
    ========================= */
    const changePassToggle = document.getElementById('change-password-toggle');
    const changePassModal = document.getElementById('change-password-modal');
    const closePassModal = document.getElementById('close-pass-modal');
    const changePassForm = document.getElementById('change-password-form');

    // فتح المودال
    if (changePassToggle && changePassModal) {
        changePassToggle.addEventListener('click', (e) => {
            e.preventDefault();
            changePassModal.style.display = 'flex';
        });
    }

    // إغلاق المودال (الزر)
    if (closePassModal && changePassModal) {
        closePassModal.addEventListener('click', () => {
            changePassModal.style.display = 'none';
        });
    }

    // إغلاق المودال (عند الضغط خارج الصندوق)
    window.addEventListener('click', (e) => {
        if (e.target === changePassModal) {
            changePassModal.style.display = 'none';
        }
    });

    /* =========================
       🔑 Submit Change Password
    ========================= */
    if (changePassForm) {
        console.log("✅ تم ربط نموذج تغيير كلمة المرور بنجاح");

        changePassForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const old_password = document.getElementById('old-password').value;
            const new_password = document.getElementById('new-password').value;

            if (!token) {
                alert('انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى');
                return;
            }

            try {
                const response = await fetch('/api/change-password', {
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
                    alert('❌ خطأ: ' + (result.message || 'فشل العملية'));
                }
            } catch (err) {
                console.error('Password Change Error:', err);
                alert('حدث خطأ أثناء الاتصال بالسيرفر');
            }
        });
    }

    /* =========================
       🤖 Chatbot Logic
    ========================= */
    const chatbotBtn = document.getElementById('chatbot-btn');
    const chatbotWindow = document.getElementById('chatbot-window');
    const closeChat = document.getElementById('close-chat');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');
    const chatBody = document.querySelector('.chat-body');

    function appendMessage(text, sender) {
        const msg = document.createElement('div');
        msg.className = `message ${sender}`;
        msg.innerHTML = `<p>${text}</p>`;
        chatBody.appendChild(msg);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    if (chatbotBtn && chatbotWindow) {
        chatbotBtn.addEventListener('click', (e) => {
            e.preventDefault();
            chatbotWindow.style.display = 'flex';
            if (contactMenu) contactMenu.classList.remove('active');
        });
    }

    if (closeChat && chatbotWindow) {
        closeChat.addEventListener('click', () => {
            chatbotWindow.style.display = 'none';
        });
    }

    if (sendBtn && chatInput) {
        sendBtn.addEventListener('click', () => {
            const text = chatInput.value.trim();
            if (!text) return;

            appendMessage(text, 'user');
            chatInput.value = '';

            let response = 'أهلاً بك! 😊 كيف أساعدك اليوم؟';
            if (text.includes('حسام الرفايعة')) {
                response = 'شخص يأكله بالمتر.';
            }

            setTimeout(() => appendMessage(response, 'bot'), 600);
        });
    }

    /* =========================
       📊 Dashboard Data (Fetch)
    ========================= */
    if (token) {
        try {
            // جلب بيانات البروفايل
            const profileRes = await fetch('/api/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (profileRes.ok) {
                const user = await profileRes.json();
                const welcomeMsg = document.getElementById('welcome-msg');
                if (welcomeMsg && user.full_name) {
                    welcomeMsg.textContent = `مرحباً بك، ${user.full_name.split(' ')[0]} 👋`;
                }
            }

            // جلب الشكاوى
            const complaintsRes = await fetch('/api/my-complaints', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (complaintsRes.ok) {
                const complaints = await complaintsRes.json();

                // تحديث الإحصائيات
                const statTotal = document.getElementById('stat-total');
                const statPending = document.getElementById('stat-pending');
                const statCompleted = document.getElementById('stat-completed');

                if(statTotal) statTotal.textContent = complaints.length;
                if(statPending) statPending.textContent = complaints.filter(c => c.status !== 'completed').length;
                if(statCompleted) statCompleted.textContent = complaints.filter(c => c.status === 'completed').length;

                const tbody = document.getElementById('recent-complaints-body');
                if (tbody) {
                    tbody.innerHTML = complaints.length ? '' : '<tr><td colspan="5">لا توجد شكاوى.</td></tr>';

                    complaints.slice(0, 5).forEach(c => {
                        const date = new Date(c.date_submitted).toLocaleDateString('ar-EG');
 
tbody.innerHTML += `
    <tr>
        <td>TIC_${c.id}</td>
        <td>${c.complaint_type}</td>
        <td>${date}</td>
        <td>${c.status}</td>
        <td style="text-align:left;">
            <button onclick='printComplaint(${JSON.stringify(c)})' 
                style="background:#2ecc71;color:#fff;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;">
                <i class="fas fa-print"></i> طباعة
            </button>
        </td>
    </tr>`;
                    });
                }
            }

        } catch (err) {
            console.error('Dashboard Load Error:', err);
        }
    }
});
function printComplaint(complaintData) {
    // إنشاء نافذة جديدة للطباعة
    const printWindow = window.open('', '_blank');
    
    // محتوى الشكوى بتنسيق رسمي
    const htmlContent = `
        <html>
        <head>
            <title>طباعة شكوى - ${complaintData.id}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; padding: 40px; color: #333; }
                .header { text-align: center; border-bottom: 2px solid #c9a24d; padding-bottom: 20px; margin-bottom: 30px; }
                .header h1 { color: #0b1c2d; margin: 0; }
                .info-section { margin-bottom: 20px; line-height: 1.6; }
                .info-row { display: flex; border-bottom: 1px solid #eee; padding: 10px 0; }
                .label { font-weight: bold; width: 150px; color: #0b1c2d; }
                .value { flex: 1; }
                .footer { margin-top: 50px; text-align: center; font-size: 0.8rem; color: #777; border-top: 1px solid #eee; padding-top: 20px; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>نظام المساعدة والدعم (Alomari Help Desk)</h1>
                <p>نموذج تفاصيل الشكوى الرسمي</p>
            </div>
            
            <div class="info-section">
                <div class="info-row"><div class="label">رقم المرجع:</div><div class="value">TIC_${complaintData.id}</div></div>
                <div class="info-row"><div class="label">نوع الشكوى:</div><div class="value">${complaintData.complaint_type}</div></div>
                <div class="info-row"><div class="label">تاريخ التقديم:</div><div class="value">${new Date(complaintData.date_submitted).toLocaleDateString('ar-EG')}</div></div>
                <div class="info-row"><div class="label">الحالة الحالية:</div><div class="value">${complaintData.status}</div></div>
                <div class="info-row"><div class="label">تفاصيل المشكلة:</div><div class="value">${complaintData.description || 'لا يوجد وصف إضافي'}</div></div>
            </div>

            <div class="footer">
                <p>تم استخراج هذا المستند إلكترونياً بتاريخ: ${new Date().toLocaleString('ar-EG')}</p>
                <p>العقبة، الأردن</p>
            </div>

            <script>
                window.onload = function() { window.print(); window.close(); }
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
}