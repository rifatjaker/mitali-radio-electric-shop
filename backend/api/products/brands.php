<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'ব্র্যান্ডের তালিকা দেখতে GET অনুরোধ পাঠান।');
}

$currentUser = authenticatedUser();
requirePermission($currentUser, 'setup');
$shopId = authorizedShopId($currentUser);

try {
    $statement = database()->prepare(
        "SELECT DISTINCT TRIM(brand) AS brand
         FROM products
         WHERE shop_id = :shop_id AND brand IS NOT NULL AND TRIM(brand) <> ''
         ORDER BY brand"
    );
    $statement->execute(['shop_id' => $shopId]);
    $brands = array_values(array_map(
        static fn (array $row): string => (string) $row['brand'],
        $statement->fetchAll()
    ));

    respond(200, true, 'ব্র্যান্ডের তালিকা পাওয়া গেছে।', ['brands' => $brands]);
} catch (PDOException $exception) {
    error_log('Product brand listing failed: ' . $exception->getMessage());
    respond(500, false, 'ব্র্যান্ডের তালিকা লোড করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
