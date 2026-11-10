<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'ক্রয় মেমো দেখতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
if (!userHasPermission($user, 'overview') && !userHasPermission($user, 'reports')) {
    respond(403, false, 'ক্রয় মেমো দেখার অনুমতি আপনার অ্যাকাউন্টে নেই।');
}
$shopId = authorizedShopId($user);
$purchaseId = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
if ($purchaseId === false || $purchaseId === null || $purchaseId < 1) {
    respond(422, false, 'সঠিক ক্রয় চালান নির্বাচন করুন।');
}

try {
    $pdo = database();
    $purchaseQuery = $pdo->prepare(
        'SELECT pb.id, pb.bill_number, pb.purchase_date, pb.destination_type,
                pb.total_amount, pb.notes, DATE_FORMAT(pb.created_at, \'%H:%i\') AS purchase_time,
                su.supplier_name, su.mobile_number AS supplier_mobile_number, su.address AS supplier_address,
                w.warehouse_name, u.display_name AS operator_name
         FROM purchase_bills pb
         INNER JOIN suppliers su ON su.id = pb.supplier_id
         LEFT JOIN warehouses w ON w.id = pb.warehouse_id
         INNER JOIN users u ON u.id = pb.created_by
         WHERE pb.id = :id AND pb.shop_id = :shop_id
         LIMIT 1'
    );
    $purchaseQuery->execute(['id' => $purchaseId, 'shop_id' => $shopId]);
    $purchase = $purchaseQuery->fetch();
    if (!$purchase) {
        respond(404, false, 'নির্বাচিত ক্রয় চালান পাওয়া যায়নি।');
    }

    $itemQuery = $pdo->prepare(
        'SELECT p.product_name, p.product_code, p.unit,
                pi.quantity, pi.unit_price, pi.line_total
         FROM purchase_items pi
         INNER JOIN products p ON p.id = pi.product_id
         WHERE pi.purchase_id = :purchase_id
         ORDER BY pi.id'
    );
    $itemQuery->execute(['purchase_id' => $purchaseId]);
    $purchase['id'] = (int) $purchase['id'];
    $purchase['total_amount'] = (float) $purchase['total_amount'];
    $purchase['items'] = $itemQuery->fetchAll();
    foreach ($purchase['items'] as &$item) {
        $item['quantity'] = (float) $item['quantity'];
        $item['unit_price'] = (float) $item['unit_price'];
        $item['line_total'] = (float) $item['line_total'];
    }
    unset($item);

    respond(200, true, 'ক্রয় মেমো পাওয়া গেছে।', ['purchase' => $purchase]);
} catch (PDOException $exception) {
    error_log('Purchase receipt lookup failed for user ' . $user['id'] . ': ' . $exception->getMessage());
    respond(500, false, 'ক্রয় মেমো লোড করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
