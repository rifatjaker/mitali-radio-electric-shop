<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/setup/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'কাস্টমারের বকেয়া দেখতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'sales');
$shopId = authorizedShopId($user);

try {
    $statement = database()->prepare(
        'SELECT id, customer_name, mobile_number, address, COALESCE(current_balance, 0) AS current_due
         FROM customers
         WHERE shop_id = :shop_id AND COALESCE(current_balance, 0) > 0
         ORDER BY customer_name, id'
    );
    $statement->execute(['shop_id' => $shopId]);
    $customers = $statement->fetchAll();
    foreach ($customers as &$customer) {
        $customer['id'] = (int) $customer['id'];
        $customer['current_due'] = (float) $customer['current_due'];
    }
    unset($customer);

    respond(200, true, 'বকেয়াসহ কাস্টমারের তালিকা পাওয়া গেছে।', ['customers' => $customers]);
} catch (PDOException $exception) {
    error_log('Customer payment options failed: ' . $exception->getMessage());
    respond(500, false, 'কাস্টমারের বকেয়ার তালিকা লোড করা যায়নি।');
}
