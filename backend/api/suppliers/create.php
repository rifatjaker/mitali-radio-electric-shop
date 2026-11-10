<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'সাপ্লায়ার সংরক্ষণ করতে POST অনুরোধ পাঠান।');
}

$currentUser = authenticatedUser();
requirePermission($currentUser, 'setup');
$shopId = authorizedShopId($currentUser);
$body = requestJson();

function supplierOptionalText(array $body, string $key, string $label, int $maxLength): ?string
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

function supplierMobile(array $body, string $key, string $label): ?string
{
    $mobile = supplierOptionalText($body, $key, $label, 20);
    if ($mobile === null) {
        return null;
    }
    if (!preg_match('/^[0-9০-৯+().\-\s]+$/u', $mobile)) {
        respond(422, false, "{$label}-এ শুধু সংখ্যা, +, বন্ধনী, হাইফেন ও ফাঁকা স্থান ব্যবহার করুন।");
    }
    preg_match_all('/[0-9০-৯]/u', $mobile, $digits);
    if (count($digits[0]) < 7 || count($digits[0]) > 15) {
        respond(422, false, "{$label}-এ ৭ থেকে ১৫টি সংখ্যা লিখুন।");
    }
    return $mobile;
}

$supplierName = trim((string) ($body['supplier_name'] ?? ''));
if ($supplierName === '') {
    respond(422, false, 'সাপ্লায়ারের নাম লিখুন।');
}
$supplierNameLength = function_exists('mb_strlen')
    ? mb_strlen($supplierName, 'UTF-8')
    : strlen($supplierName);
if ($supplierNameLength > 180) {
    respond(422, false, 'সাপ্লায়ারের নাম ১৮০ অক্ষরের মধ্যে লিখুন।');
}

$mobileNumber = supplierMobile($body, 'mobile_number', 'মোবাইল নম্বর');
$address = supplierOptionalText($body, 'address', 'ঠিকানা', 255);
$contactPerson = supplierOptionalText($body, 'contact_person', 'যোগাযোগ ব্যক্তির নাম', 120);
$contactMobile = supplierMobile($body, 'contact_mobile', 'যোগাযোগ ব্যক্তির মোবাইল নম্বর');
$bankDetails = trim((string) ($body['bank_details'] ?? ''));
$bankDetailsLength = function_exists('mb_strlen')
    ? mb_strlen($bankDetails, 'UTF-8')
    : strlen($bankDetails);
if ($bankDetailsLength > 4000 || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', $bankDetails)) {
    respond(422, false, 'ব্যাংক তথ্য ৪০০০ অক্ষরের মধ্যে লিখুন।');
}
$bankDetails = $bankDetails === '' ? null : $bankDetails;
$previousBalanceInput = trim((string) ($body['previous_balance'] ?? ''));
$previousBalance = null;
if ($previousBalanceInput !== '') {
    if (!preg_match('/^-?\d{1,10}(?:\.\d{1,2})?$/', $previousBalanceInput)) {
        respond(422, false, 'পূর্বের ব্যালেন্স সঠিক টাকার অঙ্কে লিখুন।');
    }
    $previousBalance = $previousBalanceInput;
}

try {
    $pdo = database();
    $statement = $pdo->prepare(
        'INSERT INTO suppliers (
            shop_id, supplier_name, mobile_number, address, previous_balance,
            contact_person, contact_mobile, bank_details, created_by
        ) VALUES (
            :shop_id, :supplier_name, :mobile_number, :address, :previous_balance,
            :contact_person, :contact_mobile, :bank_details, :created_by
        )'
    );
    $statement->execute([
        'shop_id' => $shopId,
        'supplier_name' => $supplierName,
        'mobile_number' => $mobileNumber,
        'address' => $address,
        'previous_balance' => $previousBalance,
        'contact_person' => $contactPerson,
        'contact_mobile' => $contactMobile,
        'bank_details' => $bankDetails,
        'created_by' => $currentUser['id'],
    ]);

    respond(201, true, 'সাপ্লায়ার সফলভাবে সংরক্ষণ হয়েছে।', [
        'supplier' => [
            'id' => (int) $pdo->lastInsertId(),
            'supplier_name' => $supplierName,
            'mobile_number' => $mobileNumber,
        ],
    ]);
} catch (PDOException $exception) {
    error_log('Supplier creation failed: ' . $exception->getMessage());
    respond(500, false, 'সাপ্লায়ার সংরক্ষণ করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
