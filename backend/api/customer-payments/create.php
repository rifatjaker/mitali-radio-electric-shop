<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(__DIR__) . '/sms.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'কাস্টমার পেমেন্ট সংরক্ষণ করতে POST অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'sales');
$shopId = authorizedShopId($user);
$body = requestJson();

$customerId = filter_var($body['customer_id'] ?? null, FILTER_VALIDATE_INT);
if ($customerId === false || $customerId === null || $customerId < 1) {
    respond(422, false, 'কাস্টমার নির্বাচন করুন।');
}
$paymentAmount = trim((string) ($body['payment_amount'] ?? ''));
if (!preg_match('/^\d{1,10}(?:\.\d{1,2})?$/', $paymentAmount) || (float) $paymentAmount <= 0) {
    respond(422, false, 'আদায়ের পরিমাণ শূন্যের বেশি এবং সর্বোচ্চ ২ দশমিক ঘরে লিখুন।');
}
$paymentMethod = (string) ($body['payment_method'] ?? '');
if (!in_array($paymentMethod, ['cash', 'bank'], true)) {
    respond(422, false, 'By Cash অথবা By Bank নির্বাচন করুন।');
}
$bankAccountId = null;
if ($paymentMethod === 'bank') {
    $bankAccountId = filter_var($body['bank_account_id'] ?? null, FILTER_VALIDATE_INT);
    if ($bankAccountId === false || $bankAccountId === null || $bankAccountId < 1) {
        respond(422, false, 'ব্যাংক পেমেন্টের জন্য ব্যাংক হিসাব নির্বাচন করুন।');
    }
}
$note = trim((string) ($body['note'] ?? ''));
if ((function_exists('mb_strlen') ? mb_strlen($note, 'UTF-8') : strlen($note)) > 500
    || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', $note)) {
    respond(422, false, 'নোট ৫০০ অক্ষরের মধ্যে লিখুন।');
}
$note = $note === '' ? null : $note;

try {
    $pdo = database();
    $pdo->beginTransaction();
    $customerQuery = $pdo->prepare(
        'SELECT id, customer_name, mobile_number, COALESCE(current_balance, 0) AS current_due
         FROM customers WHERE id = :customer_id AND shop_id = :shop_id FOR UPDATE'
    );
    $customerQuery->execute(['customer_id' => $customerId, 'shop_id' => $shopId]);
    $customer = $customerQuery->fetch();
    if (!$customer) {
        $pdo->rollBack();
        respond(422, false, 'নির্বাচিত কাস্টমার এই দোকানের নয়।');
    }
    $previousDue = round((float) $customer['current_due'], 2);
    $amount = round((float) $paymentAmount, 2);
    if ($previousDue <= 0) {
        $pdo->rollBack();
        respond(409, false, 'এই কাস্টমারের কোনো বকেয়া নেই।');
    }
    if ($amount > $previousDue + 0.001) {
        $pdo->rollBack();
        respond(422, false, 'আদায়ের পরিমাণ কাস্টমারের বর্তমান বকেয়ার বেশি হতে পারবে না।');
    }
    if ($paymentMethod === 'bank') {
        $bankQuery = $pdo->prepare(
            'SELECT id FROM bank_accounts WHERE id = :id AND shop_id = :shop_id FOR UPDATE'
        );
        $bankQuery->execute(['id' => $bankAccountId, 'shop_id' => $shopId]);
        if (!$bankQuery->fetch()) {
            $pdo->rollBack();
            respond(422, false, 'নির্বাচিত ব্যাংক হিসাব এই দোকানের নয়।');
        }
    }

    $insert = $pdo->prepare(
        'INSERT INTO customer_payments (
            shop_id, customer_id, payment_amount, payment_method, bank_account_id, note, created_by
         ) VALUES (
            :shop_id, :customer_id, :payment_amount, :payment_method, :bank_account_id, :note, :created_by
         )'
    );
    $insert->execute([
        'shop_id' => $shopId,
        'customer_id' => $customerId,
        'payment_amount' => $paymentAmount,
        'payment_method' => $paymentMethod,
        'bank_account_id' => $bankAccountId,
        'note' => $note,
        'created_by' => $user['id'],
    ]);
    $paymentId = (int) $pdo->lastInsertId();
    $currentDue = round($previousDue - $amount, 2);
    $balanceUpdate = $pdo->prepare(
        'UPDATE customers SET current_balance = :current_due
         WHERE id = :customer_id AND shop_id = :shop_id'
    );
    $balanceUpdate->execute([
        'current_due' => $currentDue,
        'customer_id' => $customerId,
        'shop_id' => $shopId,
    ]);
    $shopNameQuery = $pdo->prepare('SELECT shop_name FROM shops WHERE id = :shop_id');
    $shopNameQuery->execute(['shop_id' => $shopId]);
    $shopName = (string) ($shopNameQuery->fetchColumn() ?: 'মিতালী রেডিও ইলেকট্রিক');
    $pdo->commit();
    $smsText = sprintf(
        'প্রিয় %s, আপনার কাছ থেকে ৳%s বাকি আদায় হয়েছে। আগের বাকি ৳%s, বর্তমান বাকি ৳%s। ধন্যবাদ - %s।',
        $customer['customer_name'],
        formatSmsMoney($amount),
        formatSmsMoney($previousDue),
        formatSmsMoney($currentDue),
        $shopName
    );
    $sms = sendCustomerSms($customer['mobile_number'] ?? null, $smsText);

    respond(201, true, 'বাকি আদায় সংরক্ষণ হয়েছে। ' . $sms['message'], [
        'sms' => $sms,
        'payment' => [
            'id' => $paymentId,
            'previous_due' => $previousDue,
            'payment_amount' => $amount,
            'current_due' => $currentDue,
            'payment_method' => $paymentMethod,
            'bank_account_id' => $bankAccountId,
        ],
    ]);
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Customer payment creation failed: ' . $exception->getMessage());
    respond(500, false, 'বাকি আদায় সংরক্ষণ করা যায়নি।');
}
