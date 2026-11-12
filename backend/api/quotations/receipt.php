<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'কোটেশন দেখতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'sales');
$shopId = authorizedShopId($user);
$quotationId = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
if ($quotationId === false || $quotationId === null || $quotationId < 1) {
    respond(422, false, 'সঠিক কোটেশন নির্বাচন করুন।');
}

try {
    $pdo = database();
    $statement = $pdo->prepare(
        'SELECT q.id, q.customer_id, q.customer_name, q.mobile_number, q.address,
                q.quotation_number, q.issue_date, q.valid_until, q.subtotal, q.vat_amount,
                q.discount_amount, q.total_amount, q.terms, q.status,
                q.converted_sale_id, s.invoice_number, u.display_name AS operator_name,
                sh.shop_name, sh.memo_heading, sh.address AS shop_address,
                sh.contact_number AS shop_contact_number
         FROM quotations q
         INNER JOIN shops sh ON sh.id = q.shop_id
         INNER JOIN users u ON u.id = q.created_by
         LEFT JOIN sales s ON s.id = q.converted_sale_id AND s.shop_id = q.shop_id
         WHERE q.id = :id AND q.shop_id = :shop_id
         LIMIT 1'
    );
    $statement->execute(['id' => $quotationId, 'shop_id' => $shopId]);
    $quotation = $statement->fetch();
    if (!$quotation) {
        respond(404, false, 'নির্বাচিত কোটেশন পাওয়া যায়নি।');
    }
    $quotation['id'] = (int) $quotation['id'];
    $quotation['customer_id'] = $quotation['customer_id'] === null ? null : (int) $quotation['customer_id'];
    $quotation['converted_sale_id'] = $quotation['converted_sale_id'] === null
        ? null
        : (int) $quotation['converted_sale_id'];
    foreach (['subtotal', 'vat_amount', 'discount_amount', 'total_amount'] as $field) {
        $quotation[$field] = (float) $quotation[$field];
    }
    if ($quotation['status'] === 'open' && $quotation['valid_until'] < date('Y-m-d')) {
        $quotation['status'] = 'expired';
    }

    $itemQuery = $pdo->prepare(
        'SELECT id, product_id, product_name, product_code, unit,
                quantity, unit_price, line_total
         FROM quotation_items WHERE quotation_id = :quotation_id ORDER BY id'
    );
    $itemQuery->execute(['quotation_id' => $quotationId]);
    $quotation['items'] = $itemQuery->fetchAll();
    foreach ($quotation['items'] as &$item) {
        $item['id'] = (int) $item['id'];
        $item['product_id'] = $item['product_id'] === null ? null : (int) $item['product_id'];
        $item['quantity'] = (float) $item['quantity'];
        $item['unit_price'] = (float) $item['unit_price'];
        $item['line_total'] = (float) $item['line_total'];
    }
    unset($item);

    $shop = [
        'shop_name' => $quotation['shop_name'],
        'memo_heading' => $quotation['memo_heading'],
        'address' => $quotation['shop_address'],
        'contact_number' => $quotation['shop_contact_number'],
    ];
    respond(200, true, 'কোটেশন পাওয়া গেছে।', [
        'quotation' => $quotation,
        'shop' => $shop,
    ]);
} catch (PDOException $exception) {
    error_log('Quotation receipt failed for user ' . $user['id'] . ': ' . $exception->getMessage());
    respond(500, false, 'কোটেশন লোড করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
