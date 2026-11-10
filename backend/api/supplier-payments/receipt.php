<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'সাপ্লায়ার পেমেন্ট মেমো দেখতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
if (!userHasPermission($user, 'overview') && !userHasPermission($user, 'reports')) {
    respond(403, false, 'সাপ্লায়ার পেমেন্ট মেমো দেখার অনুমতি আপনার অ্যাকাউন্টে নেই।');
}
$shopId = authorizedShopId($user);
$paymentId = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
if ($paymentId === false || $paymentId === null || $paymentId < 1) {
    respond(422, false, 'সঠিক সাপ্লায়ার পেমেন্ট নির্বাচন করুন।');
}

try {
    $statement = database()->prepare(
        'SELECT sp.id, sp.payment_amount, sp.payment_method, sp.note,
                DATE(sp.created_at) AS payment_date,
                DATE_FORMAT(sp.created_at, \'%H:%i\') AS payment_time,
                su.supplier_name, su.mobile_number AS supplier_mobile_number,
                su.address AS supplier_address,
                ba.bank_name, ba.account_name, ba.account_number, ba.branch_name,
                u.display_name AS operator_name
         FROM supplier_payments sp
         INNER JOIN suppliers su ON su.id = sp.supplier_id
         LEFT JOIN bank_accounts ba ON ba.id = sp.bank_account_id
         INNER JOIN users u ON u.id = sp.created_by
         WHERE sp.id = :id AND sp.shop_id = :shop_id
         LIMIT 1'
    );
    $statement->execute(['id' => $paymentId, 'shop_id' => $shopId]);
    $payment = $statement->fetch();
    if (!$payment) {
        respond(404, false, 'নির্বাচিত সাপ্লায়ার পেমেন্ট পাওয়া যায়নি।');
    }
    $payment['id'] = (int) $payment['id'];
    $payment['payment_amount'] = (float) $payment['payment_amount'];

    respond(200, true, 'সাপ্লায়ার পেমেন্ট মেমো পাওয়া গেছে।', ['payment' => $payment]);
} catch (PDOException $exception) {
    error_log('Supplier payment receipt lookup failed for user ' . $user['id'] . ': ' . $exception->getMessage());
    respond(500, false, 'সাপ্লায়ার পেমেন্ট মেমো লোড করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
