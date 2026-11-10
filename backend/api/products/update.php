<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/setup/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'পণ্যের তথ্য পরিবর্তন করতে POST অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'setup');
if (!userHasPermission($user, 'can_edit')) {
    respond(403, false, 'পণ্য সম্পাদনার অনুমতি আপনার অ্যাকাউন্টে নেই।');
}
$shopId = authorizedShopId($user);
$body = requestJson();
$productId = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT);
if ($productId === false || $productId === null || $productId < 1) {
    respond(422, false, 'সঠিক পণ্য নির্বাচন করুন।');
}

$productName = trim((string) ($body['product_name'] ?? ''));
if ($productName === '') {
    respond(422, false, 'পণ্যের নাম লিখুন।');
}
if ((function_exists('mb_strlen') ? mb_strlen($productName, 'UTF-8') : strlen($productName)) > 180) {
    respond(422, false, 'পণ্যের নাম ১৮০ অক্ষরের মধ্যে লিখুন।');
}

function productUpdateText(array $body, string $key, string $label, int $maxLength): ?string
{
    $value = trim((string) ($body[$key] ?? ''));
    $length = function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
    if ($length > $maxLength) {
        respond(422, false, "{$label} {$maxLength} অক্ষরের মধ্যে লিখুন।");
    }
    return $value === '' ? null : $value;
}

function productUpdateDecimal(array $body, string $key, string $label, int $scale, bool $required): ?string
{
    $value = trim((string) ($body[$key] ?? ''));
    if ($value === '') {
        if ($required) {
            respond(422, false, "{$label} লিখুন।");
        }
        return null;
    }
    if (!preg_match('/^\d{1,10}(?:\.\d{1,' . $scale . '})?$/', $value)) {
        respond(422, false, "{$label} সঠিক সংখ্যায় লিখুন।");
    }
    return $value;
}

$productCode = productUpdateText($body, 'product_code', 'পণ্য কোড/বারকোড', 80);
$category = productUpdateText($body, 'category', 'ক্যাটাগরি', 100);
$brand = productUpdateText($body, 'brand', 'ব্র্যান্ড', 100);
$unit = productUpdateText($body, 'unit', 'ইউনিট', 40);
$purchasePrice = productUpdateDecimal($body, 'purchase_price', 'ক্রয়মূল্য', 2, false);
$salePrice = productUpdateDecimal($body, 'sale_price', 'বিক্রয়মূল্য', 2, false);
$currentStock = productUpdateDecimal($body, 'current_stock', 'বর্তমান স্টক', 3, true);
$minStock = productUpdateDecimal($body, 'min_stock', 'ন্যূনতম স্টক সীমা', 3, true);
$tracksSerialNumber = !empty($body['tracks_serial_number']) ? 1 : 0;

try {
    $pdo = database();
    $pdo->beginTransaction();
    $existingStatement = $pdo->prepare(
        'SELECT current_stock FROM products WHERE id = :id AND shop_id = :shop_id FOR UPDATE'
    );
    $existingStatement->execute(['id' => $productId, 'shop_id' => $shopId]);
    $existing = $existingStatement->fetch();
    if (!$existing) {
        $pdo->rollBack();
        respond(404, false, 'পণ্যটি পাওয়া যায়নি।');
    }
    if ((setupReferenceExists(
        $pdo,
        ['purchase_items', 'sales', 'sale_items', 'sales_items', 'warranty_items', 'warehouse_stock', 'stock_cost_layers'],
        'product_id',
        (int) $productId,
    ) || setupForeignKeyReferenceExists($pdo, 'products', (int) $productId))
        && number_format((float) $currentStock, 3, '.', '') !== number_format((float) $existing['current_stock'], 3, '.', '')) {
        $pdo->rollBack();
        respond(409, false, 'লেনদেনে ব্যবহৃত পণ্যের স্টক সরাসরি পরিবর্তন করা যাবে না।');
    }

    $statement = $pdo->prepare(
        'UPDATE products SET product_name = :product_name, product_code = :product_code,
         category = :category, brand = :brand, unit = :unit,
         purchase_price = :purchase_price, sale_price = :sale_price,
         current_stock = :current_stock, min_stock = :min_stock,
         tracks_serial_number = :tracks_serial_number
         WHERE id = :id AND shop_id = :shop_id'
    );
    $statement->execute([
        'product_name' => $productName,
        'product_code' => $productCode,
        'category' => $category,
        'brand' => $brand,
        'unit' => $unit,
        'purchase_price' => $purchasePrice,
        'sale_price' => $salePrice,
        'current_stock' => $currentStock,
        'min_stock' => $minStock,
        'tracks_serial_number' => $tracksSerialNumber,
        'id' => $productId,
        'shop_id' => $shopId,
    ]);
    if ((float) $currentStock > 0) {
        $costLayerCheck = $pdo->prepare(
            'SELECT 1 FROM stock_cost_layers WHERE product_id = :product_id LIMIT 1'
        );
        $costLayerCheck->execute(['product_id' => $productId]);
        $hasCostLayer = (bool) $costLayerCheck->fetchColumn();
        if (!$hasCostLayer && $purchasePrice === null) {
            $pdo->rollBack();
            respond(422, false, 'প্রারম্ভিক স্টকের ক্রয়মূল্য লিখে সংরক্ষণ করুন।');
        }
        if (!$hasCostLayer) {
            $costLayer = $pdo->prepare(
                'INSERT INTO stock_cost_layers (
                    shop_id, product_id, source_type, initial_quantity,
                    received_date, remaining_quantity, unit_cost
                 ) VALUES (
                    :shop_id, :product_id, \'opening\', :quantity,
                    :received_date, :remaining_quantity, :unit_cost
                 )'
            );
            $costLayer->execute([
                'shop_id' => $shopId,
                'product_id' => $productId,
                'quantity' => $currentStock,
                'received_date' => '1000-01-01',
                'remaining_quantity' => $currentStock,
                'unit_cost' => $purchasePrice,
            ]);
        }
    }
    $pdo->commit();
    respond(200, true, 'পণ্যের তথ্য আপডেট হয়েছে।');
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($exception->getCode() === '23000' && $productCode !== null) {
        respond(409, false, 'এই পণ্য কোড/বারকোডটি আগে থেকেই ব্যবহৃত হয়েছে।');
    }
    error_log('Product update failed: ' . $exception->getMessage());
    respond(500, false, 'পণ্যের তথ্য আপডেট করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}