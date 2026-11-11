<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'ফেরতযোগ্য বিক্রয় দেখতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'sales');
$shopId = authorizedShopId($user);
$customerId = null;
if (isset($_GET['customer_id']) && $_GET['customer_id'] !== '') {
    $customerId = filter_var($_GET['customer_id'], FILTER_VALIDATE_INT);
    if ($customerId === false || $customerId === null || $customerId < 1) {
        respond(422, false, 'সঠিক কাস্টমার নির্বাচন করুন।');
    }
}
$invoiceNumber = trim((string) ($_GET['invoice_number'] ?? ''));
if (strlen($invoiceNumber) > 50) {
    respond(422, false, 'বিল নম্বর ৫০ অক্ষরের মধ্যে লিখুন।');
}
$invoiceNumber = $invoiceNumber === '' ? null : $invoiceNumber;
$excludeSaleId = null;
if (isset($_GET['exclude_sale_id']) && $_GET['exclude_sale_id'] !== '') {
    $excludeSaleId = filter_var($_GET['exclude_sale_id'], FILTER_VALIDATE_INT);
    if ($excludeSaleId === false || $excludeSaleId < 1) {
        respond(422, false, 'সঠিক বাদ দেওয়ার বিক্রয় বিল নির্বাচন করুন।');
    }
}
$walkInName = trim((string) ($_GET['customer_name'] ?? ''));
if (strlen($walkInName) > 180) {
    respond(422, false, 'ওয়াক-ইন কাস্টমারের নাম ১৮০ অক্ষরের মধ্যে লিখুন।');
}
$walkInName = $walkInName === '' ? null : $walkInName;
if ($customerId === null && $walkInName === null) {
    respond(422, false, 'ওয়াক-ইন কাস্টমারের নাম অথবা বিল নম্বর দিন।');
}

try {
    $pdo = database();
    $customerCheck = $pdo->prepare(
        'SELECT id FROM customers WHERE id = :id AND shop_id = :shop_id'
    );
    if ($customerId !== null) {
        $customerCheck->execute(['id' => $customerId, 'shop_id' => $shopId]);
        if (!$customerCheck->fetch()) {
            respond(422, false, 'নির্বাচিত কাস্টমার এই দোকানের নয়।');
        }
    }

    $customerCondition = $customerId === null
        ? 'customer_id IS NULL AND customer_name = :customer_name'
        : 'customer_id = :customer_id';
    $saleSelection = $invoiceNumber === null
        ? "SELECT id FROM sales
           WHERE shop_id = :shop_id AND {$customerCondition}
             AND (:exclude_check IS NULL OR id <> :excluded_sale_id)
           ORDER BY id DESC LIMIT 100"
        : "SELECT id FROM sales
           WHERE shop_id = :shop_id AND {$customerCondition}
             AND (:exclude_check IS NULL OR id <> :excluded_sale_id)
             AND invoice_number = :invoice_number";
    $statement = $pdo->prepare(
        'SELECT si.id AS sale_item_id, s.id AS sale_id, s.invoice_number, s.sale_date,
                COALESCE(s.customer_name, c.customer_name, :walk_in_name) AS customer_name,
                p.id AS product_id, p.product_name, p.product_code, p.unit,
                si.quantity AS original_quantity, si.unit_price,
                COALESCE(SUM(sr.quantity), 0) AS returned_quantity,
                si.quantity - COALESCE(SUM(sr.quantity), 0) AS remaining_quantity
         FROM (' . $saleSelection . ') recent
         INNER JOIN sales s ON s.id = recent.id
         INNER JOIN sale_items si ON si.sale_id = s.id
         INNER JOIN products p ON p.id = si.product_id
         LEFT JOIN customers c ON c.id = s.customer_id
         LEFT JOIN sale_returns sr ON sr.original_sale_item_id = si.id
         GROUP BY si.id, s.id, s.invoice_number, s.sale_date, s.customer_name,
                  c.customer_name, p.id, p.product_name, p.product_code, p.unit,
                  si.quantity, si.unit_price
         HAVING si.quantity - COALESCE(SUM(sr.quantity), 0) > 0
         ORDER BY s.id DESC, si.id'
    );
    $params = [
        'walk_in_name' => 'ওয়াক-ইন কাস্টমার',
        'shop_id' => $shopId,
        'exclude_check' => $excludeSaleId,
        'excluded_sale_id' => $excludeSaleId,
    ];
    if ($customerId !== null) {
        $params['customer_id'] = $customerId;
    } else {
        $params['customer_name'] = $walkInName;
    }
    if ($invoiceNumber !== null) {
        $params['invoice_number'] = $invoiceNumber;
    }
    $statement->execute($params);
    $items = $statement->fetchAll();
    foreach ($items as &$item) {
        $item['sale_item_id'] = (int) $item['sale_item_id'];
        $item['sale_id'] = (int) $item['sale_id'];
        $item['product_id'] = (int) $item['product_id'];
    }
    unset($item);
    respond(200, true, 'ফেরতযোগ্য পণ্যের তালিকা পাওয়া গেছে।', ['items' => $items]);
} catch (PDOException $exception) {
    error_log('Returnable sales listing failed: ' . $exception->getMessage());
    respond(500, false, 'ফেরতযোগ্য পণ্যের তালিকা লোড করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
