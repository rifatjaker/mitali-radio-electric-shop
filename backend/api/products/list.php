<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/setup/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'পণ্যের তালিকা দেখতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
if (
    !userHasPermission($user, 'setup')
    && !userHasPermission($user, 'purchase')
    && !userHasPermission($user, 'sales')
) {
    respond(403, false, 'পণ্যের তালিকা দেখার অনুমতি আপনার অ্যাকাউন্টে নেই।');
}
$shopId = authorizedShopId($user);
$stockSource = trim((string) ($_GET['stock_source'] ?? ''));
$warehouseId = null;
if ($stockSource !== '' && !in_array($stockSource, ['shop', 'warehouse'], true)) {
    respond(422, false, 'পণ্যের স্টকের উৎস সঠিক নয়।');
}
if ($stockSource === 'warehouse') {
    $warehouseId = filter_var($_GET['warehouse_id'] ?? null, FILTER_VALIDATE_INT);
    if ($warehouseId === false || $warehouseId === null || $warehouseId < 1) {
        respond(422, false, 'গুদাম নির্বাচন করুন।');
    }
}

try {
    $pdo = database();
    if ($stockSource === 'shop') {
        $statement = $pdo->prepare(
            'SELECT id, product_name, product_code, category, brand, unit,
                    purchase_price, sale_price, current_stock, min_stock,
                    tracks_serial_number, current_stock AS available_stock
             FROM products
             WHERE shop_id = :shop_id AND current_stock > 0
             ORDER BY product_name, id'
        );
        $statement->execute(['shop_id' => $shopId]);
    } elseif ($stockSource === 'warehouse') {
        $warehouseCheck = $pdo->prepare('SELECT id FROM warehouses WHERE id = :id');
        $warehouseCheck->execute(['id' => $warehouseId]);
        if (!$warehouseCheck->fetch()) {
            respond(422, false, 'নির্বাচিত গুদামটি পাওয়া যায়নি।');
        }
        $statement = $pdo->prepare(
            'SELECT p.id, p.product_name, p.product_code, p.category, p.brand, p.unit,
                    p.purchase_price, p.sale_price, p.current_stock, p.min_stock,
                    p.tracks_serial_number, ws.quantity AS available_stock
             FROM warehouse_stock ws
             INNER JOIN products p ON p.id = ws.product_id
             WHERE p.shop_id = :shop_id AND ws.warehouse_id = :warehouse_id
               AND ws.quantity > 0
             ORDER BY p.product_name, p.id'
        );
        $statement->execute(['shop_id' => $shopId, 'warehouse_id' => $warehouseId]);
    } else {
        $statement = $pdo->prepare(
            'SELECT id, product_name, product_code, category, brand, unit,
                    purchase_price, sale_price, current_stock, min_stock, tracks_serial_number
             FROM products WHERE shop_id = :shop_id ORDER BY product_name, id'
        );
        $statement->execute(['shop_id' => $shopId]);
    }
    $products = $statement->fetchAll();
    foreach ($products as &$product) {
        $product['id'] = (int) $product['id'];
        if (array_key_exists('available_stock', $product)) {
            $product['available_stock'] = (float) $product['available_stock'];
        }
        $product['tracks_serial_number'] = (bool) $product['tracks_serial_number'];
        $productId = $product['id'];
        $product['has_transactions'] = setupReferenceExists(
            $pdo,
            ['purchase_items', 'sales', 'sale_items', 'sales_items', 'warranty_items'],
            'product_id',
            $productId,
        ) || setupForeignKeyReferenceExists($pdo, 'products', $productId);
        $product['has_warehouse_stock'] = setupReferenceExists($pdo, ['warehouse_stock'], 'product_id', $productId);
        $product['can_delete'] = !$product['has_transactions']
            && !$product['has_warehouse_stock']
            && (float) $product['current_stock'] <= 0;
    }
    unset($product);
    respond(200, true, 'পণ্যের তালিকা পাওয়া গেছে।', ['products' => $products]);
} catch (PDOException $exception) {
    error_log('Purchase product listing failed: ' . $exception->getMessage());
    respond(500, false, 'পণ্যের তালিকা লোড করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
