<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'ক্রয় চালান সম্পাদনা করতে POST অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'purchase');
if (!userHasPermission($user, 'can_edit')) {
    respond(403, false, 'ক্রয় চালান সম্পাদনার অনুমতি আপনার অ্যাকাউন্টে নেই।');
}
$shopId = authorizedShopId($user);
$body = requestJson();
$purchaseId = filter_var($body['purchase_id'] ?? null, FILTER_VALIDATE_INT);
$supplierId = filter_var($body['supplier_id'] ?? null, FILTER_VALIDATE_INT);
if ($purchaseId === false || $purchaseId === null || $purchaseId < 1
    || $supplierId === false || $supplierId === null || $supplierId < 1) {
    respond(422, false, 'সঠিক ক্রয় চালান ও সাপ্লায়ার নির্বাচন করুন।');
}

$destinationType = (string) ($body['destination_type'] ?? '');
if (!in_array($destinationType, ['shop', 'warehouse'], true)) {
    respond(422, false, 'পণ্যের গন্তব্য দোকান অথবা গুদাম নির্বাচন করুন।');
}
$warehouseId = null;
if ($destinationType === 'warehouse') {
    $warehouseId = filter_var($body['warehouse_id'] ?? null, FILTER_VALIDATE_INT);
    if ($warehouseId === false || $warehouseId === null || $warehouseId < 1) {
        respond(422, false, 'গুদাম নির্বাচন করুন।');
    }
}

$billNumber = trim((string) ($body['bill_number'] ?? ''));
if ((function_exists('mb_strlen') ? mb_strlen($billNumber, 'UTF-8') : strlen($billNumber)) > 80) {
    respond(422, false, 'চালান নম্বর ৮০ অক্ষরের মধ্যে লিখুন।');
}
$billNumber = $billNumber === '' ? null : $billNumber;
$purchaseDate = trim((string) ($body['purchase_date'] ?? ''));
$parsedDate = DateTimeImmutable::createFromFormat('!Y-m-d', $purchaseDate);
if (!$parsedDate || $parsedDate->format('Y-m-d') !== $purchaseDate || $purchaseDate > date('Y-m-d')) {
    respond(422, false, 'সঠিক অতীত/আজকের ক্রয়ের তারিখ লিখুন।');
}
$notes = trim((string) ($body['notes'] ?? ''));
if ((function_exists('mb_strlen') ? mb_strlen($notes, 'UTF-8') : strlen($notes)) > 500) {
    respond(422, false, 'নোট ৫০০ অক্ষরের মধ্যে লিখুন।');
}
$notes = $notes === '' ? null : $notes;
$items = $body['items'] ?? null;
if (!is_array($items) || count($items) < 1 || count($items) > 100) {
    respond(422, false, 'চালানে ১ থেকে ১০০টি পণ্য রাখুন।');
}

$validatedItems = [];
foreach ($items as $item) {
    if (!is_array($item)) {
        respond(422, false, 'চালানের পণ্যের তথ্য সঠিক নয়।');
    }
    $productId = filter_var($item['product_id'] ?? null, FILTER_VALIDATE_INT);
    $quantity = trim((string) ($item['quantity'] ?? ''));
    $unitPrice = trim((string) ($item['unit_price'] ?? ''));
    if ($productId === false || $productId === null || $productId < 1
        || !preg_match('/^(?:\d{1,9})(?:\.\d{1,3})?$/', $quantity) || (float) $quantity <= 0
        || !preg_match('/^\d{1,10}(?:\.\d{1,2})?$/', $unitPrice)) {
        respond(422, false, 'প্রতিটি পণ্যের পণ্য, পরিমাণ ও ক্রয়মূল্য সঠিকভাবে লিখুন।');
    }
    $validatedItems[] = [
        'product_id' => (int) $productId,
        'quantity' => $quantity,
        'unit_price' => $unitPrice,
    ];
}

try {
    $pdo = database();
    $pdo->beginTransaction();
    $billQuery = $pdo->prepare(
        'SELECT id, destination_type, warehouse_id
         FROM purchase_bills WHERE id = :id AND shop_id = :shop_id FOR UPDATE'
    );
    $billQuery->execute(['id' => $purchaseId, 'shop_id' => $shopId]);
    $oldLocation = $billQuery->fetch();
    if (!$oldLocation) {
        $pdo->rollBack();
        respond(404, false, 'ক্রয় চালানটি পাওয়া যায়নি।');
    }
    $supplierQuery = $pdo->prepare('SELECT id FROM suppliers WHERE id = :id AND shop_id = :shop_id');
    $supplierQuery->execute(['id' => $supplierId, 'shop_id' => $shopId]);
    if (!$supplierQuery->fetch()) {
        $pdo->rollBack();
        respond(422, false, 'নির্বাচিত সাপ্লায়ার এই দোকানের নয়।');
    }
    if ($destinationType === 'warehouse') {
        $warehouseQuery = $pdo->prepare('SELECT id FROM warehouses WHERE id = :id FOR UPDATE');
        $warehouseQuery->execute(['id' => $warehouseId]);
        if (!$warehouseQuery->fetch()) {
            $pdo->rollBack();
            respond(422, false, 'নির্বাচিত গুদামটি পাওয়া যায়নি।');
        }
    }

    $returnQuery = $pdo->prepare(
        'SELECT 1 FROM supplier_return_items sri
         INNER JOIN purchase_items pi ON pi.id = sri.original_purchase_item_id
         WHERE pi.purchase_id = :purchase_id LIMIT 1'
    );
    $returnQuery->execute(['purchase_id' => $purchaseId]);
    if ($returnQuery->fetchColumn()) {
        $pdo->rollBack();
        respond(409, false, 'সাপ্লায়ার রিটার্ন যুক্ত চালান সম্পাদনা করা যাবে না।');
    }

    $oldItemsQuery = $pdo->prepare(
        'SELECT pi.id, pi.product_id, pi.quantity, p.current_stock, pb.warehouse_id,
                scl.id AS layer_id, scl.remaining_quantity
         FROM purchase_items pi
         INNER JOIN products p ON p.id = pi.product_id AND p.shop_id = :shop_id
         LEFT JOIN stock_cost_layers scl ON scl.purchase_item_id = pi.id
         WHERE pi.purchase_id = :purchase_id
         ORDER BY pi.id
         FOR UPDATE'
    );
    $oldItemsQuery->execute(['shop_id' => $shopId, 'purchase_id' => $purchaseId]);
    $oldItems = $oldItemsQuery->fetchAll();
    if ($oldItems === []) {
        $pdo->rollBack();
        respond(409, false, 'চালানের পণ্যের তথ্য পাওয়া যায়নি; সম্পাদনা বন্ধ।');
    }

    $allocationCheck = $pdo->prepare(
        'SELECT 1 FROM sale_cost_allocations WHERE stock_cost_layer_id = :layer_id LIMIT 1'
    );
    $stockUpdateShop = $pdo->prepare(
        'UPDATE products SET current_stock = current_stock - :quantity
         WHERE id = :product_id AND shop_id = :shop_id AND current_stock >= :minimum_quantity'
    );
    $stockUpdateWarehouse = $pdo->prepare(
        'UPDATE warehouse_stock SET quantity = quantity - :quantity
         WHERE warehouse_id = :warehouse_id AND product_id = :product_id
           AND quantity >= :minimum_quantity'
    );
    $layerDelete = $pdo->prepare('DELETE FROM stock_cost_layers WHERE id = :id AND purchase_item_id = :purchase_item_id');
    foreach ($oldItems as $oldItem) {
        if ($oldItem['layer_id'] === null
            || abs((float) $oldItem['remaining_quantity'] - (float) $oldItem['quantity']) > 0.000001) {
            $pdo->rollBack();
            respond(409, false, 'এই চালানের পণ্য বিক্রি/স্থানান্তর/সমন্বয়ে ব্যবহৃত হয়েছে; সম্পাদনা করা যাবে না।');
        }
        $allocationCheck->execute(['layer_id' => $oldItem['layer_id']]);
        if ($allocationCheck->fetchColumn()) {
            $pdo->rollBack();
            respond(409, false, 'এই চালানের পণ্য বিক্রয় লেনদেনে ব্যবহৃত হয়েছে; সম্পাদনা করা যাবে না।');
        }
        if ($oldLocation['destination_type'] === 'shop') {
            $stockUpdateShop->execute([
                'quantity' => $oldItem['quantity'],
                'minimum_quantity' => $oldItem['quantity'],
                'product_id' => $oldItem['product_id'],
                'shop_id' => $shopId,
            ]);
        } else {
            $stockUpdateWarehouse->execute([
                'quantity' => $oldItem['quantity'],
                'minimum_quantity' => $oldItem['quantity'],
                'warehouse_id' => $oldLocation['warehouse_id'],
                'product_id' => $oldItem['product_id'],
            ]);
        }
        if ($stockUpdateShop->rowCount() !== 1 && $oldLocation['destination_type'] === 'shop') {
            $pdo->rollBack();
            respond(409, false, 'দোকানের বর্তমান স্টক থেকে পুরোনো ক্রয় পরিমাণ সমন্বয় করা যাচ্ছে না।');
        }
        if ($oldLocation['destination_type'] === 'warehouse' && $stockUpdateWarehouse->rowCount() !== 1) {
            $pdo->rollBack();
            respond(409, false, 'গুদামের বর্তমান স্টক থেকে পুরোনো ক্রয় পরিমাণ সমন্বয় করা যাচ্ছে না।');
        }
        $layerDelete->execute(['id' => $oldItem['layer_id'], 'purchase_item_id' => $oldItem['id']]);
    }
    $pdo->prepare('DELETE FROM purchase_items WHERE purchase_id = :purchase_id')
        ->execute(['purchase_id' => $purchaseId]);

    $billUpdate = $pdo->prepare(
        'UPDATE purchase_bills SET supplier_id = :supplier_id, destination_type = :destination_type,
            warehouse_id = :warehouse_id, bill_number = :bill_number, purchase_date = :purchase_date,
            notes = :notes WHERE id = :id AND shop_id = :shop_id'
    );
    $billUpdate->execute([
        'supplier_id' => $supplierId,
        'destination_type' => $destinationType,
        'warehouse_id' => $warehouseId,
        'bill_number' => $billNumber,
        'purchase_date' => $purchaseDate,
        'notes' => $notes,
        'id' => $purchaseId,
        'shop_id' => $shopId,
    ]);

    $productQuery = $pdo->prepare('SELECT id FROM products WHERE id = :id AND shop_id = :shop_id FOR UPDATE');
    $lineInsert = $pdo->prepare(
        'INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, line_total)
         VALUES (:purchase_id, :product_id, :quantity, :unit_price, ROUND(:line_quantity * :line_price, 2))'
    );
    $layerInsert = $pdo->prepare(
        'INSERT INTO stock_cost_layers (
            shop_id, product_id, source_type, location_type, warehouse_id, purchase_item_id,
            received_date, initial_quantity, remaining_quantity, unit_cost
         ) VALUES (
            :shop_id, :product_id, \'purchase\', :location_type, :warehouse_id, :purchase_item_id,
            :received_date, :quantity, :remaining_quantity, :unit_cost
         )'
    );
    $shopStockAdd = $pdo->prepare(
        'UPDATE products SET current_stock = current_stock + :quantity, purchase_price = :purchase_price
         WHERE id = :id AND shop_id = :shop_id'
    );
    $productPriceUpdate = $pdo->prepare('UPDATE products SET purchase_price = :purchase_price WHERE id = :id AND shop_id = :shop_id');
    $warehouseStockAdd = $pdo->prepare(
        'INSERT INTO warehouse_stock (warehouse_id, product_id, quantity)
         VALUES (:warehouse_id, :product_id, :quantity)
         ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)'
    );
    foreach ($validatedItems as $item) {
        $productQuery->execute(['id' => $item['product_id'], 'shop_id' => $shopId]);
        if (!$productQuery->fetch()) {
            $pdo->rollBack();
            respond(422, false, 'চালানের একটি পণ্য এই দোকানের নয়।');
        }
        $lineInsert->execute([
            'purchase_id' => $purchaseId,
            'product_id' => $item['product_id'],
            'quantity' => $item['quantity'],
            'unit_price' => $item['unit_price'],
            'line_quantity' => $item['quantity'],
            'line_price' => $item['unit_price'],
        ]);
        $purchaseItemId = (int) $pdo->lastInsertId();
        $layerInsert->execute([
            'shop_id' => $shopId,
            'product_id' => $item['product_id'],
            'location_type' => $destinationType,
            'warehouse_id' => $warehouseId,
            'purchase_item_id' => $purchaseItemId,
            'received_date' => $purchaseDate,
            'quantity' => $item['quantity'],
            'remaining_quantity' => $item['quantity'],
            'unit_cost' => $item['unit_price'],
        ]);
        if ($destinationType === 'shop') {
            $shopStockAdd->execute([
                'quantity' => $item['quantity'],
                'purchase_price' => $item['unit_price'],
                'id' => $item['product_id'],
                'shop_id' => $shopId,
            ]);
        } else {
            $productPriceUpdate->execute([
                'purchase_price' => $item['unit_price'],
                'id' => $item['product_id'],
                'shop_id' => $shopId,
            ]);
            $warehouseStockAdd->execute([
                'warehouse_id' => $warehouseId,
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'],
            ]);
        }
    }
    $pdo->prepare(
        'UPDATE purchase_bills SET total_amount = (
            SELECT COALESCE(SUM(line_total), 0) FROM purchase_items WHERE purchase_id = :purchase_id
         ) WHERE id = :id'
    )->execute(['purchase_id' => $purchaseId, 'id' => $purchaseId]);

    $pdo->commit();
    respond(200, true, 'ক্রয় চালানের তথ্য ও স্টক আপডেট হয়েছে।');
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($exception->getCode() === '23000' && $billNumber !== null) {
        respond(409, false, 'এই চালান নম্বরটি এই দোকানে আগে থেকেই ব্যবহৃত হয়েছে।');
    }
    error_log('Purchase update failed for user ' . $user['id'] . ': ' . $exception->getMessage());
    respond(500, false, 'ক্রয় চালান সম্পাদনা করা যায়নি।');
}
