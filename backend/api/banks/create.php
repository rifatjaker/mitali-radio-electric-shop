<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'ব্যাংক হিসাব সংরক্ষণ করতে POST অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'setup');
$shopId = authorizedShopId($user);
$account = validatedBankAccount(requestJson());

try {
    $pdo = database();
    $statement = $pdo->prepare(
        'INSERT INTO bank_accounts (
            shop_id, bank_name, account_name, account_number, branch_name,
            routing_number, mobile_number, opening_balance, note, created_by
         ) VALUES (
            :shop_id, :bank_name, :account_name, :account_number, :branch_name,
            :routing_number, :mobile_number, :opening_balance, :note, :created_by
         )'
    );
    $statement->execute($account + [
        'shop_id' => $shopId,
        'created_by' => $user['id'],
    ]);

    respond(201, true, 'ব্যাংক হিসাব সংরক্ষণ হয়েছে।', [
        'account' => ['id' => (int) $pdo->lastInsertId()] + $account,
    ]);
} catch (PDOException $exception) {
    if ($exception->getCode() === '23000') {
        respond(409, false, 'এই ব্যাংকের একই হিসাব নম্বর আগে থেকেই যোগ করা হয়েছে।');
    }
    error_log('Bank account creation failed: ' . $exception->getMessage());
    respond(500, false, 'ব্যাংক হিসাব সংরক্ষণ করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
