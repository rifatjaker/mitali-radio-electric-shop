<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(__DIR__) . '/sms.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'বিক্রয় SMS আবার পাঠাতে POST অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'sales');
$shopId = authorizedShopId($user);
$body = requestJson();
$saleId = filter_var($body['sale_id'] ?? null, FILTER_VALIDATE_INT);
if ($saleId === false || $saleId === null || $saleId < 1) {
    respond(422, false, 'সঠিক বিক্রয় বিল নির্বাচন করুন।');
}

try {
    $pdo = database();
    $statement = $pdo->prepare(
        'SELECT s.customer_id, s.invoice_number, s.subtotal, s.vat_amount,
                s.discount_amount, s.sales_return_amount, s.special_discount_amount,
                s.payment_received, s.present_due,
                COALESCE(NULLIF(s.customer_name, \'\'), c.customer_name) AS customer_name,
                c.mobile_number
         FROM sales s
         LEFT JOIN customers c ON c.id = s.customer_id
         WHERE s.id = :sale_id AND s.shop_id = :shop_id
         LIMIT 1'
    );
    $statement->execute(['sale_id' => $saleId, 'shop_id' => $shopId]);
    $sale = $statement->fetch();
    if (!$sale) {
        respond(404, false, 'নির্বাচিত বিক্রয় বিল পাওয়া যায়নি।');
    }
    if ($sale['customer_id'] === null) {
        respond(422, false, 'এই বিক্রয়টি ওয়াক-ইন; SMS পাঠানোর জন্য কাস্টমার নম্বর নেই।');
    }

    $billAmount = (float) $sale['subtotal'] + (float) $sale['vat_amount']
        - (float) $sale['discount_amount'] - (float) $sale['sales_return_amount']
        - (float) $sale['special_discount_amount'];
    $message = sprintf(
        'প্রিয় %s, আপনার বিক্রয় মেমো %s। মোট বিল ৳%s, জমা ৳%s, বর্তমান বাকি ৳%s। ধন্যবাদ। মেসার্স মিতালী রেডিও ইলেকট্রিক, ফেনী',
        $sale['customer_name'] ?: 'কাস্টমার',
        $sale['invoice_number'],
        formatSmsMoney($billAmount),
        formatSmsMoney((float) $sale['payment_received']),
        formatSmsMoney((float) $sale['present_due'])
    );
    $sms = sendCustomerSms($sale['mobile_number'] ?? null, $message);
    if (!$sms['sent']) {
        respond(502, false, $sms['message'], ['sms' => $sms]);
    }

    respond(200, true, $sms['message'], ['sms' => $sms]);
} catch (PDOException $exception) {
    error_log('Sales SMS resend failed for user ' . $user['id'] . ': ' . $exception->getMessage());
    respond(500, false, 'বিক্রয় SMS পাঠানো যায়নি। সার্ভার লগ পরীক্ষা করুন।');
}
