<?php
declare(strict_types=1);

function sendCustomerSms(?string $mobileNumber, string $message): array
{
    $mobile = normalizeSmsMobile($mobileNumber ?? '');
    if ($mobile === '') {
        return ['sent' => false, 'message' => 'কাস্টমারের বৈধ মোবাইল নম্বর নেই।'];
    }

    $apiKey = trim((string) (getenv('SMS_API_KEY') ?: ''));
    if ($apiKey === '') {
        return ['sent' => false, 'message' => 'SMS_API_KEY সার্ভার কনফিগারেশনে সেট করা নেই।'];
    }
    if (!function_exists('curl_init')) {
        return ['sent' => false, 'message' => 'SMS পাঠাতে সার্ভারে PHP cURL চালু থাকতে হবে।'];
    }

    $url = 'https://portal.jadusms.com/smsapi/v2/non-masking?' . http_build_query([
        'api_key' => $apiKey,
        'mobileNo' => $mobile,
        'smsContent' => $message,
    ], '', '&', PHP_QUERY_RFC3986);
    $curl = curl_init($url);
    if ($curl === false) {
        return ['sent' => false, 'message' => 'SMS gateway সংযোগ শুরু করা যায়নি।'];
    }
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    $response = curl_exec($curl);
    $httpStatus = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);

    if ($response === false) {
        error_log('Customer SMS gateway request failed.');
        return ['sent' => false, 'message' => 'SMS gateway-তে সংযোগ করা যায়নি।'];
    }
    if ($httpStatus < 200 || $httpStatus >= 300) {
        error_log('Customer SMS gateway returned HTTP ' . $httpStatus . '.');
        return ['sent' => false, 'message' => "SMS gateway HTTP {$httpStatus} ত্রুটি দিয়েছে।"];
    }

    return ['sent' => true, 'message' => 'কাস্টমারের নম্বরে SMS পাঠানো হয়েছে।'];
}

function fetchSmsBalance(): array
{
    $apiKey = trim((string) (getenv('SMS_API_KEY') ?: ''));
    if ($apiKey === '') {
        return ['available' => false, 'balance' => null, 'message' => 'SMS API key সেট করা নেই'];
    }
    if (!function_exists('curl_init')) {
        return ['available' => false, 'balance' => null, 'message' => 'সার্ভারে PHP cURL চালু নেই'];
    }

    $url = 'https://portal.jadusms.com/api/v2/balance?' . http_build_query([
        'api_key' => $apiKey,
    ], '', '&', PHP_QUERY_RFC3986);
    $curl = curl_init($url);
    if ($curl === false) {
        return ['available' => false, 'balance' => null, 'message' => 'SMS gateway সংযোগ শুরু করা যায়নি'];
    }
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    $response = curl_exec($curl);
    $httpStatus = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);
    if ($response === false) {
        error_log('SMS balance gateway request failed.');
        return ['available' => false, 'balance' => null, 'message' => 'SMS gateway-তে সংযোগ করা যায়নি'];
    }
    if ($httpStatus < 200 || $httpStatus >= 300) {
        error_log('SMS balance gateway returned HTTP ' . $httpStatus . '.');
        return ['available' => false, 'balance' => null, 'message' => 'SMS gateway থেকে ব্যালেন্স পাওয়া যায়নি'];
    }

    $decoded = json_decode($response, true);
    $balance = is_array($decoded) ? findSmsBalance($decoded) : null;
    if ($balance === null) {
        $plainText = trim(strip_tags($response));
        if (preg_match('/^\d+(?:\.\d+)?$/', $plainText)) {
            $balance = (float) $plainText;
        } elseif (preg_match('/(?:balance|credit|sms)[^0-9]{0,40}(\d+(?:\.\d+)?)/i', $plainText, $matches)) {
            $balance = (float) $matches[1];
        }
    }
    if ($balance === null) {
        error_log('SMS balance response did not contain a recognized balance field.');
        return ['available' => false, 'balance' => null, 'message' => 'SMS gateway-এর ব্যালেন্স ফরম্যাট বোঝা যায়নি'];
    }

    return ['available' => true, 'balance' => $balance, 'message' => 'SMS ব্যালেন্স হালনাগাদ'];
}

function findSmsBalance(array $payload): ?float
{
    foreach ($payload as $key => $value) {
        if (in_array(strtolower((string) $key), ['balance', 'sms_balance', 'available_balance', 'remaining_balance'], true)
            && (is_numeric($value) || (is_string($value) && preg_match('/^\d+(?:\.\d+)?$/', trim($value))))) {
            return (float) $value;
        }
    }
    foreach ($payload as $value) {
        if (is_array($value)) {
            $balance = findSmsBalance($value);
            if ($balance !== null) {
                return $balance;
            }
        }
    }
    return null;
}

function normalizeSmsMobile(string $mobileNumber): string
{
    $digits = strtr($mobileNumber, [
        '০' => '0', '১' => '1', '২' => '2', '৩' => '3', '৪' => '4',
        '৫' => '5', '৬' => '6', '৭' => '7', '৮' => '8', '৯' => '9',
    ]);
    $digits = preg_replace('/\D+/', '', $digits) ?? '';
    if (str_starts_with($digits, '00880')) {
        $digits = substr($digits, 2);
    } elseif (str_starts_with($digits, '0')) {
        $digits = '88' . $digits;
    } elseif (!str_starts_with($digits, '88')) {
        $digits = '880' . $digits;
    }

    return preg_match('/^8801[3-9]\d{8}$/', $digits) ? $digits : '';
}

function formatSmsMoney(float $amount): string
{
    return number_format($amount, 2, '.', ',');
}
