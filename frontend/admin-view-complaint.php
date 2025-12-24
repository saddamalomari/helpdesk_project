<?php
// بيانات الاتصال بقاعدة البيانات على Clever Cloud
$host = "bx5qdcow10qwuqhd8h8r-mysql.services.clever-cloud.com";
$user = "ufjpwkt1zl5qfvul";
$pass = "كلمة_المرور_الخاصة_بك"; 
$dbname = "bx5qdcow10qwuqhd8h8r";

$conn = new mysqli($host, $user, $pass, $dbname);

// جلب ID الشكوى من الرابط
$id = isset($_GET['id']) ? $_GET['id'] : '';

if ($id) {
    // جلب بيانات الشكوى من الجدول الذي أنشأناه
    $result = $conn->query("SELECT * FROM complaints WHERE id = '$id'");
    $complaint = $result->fetch_assoc();
}

if (!$complaint) {
    die("الشكوى غير موجودة أو الرابط خاطئ.");
}
?>

<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>عرض الشكوى رقم <?php echo $complaint['id']; ?></title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
        .container { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); max-width: 800px; margin: auto; }
        h2 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .info-group { margin-bottom: 15px; }
        .label { font-weight: bold; color: #555; }
    </style>
</head>
<body>
    <div class="container">
        <h2>تفاصيل الشكوى رقم: <?php echo $complaint['id']; ?></h2>
        <div class="info-group"><span class="label">اسم المشتكي:</span> <?php echo $complaint['full_name']; ?></div>
        <div class="info-group"><span class="label">رقم الهاتف:</span> <?php echo $complaint['phone']; ?></div>
        <div class="info-group"><span class="label">الموقع:</span> <?php echo $complaint['province'] . " - " . $complaint['area']; ?></div>
        <div class="info-group"><span class="label">نوع الشكوى:</span> <?php echo $complaint['complaint_type']; ?></div>
        <div class="info-group"><span class="label">الوصف:</span> <p><?php echo $complaint['description']; ?></p></div>
        <div class="info-group"><span class="label">الحالة:</span> <?php echo $complaint['status']; ?></div>
        <hr>
        <a href="admin-dashboard.php">العودة للوحة التحكم</a>
    </div>
</body>
</html>