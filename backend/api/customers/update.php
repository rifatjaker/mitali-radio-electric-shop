<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/setup/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'কাস্টমারের তথ্য পরিবর্তন করতে POST অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'setup');
if (!setupCanEdit($user)) {
    respond(403, false, 'কাস্টমার সম্পাদনার অনুমতি আপনার অ্যাকাউন্টে নেই।');
}
$shopId = authorizedShopId($user);
$body = requestJson();
$customerId = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT);
if ($customerId === false || $customerId === null || $customerId < 1) {
    respond(422, false, 'সঠিক কাস্টমার নির্বাচন করুন।');
}
$customerName = trim((string) ($body['customer_name'] ?? ''));
if ($customerName === '') {
    respond(422, false, 'কাস্টমারের নাম লিখুন।');
}
if ((function_exists('mb_strlen') ? mb_strlen($customerName, 'UTF-8') : strlen($customerName)) > 180) {
    respond(422, false, 'কাস্টমারের নাম ১৮০ অক্ষরের মধ্যে লিখুন।');
}

function customerUpdateText(array $body, string $key, string $label, int $maxLength): ?string
{
    $value = trim((string) ($body[$key] ?? ''));
    if ($value === '') {
        return null;
    }
    $length = function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
    if ($length > $maxLength) {
        respond(422, false, "{$label} {$maxLength} অক্ষরের মধ্যে লিখুন।");
    }
    return $value;
}

function customerUpdateAmount(array $body, string $key, string $label, bool $negativeAllowed): ?string
{
    $value = trim((string) ($body[$key] ?? ''));
    if ($value === '') {
        return null;
    }
    $sign = $negativeAllowed ? '-?' : '';
    if (!preg_match('/^' . $sign . '\d{1,10}(?:\.\d{1,2})?$/', $value)) {
        respond(422, false, "{$label} সঠিক টাকার অঙ্কে লিখুন।");
    }
    return $value;
}

$mobileNumber = customerUpdateText($body, 'mobile_number', 'মোবাইল নম্বর', 20);
if ($mobileNumber !== null) {
    if (!preg_match('/^[0-9০-৯+().\-\s]+$/u', $mobileNumber)) {
        respond(422, false, 'মোবাইল নম্বরে শুধু সংখ্যা, +, বন্ধনী, হাইফেন ও ফাঁকা স্থান ব্যবহার করুন।');
    }
    preg_match_all('/[0-9০-৯]/u', $mobileNumber, $digits);
    if (count($digits[0]) < 7 || count($digits[0]) > 15) {
        respond(422, false, 'মোবাইল নম্বরে ৭ থেকে ১৫টি সংখ্যা লিখুন।');
    }
}
$address = customerUpdateText($body, 'address', 'ঠিকানা', 255);
$area = customerUpdateText($body, 'area', 'এলাকা', 120);
$openingBalance = customerUpdateAmount($body, 'opening_balance', 'পূর্বের বাকি', true);
$creditLimit = customerUpdateAmount($body, 'credit_limit', 'বাকি সীমা', false);
$customerLevel = trim((string) ($body['customer_level'] ?? 'সাধারণ'));
if (!in_array($customerLevel, ['সাধারণ', 'নিয়মিত', 'প্রিমিয়াম', 'বিশেষ'], true)) {
    respond(422, false, 'কাস্টমার লেভেলের তালিকা থেকে একটি বিকল্প নির্বাচন করুন।');
}

try {
    $pdo = database();
    $statement = $pdo->prepare(
        'UPDATE customers SET customer_name = :customer_name, mobile_number = :mobile_number,
         address = :address, area = :area,
         current_balance = COALESCE(current_balance, 0)
             + COALESCE(:opening_balance_for_current, 0) - COALESCE(opening_balance, 0),
         opening_balance = :opening_balance,
         credit_limit = :credit_limit, customer_level = :customer_level
         WHERE id = :id AND shop_id = :shop_id'
    );
    $statement->execute([
        'customer_name' => $customerName,
        'mobile_number' => $mobileNumber,
        'address' => $address,
        'area' => $area,
        'opening_balance_for_current' => $openingBalance,
        'opening_balance' => $openingBalance,
        'credit_limit' => $creditLimit,
        'customer_level' => $customerLevel,
        'id' => $customerId,
        'shop_id' => $shopId,
    ]);
    if ($statement->rowCount() === 0) {
        $check = $pdo->prepare('SELECT id FROM customers WHERE id = :id AND shop_id = :shop_id');
        $check->execute(['id' => $customerId, 'shop_id' => $shopId]);
        if (!$check->fetch()) {
            respond(404, false, 'কাস্টমারটি পাওয়া যায়নি।');
        }
    }
    respond(200, true, 'কাস্টমারের তথ্য আপডেট হয়েছে।');
} catch (PDOException $exception) {
    error_log('Customer update failed: ' . $exception->getMessage());
    respond(500, false, 'কাস্টমারের তথ্য আপডেট করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}