<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'বিক্রয় মেমো দেখতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
if (!userHasPermission($user, 'overview') && !userHasPermission($user, 'reports')) {
    respond(403, false, 'বিক্রয় মেমো দেখার অনুমতি আপনার অ্যাকাউন্টে নেই।');
}
$shopId = authorizedShopId($user);
$saleId = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
if ($saleId === false || $saleId === null || $saleId < 1) {
    respond(422, false, 'সঠিক বিক্রয় বিল নির্বাচন করুন।');
}

try {
    $pdo = database();
    $saleQuery = $pdo->prepare(
        'SELECT s.id, s.customer_id, s.sale_source, s.warehouse_id,
                COALESCE(s.customer_name, c.customer_name, \'ওয়াক-ইন কাস্টমার\') AS customer_name,
                c.mobile_number AS customer_mobile_number, c.address AS customer_address,
                u.display_name AS operator_name,
                s.invoice_number, s.sale_date, DATE_FORMAT(s.created_at, \'%H:%i\') AS sale_time,
                s.subtotal, s.vat_amount,
                s.discount_amount, s.special_discount_amount, s.previous_due_amount,
                s.sales_return_amount, s.net_amount, s.payment_method,
                s.payment_received, s.cash_refund_amount, s.present_due,
                s.notes, w.warehouse_name
         FROM sales s
         LEFT JOIN customers c ON c.id = s.customer_id
         LEFT JOIN warehouses w ON w.id = s.warehouse_id
         INNER JOIN users u ON u.id = s.created_by
         WHERE s.id = :id AND s.shop_id = :shop_id
         LIMIT 1'
    );
    $saleQuery->execute(['id' => $saleId, 'shop_id' => $shopId]);
    $sale = $saleQuery->fetch();
    if (!$sale) {
        respond(404, false, 'নির্বাচিত বিক্রয় বিল পাওয়া যায়নি।');
    }
    $sale['id'] = (int) $sale['id'];
    $sale['customer_id'] = $sale['customer_id'] === null ? null : (int) $sale['customer_id'];
    $sale['warehouse_id'] = $sale['warehouse_id'] === null ? null : (int) $sale['warehouse_id'];
    foreach ([
        'subtotal',
        'vat_amount',
        'discount_amount',
        'special_discount_amount',
        'previous_due_amount',
        'sales_return_amount',
        'net_amount',
        'payment_received',
        'cash_refund_amount',
        'present_due',
    ] as $field) {
        $sale[$field] = (float) $sale[$field];
    }

    $itemQuery = $pdo->prepare(
        'SELECT si.product_id, p.product_name, p.unit, si.quantity,
                si.unit_price, si.line_total
         FROM sale_items si
         INNER JOIN products p ON p.id = si.product_id
         WHERE si.sale_id = :sale_id
         ORDER BY si.id'
    );
    $itemQuery->execute(['sale_id' => $saleId]);
    $sale['items'] = $itemQuery->fetchAll();
    foreach ($sale['items'] as &$item) {
        $item['product_id'] = (int) $item['product_id'];
        $item['quantity'] = (float) $item['quantity'];
        $item['unit_price'] = (float) $item['unit_price'];
        $item['line_total'] = (float) $item['line_total'];
    }
    unset($item);

    $returnQuery = $pdo->prepare(
        'SELECT sr.quantity, sr.unit_price, sr.line_total,
                p.product_name, p.unit, original.invoice_number AS original_invoice_number
         FROM sale_returns sr
         INNER JOIN sale_items original_item ON original_item.id = sr.original_sale_item_id
         INNER JOIN products p ON p.id = original_item.product_id
         INNER JOIN sales original ON original.id = original_item.sale_id
         WHERE sr.sale_id = :sale_id
         ORDER BY sr.id'
    );
    $returnQuery->execute(['sale_id' => $saleId]);
    $sale['returns'] = $returnQuery->fetchAll();
    foreach ($sale['returns'] as &$return) {
        $return['quantity'] = (float) $return['quantity'];
        $return['unit_price'] = (float) $return['unit_price'];
        $return['line_total'] = (float) $return['line_total'];
    }
    unset($return);

    respond(200, true, 'বিক্রয় মেমো পাওয়া গেছে।', ['sale' => $sale]);
} catch (PDOException $exception) {
    error_log('Sales receipt lookup failed for user ' . $user['id'] . ': ' . $exception->getMessage());
    respond(500, false, 'বিক্রয় মেমো লোড করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
