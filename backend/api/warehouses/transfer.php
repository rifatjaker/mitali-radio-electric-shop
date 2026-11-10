<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'গুদাম থেকে দোকানে স্টক নিতে POST অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'purchase');
$shopId = authorizedShopId($user);
$body = requestJson();

$warehouseId = filter_var($body['warehouse_id'] ?? null, FILTER_VALIDATE_INT);
if ($warehouseId === false || $warehouseId === null || $warehouseId < 1) {
    respond(422, false, 'যে গুদাম থেকে স্টক নেবেন সেটি নির্বাচন করুন।');
}

$transferDate = trim((string) ($body['transfer_date'] ?? date('Y-m-d')));
$parsedDate = DateTimeImmutable::createFromFormat('!Y-m-d', $transferDate);
if (!$parsedDate || $parsedDate->format('Y-m-d') !== $transferDate
    || $transferDate > date('Y-m-d')) {
    respond(422, false, 'স্টক স্থানান্তরের সঠিক তারিখ লিখুন।');
}

$notes = trim((string) ($body['notes'] ?? ''));
if ((function_exists('mb_strlen') ? mb_strlen($notes, 'UTF-8') : strlen($notes)) > 500) {
    respond(422, false, 'নোট ৫০০ অক্ষরের মধ্যে লিখুন।');
}
$notes = $notes === '' ? null : $notes;

$items = $body['items'] ?? null;
if (!is_array($items) || count($items) < 1 || count($items) > 100) {
    respond(422, false, 'স্থানান্তরে ১ থেকে ১০০টি পণ্য যোগ করুন।');
}

$validatedItems = [];
$seenProductIds = [];
foreach ($items as $item) {
    if (!is_array($item)) {
        respond(422, false, 'স্থানান্তরের পণ্যের তথ্য সঠিক নয়।');
    }
    $productId = filter_var($item['product_id'] ?? null, FILTER_VALIDATE_INT);
    $quantity = trim((string) ($item['quantity'] ?? ''));
    if ($productId === false || $productId === null || $productId < 1) {
        respond(422, false, 'প্রতিটি সারিতে পণ্য নির্বাচন করুন।');
    }
    if (isset($seenProductIds[$productId])) {
        respond(422, false, 'একই পণ্য একাধিক সারিতে না দিয়ে পরিমাণ এক সারিতে লিখুন।');
    }
    if (!preg_match('/^\d{1,9}(?:\.\d{1,3})?$/', $quantity) || (float) $quantity <= 0) {
        respond(422, false, 'স্থানান্তরের পরিমাণ শূন্যের বেশি এবং সর্বোচ্চ ৩ দশমিক ঘরে লিখুন।');
    }
    $seenProductIds[$productId] = true;
    $validatedItems[] = [
        'product_id' => (int) $productId,
        'quantity' => $quantity,
    ];
}
usort($validatedItems, static fn(array $left, array $right): int => $left['product_id'] <=> $right['product_id']);

try {
    $pdo = database();
    $pdo->beginTransaction();

    $warehouseCheck = $pdo->prepare(
        'SELECT id FROM warehouses WHERE id = :id FOR UPDATE'
    );
    $warehouseCheck->execute(['id' => $warehouseId]);
    if (!$warehouseCheck->fetch()) {
        $pdo->rollBack();
        respond(422, false, 'নির্বাচিত গুদামটি পাওয়া যায়নি।');
    }

    $productCheck = $pdo->prepare(
        'SELECT id, product_name FROM products WHERE id = :id AND shop_id = :shop_id FOR UPDATE'
    );
    $warehouseStockCheck = $pdo->prepare(
        'SELECT quantity FROM warehouse_stock
         WHERE warehouse_id = :warehouse_id AND product_id = :product_id FOR UPDATE'
    );
    $costLayerQuery = $pdo->prepare(
        'SELECT id, remaining_quantity, unit_cost, received_date
         FROM stock_cost_layers
         WHERE shop_id = :shop_id AND product_id = :product_id
           AND location_type = \'warehouse\' AND warehouse_id = :warehouse_id
           AND remaining_quantity > 0
         ORDER BY received_date, id
         FOR UPDATE'
    );
    $validatedItemsWithLayers = [];
    foreach ($validatedItems as $item) {
        $productCheck->execute(['id' => $item['product_id'], 'shop_id' => $shopId]);
        $product = $productCheck->fetch();
        if (!$product) {
            $pdo->rollBack();
            respond(422, false, 'স্থানান্তরের একটি পণ্য এই দোকানের নয়।');
        }

        $warehouseStockCheck->execute([
            'warehouse_id' => $warehouseId,
            'product_id' => $item['product_id'],
        ]);
        $warehouseQuantity = $warehouseStockCheck->fetchColumn();
        if ($warehouseQuantity === false
            || (float) $warehouseQuantity + 0.000001 < (float) $item['quantity']) {
            $pdo->rollBack();
            respond(409, false, $product['product_name'] . ' পণ্যের গুদাম স্টক স্থানান্তরের জন্য যথেষ্ট নয়।');
        }

        $costLayerQuery->execute([
            'shop_id' => $shopId,
            'product_id' => $item['product_id'],
            'warehouse_id' => $warehouseId,
        ]);
        $layers = $costLayerQuery->fetchAll();
        $availableCostQuantity = array_sum(array_map(
            static fn(array $layer): float => (float) $layer['remaining_quantity'],
            $layers
        ));
        if ($availableCostQuantity + 0.000001 < (float) $item['quantity']) {
            $pdo->rollBack();
            respond(409, false, $product['product_name'] . ' পণ্যের FIFO ক্রয়দরের স্টক মিলছে না; স্টক কস্টিং মাইগ্রেশন পরীক্ষা করুন।');
        }
        $validatedItemsWithLayers[] = [
            ...$item,
            'product_name' => $product['product_name'],
            'layers' => $layers,
        ];
    }

    $transferInsert = $pdo->prepare(
        'INSERT INTO warehouse_stock_transfers (
            shop_id, warehouse_id, transfer_date, notes, created_by
         ) VALUES (
            :shop_id, :warehouse_id, :transfer_date, :notes, :created_by
         )'
    );
    $transferInsert->execute([
        'shop_id' => $shopId,
        'warehouse_id' => $warehouseId,
        'transfer_date' => $transferDate,
        'notes' => $notes,
        'created_by' => $user['id'],
    ]);
    $transferId = (int) $pdo->lastInsertId();

    $transferItemInsert = $pdo->prepare(
        'INSERT INTO warehouse_stock_transfer_items (transfer_id, product_id, quantity)
         VALUES (:transfer_id, :product_id, :quantity)'
    );
    $sourceLayerUpdate = $pdo->prepare(
        'UPDATE stock_cost_layers
         SET remaining_quantity = remaining_quantity - :quantity
         WHERE id = :id AND remaining_quantity >= :minimum_quantity'
    );
    $destinationLayerInsert = $pdo->prepare(
        'INSERT INTO stock_cost_layers (
            shop_id, product_id, source_type, location_type, warehouse_id,
            transfer_item_id, received_date, initial_quantity,
            remaining_quantity, unit_cost
         ) VALUES (
            :shop_id, :product_id, \'transfer\', \'shop\', NULL,
            :transfer_item_id, :received_date, :quantity,
            :remaining_quantity, :unit_cost
         )'
    );
    $warehouseStockUpdate = $pdo->prepare(
        'UPDATE warehouse_stock SET quantity = quantity - :quantity
         WHERE warehouse_id = :warehouse_id AND product_id = :product_id
           AND quantity >= :minimum_quantity'
    );
    $shopStockUpdate = $pdo->prepare(
        'UPDATE products SET current_stock = current_stock + :quantity
         WHERE id = :product_id AND shop_id = :shop_id'
    );

    foreach ($validatedItemsWithLayers as $item) {
        $transferItemInsert->execute([
            'transfer_id' => $transferId,
            'product_id' => $item['product_id'],
            'quantity' => $item['quantity'],
        ]);
        $transferItemId = (int) $pdo->lastInsertId();
        $quantityLeft = (float) $item['quantity'];
        foreach ($item['layers'] as $layer) {
            if ($quantityLeft <= 0.000001) {
                break;
            }
            $movedQuantity = min($quantityLeft, (float) $layer['remaining_quantity']);
            if ($movedQuantity <= 0) {
                continue;
            }
            $sourceLayerUpdate->execute([
                'quantity' => $movedQuantity,
                'minimum_quantity' => $movedQuantity,
                'id' => $layer['id'],
            ]);
            if ($sourceLayerUpdate->rowCount() !== 1) {
                $pdo->rollBack();
                respond(409, false, 'গুদামের FIFO স্টক আপডেট করা যায়নি; আবার চেষ্টা করুন।');
            }
            $destinationLayerInsert->execute([
                'shop_id' => $shopId,
                'product_id' => $item['product_id'],
                'transfer_item_id' => $transferItemId,
                'received_date' => $layer['received_date'],
                'quantity' => $movedQuantity,
                'remaining_quantity' => $movedQuantity,
                'unit_cost' => $layer['unit_cost'],
            ]);
            $quantityLeft -= $movedQuantity;
        }
        if ($quantityLeft > 0.000001) {
            $pdo->rollBack();
            respond(409, false, 'স্থানান্তরের FIFO ব্যাচের পরিমাণ মিলছে না।');
        }

        $warehouseStockUpdate->execute([
            'quantity' => $item['quantity'],
            'minimum_quantity' => $item['quantity'],
            'warehouse_id' => $warehouseId,
            'product_id' => $item['product_id'],
        ]);
        if ($warehouseStockUpdate->rowCount() !== 1) {
            $pdo->rollBack();
            respond(409, false, 'গুদামের স্টক আপডেট করা যায়নি; আবার চেষ্টা করুন।');
        }
        $shopStockUpdate->execute([
            'quantity' => $item['quantity'],
            'product_id' => $item['product_id'],
            'shop_id' => $shopId,
        ]);
        if ($shopStockUpdate->rowCount() !== 1) {
            $pdo->rollBack();
            respond(409, false, 'দোকানের স্টক আপডেট করা যায়নি; আবার চেষ্টা করুন।');
        }
    }

    $pdo->commit();
    respond(201, true, 'গুদাম থেকে দোকানে স্টক স্থানান্তর হয়েছে।', [
        'transfer' => [
            'id' => $transferId,
            'warehouse_id' => $warehouseId,
            'transfer_date' => $transferDate,
            'item_count' => count($validatedItemsWithLayers),
        ],
    ]);
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Warehouse stock transfer failed: ' . $exception->getMessage());
    respond(500, false, 'গুদাম থেকে দোকানে স্টক স্থানান্তর করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
