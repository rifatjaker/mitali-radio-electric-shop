<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'কাস্টমার আদায়ের রসিদ দেখতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
if (!userHasPermission($user, 'sales') && !userHasPermission($user, 'overview') && !userHasPermission($user, 'reports')) {
    respond(403, false, 'কাস্টমার আদায়ের রসিদ দেখার অনুমতি আপনার অ্যাকাউন্টে নেই।');
}
$shopId = authorizedShopId($user);
$paymentId = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
if ($paymentId === false || $paymentId === null || $paymentId < 1) {
    respond(422, false, 'সঠিক কাস্টমার আদায় নির্বাচন করুন।');
}

try {
    $statement = database()->prepare(
        'SELECT cp.id, cp.payment_amount, cp.payment_method, cp.note,
                DATE(cp.created_at) AS payment_date,
                DATE_FORMAT(cp.created_at, \'%H:%i\') AS payment_time,
                c.customer_name, c.mobile_number AS customer_mobile_number, c.address AS customer_address,
                ba.bank_name, ba.account_name, ba.account_number, ba.branch_name,
                u.display_name AS operator_name
         FROM customer_payments cp
         INNER JOIN customers c ON c.id = cp.customer_id
         LEFT JOIN bank_accounts ba ON ba.id = cp.bank_account_id
         INNER JOIN users u ON u.id = cp.created_by
         WHERE cp.id = :id AND cp.shop_id = :shop_id
         LIMIT 1'
    );
    $statement->execute(['id' => $paymentId, 'shop_id' => $shopId]);
    $payment = $statement->fetch();
    if (!$payment) {
        respond(404, false, 'কাস্টমার আদায়ের রসিদ পাওয়া যায়নি।');
    }
    $payment['id'] = (int) $payment['id'];
    $payment['payment_amount'] = (float) $payment['payment_amount'];
    respond(200, true, 'কাস্টমার আদায়ের রসিদ পাওয়া গেছে।', ['payment' => $payment]);
} catch (PDOException $exception) {
    error_log('Customer payment receipt lookup failed for user ' . $user['id'] . ': ' . $exception->getMessage());
    respond(500, false, 'কাস্টমার আদায়ের রসিদ লোড করা যায়নি।');
}
