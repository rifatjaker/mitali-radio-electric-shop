<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'ব্যাংক হিসাব পরিবর্তন করতে POST অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'setup');
if (!setupCanEdit($user)) {
    respond(403, false, 'ব্যাংক হিসাব সম্পাদনার অনুমতি আপনার অ্যাকাউন্টে নেই।');
}
$shopId = authorizedShopId($user);
$body = requestJson();
$accountId = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT);
if ($accountId === false || $accountId === null || $accountId < 1) {
    respond(422, false, 'সঠিক ব্যাংক হিসাব নির্বাচন করুন।');
}
$account = validatedBankAccount($body);

try {
    $statement = database()->prepare(
        'UPDATE bank_accounts SET
            bank_name = :bank_name, account_name = :account_name,
            account_number = :account_number, branch_name = :branch_name,
            routing_number = :routing_number, mobile_number = :mobile_number,
            opening_balance = :opening_balance, note = :note
         WHERE id = :id AND shop_id = :shop_id'
    );
    $statement->execute($account + ['id' => $accountId, 'shop_id' => $shopId]);
    if ($statement->rowCount() === 0) {
        $check = database()->prepare(
            'SELECT id FROM bank_accounts WHERE id = :id AND shop_id = :shop_id'
        );
        $check->execute(['id' => $accountId, 'shop_id' => $shopId]);
        if (!$check->fetch()) {
            respond(404, false, 'ব্যাংক হিসাবটি পাওয়া যায়নি।');
        }
    }
    respond(200, true, 'ব্যাংক হিসাব আপডেট হয়েছে।');
} catch (PDOException $exception) {
    if ($exception->getCode() === '23000') {
        respond(409, false, 'এই ব্যাংকের একই হিসাব নম্বর আগে থেকেই যোগ করা হয়েছে।');
    }
    error_log('Bank account update failed: ' . $exception->getMessage());
    respond(500, false, 'ব্যাংক হিসাব আপডেট করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
