<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

function validatedWarehouseDetails(array $body): array
{
    $warehouseName = trim((string) ($body['warehouse_name'] ?? ''));
    $address = trim((string) ($body['address'] ?? ''));
    $contactNumber = trim((string) ($body['contact_number'] ?? ''));
    $nameLength = function_exists('mb_strlen')
        ? mb_strlen($warehouseName, 'UTF-8')
        : strlen($warehouseName);
    $addressLength = function_exists('mb_strlen')
        ? mb_strlen($address, 'UTF-8')
        : strlen($address);
    $contactLength = function_exists('mb_strlen')
        ? mb_strlen($contactNumber, 'UTF-8')
        : strlen($contactNumber);

    if ($warehouseName === '' || $nameLength > 180) {
        respond(422, false, 'গুদামের নাম লিখুন (সর্বোচ্চ ১৮০ অক্ষর)।');
    }
    if ($addressLength > 255) {
        respond(422, false, 'গুদামের ঠিকানা ২৫৫ অক্ষরের মধ্যে লিখুন।');
    }
    if ($contactLength > 120 || preg_match('/[\r\n\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', $contactNumber)) {
        respond(422, false, 'যোগাযোগের তথ্য ১২০ অক্ষরের মধ্যে এক লাইনে লিখুন।');
    }

    return [
        'warehouse_name' => $warehouseName,
        'address' => $address === '' ? null : $address,
        'contact_number' => $contactNumber === '' ? null : $contactNumber,
    ];
}
