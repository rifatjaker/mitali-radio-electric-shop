<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'ক্রয় সংরক্ষণ করতে POST অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'purchase');
$shopId = authorizedShopId($user);
$body = requestJson();

$supplierId = filter_var($body['supplier_id'] ?? null, FILTER_VALIDATE_INT);
if ($supplierId === false || $supplierId === null || $supplierId < 1) {
    respond(422, false, 'সাপ্লায়ার নির্বাচন করুন।');
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
$billNumberLength = function_exists('mb_strlen')
    ? mb_strlen($billNumber, 'UTF-8')
    : strlen($billNumber);
if ($billNumberLength > 80) {
    respond(422, false, 'চালান নম্বর ৮০ অক্ষরের মধ্যে লিখুন।');
}
$billNumber = $billNumber === '' ? null : $billNumber;

$purchaseDate = trim((string) ($body['purchase_date'] ?? date('Y-m-d')));
$parsedDate = DateTimeImmutable::createFromFormat('!Y-m-d', $purchaseDate);
if (!$parsedDate || $parsedDate->format('Y-m-d') !== $purchaseDate) {
    respond(422, false, 'সঠিক ক্রয়ের তারিখ লিখুন।');
}

$notes = trim((string) ($body['notes'] ?? ''));
$notesLength = function_exists('mb_strlen') ? mb_strlen($notes, 'UTF-8') : strlen($notes);
if ($notesLength > 500) {
    respond(422, false, 'নোট ৫০০ অক্ষরের মধ্যে লিখুন।');
}
$notes = $notes === '' ? null : $notes;

$items = $body['items'] ?? null;
if (!is_array($items) || count($items) < 1 || count($items) > 100) {
    respond(422, false, 'চালানে ১ থেকে ১০০টি পণ্য যোগ করুন।');
}

$validatedItems = [];
foreach ($items as $item) {
    if (!is_array($item)) {
        respond(422, false, 'চালানের পণ্যের তথ্য সঠিক নয়।');
    }
    $productId = filter_var($item['product_id'] ?? null, FILTER_VALIDATE_INT);
    $quantity = trim((string) ($item['quantity'] ?? ''));
    $unitPrice = trim((string) ($item['unit_price'] ?? ''));
    if ($productId === false || $productId === null || $productId < 1) {
        respond(422, false, 'প্রতিটি সারিতে পণ্য নির্বাচন করুন।');
    }
    if (!preg_match('/^(?:\d{1,9})(?:\.\d{1,3})?$/', $quantity) || (float) $quantity <= 0) {
        respond(422, false, 'পণ্যের পরিমাণ শূন্যের বেশি এবং সর্বোচ্চ ৩ দশমিক ঘরে লিখুন।');
    }
    if (!preg_match('/^\d{1,10}(?:\.\d{1,2})?$/', $unitPrice)) {
        respond(422, false, 'প্রতি পণ্যের ক্রয়মূল্য সঠিকভাবে লিখুন।');
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

    $supplierCheck = $pdo->prepare(
        'SELECT id FROM suppliers WHERE id = :id AND shop_id = :shop_id FOR UPDATE'
    );
    $supplierCheck->execute(['id' => $supplierId, 'shop_id' => $shopId]);
    if (!$supplierCheck->fetch()) {
        $pdo->rollBack();
        respond(422, false, 'নির্বাচিত সাপ্লায়ার এই দোকানের নয়।');
    }

    if ($destinationType === 'warehouse') {
        $warehouseCheck = $pdo->prepare('SELECT id FROM warehouses WHERE id = :id FOR UPDATE');
        $warehouseCheck->execute(['id' => $warehouseId]);
        if (!$warehouseCheck->fetch()) {
            $pdo->rollBack();
            respond(422, false, 'নির্বাচিত গুদামটি পাওয়া যায়নি।');
        }
    }

    $bill = $pdo->prepare(
        'INSERT INTO purchase_bills (
            shop_id, supplier_id, destination_type, warehouse_id,
            bill_number, purchase_date, total_amount, notes, created_by
        ) VALUES (
            :shop_id, :supplier_id, :destination_type, :warehouse_id,
            :bill_number, :purchase_date, 0, :notes, :created_by
        )'
    );
    $bill->execute([
        'shop_id' => $shopId,
        'supplier_id' => $supplierId,
        'destination_type' => $destinationType,
        'warehouse_id' => $warehouseId,
        'bill_number' => $billNumber,
        'purchase_date' => $purchaseDate,
        'notes' => $notes,
        'created_by' => $user['id'],
    ]);
    $purchaseId = (int) $pdo->lastInsertId();

    $productCheck = $pdo->prepare(
        'SELECT id FROM products WHERE id = :id AND shop_id = :shop_id FOR UPDATE'
    );
    $lineInsert = $pdo->prepare(
        'INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, line_total)
         VALUES (:purchase_id, :product_id, :quantity, :unit_price, ROUND(:line_quantity * :line_price, 2))'
    );
    $costLayerInsert = $pdo->prepare(
        'INSERT INTO stock_cost_layers (
            shop_id, product_id, source_type, location_type, warehouse_id, purchase_item_id,
            received_date, initial_quantity, remaining_quantity, unit_cost
         ) VALUES (
            :shop_id, :product_id, \'purchase\', :location_type, :warehouse_id, :purchase_item_id,
            :received_date, :quantity, :remaining_quantity, :unit_cost
         )'
    );
    $shopStockUpdate = $pdo->prepare(
        'UPDATE products SET current_stock = current_stock + :quantity, purchase_price = :purchase_price
         WHERE id = :id AND shop_id = :shop_id'
    );
    $warehousePurchasePriceUpdate = $pdo->prepare(
        'UPDATE products SET purchase_price = :purchase_price WHERE id = :id AND shop_id = :shop_id'
    );
    $warehouseStockUpsert = $pdo->prepare(
        'INSERT INTO warehouse_stock (warehouse_id, product_id, quantity)
         VALUES (:warehouse_id, :product_id, :quantity)
         ON DUPLICATE KEY UPDATE quantity = quantity + :added_quantity'
    );

    foreach ($validatedItems as $item) {
        $productCheck->execute(['id' => $item['product_id'], 'shop_id' => $shopId]);
        if (!$productCheck->fetch()) {
            $pdo->rollBack();
            respond(422, false, 'চালানের একটি পণ্য এই দোকানের তালিকায় নেই।');
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
        $costLayerInsert->execute([
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
            $shopStockUpdate->execute([
                'quantity' => $item['quantity'],
                'purchase_price' => $item['unit_price'],
                'id' => $item['product_id'],
                'shop_id' => $shopId,
            ]);
        } else {
            $warehousePurchasePriceUpdate->execute([
                'purchase_price' => $item['unit_price'],
                'id' => $item['product_id'],
                'shop_id' => $shopId,
            ]);
            $warehouseStockUpsert->execute([
                'warehouse_id' => $warehouseId,
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'],
                'added_quantity' => $item['quantity'],
            ]);
        }
    }

    $totalStatement = $pdo->prepare(
        'UPDATE purchase_bills SET total_amount = (
            SELECT COALESCE(SUM(line_total), 0) FROM purchase_items WHERE purchase_id = :purchase_id
         ) WHERE id = :id'
    );
    $totalStatement->execute(['purchase_id' => $purchaseId, 'id' => $purchaseId]);
    $totalQuery = $pdo->prepare('SELECT total_amount FROM purchase_bills WHERE id = :id');
    $totalQuery->execute(['id' => $purchaseId]);
    $totalAmount = (string) $totalQuery->fetchColumn();

    $pdo->commit();
    respond(201, true, 'ক্রয় বিল সংরক্ষণ হয়েছে এবং স্টক আপডেট হয়েছে।', [
        'purchase' => [
            'id' => $purchaseId,
            'bill_number' => $billNumber,
            'purchase_date' => $purchaseDate,
            'destination_type' => $destinationType,
            'warehouse_id' => $warehouseId,
            'total_amount' => $totalAmount,
            'item_count' => count($validatedItems),
        ],
    ]);
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($exception->getCode() === '23000' && $billNumber !== null) {
        respond(409, false, 'এই চালান নম্বরটি এই দোকানে আগে থেকেই ব্যবহৃত হয়েছে।');
    }
    error_log('Purchase creation failed: ' . $exception->getMessage());
    respond(500, false, 'ক্রয় বিল সংরক্ষণ করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
