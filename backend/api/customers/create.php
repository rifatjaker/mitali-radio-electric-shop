<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'কাস্টমার সংরক্ষণ করতে POST অনুরোধ পাঠান।');
}

$currentUser = authenticatedUser();
requirePermission($currentUser, 'setup');
$shopId = authorizedShopId($currentUser);

$body = requestJson();
$customerName = trim((string) ($body['customer_name'] ?? ''));
if ($customerName === '') {
    respond(422, false, 'কাস্টমারের নাম লিখুন।');
}
$nameLength = function_exists('mb_strlen')
    ? mb_strlen($customerName, 'UTF-8')
    : strlen($customerName);
if ($nameLength > 180) {
    respond(422, false, 'কাস্টমারের নাম ১৮০ অক্ষরের মধ্যে লিখুন।');
}

function customerOptionalText(array $body, string $key, string $label, int $maxLength): ?string
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

function customerOptionalAmount(
    array $body,
    string $key,
    string $label,
    bool $allowNegative = false
): ?string {
    $value = trim((string) ($body[$key] ?? ''));
    if ($value === '') {
        return null;
    }

    $sign = $allowNegative ? '-?' : '';
    if (!preg_match('/^' . $sign . '\d{1,10}(?:\.\d{1,2})?$/', $value)) {
        respond(422, false, "{$label} সঠিক টাকার অঙ্কে লিখুন।");
    }
    return $value;
}

$mobileNumber = customerOptionalText($body, 'mobile_number', 'মোবাইল নম্বর', 20);
if ($mobileNumber !== null) {
    if (!preg_match('/^[0-9০-৯+().\-\s]+$/u', $mobileNumber)) {
        respond(422, false, 'মোবাইল নম্বরে শুধু সংখ্যা, +, বন্ধনী, হাইফেন ও ফাঁকা স্থান ব্যবহার করুন।');
    }
    preg_match_all('/[0-9০-৯]/u', $mobileNumber, $digits);
    if (count($digits[0]) < 7 || count($digits[0]) > 15) {
        respond(422, false, 'মোবাইল নম্বরে ৭ থেকে ১৫টি সংখ্যা লিখুন।');
    }
}

$address = customerOptionalText($body, 'address', 'ঠিকানা', 255);
$area = customerOptionalText($body, 'area', 'এলাকা', 120);
$openingBalance = customerOptionalAmount($body, 'opening_balance', 'পূর্বের বাকি', true);
$creditLimit = customerOptionalAmount($body, 'credit_limit', 'বাকি সীমা');
$customerLevel = trim((string) ($body['customer_level'] ?? 'সাধারণ'));
$customerLevels = ['সাধারণ', 'নিয়মিত', 'প্রিমিয়াম', 'বিশেষ'];
if (!in_array($customerLevel, $customerLevels, true)) {
    respond(422, false, 'কাস্টমার লেভেলের তালিকা থেকে একটি বিকল্প নির্বাচন করুন।');
}

try {
    $pdo = database();
    $statement = $pdo->prepare(
        'INSERT INTO customers (
            shop_id, customer_name, mobile_number, address, area,
            opening_balance, current_balance, credit_limit, customer_level, created_by
        ) VALUES (
            :shop_id, :customer_name, :mobile_number, :address, :area,
            :opening_balance, :current_balance, :credit_limit, :customer_level, :created_by
        )'
    );
    $statement->execute([
        'shop_id' => $shopId,
        'customer_name' => $customerName,
        'mobile_number' => $mobileNumber,
        'address' => $address,
        'area' => $area,
        'opening_balance' => $openingBalance,
        'current_balance' => $openingBalance,
        'credit_limit' => $creditLimit,
        'customer_level' => $customerLevel,
        'created_by' => $currentUser['id'],
    ]);

    respond(201, true, 'কাস্টমার সফলভাবে সংরক্ষণ হয়েছে।', [
        'customer' => [
            'id' => (int) $pdo->lastInsertId(),
            'customer_name' => $customerName,
            'mobile_number' => $mobileNumber,
            'customer_level' => $customerLevel,
        ],
    ]);
} catch (PDOException $exception) {
    error_log('Customer creation failed: ' . $exception->getMessage());
    respond(500, false, 'কাস্টমার সংরক্ষণ করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
