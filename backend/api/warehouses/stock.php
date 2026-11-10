<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'গুদামের স্টক দেখতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
if (!userHasPermission($user, 'purchase') && !userHasPermission($user, 'reports')) {
    respond(403, false, 'গুদামের স্টক দেখার অনুমতি আপনার অ্যাকাউন্টে নেই।');
}
$shopId = authorizedShopId($user);
$warehouseId = filter_var($_GET['warehouse_id'] ?? null, FILTER_VALIDATE_INT);
if ($warehouseId === false || $warehouseId === null || $warehouseId < 1) {
    respond(422, false, 'গুদাম নির্বাচন করুন।');
}
$search = trim((string) ($_GET['search'] ?? ''));
if (strlen($search) > 180) {
    respond(422, false, 'পণ্যের নাম ১৮০ অক্ষরের মধ্যে লিখুন।');
}

try {
    $pdo = database();
    $warehouseCheck = $pdo->prepare(
        'SELECT id, warehouse_name FROM warehouses WHERE id = :id'
    );
    $warehouseCheck->execute(['id' => $warehouseId]);
    $warehouse = $warehouseCheck->fetch();
    if (!$warehouse) {
        respond(404, false, 'নির্বাচিত গুদামটি পাওয়া যায়নি।');
    }

    $statement = $pdo->prepare(
        'SELECT p.id AS product_id, p.product_name, p.product_code, p.unit,
                ws.quantity, ws.updated_at
         FROM warehouse_stock ws
         INNER JOIN products p ON p.id = ws.product_id
         WHERE ws.warehouse_id = :warehouse_id
           AND p.shop_id = :shop_id
           AND ws.quantity > 0
           AND (:search_empty = \'\' OR p.product_name LIKE :name_search
                OR p.product_code LIKE :code_search)
         ORDER BY p.product_name, p.id'
    );
    $like = '%' . $search . '%';
    $statement->execute([
        'warehouse_id' => $warehouseId,
        'shop_id' => $shopId,
        'search_empty' => $search,
        'name_search' => $like,
        'code_search' => $like,
    ]);
    $items = $statement->fetchAll();
    foreach ($items as &$item) {
        $item['product_id'] = (int) $item['product_id'];
        $item['quantity'] = (float) $item['quantity'];
    }
    unset($item);

    respond(200, true, 'গুদামের স্টক পাওয়া গেছে।', [
        'warehouse' => $warehouse,
        'items' => $items,
    ]);
} catch (PDOException $exception) {
    error_log('Warehouse stock listing failed for user ' . $user['id'] . ': ' . $exception->getMessage());
    respond(500, false, 'গুদামের স্টক লোড করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
