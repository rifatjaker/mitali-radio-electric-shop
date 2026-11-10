<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'সাপ্লায়ার রিটার্ন সংরক্ষণ করতে POST অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'purchase');
$shopId = authorizedShopId($user);
$body = requestJson();

$supplierId = filter_var($body['supplier_id'] ?? null, FILTER_VALIDATE_INT);
$purchaseBillId = filter_var($body['purchase_bill_id'] ?? null, FILTER_VALIDATE_INT);
if ($supplierId === false || $supplierId === null || $supplierId < 1
    || $purchaseBillId === false || $purchaseBillId === null || $purchaseBillId < 1) {
    respond(422, false, 'সাপ্লায়ার এবং মূল ক্রয় বিল নির্বাচন করুন।');
}

$returnDate = trim((string) ($body['return_date'] ?? date('Y-m-d')));
$parsedDate = DateTimeImmutable::createFromFormat('!Y-m-d', $returnDate);
if (!$parsedDate || $parsedDate->format('Y-m-d') !== $returnDate
    || $returnDate > date('Y-m-d')) {
    respond(422, false, 'সঠিক রিটার্নের তারিখ লিখুন।');
}
$notes = trim((string) ($body['notes'] ?? ''));
if ((function_exists('mb_strlen') ? mb_strlen($notes, 'UTF-8') : strlen($notes)) > 500) {
    respond(422, false, 'নোট ৫০০ অক্ষরের মধ্যে লিখুন।');
}
$notes = $notes === '' ? null : $notes;
$items = $body['items'] ?? null;
if (!is_array($items) || count($items) < 1 || count($items) > 100) {
    respond(422, false, 'রিটার্নে ১ থেকে ১০০টি পণ্য যোগ করুন।');
}

$validatedItems = [];
$seenPurchaseItems = [];
foreach ($items as $item) {
    if (!is_array($item)) {
        respond(422, false, 'রিটার্নের পণ্যের তথ্য সঠিক নয়।');
    }
    $purchaseItemId = filter_var($item['purchase_item_id'] ?? null, FILTER_VALIDATE_INT);
    $quantity = trim((string) ($item['quantity'] ?? ''));
    if ($purchaseItemId === false || $purchaseItemId === null || $purchaseItemId < 1) {
        respond(422, false, 'মূল ক্রয়ের একটি পণ্য নির্বাচন করুন।');
    }
    if (isset($seenPurchaseItems[$purchaseItemId])) {
        respond(422, false, 'একই পণ্যের রিটার্ন পরিমাণ এক সারিতে লিখুন।');
    }
    if (!preg_match('/^\d{1,9}(?:\.\d{1,3})?$/', $quantity) || (float) $quantity <= 0) {
        respond(422, false, 'রিটার্নের পরিমাণ শূন্যের বেশি এবং সর্বোচ্চ ৩ দশমিক ঘরে লিখুন।');
    }
    $seenPurchaseItems[$purchaseItemId] = true;
    $validatedItems[] = [
        'purchase_item_id' => (int) $purchaseItemId,
        'quantity' => $quantity,
    ];
}
usort($validatedItems, static fn(array $left, array $right): int => $left['purchase_item_id'] <=> $right['purchase_item_id']);

try {
    $pdo = database();
    $pdo->beginTransaction();
    $billCheck = $pdo->prepare(
        'SELECT id FROM purchase_bills
         WHERE id = :bill_id AND shop_id = :shop_id AND supplier_id = :supplier_id
           AND destination_type = \'shop\'
         FOR UPDATE'
    );
    $billCheck->execute([
        'bill_id' => $purchaseBillId,
        'shop_id' => $shopId,
        'supplier_id' => $supplierId,
    ]);
    if (!$billCheck->fetch()) {
        $pdo->rollBack();
        respond(422, false, 'নির্বাচিত মূল ক্রয় বিল এই সাপ্লায়ার/দোকানের নয় অথবা গুদামে নেওয়া হয়েছিল।');
    }

    $purchaseCheck = $pdo->prepare(
        'SELECT pi.id, pi.product_id, pi.quantity, pi.unit_price, p.product_name
         FROM purchase_items pi
         INNER JOIN products p ON p.id = pi.product_id
         WHERE pi.id = :purchase_item_id AND pi.purchase_id = :purchase_id
           AND p.shop_id = :shop_id'
    );
    $alreadyReturned = $pdo->prepare(
        'SELECT COALESCE(SUM(quantity), 0) FROM supplier_return_items
         WHERE original_purchase_item_id = :purchase_item_id'
    );
    $sources = [];
    $returnedByProduct = [];
    $totalAmount = 0.0;
    foreach ($validatedItems as $index => $item) {
        $purchaseCheck->execute([
            'purchase_item_id' => $item['purchase_item_id'],
            'purchase_id' => $purchaseBillId,
            'shop_id' => $shopId,
        ]);
        $source = $purchaseCheck->fetch();
        if (!$source) {
            $pdo->rollBack();
            respond(422, false, 'রিটার্নের একটি পণ্য মূল দোকান ক্রয় বিলে পাওয়া যায়নি।');
        }
        $alreadyReturned->execute(['purchase_item_id' => $item['purchase_item_id']]);
        $remaining = (float) $source['quantity'] - (float) $alreadyReturned->fetchColumn();
        if ((float) $item['quantity'] > $remaining + 0.000001) {
            $pdo->rollBack();
            respond(409, false, 'রিটার্নের পরিমাণ মূল বিলে অবশিষ্ট ক্রয় পরিমাণের বেশি।');
        }
        $returnedByProduct[$source['product_id']] = ($returnedByProduct[$source['product_id']] ?? 0)
            + (float) $item['quantity'];
        $lineTotal = round((float) $item['quantity'] * (float) $source['unit_price'], 2);
        $sources[$index] = [
            ...$item,
            'product_id' => (int) $source['product_id'],
            'product_name' => $source['product_name'],
            'unit_price' => (string) $source['unit_price'],
            'line_total' => $lineTotal,
        ];
        $totalAmount += $lineTotal;
    }

    $productIds = array_keys($returnedByProduct);
    sort($productIds, SORT_NUMERIC);
    $stockCheck = $pdo->prepare(
        'SELECT current_stock FROM products WHERE id = :product_id AND shop_id = :shop_id FOR UPDATE'
    );
    foreach ($productIds as $productId) {
        $stockCheck->execute(['product_id' => $productId, 'shop_id' => $shopId]);
        $stock = $stockCheck->fetch();
        if (!$stock || (float) $stock['current_stock'] < $returnedByProduct[$productId] - 0.000001) {
            $pdo->rollBack();
            respond(409, false, 'রিটার্নের জন্য দোকানে পর্যাপ্ত পণ্য স্টক নেই।');
        }
    }

    $sourceLayerQuery = $pdo->prepare(
        'SELECT id, remaining_quantity
         FROM stock_cost_layers
         WHERE purchase_item_id = :purchase_item_id
         FOR UPDATE'
    );
    $oldestLayerQuery = $pdo->prepare(
        'SELECT id, remaining_quantity
         FROM stock_cost_layers
        WHERE shop_id = :shop_id AND product_id = :product_id
          AND location_type = \'shop\' AND remaining_quantity > 0
         ORDER BY received_date, id
         FOR UPDATE'
    );
    $layerUpdate = $pdo->prepare(
        'UPDATE stock_cost_layers
         SET remaining_quantity = remaining_quantity - :quantity
         WHERE id = :id AND remaining_quantity >= :minimum_quantity'
    );
    foreach ($sources as $item) {
        $sourceLayerQuery->execute(['purchase_item_id' => $item['purchase_item_id']]);
        $layers = $sourceLayerQuery->fetchAll();
        if ($layers === []) {
            $oldestLayerQuery->execute([
                'shop_id' => $shopId,
                'product_id' => $item['product_id'],
            ]);
            $layers = $oldestLayerQuery->fetchAll();
        }
        $quantityLeft = (float) $item['quantity'];
        $available = array_sum(array_map(
            static fn(array $layer): float => (float) $layer['remaining_quantity'],
            $layers
        ));
        if ($available + 0.000001 < $quantityLeft) {
            $pdo->rollBack();
            respond(409, false, 'মূল ক্রয় ব্যাচে রিটার্নের জন্য পর্যাপ্ত অবশিষ্ট স্টক নেই।');
        }
        foreach ($layers as $layer) {
            if ($quantityLeft <= 0.000001) {
                break;
            }
            $used = min($quantityLeft, (float) $layer['remaining_quantity']);
            if ($used <= 0) {
                continue;
            }
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
    }

    $insertReturn = $pdo->prepare(
        'INSERT INTO supplier_returns (
            shop_id, supplier_id, purchase_bill_id, return_date, notes, created_by
         ) VALUES (
            :shop_id, :supplier_id, :purchase_bill_id, :return_date, :notes, :created_by
         )'
    );
    $insertReturn->execute([
        'shop_id' => $shopId,
        'supplier_id' => $supplierId,
        'purchase_bill_id' => $purchaseBillId,
        'return_date' => $returnDate,
        'notes' => $notes,
        'created_by' => $user['id'],
    ]);
    $returnId = (int) $pdo->lastInsertId();
    $insertItem = $pdo->prepare(
        'INSERT INTO supplier_return_items (
            supplier_return_id, original_purchase_item_id, product_id,
            quantity, unit_price, line_total
         ) VALUES (
            :supplier_return_id, :original_purchase_item_id, :product_id,
            :quantity, :unit_price, :line_total
         )'
    );
    foreach ($sources as $item) {
        $insertItem->execute([
            'supplier_return_id' => $returnId,
            'original_purchase_item_id' => $item['purchase_item_id'],
            'product_id' => $item['product_id'],
            'quantity' => $item['quantity'],
            'unit_price' => $item['unit_price'],
            'line_total' => $item['line_total'],
        ]);
    }
    $stockUpdate = $pdo->prepare(
        'UPDATE products SET current_stock = current_stock - :quantity
         WHERE id = :product_id AND shop_id = :shop_id'
    );
    foreach ($productIds as $productId) {
        $stockUpdate->execute([
            'quantity' => $returnedByProduct[$productId],
            'product_id' => $productId,
            'shop_id' => $shopId,
        ]);
    }
    $pdo->commit();
    respond(201, true, 'সাপ্লায়ার রিটার্ন সংরক্ষিত হয়েছে এবং দোকানের স্টক কমানো হয়েছে।', [
        'return_id' => $returnId,
        'total_amount' => round($totalAmount, 2),
    ]);
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Supplier return creation failed: ' . $exception->getMessage());
    respond(500, false, 'সাপ্লায়ার রিটার্ন সংরক্ষণ করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
