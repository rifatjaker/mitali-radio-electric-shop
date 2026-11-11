<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/setup/helpers.php';
require_once dirname(__DIR__) . '/delete-audit.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'কাস্টমার মুছতে POST অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'setup');
if (!setupCanDelete($user)) {
    respond(403, false, 'কাস্টমার মুছে ফেলার অনুমতি আপনার অ্যাকাউন্টে নেই।');
}
$shopId = authorizedShopId($user);
$body = requestJson();
$customerId = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT);
if ($customerId === false || $customerId === null || $customerId < 1) {
    respond(422, false, 'সঠিক কাস্টমার নির্বাচন করুন।');
}
$reason = validatedDeletionReason($body);

try {
    $pdo = database();
    $pdo->beginTransaction();
    $statement = $pdo->prepare(
        'SELECT customer_name, current_balance FROM customers WHERE id = :id AND shop_id = :shop_id FOR UPDATE'
    );
    $statement->execute(['id' => $customerId, 'shop_id' => $shopId]);
    $customer = $statement->fetch();
    if (!$customer) {
        $pdo->rollBack();
        respond(404, false, 'কাস্টমারটি পাওয়া যায়নি।');
    }
    $hasTransactions = setupReferenceExists(
        $pdo,
        ['sales', 'sale_bills', 'sales_bills', 'sale_items', 'sales_items', 'customer_payments'],
        'customer_id',
        (int) $customerId,
    ) || setupForeignKeyReferenceExists($pdo, 'customers', (int) $customerId);
    if ($hasTransactions || (float) ($customer['current_balance'] ?? 0) !== 0.0) {
        $pdo->rollBack();
        respond(409, false, 'বিক্রয় লেনদেন বা বকেয়া থাকা কাস্টমার মুছবেন না।');
    }

    recordDeletionAudit($pdo, $shopId, $user, 'customer', (int) $customerId, $customer['customer_name'], $reason);
    $delete = $pdo->prepare('DELETE FROM customers WHERE id = :id AND shop_id = :shop_id');
    $delete->execute(['id' => $customerId, 'shop_id' => $shopId]);
    $pdo->commit();
    respond(200, true, 'কাস্টমার মুছে ফেলা হয়েছে।');
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($exception->getCode() === '23000') {
        respond(409, false, 'লেনদেনে ব্যবহৃত কাস্টমার মুছবেন না।');
    }
    error_log('Customer deletion failed: ' . $exception->getMessage());
    respond(500, false, 'কাস্টমার মুছে ফেলা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}