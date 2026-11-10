<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/setup/helpers.php';

function validatedBankAccount(array $body): array
{
    $bankName = trim((string) ($body['bank_name'] ?? ''));
    $accountName = trim((string) ($body['account_name'] ?? ''));
    if ($bankName === '' || bankTextLength($bankName) > 180) {
        respond(422, false, 'ব্যাংকের নাম লিখুন (সর্বোচ্চ ১৮০ অক্ষর)।');
    }
    if ($accountName === '' || bankTextLength($accountName) > 180) {
        respond(422, false, 'হিসাবের নাম লিখুন (সর্বোচ্চ ১৮০ অক্ষর)।');
    }

    $accountNumber = bankOptionalText($body, 'account_number', 'হিসাব নম্বর', 100);
    $branchName = bankOptionalText($body, 'branch_name', 'শাখার নাম', 120);
    $routingNumber = bankOptionalText($body, 'routing_number', 'রাউটিং নম্বর', 30);
    $mobileNumber = bankOptionalText($body, 'mobile_number', 'মোবাইল নম্বর', 20);
    $note = bankOptionalText($body, 'note', 'নোট', 255);
    if ($mobileNumber !== null && !preg_match('/^[0-9০-৯+().\-\s]+$/u', $mobileNumber)) {
        respond(422, false, 'মোবাইল নম্বরে সঠিক সংখ্যা লিখুন।');
    }

    $openingBalance = trim((string) ($body['opening_balance'] ?? '0'));
    if (!preg_match('/^\d{1,10}(?:\.\d{1,2})?$/', $openingBalance)) {
        respond(422, false, 'প্রারম্ভিক ব্যালেন্স সঠিক টাকার অঙ্কে লিখুন।');
    }

    return [
        'bank_name' => $bankName,
        'account_name' => $accountName,
        'account_number' => $accountNumber,
        'branch_name' => $branchName,
        'routing_number' => $routingNumber,
        'mobile_number' => $mobileNumber,
        'opening_balance' => $openingBalance,
        'note' => $note,
    ];
}

function bankOptionalText(array $body, string $key, string $label, int $maxLength): ?string
{
    $value = trim((string) ($body[$key] ?? ''));
    if ($value === '') {
        return null;
    }
    if (bankTextLength($value) > $maxLength) {
        respond(422, false, "{$label} {$maxLength} অক্ষরের মধ্যে লিখুন।");
    }
    if (preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', $value)) {
        respond(422, false, "{$label}-এ অনুপযুক্ত অক্ষর রয়েছে।");
    }
    return $value;
}

function bankTextLength(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}
