<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/setup/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'সাপ্লায়ারের তথ্য পরিবর্তন করতে POST অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'setup');
if (!setupCanEdit($user)) {
    respond(403, false, 'সাপ্লায়ার সম্পাদনার অনুমতি আপনার অ্যাকাউন্টে নেই।');
}
$shopId = authorizedShopId($user);
$body = requestJson();
$supplierId = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT);
if ($supplierId === false || $supplierId === null || $supplierId < 1) {
    respond(422, false, 'সঠিক সাপ্লায়ার নির্বাচন করুন।');
}
$supplierName = trim((string) ($body['supplier_name'] ?? ''));
if ($supplierName === '') {
    respond(422, false, 'সাপ্লায়ারের নাম লিখুন।');
}
if ((function_exists('mb_strlen') ? mb_strlen($supplierName, 'UTF-8') : strlen($supplierName)) > 180) {
    respond(422, false, 'সাপ্লায়ারের নাম ১৮০ অক্ষরের মধ্যে লিখুন।');
}

function supplierUpdateText(array $body, string $key, string $label, int $maxLength): ?string
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

function supplierUpdateMobile(array $body, string $key, string $label): ?string
{
    $mobile = supplierUpdateText($body, $key, $label, 20);
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

$mobileNumber = supplierUpdateMobile($body, 'mobile_number', 'মোবাইল নম্বর');
$address = supplierUpdateText($body, 'address', 'ঠিকানা', 255);
$contactPerson = supplierUpdateText($body, 'contact_person', 'যোগাযোগ ব্যক্তির নাম', 120);
$contactMobile = supplierUpdateMobile($body, 'contact_mobile', 'যোগাযোগ ব্যক্তির মোবাইল নম্বর');
$bankDetails = trim((string) ($body['bank_details'] ?? ''));
$bankDetailsLength = function_exists('mb_strlen')
    ? mb_strlen($bankDetails, 'UTF-8')
    : strlen($bankDetails);
if ($bankDetailsLength > 4000 || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', $bankDetails)) {
    respond(422, false, 'ব্যাংক তথ্য ৪০০০ অক্ষরের মধ্যে লিখুন।');
}
$bankDetails = $bankDetails === '' ? null : $bankDetails;
$previousBalance = trim((string) ($body['previous_balance'] ?? ''));
if ($previousBalance !== '' && !preg_match('/^-?\d{1,10}(?:\.\d{1,2})?$/', $previousBalance)) {
    respond(422, false, 'পূর্বের ব্যালেন্স সঠিক টাকার অঙ্কে লিখুন।');
}
$previousBalance = $previousBalance === '' ? null : $previousBalance;

try {
    $statement = database()->prepare(
        'UPDATE suppliers SET supplier_name = :supplier_name, mobile_number = :mobile_number,
         address = :address, previous_balance = :previous_balance,
         contact_person = :contact_person, contact_mobile = :contact_mobile,
         bank_details = :bank_details
         WHERE id = :id AND shop_id = :shop_id'
    );
    $statement->execute([
        'supplier_name' => $supplierName,
        'mobile_number' => $mobileNumber,
        'address' => $address,
        'previous_balance' => $previousBalance,
        'contact_person' => $contactPerson,
        'contact_mobile' => $contactMobile,
        'bank_details' => $bankDetails,
        'id' => $supplierId,
        'shop_id' => $shopId,
    ]);
    if ($statement->rowCount() === 0) {
        $check = database()->prepare('SELECT id FROM suppliers WHERE id = :id AND shop_id = :shop_id');
        $check->execute(['id' => $supplierId, 'shop_id' => $shopId]);
        if (!$check->fetch()) {
            respond(404, false, 'সাপ্লায়ারটি পাওয়া যায়নি।');
        }
    }
    respond(200, true, 'সাপ্লায়ারের তথ্য আপডেট হয়েছে।');
} catch (PDOException $exception) {
    error_log('Supplier update failed: ' . $exception->getMessage());
    respond(500, false, 'সাপ্লায়ারের তথ্য আপডেট করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}