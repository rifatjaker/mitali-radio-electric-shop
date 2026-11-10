<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'সাপ্লায়ারকে ফেরতযোগ্য পণ্য দেখতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'purchase');
$shopId = authorizedShopId($user);
$supplierId = filter_var($_GET['supplier_id'] ?? null, FILTER_VALIDATE_INT);
if ($supplierId === false || $supplierId === null || $supplierId < 1) {
    respond(422, false, 'সাপ্লায়ার নির্বাচন করুন।');
}

try {
    $pdo = database();
    $supplierCheck = $pdo->prepare(
        'SELECT id FROM suppliers WHERE id = :id AND shop_id = :shop_id'
    );
    $supplierCheck->execute(['id' => $supplierId, 'shop_id' => $shopId]);
    if (!$supplierCheck->fetch()) {
        respond(422, false, 'নির্বাচিত সাপ্লায়ার এই দোকানের নয়।');
    }

    $statement = $pdo->prepare(
        'SELECT pi.id AS purchase_item_id, pb.id AS purchase_bill_id,
                pb.bill_number, pb.purchase_date, p.id AS product_id,
                p.product_name, p.product_code, p.unit, pi.quantity AS purchased_quantity,
                pi.unit_price,
                COALESCE(SUM(sri.quantity), 0) AS returned_quantity,
                pi.quantity - COALESCE(SUM(sri.quantity), 0) AS remaining_quantity
         FROM (
             SELECT pb.id
             FROM purchase_bills pb
             WHERE pb.shop_id = :shop_id AND pb.supplier_id = :supplier_id
               AND pb.destination_type = \'shop\'
             ORDER BY pb.id DESC
             LIMIT 100
         ) recent
         INNER JOIN purchase_bills pb ON pb.id = recent.id
         INNER JOIN purchase_items pi ON pi.purchase_id = pb.id
         INNER JOIN products p ON p.id = pi.product_id
         LEFT JOIN supplier_return_items sri ON sri.original_purchase_item_id = pi.id
         GROUP BY pi.id, pb.id, pb.bill_number, pb.purchase_date, p.id,
                  p.product_name, p.product_code, p.unit, pi.quantity, pi.unit_price
         HAVING pi.quantity - COALESCE(SUM(sri.quantity), 0) > 0
         ORDER BY pb.id DESC, pi.id'
    );
    $statement->execute(['shop_id' => $shopId, 'supplier_id' => $supplierId]);
    $items = $statement->fetchAll();
    foreach ($items as &$item) {
        $item['purchase_item_id'] = (int) $item['purchase_item_id'];
        $item['purchase_bill_id'] = (int) $item['purchase_bill_id'];
        $item['product_id'] = (int) $item['product_id'];
    }
    unset($item);
    respond(200, true, 'সাপ্লায়ারকে ফেরতযোগ্য পণ্যের তালিকা পাওয়া গেছে।', ['items' => $items]);
} catch (PDOException $exception) {
    error_log('Supplier returnable purchase listing failed: ' . $exception->getMessage());
    respond(500, false, 'ফেরতযোগ্য ক্রয়পণ্যের তালিকা লোড করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
