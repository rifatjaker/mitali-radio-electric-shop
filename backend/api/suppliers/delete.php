<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/setup/helpers.php';
require_once dirname(__DIR__) . '/delete-audit.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'সাপ্লায়ার মুছতে POST অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'setup');
if (!setupCanDelete($user)) {
    respond(403, false, 'সাপ্লায়ার মুছে ফেলার অনুমতি আপনার অ্যাকাউন্টে নেই।');
}
$shopId = authorizedShopId($user);
$body = requestJson();
$supplierId = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT);
if ($supplierId === false || $supplierId === null || $supplierId < 1) {
    respond(422, false, 'সঠিক সাপ্লায়ার নির্বাচন করুন।');
}
$reason = validatedDeletionReason($body);

try {
    $pdo = database();
    $pdo->beginTransaction();
    $statement = $pdo->prepare(
        'SELECT supplier_name, previous_balance FROM suppliers WHERE id = :id AND shop_id = :shop_id FOR UPDATE'
    );
    $statement->execute(['id' => $supplierId, 'shop_id' => $shopId]);
    $supplier = $statement->fetch();
    if (!$supplier) {
        $pdo->rollBack();
        respond(404, false, 'সাপ্লায়ারটি পাওয়া যায়নি।');
    }
    $hasTransactions = setupReferenceExists(
        $pdo,
        ['purchase_bills', 'supplier_payments'],
        'supplier_id',
        (int) $supplierId,
    ) || setupForeignKeyReferenceExists($pdo, 'suppliers', (int) $supplierId);
    if ($hasTransactions || (float) ($supplier['previous_balance'] ?? 0) !== 0.0) {
        $pdo->rollBack();
        respond(409, false, 'ক্রয়/পেমেন্ট লেনদেন বা বকেয়া থাকা সাপ্লায়ার মুছবেন না।');
    }

    recordDeletionAudit($pdo, $shopId, $user, 'supplier', (int) $supplierId, $supplier['supplier_name'], $reason);
    $delete = $pdo->prepare('DELETE FROM suppliers WHERE id = :id AND shop_id = :shop_id');
    $delete->execute(['id' => $supplierId, 'shop_id' => $shopId]);
    $pdo->commit();
    respond(200, true, 'সাপ্লায়ার মুছে ফেলা হয়েছে।');
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($exception->getCode() === '23000') {
        respond(409, false, 'লেনদেনে ব্যবহৃত সাপ্লায়ার মুছবেন না।');
    }
    error_log('Supplier deletion failed: ' . $exception->getMessage());
    respond(500, false, 'সাপ্লায়ার মুছে ফেলা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}