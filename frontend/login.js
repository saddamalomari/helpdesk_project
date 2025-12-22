const loginForm = document.getElementById('login-form');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value.trim();
    
    if (!email || !password) return alert("يرجى ملء جميع الحقول!");
    
    try {
        // ✅ التعديل الجوهري: استخدام مسار نسبي ليعمل على Render تلقائياً
        const res = await fetch('/api/login', {
            method:'POST',
            headers:{ 'Content-Type':'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            alert(data.message); 

            if (!data.token) {
                console.error("❌ فشل في جلب التوكن من رد الخادم.");
                alert("تم الدخول بنجاح، لكن الخادم لم يرسل رمز المصادقة (Token).");
                return; 
            }

            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userRole', data.role); 
    
            const userRole = data.role ? data.role.toLowerCase() : ''; 
            
            if (userRole === 'admin') {
                window.location.href = 'admin-dashboard.html';
            } else if (userRole === 'employee') {
                window.location.href = 'employee-dashboard.html'; 
            } else if (userRole === 'citizen') {
                window.location.href = 'citizen-dashboard.html'; 
            } else {
                alert("تم تسجيل الدخول بنجاح، لكن دور المستخدم غير محدد.");
                window.location.href = 'index.html'; 
            }
            
        } else {
            alert(data.message || "البريد الإلكتروني أو كلمة المرور غير صحيحة");
        }
        
    } catch(err) { 
        console.error(err); 
        alert("تعذر الاتصال بالسيرفر. تأكد أن الخادم يعمل."); 
    }
});