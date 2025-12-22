document.addEventListener('DOMContentLoaded', function() {

    const signupForm = document.getElementById('signup-form');
    const roleCitizen = document.getElementById('role-citizen');
    const roleEmployee = document.getElementById('role-employee');
    const citizenFields = document.getElementById('citizen-fields');
    const employeeFields = document.getElementById('employee-fields');
    const provinceInput = signupForm.querySelector('select[name="province"]');
    const employeeIdInput = document.getElementById('employee-id-input');
    const passwordInput = signupForm.querySelector('input[name="password"]');
    const confirmPasswordInput = signupForm.querySelector('input[name="confirm_password"]');

    const toggleFields = () => {
        if (roleEmployee.checked) {
            citizenFields.classList.remove('visible'); 
            employeeFields.classList.add('visible');   
            employeeIdInput.required = true;
            provinceInput.required = false; 
            provinceInput.value = ''; 
        } else {
            citizenFields.classList.add('visible');    
            employeeFields.classList.remove('visible'); 
            provinceInput.required = true;
            employeeIdInput.required = false; 
            employeeIdInput.value = '';
        }
    };

    roleCitizen.addEventListener('change', toggleFields);
    roleEmployee.addEventListener('change', toggleFields);
    toggleFields();

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const role = document.querySelector('input[name="role"]:checked').value; 
        const name = signupForm.name.value.trim();
        const phone = signupForm.phone.value.trim();
        const email = signupForm.email.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const province = role === 'citizen' ? provinceInput.value : null; 
        const employee_id = role === 'employee' ? employeeIdInput.value.trim() : null; 

        if (password !== confirmPassword) {
            return alert("كلمة المرور وتأكيد كلمة المرور غير متطابقان.");
        }

        if (role === 'employee' && !employee_id) {
            return alert("يرجى إدخال الرقم الوظيفي المعتمد.");
        }
        
        if (role === 'citizen' && (!province || province.trim() === '')) {
            return alert("يرجى اختيار المحافظة.");
        }

        const dataToSend = { name, phone, email, password, role, province, employee_id };

        try {
            const res = await fetch('http://localhost:3000/api/signup', {
                method:'POST',
                headers:{ 'Content-Type':'application/json' },
                body: JSON.stringify(dataToSend) 
            });

            const data = await res.json();

            if (res.ok) {
                alert(data.message + " يمكنك الآن تسجيل الدخول.");
                window.location.href='login.html'; 
            } else {
                 alert(data.message || "فشل التسجيل. حاول مجدداً.");
            }
            
        } catch(err) { 
            console.error(err); 
            alert("تعذر الاتصال بالسيرفر."); 
        }
    });

});
