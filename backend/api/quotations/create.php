<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'কোটেশন সংরক্ষণ করতে POST অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'sales');
$shopId = authorizedShopId($user);
$body = requestJson();

$customerId = null;
if (isset($body['customer_id']) && $body['customer_id'] !== '') {
    $customerId = filter_var($body['customer_id'], FILTER_VALIDATE_INT);
    if ($customerId === false || $customerId < 1) {
        respond(422, false, 'সঠিক কাস্টমার নির্বাচন করুন।');
    }
}
$customerName = trim((string) ($body['customer_name'] ?? ''));
if ($customerName === '' || (function_exists('mb_strlen') ? mb_strlen($customerName, 'UTF-8') : strlen($customerName)) > 180) {
    respond(422, false, 'কাস্টমার/কোম্পানির নাম লিখুন (সর্বোচ্চ ১৮০ অক্ষর)।');
}
$mobileNumber = trim((string) ($body['mobile_number'] ?? ''));
$address = trim((string) ($body['address'] ?? ''));
$terms = trim((string) ($body['terms'] ?? ''));
if (strlen($mobileNumber) > 20 || strlen($address) > 255
    || (function_exists('mb_strlen') ? mb_strlen($terms, 'UTF-8') : strlen($terms)) > 2000) {
    respond(422, false, 'মোবাইল, ঠিকানা অথবা শর্তের লেখা নির্ধারিত সীমার বেশি।');
}
$mobileNumber = $mobileNumber === '' ? null : $mobileNumber;
$address = $address === '' ? null : $address;
$terms = $terms === '' ? null : $terms;

function quotationDate(string $value, string $label): string
{
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    if (!$date || $date->format('Y-m-d') !== $value) {
        respond(422, false, "{$label} সঠিক তারিখ দিন।");
    }
    return $value;
}

function quotationAmount(array $body, string $key, string $label): float
{
    $value = trim((string) ($body[$key] ?? '0'));
    if ($value === '') {
        return 0.0;
    }
    if (!preg_match('/^\d{1,10}(?:\.\d{1,2})?$/', $value)) {
        respond(422, false, "{$label} সঠিক টাকার অঙ্কে লিখুন।");
    }
    return (float) $value;
}

$issueDate = quotationDate((string) ($body['issue_date'] ?? date('Y-m-d')), 'ইস্যুর');
$validUntil = quotationDate((string) ($body['valid_until'] ?? ''), 'মেয়াদের');
if ($validUntil < $issueDate) {
    respond(422, false, 'কোটেশনের মেয়াদ ইস্যুর তারিখের আগে হতে পারবে না।');
}
$vatAmount = quotationAmount($body, 'vat_amount', 'ভ্যাট');
$discountAmount = quotationAmount($body, 'discount_amount', 'ছাড়');
$quoteItems = $body['items'] ?? null;
if (!is_array($quoteItems) || count($quoteItems) < 1 || count($quoteItems) > 100) {
    respond(422, false, 'কোটেশনে ১ থেকে ১০০টি পণ্য যোগ করুন।');
}

$items = [];
$subtotal = 0.0;
foreach ($quoteItems as $item) {
    if (!is_array($item)) {
        respond(422, false, 'কোটেশনের পণ্যের তথ্য সঠিক নয়।');
    }
    $productId = filter_var($item['product_id'] ?? null, FILTER_VALIDATE_INT);
    $quantity = trim((string) ($item['quantity'] ?? ''));
    $unitPrice = trim((string) ($item['unit_price'] ?? ''));
    if ($productId === false || $productId === null || $productId < 1) {
        respond(422, false, 'প্রতিটি সারিতে পণ্য নির্বাচন করুন।');
    }
    if (!preg_match('/^\d{1,9}(?:\.\d{1,3})?$/', $quantity) || (float) $quantity <= 0) {
        respond(422, false, 'পণ্যের পরিমাণ শূন্যের বেশি এবং সর্বোচ্চ ৩ দশমিক ঘরে লিখুন।');
    }
    if (!preg_match('/^\d{1,10}(?:\.\d{1,2})?$/', $unitPrice)) {
        respond(422, false, 'পণ্যের দর সঠিকভাবে লিখুন।');
    }
    $lineTotal = round((float) $quantity * (float) $unitPrice, 2);
    $items[] = [
        'product_id' => (int) $productId,
        'quantity' => $quantity,
        'unit_price' => $unitPrice,
        'line_total' => $lineTotal,
    ];
    $subtotal += $lineTotal;
}
$subtotal = round($subtotal, 2);
$totalAmount = round($subtotal + $vatAmount - $discountAmount, 2);
if ($discountAmount > $subtotal + $vatAmount || $totalAmount < 0) {
    respond(422, false, 'ছাড় পণ্যমূল্য ও ভ্যাটের যোগফলের চেয়ে বেশি হতে পারবে না।');
}

try {
    $pdo = database();
    $pdo->beginTransaction();
    if ($customerId !== null) {
        $customerQuery = $pdo->prepare(
            'SELECT customer_name, mobile_number, address
             FROM customers WHERE id = :id AND shop_id = :shop_id FOR UPDATE'
        );
        $customerQuery->execute(['id' => $customerId, 'shop_id' => $shopId]);
        $customer = $customerQuery->fetch();
        if (!$customer) {
            $pdo->rollBack();
            respond(422, false, 'নির্বাচিত কাস্টমার এই দোকানের নয়।');
        }
        $customerName = $customer['customer_name'];
        $mobileNumber = $customer['mobile_number'];
        $address = $customer['address'];
    }

    $productIds = array_values(array_unique(array_column($items, 'product_id')));
    $placeholders = implode(',', array_fill(0, count($productIds), '?'));
    $productQuery = $pdo->prepare(
        'SELECT id, product_name, product_code, unit
         FROM products WHERE shop_id = ? AND id IN (' . $placeholders . ')'
    );
    $productQuery->execute(array_merge([$shopId], $productIds));
    $products = [];
    foreach ($productQuery->fetchAll() as $product) {
        $products[(int) $product['id']] = $product;
    }
    if (count($products) !== count($productIds)) {
        $pdo->rollBack();
        respond(422, false, 'কոտেশনে এমন পণ্য আছে যা নির্বাচিত দোকানের নয়।');
    }

    $insert = $pdo->prepare(
        'INSERT INTO quotations (
            shop_id, customer_id, customer_name, mobile_number, address, quotation_number,
            issue_date, valid_until, subtotal, vat_amount, discount_amount, total_amount,
            terms, created_by
         ) VALUES (
            :shop_id, :customer_id, :customer_name, :mobile_number, :address, NULL,
            :issue_date, :valid_until, :subtotal, :vat_amount, :discount_amount, :total_amount,
            :terms, :created_by
         )'
    );
    $insert->execute([
        'shop_id' => $shopId,
        'customer_id' => $customerId,
        'customer_name' => $customerName,
        'mobile_number' => $mobileNumber,
        'address' => $address,
        'issue_date' => $issueDate,
        'valid_until' => $validUntil,
        'subtotal' => $subtotal,
        'vat_amount' => $vatAmount,
        'discount_amount' => $discountAmount,
        'total_amount' => $totalAmount,
        'terms' => $terms,
        'created_by' => $user['id'],
    ]);
    $quotationId = (int) $pdo->lastInsertId();
    $quotationNumber = sprintf('MRE-Q-%d-%s-%06d', $shopId, date('ymd'), $quotationId);
    $numberUpdate = $pdo->prepare(
        'UPDATE quotations SET quotation_number = :quotation_number WHERE id = :id'
    );
    $numberUpdate->execute(['quotation_number' => $quotationNumber, 'id' => $quotationId]);
    $itemInsert = $pdo->prepare(
        'INSERT INTO quotation_items (
            quotation_id, product_id, product_name, product_code, unit,
            quantity, unit_price, line_total
         ) VALUES (
            :quotation_id, :product_id, :product_name, :product_code, :unit,
            :quantity, :unit_price, :line_total
         )'
    );
    foreach ($items as $item) {
        $product = $products[$item['product_id']];
        $itemInsert->execute([
            'quotation_id' => $quotationId,
            'product_id' => $item['product_id'],
            'product_name' => $product['product_name'],
            'product_code' => $product['product_code'],
            'unit' => $product['unit'],
            'quantity' => $item['quantity'],
            'unit_price' => $item['unit_price'],
            'line_total' => $item['line_total'],
        ]);
    }
    $pdo->commit();

    respond(201, true, 'কোটেশন সংরক্ষণ হয়েছে।', [
        'quotation' => [
            'id' => $quotationId,
            'quotation_number' => $quotationNumber,
            'customer_name' => $customerName,
            'total_amount' => $totalAmount,
            'issue_date' => $issueDate,
            'valid_until' => $validUntil,
            'status' => 'open',
        ],
    ]);
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Quotation creation failed for user ' . $user['id'] . ': ' . $exception->getMessage());
    respond(500, false, 'কোটেশন সংরক্ষণ করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
