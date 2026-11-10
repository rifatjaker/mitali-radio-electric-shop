<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'পণ্য সংরক্ষণ করতে POST অনুরোধ পাঠান।');
}

$currentUser = authenticatedUser();
requirePermission($currentUser, 'setup');
$shopId = authorizedShopId($currentUser);

$body = requestJson();
$productName = trim((string) ($body['product_name'] ?? ''));
if ($productName === '') {
    respond(422, false, 'পণ্যের নাম লিখুন।');
}
$nameLength = function_exists('mb_strlen')
    ? mb_strlen($productName, 'UTF-8')
    : strlen($productName);
if ($nameLength > 180) {
    respond(422, false, 'পণ্যের নাম ১৮০ অক্ষরের মধ্যে লিখুন।');
}

function optionalText(array $body, string $key, string $label, int $maxLength): ?string
{
    $value = trim((string) ($body[$key] ?? ''));
    if ($value === '') {
        return null;
    }

    $length = function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
    if ($length > $maxLength) {
        respond(422, false, "{$label} {$maxLength} অক্ষরের মধ্যে লিখুন।");
    }
    return $value;
}

function optionalDecimal(
    array $body,
    string $key,
    string $label,
    int $fractionDigits,
    bool $defaultToZero = false
): ?string {
    $value = trim((string) ($body[$key] ?? ''));
    if ($value === '') {
        return $defaultToZero ? '0' : null;
    }

    $pattern = '/^\d{1,10}(?:\.\d{1,' . $fractionDigits . '})?$/';
    if (!preg_match($pattern, $value)) {
        respond(422, false, "{$label} সঠিক সংখ্যায় লিখুন (সর্বোচ্চ {$fractionDigits} দশমিক ঘর)।");
    }
    return $value;
}

$productCode = optionalText($body, 'product_code', 'পণ্য কোড/বারকোড', 80);
$category = optionalText($body, 'category', 'ক্যাটাগরি', 100);
$brand = optionalText($body, 'brand', 'ব্র্যান্ড', 100);
$unit = optionalText($body, 'unit', 'ইউনিট', 40);
$purchasePrice = optionalDecimal($body, 'purchase_price', 'ক্রয়মূল্য', 2);
$salePrice = optionalDecimal($body, 'sale_price', 'বিক্রয়মূল্য', 2);
$currentStock = optionalDecimal($body, 'current_stock', 'বর্তমান স্টক', 3, true);
$minStock = optionalDecimal($body, 'min_stock', 'ন্যূনতম স্টক', 3, true);
$tracksSerialNumber = !empty($body['tracks_serial_number']) ? 1 : 0;
if ((float) $currentStock > 0 && $purchasePrice === null) {
    respond(422, false, 'প্রারম্ভিক স্টক দিলে তার ক্রয়মূল্যও লিখুন।');
}

try {
    $pdo = database();
    $pdo->beginTransaction();
    $statement = $pdo->prepare(
        'INSERT INTO products (
            shop_id, product_name, product_code, category, brand, unit,
            purchase_price, sale_price, current_stock, min_stock,
            tracks_serial_number, created_by
        ) VALUES (
            :shop_id, :product_name, :product_code, :category, :brand, :unit,
            :purchase_price, :sale_price, :current_stock, :min_stock,
            :tracks_serial_number, :created_by
        )'
    );
    $statement->execute([
        'shop_id' => $shopId,
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
        'created_by' => $currentUser['id'],
    ]);
    $productId = (int) $pdo->lastInsertId();
    if ((float) $currentStock > 0) {
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
            'received_date' => date('Y-m-d'),
            'remaining_quantity' => $currentStock,
            'unit_cost' => $purchasePrice ?? '0',
        ]);
    }

    $pdo->commit();
    respond(201, true, 'পণ্য সফলভাবে সংরক্ষণ হয়েছে।', [
        'product' => [
            'id' => $productId,
            'product_name' => $productName,
            'product_code' => $productCode,
        ],
    ]);
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($exception->getCode() === '23000' && $productCode !== null) {
        respond(409, false, 'এই পণ্য কোড/বারকোডটি আগে থেকেই ব্যবহৃত হয়েছে।');
    }
    error_log('Product creation failed: ' . $exception->getMessage());
    respond(500, false, 'পণ্য সংরক্ষণ করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
