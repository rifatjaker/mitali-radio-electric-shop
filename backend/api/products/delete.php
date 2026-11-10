<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/setup/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'পণ্য মুছতে POST অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'setup');
if (!setupCanDelete($user)) {
    respond(403, false, 'পণ্য মুছে ফেলার অনুমতি আপনার অ্যাকাউন্টে নেই।');
}
$shopId = authorizedShopId($user);
$body = requestJson();
$productId = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT);
if ($productId === false || $productId === null || $productId < 1) {
    respond(422, false, 'সঠিক পণ্য নির্বাচন করুন।');
}

try {
    $pdo = database();
    $pdo->beginTransaction();
    $statement = $pdo->prepare(
        'SELECT current_stock FROM products WHERE id = :id AND shop_id = :shop_id FOR UPDATE'
    );
    $statement->execute(['id' => $productId, 'shop_id' => $shopId]);
    $product = $statement->fetch();
    if (!$product) {
        $pdo->rollBack();
        respond(404, false, 'পণ্যটি পাওয়া যায়নি।');
    }

    $hasTransaction = setupReferenceExists(
        $pdo,
        ['purchase_items', 'sales', 'sale_items', 'sales_items', 'warranty_items'],
        'product_id',
        (int) $productId,
    ) || setupForeignKeyReferenceExists($pdo, 'products', (int) $productId);
    $hasWarehouseStock = setupReferenceExists($pdo, ['warehouse_stock'], 'product_id', (int) $productId);
    if ($hasTransaction || $hasWarehouseStock || (float) $product['current_stock'] > 0) {
        $pdo->rollBack();
        respond(409, false, 'ক্রয়/বিক্রয়/ওয়ারেন্টি লেনদেন বা স্টক থাকা পণ্য মুছবেন না। পণ্যের তথ্য সম্পাদনা করুন।');
    }

    $delete = $pdo->prepare('DELETE FROM products WHERE id = :id AND shop_id = :shop_id');
    $delete->execute(['id' => $productId, 'shop_id' => $shopId]);
    $pdo->commit();
    respond(200, true, 'পণ্য মুছে ফেলা হয়েছে।');
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($exception->getCode() === '23000') {
        respond(409, false, 'লেনদেনে ব্যবহৃত পণ্য মুছবেন না।');
    }
    error_log('Product deletion failed: ' . $exception->getMessage());
    respond(500, false, 'পণ্য মুছে ফেলা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}