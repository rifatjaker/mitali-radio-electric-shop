<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/setup/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'সাপ্লায়ারের বকেয়া দেখতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'purchase');
$shopId = authorizedShopId($user);

try {
    $statement = database()->prepare(
        'SELECT s.id, s.supplier_name, s.address, s.mobile_number,
                COALESCE(s.previous_balance, 0)
                + COALESCE((
                    SELECT SUM(pb.total_amount)
                    FROM purchase_bills pb
                    WHERE pb.shop_id = s.shop_id AND pb.supplier_id = s.id
                ), 0)
                - COALESCE((
                    SELECT SUM(sri.line_total)
                    FROM supplier_returns sr
                    INNER JOIN supplier_return_items sri ON sri.supplier_return_id = sr.id
                    WHERE sr.shop_id = s.shop_id AND sr.supplier_id = s.id
                ), 0)
                - COALESCE((
                    SELECT SUM(sp.payment_amount)
                    FROM supplier_payments sp
                    WHERE sp.shop_id = s.shop_id AND sp.supplier_id = s.id
                ), 0) AS current_due
         FROM suppliers s
         WHERE s.shop_id = :shop_id
         ORDER BY s.supplier_name, s.id'
    );
    $statement->execute(['shop_id' => $shopId]);
    $suppliers = $statement->fetchAll();
    foreach ($suppliers as &$supplier) {
        $supplier['id'] = (int) $supplier['id'];
        $supplier['current_due'] = (float) $supplier['current_due'];
    }
    unset($supplier);

    respond(200, true, 'সাপ্লায়ারের বকেয়াসহ তালিকা পাওয়া গেছে।', ['suppliers' => $suppliers]);
} catch (PDOException $exception) {
    error_log('Supplier payment options failed: ' . $exception->getMessage());
    respond(500, false, 'সাপ্লায়ারের বকেয়ার তালিকা লোড করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
