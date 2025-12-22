const areasData = {
    "عمان": [
        "العبدلي", "صويلح", "تلاع العلي", "شفا بدران", "أبو نصير",
        "وادي السير", "سحاب", "مرج الحمام", "الجبيهة", 
        "بلدية الجيزة: الجيزة", "بلدية الجيزة: القسطل", "بلدية الجيزة: أم العمد", "بلدية الجيزة: اللبن",
        "بلدية سحاب: سحاب",
        "بلدية أم البساتين: أم البساتين", "بلدية أم البساتين: الفردوس",
        "بلدية مؤتة والمزار: مؤتة", "بلدية مؤتة والمزار: المزار"
    ],
    "إربد": [
        "بلدية إربد الكبرى: إربد", "بلدية الرمثا الجديدة: الرمثا", "بلدية الرمثا الجديدة: البويضة",
        "بلدية بني كنانة: مناطق لواء بني كنانة", "بلدية الكورة: مناطق لواء الكورة",
        "بلدية الأغوار الشمالية: مناطق الأغوار الشمالية", "بلدية المزار الشمالي: المزار الشمالي",
        "بلدية الطيبة: الطيبة", "بلدية الوسطية: مناطق لواء الوسطية"
    ],
    "الزرقاء": [
        "بلدية الزرقاء الكبرى: الزرقاء", "بلدية الزرقاء الكبرى: الرصيفة",
        "بلدية الهاشمية: الهاشمية", "بلدية الأزرق: الأزرق الشمالي", "بلدية الأزرق: الأزرق الجنوبي"
    ],
    "المفرق": [
        "بلدية المفرق الكبرى: المفرق", "بلدية البادية الشمالية: مناطق البادية الشمالية",
        "بلدية أم الجمال: أم الجمال", "بلدية الصالحية ونايفة: الصالحية", "بلدية الصالحية ونايفة: نايفة"
    ],
    "البلقاء": [
        "بلدية السلط الكبرى: السلط", "بلدية السلط الكبرى: وادي السير (جزء منها)", "بلدية السلط الكبرى: يرقا", "بلدية السلط الكبرى: عيرا",
        "بلدية الفحيص: الفحيص", "بلدية ماحص: ماحص", "بلدية الشونة الجنوبية: الشونة الجنوبية", "بلدية الشونة الجنوبية: الكرامة"
    ],
    "الكرك": [
        "بلدية الكرك الكبرى: الكرك", "بلدية الكرك الكبرى: عي", "بلدية الكرك الكبرى: الثنية",
        "بلدية المزار الجنوبي: المزار الجنوبي", "بلدية القصر: القصر", "بلدية القصر: الربة"
    ],
    "معان": [
        "بلدية معان الكبرى: معان", "بلدية الشوبك الجديدة: الشوبك", "بلدية الشوبك الجديدة: العبدلية", "بلدية الشوبك الجديدة: حمزة",
        "بلدية الحسينية الجديدة: الحسينية", "بلدية الحسينية الجديدة: الهاشمية", "بلدية الجفر: الجفر"
    ],
    "العقبة": [
        "سلطة منطقة العقبة الاقتصادية الخاصة: مدينة العقبة والمناطق الاقتصادية", "بلدية القويرة: القويرة"
    ],
    "جرش": [
        "بلدية جرش الكبرى: جرش", "بلدية سوف: سوف", "بلدية المصطبة: المصطبة"
    ],
    "عجلون": [
        "بلدية عجلون الكبرى: عجلون", "بلدية كفرنجة: كفرنجة", "بلدية صخرة: صخرة"
    ],
    "مأدبا": [
        "بلدية مأدبا الكبرى: مأدبا", "بلدية ذيبان: ذيبان", "بلدية مليح: مليح"
    ],
    "الطفيلة": [
        "بلدية الطفيلة الكبرى: الطفيلة", "بلدية بصيرا: بصيرا", "بلدية الحسا: الحسا"
    ]
};

const provinceCodes = {
    'عمان': 1, 'إربد': 2, 'الزرقاء': 3, 'المفرق': 4,
    'البلقاء': 5, 'الكرك': 6, 'معان': 7, 'العقبة': 8,
    'جرش': 9, 'عجلون': 10, 'مأدبا': 11, 'الطفيلة': 12
};

document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = 'http://localhost:3000';
    
    // 1. التحقق من التوكن
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!token) {
        alert("يرجى تسجيل الدخول أولاً");
        window.location.href = 'login.html';
        return;
    }

    const provinceSelect = document.getElementById('province');
    const areaSelect = document.getElementById('area');
    const complaintForm = document.getElementById('complaint-form');
    const successBox = document.getElementById('success-message');
    const refNumberSpan = document.getElementById('reference-number-span');
    const copyBtn = document.getElementById('copy-btn');
    
    // حقول التعبئة التلقائية
    const fullNameInput = document.getElementById('full_name');
    const phoneInput = document.getElementById('phone');

    // دالة تعبئة المناطق (بناءً على المحافظة المختارة)
    function populateAreas() {
        const selectedProvince = provinceSelect.value;
        areaSelect.innerHTML = '<option value="">اختر المنطقة</option>';

        if (selectedProvince && areasData[selectedProvince]) {
            areasData[selectedProvince].forEach(area => {
                const option = document.createElement('option');
                option.value = area;
                option.textContent = area;
                areaSelect.appendChild(option);
            });
        }
    }

    // 2. دالة جلب بيانات المستخدم (التعبئة التلقائية)
    async function fetchUserData() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const userData = await response.json();

                // تعبئة الاسم
                if (fullNameInput) {
                    fullNameInput.value = userData.full_name || '';
                    fullNameInput.setAttribute('readonly', true);
                    fullNameInput.style.backgroundColor = '#e9ecef';
                }

                // تعبئة الهاتف
                if (phoneInput) {
                    phoneInput.value = userData.phone || '';
                    phoneInput.setAttribute('readonly', true);
                    phoneInput.style.backgroundColor = '#e9ecef';
                }

                // تعبئة المحافظة وتحديث المناطق
                if (provinceSelect && userData.province) {
                    provinceSelect.value = userData.province;
                    // 🔥 استدعاء دالة المناطق يدوياً بعد تعبئة المحافظة
                    populateAreas();
                }
            }
        } catch (error) {
            console.error("فشل جلب بيانات المستخدم:", error);
        }
    }

    // استدعاء التعبئة التلقائية عند التحميل
    fetchUserData();

    // الاستماع لتغيير المحافظة يدوياً
    provinceSelect.addEventListener('change', populateAreas);

    // 3. معالجة إرسال النموذج
    complaintForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const selectedProvince = provinceSelect.value;
        const selectedArea = areaSelect.value;

        if (!selectedProvince || !selectedArea) {
            alert('الرجاء اختيار المحافظة والمنطقة.');
            return;
        }

        const formData = new FormData(complaintForm);
        
        // تعطيل الزر أثناء الإرسال
        const submitBtn = complaintForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'جاري الإرسال...';

        try {
            const response = await fetch(`${API_BASE_URL}/api/complaints`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}` // ✅ إضافة التوكن ضروري جداً
                },
                body: formData 
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // حساب الكود الخاص بالمنطقة
                const provinceCode = provinceCodes[selectedProvince];
                const areaList = areasData[selectedProvince];
                const areaIndex = areaList.indexOf(selectedArea);
                const areaCode = areaIndex !== -1 ? areaIndex + 1 : '0';

                // توليد الرقم المرجعي حسب التنسيق الخاص بك
                const referenceNumber = `TIC_${provinceCode}_${areaCode}_${data.id}`;

                refNumberSpan.textContent = referenceNumber;
                successBox.style.display = 'block'; 
                complaintForm.style.display = 'none'; 
            } else {
                alert(`فشل الإرسال: ${data.message || 'حدث خطأ غير معروف.'}`);
            }
        } catch(error) {
            console.error('Fetch error:', error);
            alert('❌ حدث خطأ في الاتصال بالخادم.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    copyBtn.addEventListener('click', () => {
        const textToCopy = refNumberSpan.textContent;
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                alert('✅ تم نسخ الرقم المرجعي بنجاح!');
            })
            .catch(err => {
                console.error('فشل في النسخ:', err);
                alert('فشل في نسخ الرقم، يرجى النسخ يدوياً.');
            });
    });
});