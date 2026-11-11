<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'ক্রয় রিপোর্ট দেখতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'reports');
$shopId = authorizedShopId($user);

function purchaseReportDate(string $value, string $label): string
{
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    if (!$date || $date->format('Y-m-d') !== $value || $value > date('Y-m-d')) {
        respond(422, false, "{$label} সঠিক অতীত/আজকের তারিখ দিন।");
    }
    return $value;
}

$dateFrom = purchaseReportDate((string) ($_GET['date_from'] ?? date('Y-m-d')), 'শুরুর');
$dateTo = purchaseReportDate((string) ($_GET['date_to'] ?? date('Y-m-d')), 'শেষের');
if ($dateFrom > $dateTo) {
    respond(422, false, 'শুরুর তারিখ শেষের তারিখের পরে হতে পারবে না।');
}

$supplierId = null;
if (isset($_GET['supplier_id']) && $_GET['supplier_id'] !== '') {
    $supplierId = filter_var($_GET['supplier_id'], FILTER_VALIDATE_INT);
    if ($supplierId === false || $supplierId === null || $supplierId < 1) {
        respond(422, false, 'সঠিক সাপ্লায়ার নির্বাচন করুন।');
    }
}

$destination = trim((string) ($_GET['destination'] ?? ''));
if ($destination !== '' && !in_array($destination, ['shop', 'warehouse'], true)) {
    respond(422, false, 'ক্রয়ের গন্তব্য সঠিক নয়।');
}

$search = trim((string) ($_GET['search'] ?? ''));
if ((function_exists('mb_strlen') ? mb_strlen($search, 'UTF-8') : strlen($search)) > 120) {
    respond(422, false, 'চালান/পণ্য খোঁজার লেখা ১২০ অক্ষরের মধ্যে লিখুন।');
}

try {
    $pdo = database();
    if ($supplierId !== null) {
        $supplierCheck = $pdo->prepare(
            'SELECT id FROM suppliers WHERE id = :id AND shop_id = :shop_id'
        );
        $supplierCheck->execute(['id' => $supplierId, 'shop_id' => $shopId]);
        if (!$supplierCheck->fetch()) {
            respond(422, false, 'নির্বাচিত সাপ্লায়ার এই দোকানের নয়।');
        }
    }

    $statement = $pdo->prepare(
        'SELECT pb.id AS purchase_id, pb.bill_number, pb.purchase_date, pb.warehouse_id,
                pb.destination_type, pb.total_amount, pb.notes,
                su.id AS supplier_id, su.supplier_name,
                w.warehouse_name,
                pi.id AS purchase_item_id, pi.quantity, pi.unit_price, pi.line_total,
                p.id AS product_id, p.product_name, p.product_code, p.unit,
                COALESCE(returned.returned_quantity, 0) AS returned_quantity,
                COALESCE(returned.returned_amount, 0) AS returned_amount
         FROM purchase_bills pb
         INNER JOIN suppliers su ON su.id = pb.supplier_id
         LEFT JOIN warehouses w ON w.id = pb.warehouse_id
         LEFT JOIN purchase_items pi ON pi.purchase_id = pb.id
         LEFT JOIN products p ON p.id = pi.product_id
         LEFT JOIN (
             SELECT sri.original_purchase_item_id,
                    SUM(sri.quantity) AS returned_quantity,
                    SUM(sri.line_total) AS returned_amount
             FROM supplier_return_items sri
             INNER JOIN supplier_returns sr ON sr.id = sri.supplier_return_id
             WHERE sr.shop_id = :return_shop_id
             GROUP BY sri.original_purchase_item_id
         ) returned ON returned.original_purchase_item_id = pi.id
         WHERE pb.shop_id = :shop_id
           AND pb.purchase_date BETWEEN :date_from AND :date_to
           AND (:supplier_id_filter = 0 OR pb.supplier_id = :supplier_id_match)
           AND (:destination_filter = \'\' OR pb.destination_type = :destination_match)
           AND (
               :search_text = \'\'
               OR pb.bill_number LIKE :bill_search
               OR su.supplier_name LIKE :supplier_search
               OR EXISTS (
                   SELECT 1 FROM purchase_items search_item
                   INNER JOIN products search_product ON search_product.id = search_item.product_id
                   WHERE search_item.purchase_id = pb.id
                     AND (search_product.product_name LIKE :product_name_search
                          OR search_product.product_code LIKE :product_code_search)
               )
           )
         ORDER BY pb.purchase_date DESC, pb.id DESC, pi.id'
    );
    $searchPattern = '%' . $search . '%';
    $statement->execute([
        'return_shop_id' => $shopId,
        'shop_id' => $shopId,
        'date_from' => $dateFrom,
        'date_to' => $dateTo,
        'supplier_id_filter' => $supplierId ?? 0,
        'supplier_id_match' => $supplierId ?? 0,
        'destination_filter' => $destination,
        'destination_match' => $destination,
        'search_text' => $search,
        'bill_search' => $searchPattern,
        'supplier_search' => $searchPattern,
        'product_name_search' => $searchPattern,
        'product_code_search' => $searchPattern,
    ]);

    $bills = [];
    while ($row = $statement->fetch()) {
        $purchaseId = (int) $row['purchase_id'];
        if (!isset($bills[$purchaseId])) {
            $bills[$purchaseId] = [
                'id' => $purchaseId,
                'bill_number' => $row['bill_number'],
                'purchase_date' => $row['purchase_date'],
                'destination_type' => $row['destination_type'],
                'warehouse_id' => $row['warehouse_id'] === null ? null : (int) $row['warehouse_id'],
                'warehouse_name' => $row['warehouse_name'],
                'supplier_id' => (int) $row['supplier_id'],
                'supplier_name' => $row['supplier_name'],
                'total_amount' => (float) $row['total_amount'],
                'returned_amount' => 0.0,
                'net_amount' => 0.0,
                'notes' => $row['notes'],
                'items' => [],
            ];
        }
        if ($row['purchase_item_id'] !== null) {
            $returnedAmount = (float) $row['returned_amount'];
            $bills[$purchaseId]['returned_amount'] += $returnedAmount;
            $bills[$purchaseId]['items'][] = [
                'id' => (int) $row['purchase_item_id'],
                'product_id' => (int) $row['product_id'],
                'product_name' => $row['product_name'],
                'product_code' => $row['product_code'],
                'unit' => $row['unit'],
                'quantity' => (float) $row['quantity'],
                'returned_quantity' => (float) $row['returned_quantity'],
                'unit_price' => (float) $row['unit_price'],
                'line_total' => (float) $row['line_total'],
            ];
        }
    }
    $bills = array_values($bills);
    $totalPurchase = 0.0;
    $totalReturned = 0.0;
    foreach ($bills as &$bill) {
        $bill['returned_amount'] = round($bill['returned_amount'], 2);
        $bill['net_amount'] = round($bill['total_amount'] - $bill['returned_amount'], 2);
        $totalPurchase += $bill['total_amount'];
        $totalReturned += $bill['returned_amount'];
    }
    unset($bill);

    $suppliersStatement = $pdo->prepare(
        'SELECT id, supplier_name, address FROM suppliers
         WHERE shop_id = :shop_id ORDER BY supplier_name, id'
    );
    $suppliersStatement->execute(['shop_id' => $shopId]);
    $suppliers = $suppliersStatement->fetchAll();
    foreach ($suppliers as &$supplier) {
        $supplier['id'] = (int) $supplier['id'];
    }
    unset($supplier);

    respond(200, true, 'ক্রয় রিপোর্ট তৈরি হয়েছে।', [
        'date_from' => $dateFrom,
        'date_to' => $dateTo,
        'summary' => [
            'bill_count' => count($bills),
            'total_purchase' => round($totalPurchase, 2),
            'total_returned' => round($totalReturned, 2),
            'net_purchase' => round($totalPurchase - $totalReturned, 2),
        ],
        'suppliers' => $suppliers,
        'bills' => $bills,
    ]);
} catch (PDOException $exception) {
    error_log('Purchase report generation failed: ' . $exception->getMessage());
    respond(500, false, 'ক্রয় রিপোর্ট তৈরি করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
