<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

function validatedShopDetails(array $body): array
{
    $shopName = trim((string) ($body['shop_name'] ?? ''));
    $memoHeading = trim((string) ($body['memo_heading'] ?? ''));
    $address = trim((string) ($body['address'] ?? ''));
    $contactNumber = trim((string) ($body['contact_number'] ?? ''));
    $shopNameLength = function_exists('mb_strlen')
        ? mb_strlen($shopName, 'UTF-8')
        : strlen($shopName);
    $memoHeadingLength = function_exists('mb_strlen')
        ? mb_strlen($memoHeading, 'UTF-8')
        : strlen($memoHeading);

    if ($shopName === '' || $shopNameLength > 180) {
        respond(422, false, 'দোকানের নাম লিখুন (সর্বোচ্চ ১৮০ অক্ষর)।');
    }
    if ($memoHeading === '') {
        $memoHeading = $shopName;
        $memoHeadingLength = $shopNameLength;
    }
    if ($memoHeadingLength > 180) {
        respond(422, false, 'মেমো হেডিং ১৮০ অক্ষরের মধ্যে লিখুন।');
    }
    $addressLength = function_exists('mb_strlen')
        ? mb_strlen($address, 'UTF-8')
        : strlen($address);
    $contactNumberLength = function_exists('mb_strlen')
        ? mb_strlen($contactNumber, 'UTF-8')
        : strlen($contactNumber);
    if ($addressLength > 255) {
        respond(422, false, 'দোকানের ঠিকানা ২৫৫ অক্ষরের মধ্যে লিখুন।');
    }
    if ($contactNumberLength > 120 || preg_match('/[\r\n\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', $contactNumber)) {
        respond(422, false, 'যোগাযোগের তথ্য ১২০ অক্ষরের মধ্যে এক লাইনে লিখুন।');
    }

    return [
        'shop_name' => $shopName,
        'memo_heading' => $memoHeading,
        'address' => $address === '' ? null : $address,
        'contact_number' => $contactNumber === '' ? null : $contactNumber,
    ];
}
