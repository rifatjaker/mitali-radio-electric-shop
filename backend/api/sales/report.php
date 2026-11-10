<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'বিক্রয় রিপোর্ট দেখতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'reports');
$shopId = authorizedShopId($user);

function salesReportDate(string $value, string $label): string
{
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    if (!$date || $date->format('Y-m-d') !== $value || $value > date('Y-m-d')) {
        respond(422, false, "{$label} সঠিক অতীত/আজকের তারিখ দিন।");
    }
    return $value;
}

$today = date('Y-m-d');
$defaultStart = date('Y-m-01');
$dateFrom = salesReportDate((string) ($_GET['date_from'] ?? $defaultStart), 'শুরুর');
$dateTo = salesReportDate((string) ($_GET['date_to'] ?? $today), 'শেষের');
if ($dateFrom > $dateTo) {
    respond(422, false, 'শুরুর তারিখ শেষের তারিখের পরে হতে পারবে না।');
}

$search = trim((string) ($_GET['search'] ?? ''));
if ((function_exists('mb_strlen') ? mb_strlen($search, 'UTF-8') : strlen($search)) > 120) {
    respond(422, false, 'অনুসন্ধানের লেখা ১২০ অক্ষরের মধ্যে লিখুন।');
}
$source = trim((string) ($_GET['sale_source'] ?? ''));
if ($source !== '' && !in_array($source, ['shop', 'warehouse'], true)) {
    respond(422, false, 'দোকান বা গুদাম বিক্রয় নির্বাচন করুন।');
}

try {
    $pdo = database();
    $statement = $pdo->prepare(
        'SELECT s.id, s.invoice_number, s.sale_date, s.customer_id,
                COALESCE(s.customer_name, c.customer_name, \'ওয়াক-ইন কাস্টমার\') AS customer_name,
                s.sale_source, w.warehouse_name, s.subtotal, s.vat_amount,
                s.discount_amount, s.special_discount_amount, s.previous_due_amount,
                s.sales_return_amount, s.net_amount, s.payment_method,
                s.payment_received, s.cash_refund_amount, s.present_due,
                COUNT(DISTINCT si.id) AS item_count,
                COALESCE(SUM(si.quantity), 0) AS total_quantity
         FROM sales s
         LEFT JOIN customers c ON c.id = s.customer_id
         LEFT JOIN warehouses w ON w.id = s.warehouse_id
         LEFT JOIN sale_items si ON si.sale_id = s.id
         WHERE s.shop_id = :shop_id
           AND s.sale_date BETWEEN :date_from AND :date_to
           AND (:source_filter = \'\' OR s.sale_source = :source_match)
           AND (:search_text = \'\' OR s.invoice_number LIKE :invoice_search
                OR COALESCE(s.customer_name, c.customer_name, \'\') LIKE :customer_search
                OR CAST(s.id AS CHAR) = :sale_id_search)
         GROUP BY s.id, s.invoice_number, s.sale_date, s.customer_id,
                  s.customer_name, c.customer_name, s.sale_source,
                  w.warehouse_name, s.subtotal, s.vat_amount, s.discount_amount,
                  s.special_discount_amount, s.previous_due_amount, s.sales_return_amount,
                  s.net_amount, s.payment_method, s.payment_received,
                  s.cash_refund_amount, s.present_due
         ORDER BY s.sale_date DESC, s.id DESC
         LIMIT 500'
    );
    $pattern = '%' . $search . '%';
    $statement->execute([
        'shop_id' => $shopId,
        'date_from' => $dateFrom,
        'date_to' => $dateTo,
        'source_filter' => $source,
        'source_match' => $source,
        'search_text' => $search,
        'invoice_search' => $pattern,
        'customer_search' => $pattern,
        'sale_id_search' => $search,
    ]);
    $bills = $statement->fetchAll();
    foreach ($bills as &$bill) {
        $bill['id'] = (int) $bill['id'];
        $bill['customer_id'] = $bill['customer_id'] === null ? null : (int) $bill['customer_id'];
        $bill['item_count'] = (int) $bill['item_count'];
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
            'total_quantity',
        ] as $field) {
            $bill[$field] = (float) $bill[$field];
        }
    }
    unset($bill);

    $summaryStatement = $pdo->prepare(
        'SELECT COUNT(*) AS bill_count,
                COALESCE(SUM(subtotal), 0) AS subtotal,
                COALESCE(SUM(sales_return_amount), 0) AS returned_amount,
                COALESCE(SUM(payment_received), 0) AS collected_amount,
                COALESCE(SUM(present_due), 0) AS present_due
         FROM sales s
         LEFT JOIN customers c ON c.id = s.customer_id
         WHERE s.shop_id = :shop_id
           AND s.sale_date BETWEEN :date_from AND :date_to
           AND (:source_filter = \'\' OR s.sale_source = :source_match)
           AND (:search_text = \'\' OR s.invoice_number LIKE :invoice_search
                OR COALESCE(s.customer_name, c.customer_name, \'\') LIKE :customer_search
                OR CAST(s.id AS CHAR) = :sale_id_search)'
    );
    $summaryStatement->execute([
        'shop_id' => $shopId,
        'date_from' => $dateFrom,
        'date_to' => $dateTo,
        'source_filter' => $source,
        'source_match' => $source,
        'search_text' => $search,
        'invoice_search' => $pattern,
        'customer_search' => $pattern,
        'sale_id_search' => $search,
    ]);
    $summary = $summaryStatement->fetch();
    $summary['bill_count'] = (int) $summary['bill_count'];
    foreach (['subtotal', 'returned_amount', 'collected_amount', 'present_due'] as $field) {
        $summary[$field] = (float) $summary[$field];
    }

    respond(200, true, 'বিক্রয় রিপোর্ট তৈরি হয়েছে।', [
        'date_from' => $dateFrom,
        'date_to' => $dateTo,
        'bills' => $bills,
        'summary' => $summary,
        'limit' => 500,
    ]);
} catch (PDOException $exception) {
    error_log('Sales report failed for user ' . $user['id'] . ': ' . $exception->getMessage());
    respond(500, false, 'বিক্রয় রিপোর্ট তৈরি করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
