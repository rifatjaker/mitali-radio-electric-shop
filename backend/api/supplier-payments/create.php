<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'সাপ্লায়ার পেমেন্ট সংরক্ষণ করতে POST অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'purchase');
$shopId = authorizedShopId($user);
$body = requestJson();

$supplierId = filter_var($body['supplier_id'] ?? null, FILTER_VALIDATE_INT);
if ($supplierId === false || $supplierId === null || $supplierId < 1) {
    respond(422, false, 'সাপ্লায়ার নির্বাচন করুন।');
}
$paymentAmount = trim((string) ($body['payment_amount'] ?? ''));
if (!preg_match('/^\d{1,10}(?:\.\d{1,2})?$/', $paymentAmount) || (float) $paymentAmount <= 0) {
    respond(422, false, 'পেমেন্টের পরিমাণ শূন্যের বেশি এবং সর্বোচ্চ ২ দশমিক ঘরে লিখুন।');
}
$paymentMethod = (string) ($body['payment_method'] ?? '');
if (!in_array($paymentMethod, ['cash', 'bank'], true)) {
    respond(422, false, 'নগদ অথবা ব্যাংক পেমেন্ট পদ্ধতি নির্বাচন করুন।');
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

    $supplierQuery = $pdo->prepare(
        'SELECT id,
                COALESCE(previous_balance, 0)
                + COALESCE((
                    SELECT SUM(pb.total_amount)
                    FROM purchase_bills pb
                    WHERE pb.shop_id = s.shop_id AND pb.supplier_id = s.id
                ), 0)
                - COALESCE((
                    SELECT SUM(sri.line_total)
                    FROM supplier_returns sr
                    INNER JOIN supplier_return_items sri ON sri.supplier_return_id = sr.id
                    WHERE sr.shop_id = s.shop_id AND sr.supplier_id = s.id
                ), 0)
                - COALESCE((
                    SELECT SUM(sp.payment_amount)
                    FROM supplier_payments sp
                    WHERE sp.shop_id = s.shop_id AND sp.supplier_id = s.id
                ), 0) AS current_due
         FROM suppliers s
         WHERE s.id = :supplier_id AND s.shop_id = :shop_id
         FOR UPDATE'
    );
    $supplierQuery->execute(['supplier_id' => $supplierId, 'shop_id' => $shopId]);
    $supplier = $supplierQuery->fetch();
    if (!$supplier) {
        $pdo->rollBack();
        respond(422, false, 'নির্বাচিত সাপ্লায়ার এই দোকানের নয়।');
    }

    $previousDue = round((float) $supplier['current_due'], 2);
    $amount = round((float) $paymentAmount, 2);
    if ($previousDue <= 0) {
        $pdo->rollBack();
        respond(409, false, 'এই সাপ্লায়ারের কোনো পরিশোধযোগ্য বকেয়া নেই।');
    }
    if ($amount > $previousDue + 0.001) {
        $pdo->rollBack();
        respond(422, false, 'পেমেন্টের পরিমাণ সাপ্লায়ারের বর্তমান বকেয়ার বেশি হতে পারবে না।');
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
        'INSERT INTO supplier_payments (
            shop_id, supplier_id, payment_amount, payment_method,
            bank_account_id, note, created_by
         ) VALUES (
            :shop_id, :supplier_id, :payment_amount, :payment_method,
            :bank_account_id, :note, :created_by
         )'
    );
    $insert->execute([
        'shop_id' => $shopId,
        'supplier_id' => $supplierId,
        'payment_amount' => $paymentAmount,
        'payment_method' => $paymentMethod,
        'bank_account_id' => $bankAccountId,
        'note' => $note,
        'created_by' => $user['id'],
    ]);
    $paymentId = (int) $pdo->lastInsertId();
    $currentDue = round($previousDue - $amount, 2);
    $pdo->commit();

    respond(201, true, 'সাপ্লায়ার পেমেন্ট সংরক্ষণ হয়েছে।', [
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
    error_log('Supplier payment creation failed: ' . $exception->getMessage());
    respond(500, false, 'সাপ্লায়ার পেমেন্ট সংরক্ষণ করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
