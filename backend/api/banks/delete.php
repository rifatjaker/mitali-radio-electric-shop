<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';
require_once dirname(__DIR__) . '/delete-audit.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'ব্যাংক হিসাব মুছতে POST অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'setup');
if (!setupCanDelete($user)) {
    respond(403, false, 'ব্যাংক হিসাব মুছে ফেলার অনুমতি আপনার অ্যাকাউন্টে নেই।');
}
$shopId = authorizedShopId($user);
$body = requestJson();
$accountId = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT);
if ($accountId === false || $accountId === null || $accountId < 1) {
    respond(422, false, 'সঠিক ব্যাংক হিসাব নির্বাচন করুন।');
}
$reason = validatedDeletionReason($body);

try {
    $pdo = database();
    $pdo->beginTransaction();
    $lookup = $pdo->prepare(
        'SELECT bank_name, account_name, opening_balance FROM bank_accounts
         WHERE id = :id AND shop_id = :shop_id FOR UPDATE'
    );
    $lookup->execute(['id' => $accountId, 'shop_id' => $shopId]);
    $account = $lookup->fetch();
    if (!$account) {
        $pdo->rollBack();
        respond(404, false, 'ব্যাংক হিসাবটি পাওয়া যায়নি।');
    }
    if (abs((float) $account['opening_balance']) >= 0.005) {
        $pdo->rollBack();
        respond(409, false, 'প্রারম্ভিক ব্যালেন্স থাকা ব্যাংক হিসাব মুছে ফেলা যাবে না।');
    }
    $paymentCheck = $pdo->prepare(
        'SELECT 1 FROM supplier_payments
         WHERE bank_account_id = :supplier_bank_account_id AND shop_id = :supplier_shop_id
         UNION ALL
         SELECT 1 FROM customer_payments
         WHERE bank_account_id = :customer_bank_account_id AND shop_id = :customer_shop_id
         LIMIT 1'
    );
    $paymentCheck->execute([
        'supplier_bank_account_id' => $accountId,
        'supplier_shop_id' => $shopId,
        'customer_bank_account_id' => $accountId,
        'customer_shop_id' => $shopId,
    ]);
    if ($paymentCheck->fetchColumn()) {
        $pdo->rollBack();
        respond(409, false, 'পেমেন্টে ব্যবহৃত ব্যাংক হিসাব মুছে ফেলা যাবে না।');
    }

    recordDeletionAudit(
        $pdo,
        $shopId,
        $user,
        'bank_account',
        (int) $accountId,
        $account['bank_name'] . ' · ' . $account['account_name'],
        $reason
    );
    $delete = $pdo->prepare(
        'DELETE FROM bank_accounts WHERE id = :id AND shop_id = :shop_id'
    );
    $delete->execute(['id' => $accountId, 'shop_id' => $shopId]);
    $pdo->commit();
    respond(200, true, 'ব্যাংক হিসাব মুছে ফেলা হয়েছে।');
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($exception->getCode() === '23000') {
        respond(409, false, 'লেনদেনে ব্যবহৃত ব্যাংক হিসাব মুছবেন না।');
    }
    error_log('Bank account deletion failed: ' . $exception->getMessage());
    respond(500, false, 'ব্যাংক হিসাব মুছে ফেলা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
