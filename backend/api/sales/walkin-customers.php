<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'ওয়াক-ইন কাস্টমারের নাম খুঁজতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'sales');
$shopId = authorizedShopId($user);
$search = trim((string) ($_GET['search'] ?? ''));
if (strlen($search) > 180) {
    respond(422, false, 'কাস্টমারের নাম ১৮০ অক্ষরের মধ্যে লিখুন।');
}
if ($search === '') {
    respond(200, true, 'ওয়াক-ইন কাস্টমারের নাম পাওয়া গেছে।', ['names' => []]);
}

try {
    $pdo = database();
    $statement = $pdo->prepare(
        'SELECT DISTINCT customer_name
         FROM sales
         WHERE shop_id = :shop_id
           AND customer_id IS NULL
           AND customer_name IS NOT NULL
           AND customer_name <> \'\'
           AND customer_name LIKE :search
         ORDER BY customer_name
         LIMIT 10'
    );
    $statement->execute([
        'shop_id' => $shopId,
        'search' => '%' . $search . '%',
    ]);
    $names = array_column($statement->fetchAll(), 'customer_name');
    respond(200, true, 'ওয়াক-ইন কাস্টমারের নাম পাওয়া গেছে।', ['names' => $names]);
} catch (PDOException $exception) {
    error_log('Walk-in customer name search failed: ' . $exception->getMessage());
    respond(500, false, 'ওয়াক-ইন কাস্টমারের নাম খোঁজা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
