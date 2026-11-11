<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(__DIR__) . '/delete-audit.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'ক্রয় চালান মুছতে POST অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'purchase');
if (!userHasPermission($user, 'can_delete')) {
    respond(403, false, 'ক্রয় চালান মুছার অনুমতি আপনার অ্যাকাউন্টে নেই।');
}
$shopId = authorizedShopId($user);
$body = requestJson();
$purchaseId = filter_var($body['purchase_id'] ?? null, FILTER_VALIDATE_INT);
if ($purchaseId === false || $purchaseId === null || $purchaseId < 1) {
    respond(422, false, 'সঠিক ক্রয় চালান নির্বাচন করুন।');
}
$reason = validatedDeletionReason($body);

try {
    $pdo = database();
    $pdo->beginTransaction();
    $billQuery = $pdo->prepare(
        'SELECT id, bill_number, destination_type, warehouse_id
         FROM purchase_bills WHERE id = :id AND shop_id = :shop_id FOR UPDATE'
    );
    $billQuery->execute(['id' => $purchaseId, 'shop_id' => $shopId]);
    $bill = $billQuery->fetch();
    if (!$bill) {
        $pdo->rollBack();
        respond(404, false, 'ক্রয় চালানটি পাওয়া যায়নি।');
    }

    $returnQuery = $pdo->prepare(
        'SELECT 1 FROM supplier_return_items sri
         INNER JOIN purchase_items pi ON pi.id = sri.original_purchase_item_id
         WHERE pi.purchase_id = :purchase_id LIMIT 1'
    );
    $returnQuery->execute(['purchase_id' => $purchaseId]);
    if ($returnQuery->fetchColumn()) {
        $pdo->rollBack();
        respond(409, false, 'সাপ্লায়ার রিটার্ন যুক্ত চালান মুছা যাবে না।');
    }

    $itemsQuery = $pdo->prepare(
        'SELECT pi.id, pi.product_id, pi.quantity,
                scl.id AS layer_id, scl.remaining_quantity,
                p.current_stock, ws.quantity AS warehouse_quantity
         FROM purchase_items pi
         INNER JOIN products p ON p.id = pi.product_id AND p.shop_id = :shop_id
         LEFT JOIN stock_cost_layers scl ON scl.purchase_item_id = pi.id
         LEFT JOIN warehouse_stock ws
           ON ws.warehouse_id = :warehouse_id AND ws.product_id = pi.product_id
         WHERE pi.purchase_id = :purchase_id
         ORDER BY pi.id
         FOR UPDATE'
    );
    $itemsQuery->execute([
        'shop_id' => $shopId,
        'warehouse_id' => $bill['warehouse_id'],
        'purchase_id' => $purchaseId,
    ]);
    $items = $itemsQuery->fetchAll();
    if ($items === []) {
        $pdo->rollBack();
        respond(409, false, 'চালানের পণ্যের তথ্য পাওয়া যায়নি; মুছা বন্ধ।');
    }

    $allocationCheck = $pdo->prepare(
        'SELECT 1 FROM sale_cost_allocations WHERE stock_cost_layer_id = :layer_id LIMIT 1'
    );
    $deleteShopStock = $pdo->prepare(
        'UPDATE products SET current_stock = current_stock - :quantity
         WHERE id = :product_id AND shop_id = :shop_id AND current_stock >= :minimum_quantity'
    );
    $deleteWarehouseStock = $pdo->prepare(
        'UPDATE warehouse_stock SET quantity = quantity - :quantity
         WHERE warehouse_id = :warehouse_id AND product_id = :product_id
           AND quantity >= :minimum_quantity'
    );
    $deleteLayer = $pdo->prepare(
        'DELETE FROM stock_cost_layers WHERE id = :id AND purchase_item_id = :purchase_item_id'
    );
    foreach ($items as $item) {
        if ($item['layer_id'] === null
            || abs((float) $item['remaining_quantity'] - (float) $item['quantity']) > 0.000001) {
            $pdo->rollBack();
            respond(409, false, 'এই চালানের পণ্য বিক্রি/স্থানান্তর/সমন্বয়ে ব্যবহৃত হয়েছে; মুছা যাবে না।');
        }
        $allocationCheck->execute(['layer_id' => $item['layer_id']]);
        if ($allocationCheck->fetchColumn()) {
            $pdo->rollBack();
            respond(409, false, 'এই চালানের পণ্য বিক্রয় লেনদেনে ব্যবহৃত হয়েছে; মুছা যাবে না।');
        }
        if ($bill['destination_type'] === 'shop') {
            $deleteShopStock->execute([
                'quantity' => $item['quantity'],
                'minimum_quantity' => $item['quantity'],
                'product_id' => $item['product_id'],
                'shop_id' => $shopId,
            ]);
            if ($deleteShopStock->rowCount() !== 1) {
                $pdo->rollBack();
                respond(409, false, 'বর্তমান দোকান স্টক থেকে এই ক্রয়ের পরিমাণ বাদ দেওয়া যাবে না।');
            }
        } else {
            $deleteWarehouseStock->execute([
                'quantity' => $item['quantity'],
                'minimum_quantity' => $item['quantity'],
                'warehouse_id' => $bill['warehouse_id'],
                'product_id' => $item['product_id'],
            ]);
            if ($deleteWarehouseStock->rowCount() !== 1) {
                $pdo->rollBack();
                respond(409, false, 'বর্তমান গুদাম স্টক থেকে এই ক্রয়ের পরিমাণ বাদ দেওয়া যাবে না।');
            }
        }
        $deleteLayer->execute(['id' => $item['layer_id'], 'purchase_item_id' => $item['id']]);
    }

    $billLabel = trim((string) ($bill['bill_number'] ?? ''));
    if ($billLabel === '') {
        $billLabel = 'ক্রয় #' . $purchaseId;
    }
    recordDeletionAudit($pdo, $shopId, $user, 'purchase', (int) $purchaseId, $billLabel, $reason);
    $pdo->prepare('DELETE FROM purchase_items WHERE purchase_id = :purchase_id')
        ->execute(['purchase_id' => $purchaseId]);
    $pdo->prepare('DELETE FROM purchase_bills WHERE id = :id AND shop_id = :shop_id')
        ->execute(['id' => $purchaseId, 'shop_id' => $shopId]);
    $pdo->commit();
    respond(200, true, 'ক্রয় চালান মুছে ফেলা হয়েছে এবং অব্যবহৃত স্টক সমন্বয় হয়েছে।');
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Purchase deletion failed for user ' . $user['id'] . ': ' . $exception->getMessage());
    respond(500, false, 'ক্রয় চালান মুছা যায়নি।');
}
