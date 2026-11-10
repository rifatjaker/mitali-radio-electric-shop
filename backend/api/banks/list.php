<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'ব্যাংক হিসাবের তালিকা দেখতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
if (!userHasPermission($user, 'setup') && !userHasPermission($user, 'purchase')) {
    respond(403, false, 'ব্যাংক হিসাবের তালিকা দেখার অনুমতি আপনার অ্যাকাউন্টে নেই।');
}
$shopId = authorizedShopId($user);

try {
    $pdo = database();
    $statement = $pdo->prepare(
        'SELECT ba.id, ba.bank_name, ba.account_name, ba.account_number, ba.branch_name,
                ba.routing_number, ba.mobile_number, ba.opening_balance, ba.note,
                EXISTS (
                    SELECT 1 FROM supplier_payments sp
                    WHERE sp.bank_account_id = ba.id AND sp.shop_id = ba.shop_id
                ) AS has_transactions
         FROM bank_accounts ba WHERE ba.shop_id = :shop_id
         ORDER BY ba.bank_name, ba.account_name, ba.id'
    );
    $statement->execute(['shop_id' => $shopId]);
    $accounts = $statement->fetchAll();
    foreach ($accounts as &$account) {
        $account['id'] = (int) $account['id'];
        $account['opening_balance'] = (float) $account['opening_balance'];
        $account['has_transactions'] = (bool) $account['has_transactions'];
        $account['can_delete'] = !$account['has_transactions']
            && abs($account['opening_balance']) < 0.005;
    }
    unset($account);

    respond(200, true, 'ব্যাংক হিসাবের তালিকা পাওয়া গেছে।', ['accounts' => $accounts]);
} catch (PDOException $exception) {
    error_log('Bank account listing failed: ' . $exception->getMessage());
    respond(500, false, 'ব্যাংক হিসাবের তালিকা লোড করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
