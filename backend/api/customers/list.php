<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/setup/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'কাস্টমারের তালিকা দেখতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
if (!userHasPermission($user, 'setup') && !userHasPermission($user, 'sales')) {
    respond(403, false, 'কাস্টমারের তালিকা দেখার অনুমতি আপনার অ্যাকাউন্টে নেই।');
}
$shopId = authorizedShopId($user);

try {
    $pdo = database();
    $statement = $pdo->prepare(
        'SELECT id, customer_name, mobile_number, address, area,
                opening_balance, current_balance, credit_limit, customer_level
         FROM customers WHERE shop_id = :shop_id ORDER BY customer_name, id'
    );
    $statement->execute(['shop_id' => $shopId]);
    $customers = $statement->fetchAll();
    foreach ($customers as &$customer) {
        $customer['id'] = (int) $customer['id'];
        $customer['has_transactions'] = setupReferenceExists(
            $pdo,
            ['sales', 'sale_bills', 'sales_bills', 'sale_items', 'sales_items', 'customer_payments'],
            'customer_id',
            $customer['id'],
        ) || setupForeignKeyReferenceExists($pdo, 'customers', $customer['id']);
        $customer['can_delete'] = !$customer['has_transactions']
            && (float) ($customer['current_balance'] ?? 0) === 0.0;
    }
    unset($customer);
    respond(200, true, 'কাস্টমারের তালিকা পাওয়া গেছে।', ['customers' => $customers]);
} catch (PDOException $exception) {
    error_log('Customer listing failed: ' . $exception->getMessage());
    respond(500, false, 'কাস্টমারের তালিকা লোড করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}