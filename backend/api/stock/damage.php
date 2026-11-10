<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'ড্যামেজ স্টক এন্ট্রি করতে POST অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'purchase');
$shopId = authorizedShopId($user);
$body = requestJson();
$productId = filter_var($body['product_id'] ?? null, FILTER_VALIDATE_INT);
if ($productId === false || $productId === null || $productId < 1) {
    respond(422, false, 'ড্যামেজ হওয়া পণ্য নির্বাচন করুন।');
}
$quantity = trim((string) ($body['quantity'] ?? ''));
if (!preg_match('/^\d{1,9}(?:\.\d{1,3})?$/', $quantity) || (float) $quantity <= 0) {
    respond(422, false, 'ড্যামেজের পরিমাণ শূন্যের বেশি এবং সর্বোচ্চ ৩ দশমিক ঘরে লিখুন।');
}
$adjustmentDate = trim((string) ($body['adjustment_date'] ?? date('Y-m-d')));
$parsedDate = DateTimeImmutable::createFromFormat('!Y-m-d', $adjustmentDate);
if (!$parsedDate || $parsedDate->format('Y-m-d') !== $adjustmentDate
    || $adjustmentDate > date('Y-m-d')) {
    respond(422, false, 'সঠিক ড্যামেজের তারিখ লিখুন।');
}
$notes = trim((string) ($body['notes'] ?? ''));
if ((function_exists('mb_strlen') ? mb_strlen($notes, 'UTF-8') : strlen($notes)) > 500) {
    respond(422, false, 'নোট ৫০০ অক্ষরের মধ্যে লিখুন।');
}
$notes = $notes === '' ? null : $notes;

try {
    $pdo = database();
    $pdo->beginTransaction();
    $productCheck = $pdo->prepare(
        'SELECT current_stock FROM products WHERE id = :id AND shop_id = :shop_id FOR UPDATE'
    );
    $productCheck->execute(['id' => $productId, 'shop_id' => $shopId]);
    $product = $productCheck->fetch();
    if (!$product) {
        $pdo->rollBack();
        respond(422, false, 'নির্বাচিত পণ্য এই দোকানের নয়।');
    }
    if ((float) $product['current_stock'] + 0.000001 < (float) $quantity) {
        $pdo->rollBack();
        respond(409, false, 'ড্যামেজের পরিমাণ বর্তমান দোকান স্টকের চেয়ে বেশি।');
    }
    $layerQuery = $pdo->prepare(
        'SELECT id, remaining_quantity
         FROM stock_cost_layers
        WHERE shop_id = :shop_id AND product_id = :product_id
          AND location_type = \'shop\' AND remaining_quantity > 0
         ORDER BY received_date, id
         FOR UPDATE'
    );
    $layerQuery->execute(['shop_id' => $shopId, 'product_id' => $productId]);
    $layers = $layerQuery->fetchAll();
    $quantityLeft = (float) $quantity;
    $layerUpdate = $pdo->prepare(
        'UPDATE stock_cost_layers
         SET remaining_quantity = remaining_quantity - :quantity
         WHERE id = :id AND remaining_quantity >= :minimum_quantity'
    );
    foreach ($layers as $layer) {
        if ($quantityLeft <= 0.000001) {
            break;
        }
        $used = min($quantityLeft, (float) $layer['remaining_quantity']);
        $layerUpdate->execute([
            'quantity' => $used,
            'minimum_quantity' => $used,
            'id' => $layer['id'],
        ]);
        if ($layerUpdate->rowCount() !== 1) {
            $pdo->rollBack();
            respond(409, false, 'স্টকের ক্রয়-দর হিসাব আপডেট করা যায়নি; আবার চেষ্টা করুন।');
        }
        $quantityLeft -= $used;
    }
    if ($quantityLeft > 0.000001) {
        $pdo->rollBack();
        respond(409, false, 'স্টকের ক্রয়-দর হিসাব বর্তমান স্টকের সাথে মিলছে না; স্টক কস্টিং মাইগ্রেশন যাচাই করুন।');
    }
    $insert = $pdo->prepare(
        'INSERT INTO stock_adjustments (
            shop_id, product_id, adjustment_type, adjustment_date, quantity, notes, created_by
         ) VALUES (
            :shop_id, :product_id, \'damage\', :adjustment_date, :quantity, :notes, :created_by
         )'
    );
    $insert->execute([
        'shop_id' => $shopId,
        'product_id' => $productId,
        'adjustment_date' => $adjustmentDate,
        'quantity' => $quantity,
        'notes' => $notes,
        'created_by' => $user['id'],
    ]);
    $update = $pdo->prepare(
        'UPDATE products SET current_stock = current_stock - :quantity
         WHERE id = :id AND shop_id = :shop_id'
    );
    $update->execute(['quantity' => $quantity, 'id' => $productId, 'shop_id' => $shopId]);
    $pdo->commit();
    respond(201, true, 'ড্যামেজ স্টক এন্ট্রি হয়েছে এবং দোকানের স্টক কমানো হয়েছে।');
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Damage stock adjustment failed: ' . $exception->getMessage());
    respond(500, false, 'ড্যামেজ স্টক সংরক্ষণ করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
