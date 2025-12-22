document.addEventListener('DOMContentLoaded', function() {
    const profileDataContainer = document.getElementById('profile-data');
    const loadingMessage = document.getElementById('loading-message');
    const profileContainer = document.querySelector('.profile-container');
    
    const fullNameField = document.getElementById('full_name');
    const phoneField = document.getElementById('phone');
    const emailField = document.getElementById('email');
    const provinceField = document.getElementById('province');

    function displayError(message) {
        if(loadingMessage) loadingMessage.style.display = 'none';
        if(profileDataContainer) profileDataContainer.style.display = 'none';

        let errorBox = document.getElementById('fetch-error-box');
        if (!errorBox) {
            errorBox = document.createElement('div');
            errorBox.id = 'fetch-error-box';
            errorBox.className = 'message-box error-box';
            if(profileContainer) profileContainer.appendChild(errorBox);
        }
        errorBox.innerHTML = `❌ ${message}`;
        errorBox.style.display = 'block';
    }

    async function fetchUserProfile() {
        if(loadingMessage) loadingMessage.style.display = 'block';
        if(profileDataContainer) profileDataContainer.style.display = 'none';

        // ✅ التحقق من التوكن بكل الأسماء المحتملة لضمان استمرار الجلسة
        const userToken = localStorage.getItem('token') || 
                          localStorage.getItem('authToken') || 
                          localStorage.getItem('userToken'); 

        console.log("حالة التوكن:", userToken ? "موجود" : "غير موجود");

        if (!userToken) {
            console.error("لم يتم العثور على التوكن في التخزين المحلي.");
            displayError('خطأ: لم يتم العثور على تسجيل دخول. يرجى تسجيل الدخول مرة أخرى.');
            // window.location.href = 'login.html'; // يمكنك تفعيلها للتحويل التلقائي
            return;
        }
        
        try {
            // ✅ التعديل الجوهري: استخدام مسار نسبي ليعمل على الرابط العالمي تلقائياً
            const response = await fetch('/api/profile', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}` 
                }
            });

            if (response.status === 401 || response.status === 403) {
                console.warn("السيرفر رفض التوكن (401/403).");
                alert("انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً.");
                localStorage.clear();
                window.location.href = 'login.html';
                return;
            }

            const data = await response.json();
            
            if (response.ok) {
                if(fullNameField) fullNameField.textContent = data.full_name || 'غير متوفر';
                if(phoneField) phoneField.textContent = data.phone || 'غير متوفر';
                if(emailField) emailField.textContent = data.email || 'غير متوفر';
                if(provinceField) provinceField.textContent = data.province || 'غير متوفر';

                if(loadingMessage) loadingMessage.style.display = 'none';
                if(profileDataContainer) profileDataContainer.style.display = 'block';
            } else {
                displayError(`فشل تحميل البيانات: ${data.message || 'خطأ غير معروف'}`);
            }

        } catch (error) {
            console.error('خطأ في الاتصال:', error);
            displayError('فشل الاتصال بالسيرفر. يرجى التأكد من جودة الإنترنت في الموقع.');
        }
    }

    fetchUserProfile();
});