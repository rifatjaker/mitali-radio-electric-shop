<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(__DIR__) . '/delete-audit.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'বিক্রয় বিল মুছতে POST অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'sales');
if (!userHasPermission($user, 'can_delete')) {
    respond(403, false, 'বিক্রয় বিল মুছার অনুমতি আপনার অ্যাকাউন্টে নেই।');
}
$shopId = authorizedShopId($user);
$body = requestJson();
$saleId = filter_var($body['sale_id'] ?? null, FILTER_VALIDATE_INT);
if ($saleId === false || $saleId === null || $saleId < 1) {
    respond(422, false, 'সঠিক বিক্রয় বিল নির্বাচন করুন।');
}
$reason = validatedDeletionReason($body);

try {
    $pdo = database();
    $pdo->beginTransaction();
    $saleQuery = $pdo->prepare(
        'SELECT * FROM sales WHERE id = :id AND shop_id = :shop_id FOR UPDATE'
    );
    $saleQuery->execute(['id' => $saleId, 'shop_id' => $shopId]);
    $sale = $saleQuery->fetch();
    if (!$sale) {
        $pdo->rollBack();
        respond(404, false, 'বিক্রয় বিলটি পাওয়া যায়নি।');
    }

    $returnCheck = $pdo->prepare(
        'SELECT 1
         FROM sale_returns sr
         LEFT JOIN sale_items source_item ON source_item.id = sr.original_sale_item_id
         WHERE sr.sale_id = :sale_id OR source_item.sale_id = :source_sale_id
         LIMIT 1'
    );
    $returnCheck->execute(['sale_id' => $saleId, 'source_sale_id' => $saleId]);
    if ($returnCheck->fetchColumn()) {
        $pdo->rollBack();
        respond(409, false, 'এই বিলে কাস্টমার রিটার্ন যুক্ত আছে; রিটার্নযুক্ত বিল মুছা যাবে না।');
    }

    $itemQuery = $pdo->prepare(
        'SELECT id, product_id, quantity FROM sale_items WHERE sale_id = :sale_id FOR UPDATE'
    );
    $itemQuery->execute(['sale_id' => $saleId]);
    $items = $itemQuery->fetchAll();
    if ($sale['customer_id'] !== null) {
        $customerSaleCheck = $pdo->prepare(
            'SELECT 1 FROM sales WHERE shop_id = :shop_id AND customer_id = :customer_id
             AND id <> :sale_id AND created_at > :created_at LIMIT 1'
        );
        $customerSaleCheck->execute([
            'shop_id' => $shopId,
            'customer_id' => $sale['customer_id'],
            'sale_id' => $saleId,
            'created_at' => $sale['created_at'],
        ]);
        if ($customerSaleCheck->fetchColumn()) {
            $pdo->rollBack();
            respond(409, false, 'এই কাস্টমারের পরবর্তী বিক্রয় আছে; বকেয়ার হিসাব নিরাপদ রাখতে বিল মুছা বন্ধ।');
        }
    }

    $productIds = array_values(array_unique(array_map(
        static fn(array $item): int => (int) $item['product_id'],
        $items
    )));
    if ($productIds !== []) {
        $placeholders = implode(',', array_fill(0, count($productIds), '?'));
        $laterSaleCheck = $pdo->prepare(
            'SELECT 1 FROM sale_items target_item
             INNER JOIN sale_cost_allocations target_allocation ON target_allocation.sale_item_id = target_item.id
             INNER JOIN sale_cost_allocations later_allocation
               ON later_allocation.stock_cost_layer_id = target_allocation.stock_cost_layer_id
             INNER JOIN sale_items later_item ON later_item.id = later_allocation.sale_item_id
             INNER JOIN sales later ON later.id = later_item.sale_id
             WHERE target_item.sale_id = ? AND later.id <> ? AND later.created_at > ?
             LIMIT 1'
        );
        $laterSaleCheck->execute([$saleId, $saleId, $sale['created_at']]);
        if ($laterSaleCheck->fetchColumn()) {
            $pdo->rollBack();
            respond(409, false, 'এই বিলের FIFO স্টক পরবর্তী বিক্রয়ে ব্যবহৃত হয়েছে; বিল মুছা বন্ধ।');
        }
        $transferCheck = $pdo->prepare(
            'SELECT 1 FROM warehouse_stock_transfer_items ti
             INNER JOIN warehouse_stock_transfers t ON t.id = ti.transfer_id
             WHERE t.shop_id = ? AND t.created_at > ?
               AND ti.product_id IN (' . $placeholders . ')
               AND (? = \'shop\' OR t.warehouse_id = ?)
             LIMIT 1'
        );
        $transferCheck->execute(array_merge(
            [$shopId, $sale['created_at']],
            $productIds,
            [$sale['sale_source'], $sale['warehouse_id']]
        ));
        if ($transferCheck->fetchColumn()) {
            $pdo->rollBack();
            respond(409, false, 'এই বিলের পণ্যে পরবর্তী গুদাম স্থানান্তর আছে; বিল মুছা বন্ধ।');
        }
    }

    $restoreShopStock = $pdo->prepare(
        'UPDATE products SET current_stock = current_stock + :quantity
         WHERE id = :product_id AND shop_id = :shop_id'
    );
    $restoreWarehouseStock = $pdo->prepare(
        'INSERT INTO warehouse_stock (warehouse_id, product_id, quantity)
         VALUES (:warehouse_id, :product_id, :quantity)
         ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)'
    );
    foreach ($items as $item) {
        if ($sale['sale_source'] === 'shop') {
            $restoreShopStock->execute([
                'quantity' => $item['quantity'],
                'product_id' => $item['product_id'],
                'shop_id' => $shopId,
            ]);
        } else {
            $restoreWarehouseStock->execute([
                'warehouse_id' => $sale['warehouse_id'],
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'],
            ]);
        }
    }
    $allocationQuery = $pdo->prepare(
        'SELECT sca.id, sca.stock_cost_layer_id, sca.quantity
         FROM sale_cost_allocations sca
         INNER JOIN sale_items si ON si.id = sca.sale_item_id
         WHERE si.sale_id = :sale_id FOR UPDATE'
    );
    $allocationQuery->execute(['sale_id' => $saleId]);
    $restoreLayer = $pdo->prepare(
        'UPDATE stock_cost_layers SET remaining_quantity = remaining_quantity + :quantity WHERE id = :id'
    );
    foreach ($allocationQuery->fetchAll() as $allocation) {
        $restoreLayer->execute([
            'quantity' => $allocation['quantity'],
            'id' => $allocation['stock_cost_layer_id'],
        ]);
    }
    $deleteAllocations = $pdo->prepare(
        'DELETE sca FROM sale_cost_allocations sca
         INNER JOIN sale_items si ON si.id = sca.sale_item_id WHERE si.sale_id = :sale_id'
    );
    $deleteAllocations->execute(['sale_id' => $saleId]);
    $deleteItems = $pdo->prepare('DELETE FROM sale_items WHERE sale_id = :sale_id');
    $deleteItems->execute(['sale_id' => $saleId]);

    if ($sale['customer_id'] !== null) {
        $balanceUpdate = $pdo->prepare(
            'UPDATE customers
             SET current_balance = current_balance - (:net_amount - :previous_due)
             WHERE id = :customer_id AND shop_id = :shop_id'
        );
        $balanceUpdate->execute([
            'net_amount' => $sale['net_amount'],
            'previous_due' => $sale['previous_due_amount'],
            'customer_id' => $sale['customer_id'],
            'shop_id' => $shopId,
        ]);
    }
    $saleLabel = trim((string) ($sale['invoice_number'] ?? ''));
    if ($saleLabel === '') {
        $saleLabel = 'বিক্রয় #' . $saleId;
    }
    recordDeletionAudit($pdo, $shopId, $user, 'sale', (int) $saleId, $saleLabel, $reason);
    $deleteSale = $pdo->prepare('DELETE FROM sales WHERE id = :sale_id AND shop_id = :shop_id');
    $deleteSale->execute(['sale_id' => $saleId, 'shop_id' => $shopId]);
    $pdo->commit();
    respond(200, true, 'বিক্রয় বিল মুছে ফেলা হয়েছে।');
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Sale deletion failed for user ' . $user['id'] . ': ' . $exception->getMessage());
    respond(500, false, 'বিক্রয় বিল মুছা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
