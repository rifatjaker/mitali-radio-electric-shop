<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'বিক্রয় বিল সংরক্ষণ করতে POST অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'sales');
$shopId = authorizedShopId($user);
$body = requestJson();

function salesAmount(array $body, string $key, string $label): string
{
    $value = trim((string) ($body[$key] ?? '0'));
    if ($value === '') {
        return '0';
    }
    if (!preg_match('/^\d{1,10}(?:\.\d{1,2})?$/', $value)) {
        respond(422, false, "{$label} সঠিক টাকার অঙ্কে লিখুন।");
    }
    return $value;
}

function salesQuantityUnits(string $quantity): int
{
    [$whole, $fraction] = array_pad(explode('.', $quantity, 2), 2, '');
    return ((int) $whole * 1000) + (int) str_pad($fraction, 3, '0');
}

$customerId = null;
if (isset($body['customer_id']) && $body['customer_id'] !== '') {
    $customerId = filter_var($body['customer_id'], FILTER_VALIDATE_INT);
    if ($customerId === false || $customerId === null || $customerId < 1) {
        respond(422, false, 'সঠিক কাস্টমার নির্বাচন করুন।');
    }
}

$saleSource = (string) ($body['sale_source'] ?? 'shop');
$warehouseId = null;
$warehouseName = null;
if (!in_array($saleSource, ['shop', 'warehouse'], true)) {
    respond(422, false, 'বিক্রয়ের স্টকের উৎস নির্বাচন করুন।');
}
if ($saleSource === 'warehouse') {
    $warehouseId = filter_var($body['warehouse_id'] ?? null, FILTER_VALIDATE_INT);
    if ($warehouseId === false || $warehouseId === null || $warehouseId < 1) {
        respond(422, false, 'বিক্রয়ের জন্য একটি গুদাম নির্বাচন করুন।');
    }
} elseif (isset($body['warehouse_id']) && $body['warehouse_id'] !== '') {
    respond(422, false, 'দোকানের স্টক বাছাই করলে গুদাম নির্বাচন করা যাবে না।');
}

$customerName = trim((string) ($body['customer_name'] ?? ''));
$customerNameLength = function_exists('mb_strlen')
    ? mb_strlen($customerName, 'UTF-8')
    : strlen($customerName);
if ($customerNameLength > 180) {
    respond(422, false, 'কাস্টমারের নাম ১৮০ অক্ষরের মধ্যে লিখুন।');
}
$customerName = $customerName === '' ? null : $customerName;

$saleDate = trim((string) ($body['sale_date'] ?? date('Y-m-d')));
$parsedDate = DateTimeImmutable::createFromFormat('!Y-m-d', $saleDate);
if (!$parsedDate || $parsedDate->format('Y-m-d') !== $saleDate) {
    respond(422, false, 'সঠিক বিক্রয়ের তারিখ লিখুন।');
}

$paymentMethod = (string) ($body['payment_method'] ?? '');
if (!in_array($paymentMethod, ['cash', 'mobile_banking', 'credit'], true)) {
    respond(422, false, 'নগদ, মোবাইল ব্যাংকিং অথবা বাকি পেমেন্ট নির্বাচন করুন।');
}
$vatAmount = salesAmount($body, 'vat_amount', 'ভ্যাট');
$discountAmount = salesAmount($body, 'discount_amount', 'ডিসকাউন্ট');
$specialDiscountAmount = salesAmount($body, 'special_discount_amount', 'বিশেষ ছাড়');
$paymentReceived = salesAmount($body, 'payment_received', 'জমা');
$notes = trim((string) ($body['notes'] ?? ''));
if ((function_exists('mb_strlen') ? mb_strlen($notes, 'UTF-8') : strlen($notes)) > 500) {
    respond(422, false, 'নোট ৫০০ অক্ষরের মধ্যে লিখুন।');
}
$notes = $notes === '' ? null : $notes;

$items = $body['items'] ?? null;
$returns = $body['returns'] ?? [];
if (!is_array($items) || count($items) > 100 || !is_array($returns) || count($returns) > 100) {
    respond(422, false, 'বিক্রয় ও ফেরতের সারির সংখ্যা সঠিক নয়।');
}
if ($items === [] && $returns === []) {
    respond(422, false, 'বিক্রয়ের পণ্য অথবা ফেরত পণ্য যোগ করুন।');
}
if ($customerId === null && $returns !== [] && $customerName === null) {
    respond(422, false, 'ওয়াক-ইন কাস্টমারের পুরোনো পণ্য ফেরত দিতে কাস্টমারের নাম লিখুন।');
}

$validatedItems = [];
foreach ($items as $item) {
    if (!is_array($item)) {
        respond(422, false, 'বিক্রয়ের পণ্যের তথ্য সঠিক নয়।');
    }
    $productId = filter_var($item['product_id'] ?? null, FILTER_VALIDATE_INT);
    $quantity = trim((string) ($item['quantity'] ?? ''));
    $unitPrice = trim((string) ($item['unit_price'] ?? ''));
    if ($productId === false || $productId === null || $productId < 1) {
        respond(422, false, 'প্রতিটি বিক্রয় সারিতে পণ্য নির্বাচন করুন।');
    }
    if (!preg_match('/^\d{1,9}(?:\.\d{1,3})?$/', $quantity) || (float) $quantity <= 0) {
        respond(422, false, 'বিক্রয়ের পরিমাণ শূন্যের বেশি এবং সর্বোচ্চ ৩ দশমিক ঘরে লিখুন।');
    }
    if (!preg_match('/^\d{1,10}(?:\.\d{1,2})?$/', $unitPrice)) {
        respond(422, false, 'বিক্রয়মূল্য সঠিকভাবে লিখুন।');
    }
    $validatedItems[] = [
        'product_id' => (int) $productId,
        'quantity' => $quantity,
        'quantity_units' => salesQuantityUnits($quantity),
        'unit_price' => $unitPrice,
        'line_total' => round((float) $quantity * (float) $unitPrice, 2),
    ];
}

$validatedReturns = [];
$returnItemIds = [];
foreach ($returns as $return) {
    if (!is_array($return)) {
        respond(422, false, 'ফেরত পণ্যের তথ্য সঠিক নয়।');
    }
    $saleItemId = filter_var($return['sale_item_id'] ?? null, FILTER_VALIDATE_INT);
    $quantity = trim((string) ($return['quantity'] ?? ''));
    if ($saleItemId === false || $saleItemId === null || $saleItemId < 1) {
        respond(422, false, 'আগের বিক্রয় বিল থেকে ফেরত পণ্য নির্বাচন করুন।');
    }
    if (isset($returnItemIds[$saleItemId])) {
        respond(422, false, 'একই বিক্রয় পণ্যের ফেরত পরিমাণ এক সারিতে লিখুন।');
    }
    if (!preg_match('/^\d{1,9}(?:\.\d{1,3})?$/', $quantity) || (float) $quantity <= 0) {
        respond(422, false, 'ফেরত পরিমাণ শূন্যের বেশি এবং সর্বোচ্চ ৩ দশমিক ঘরে লিখুন।');
    }
    $returnItemIds[$saleItemId] = true;
    $validatedReturns[] = [
        'sale_item_id' => (int) $saleItemId,
        'quantity' => $quantity,
        'quantity_units' => salesQuantityUnits($quantity),
    ];
}
usort($validatedReturns, static fn(array $left, array $right): int => $left['sale_item_id'] <=> $right['sale_item_id']);

try {
    $pdo = database();
    $pdo->beginTransaction();

    $previousDue = 0.0;
    $resolvedCustomerName = $customerName;
    if ($customerId !== null) {
        $customerCheck = $pdo->prepare(
            'SELECT customer_name, mobile_number, address, current_balance FROM customers
             WHERE id = :id AND shop_id = :shop_id FOR UPDATE'
        );
        $customerCheck->execute(['id' => $customerId, 'shop_id' => $shopId]);
        $customer = $customerCheck->fetch();
        if (!$customer) {
            $pdo->rollBack();
            respond(422, false, 'নির্বাচিত কাস্টমার এই দোকানের নয়।');
        }
        $previousDue = (float) ($customer['current_balance'] ?? 0);
        $resolvedCustomerName = $customer['customer_name'];
    }

    $validatedReturnsWithSource = [];
    $returnedByProduct = [];
    $shopReturnedByProduct = [];
    $warehouseReturnedByProduct = [];
    $returnTotal = 0.0;
    $customerSaleCondition = $customerId === null
        ? 's.customer_id IS NULL AND s.customer_name = :customer_name'
        : 's.customer_id = :customer_id';
    $returnSource = $pdo->prepare(
        'SELECT si.id, si.sale_id, si.product_id, si.quantity, si.unit_price,
                s.customer_id, s.invoice_number, s.sale_source, s.warehouse_id,
                p.product_name, p.unit
         FROM sale_items si
         INNER JOIN sales s ON s.id = si.sale_id
         INNER JOIN products p ON p.id = si.product_id
         WHERE si.id = :item_id AND s.shop_id = :shop_id
           AND ' . $customerSaleCondition . '
         FOR UPDATE'
    );
    $returnedQuantity = $pdo->prepare(
        'SELECT COALESCE(SUM(quantity), 0) FROM sale_returns
         WHERE original_sale_item_id = :sale_item_id'
    );
    foreach ($validatedReturns as $return) {
        $returnParams = [
            'item_id' => $return['sale_item_id'],
            'shop_id' => $shopId,
        ];
        if ($customerId !== null) {
            $returnParams['customer_id'] = $customerId;
        } else {
            $returnParams['customer_name'] = $customerName;
        }
        $returnSource->execute($returnParams);
        $source = $returnSource->fetch();
        if (!$source) {
            $pdo->rollBack();
            respond(422, false, 'ফেরত পণ্যের বিক্রয় বিল নির্বাচিত কাস্টমার/দোকানের নয়।');
        }
        $returnedQuantity->execute(['sale_item_id' => $return['sale_item_id']]);
        $alreadyReturnedUnits = salesQuantityUnits((string) $returnedQuantity->fetchColumn());
        $soldUnits = salesQuantityUnits((string) $source['quantity']);
        if ($return['quantity_units'] > $soldUnits - $alreadyReturnedUnits) {
            $pdo->rollBack();
            respond(409, false, 'ফেরত পরিমাণ আগের বিলে অবশিষ্ট বিক্রয় পরিমাণের বেশি।');
        }
        $return['product_id'] = (int) $source['product_id'];
        $return['unit_price'] = (string) $source['unit_price'];
        $return['product_name'] = $source['product_name'];
        $return['unit'] = $source['unit'];
        $return['original_invoice_number'] = $source['invoice_number'];
        $return['sale_source'] = $source['sale_source'];
        $return['warehouse_id'] = $source['warehouse_id'] === null
            ? null
            : (int) $source['warehouse_id'];
        $return['line_total'] = round((float) $return['quantity'] * (float) $source['unit_price'], 2);
        $validatedReturnsWithSource[] = $return;
        $returnedByProduct[$return['product_id']] = ($returnedByProduct[$return['product_id']] ?? 0)
            + (float) $return['quantity'];
        if ($return['sale_source'] === 'warehouse') {
            $warehouseReturnedByProduct[$return['warehouse_id']][$return['product_id']] =
                ($warehouseReturnedByProduct[$return['warehouse_id']][$return['product_id']] ?? 0)
                + (float) $return['quantity'];
        } else {
            $shopReturnedByProduct[$return['product_id']] =
                ($shopReturnedByProduct[$return['product_id']] ?? 0) + (float) $return['quantity'];
        }
        $returnTotal += $return['line_total'];
    }

    $subtotal = array_sum(array_column($validatedItems, 'line_total'));
    $grossAmount = round($subtotal + (float) $vatAmount - (float) $discountAmount, 2);
    if ($grossAmount < 0) {
        $pdo->rollBack();
        respond(422, false, 'ছাড় ও ডিসকাউন্ট বিক্রয়মূল্য এবং ভ্যাটের চেয়ে বেশি হতে পারবে না।');
    }
    $invoiceAmount = round($grossAmount - $returnTotal - (float) $specialDiscountAmount, 2);
    $cashRefund = 0.0;
    if ($customerId === null) {
        $cashRefund = max(0, -$invoiceAmount);
        if ($invoiceAmount < 0) {
            if ((float) $paymentReceived !== 0.0) {
                $pdo->rollBack();
                respond(422, false, 'ওয়াক-ইন কাস্টমারের অতিরিক্ত রিটার্নের টাকা ফেরত দিন; নতুন জমা শূন্য রাখুন।');
            }
        } elseif (abs((float) $paymentReceived - $invoiceAmount) > 0.005) {
            $pdo->rollBack();
            respond(422, false, 'ওয়াক-ইন কাস্টমারের বিল সম্পূর্ণ পরিশোধ করুন অথবা কাস্টমার হিসেবে সংরক্ষণ করুন।');
        }
        if ($paymentMethod === 'credit') {
            $pdo->rollBack();
            respond(422, false, 'বাকিতে বিক্রির জন্য কাস্টমার নির্বাচন করুন।');
        }
    } else {
        if ($paymentMethod === 'credit' && (float) $paymentReceived !== 0.0) {
            $pdo->rollBack();
            respond(422, false, 'বাকি পেমেন্টে জমার পরিমাণ শূন্য রাখুন।');
        }
        if ($paymentMethod !== 'credit' && (float) $paymentReceived > max(0, $previousDue + $invoiceAmount)) {
            $pdo->rollBack();
            respond(422, false, 'জমার পরিমাণ বর্তমান বাকি ও বিলের মোটের বেশি।');
        }
        if ($paymentMethod !== 'credit' && (float) $paymentReceived === 0.0
            && $previousDue + $invoiceAmount > 0) {
            $pdo->rollBack();
            respond(422, false, 'জমা না থাকলে পেমেন্ট পদ্ধতি “বাকিতে” নির্বাচন করুন।');
        }
    }
    $presentDue = $customerId === null && $invoiceAmount < 0
        ? 0.0
        : round(
            ($customerId === null ? 0 : $previousDue)
            + $grossAmount
            - $returnTotal
            - (float) $paymentReceived,
            2
        );
    $netAmount = $customerId === null
        ? 0.0
        : round($presentDue - (float) $specialDiscountAmount, 2);

    $saleQuantities = [];
    foreach ($validatedItems as $item) {
        $saleQuantities[$item['product_id']] = ($saleQuantities[$item['product_id']] ?? 0)
            + (float) $item['quantity'];
    }
    $productIds = array_values(array_unique(array_merge(
        array_keys($saleQuantities),
        array_keys($returnedByProduct)
    )));
    sort($productIds, SORT_NUMERIC);
    $productNames = [];
    $productUnits = [];
    $productCosts = [];
    $productCheck = $pdo->prepare(
        'SELECT current_stock, product_name, purchase_price, unit
         FROM products WHERE id = :id AND shop_id = :shop_id FOR UPDATE'
    );
    foreach ($productIds as $productId) {
        $productCheck->execute(['id' => $productId, 'shop_id' => $shopId]);
        $product = $productCheck->fetch();
        if (!$product) {
            $pdo->rollBack();
            respond(422, false, 'বিক্রয় বা ফেরতের একটি পণ্য এই দোকানের নয়।');
        }
        $productNames[$productId] = $product['product_name'];
        $productUnits[$productId] = $product['unit'];
        $productCosts[$productId] = $product['purchase_price'] === null
            ? null
            : (float) $product['purchase_price'];
        if ($saleSource === 'shop'
            && (float) $product['current_stock'] + ($shopReturnedByProduct[$productId] ?? 0)
                < ($saleQuantities[$productId] ?? 0) - 0.000001) {
            $pdo->rollBack();
            respond(409, false, 'দোকানে পর্যাপ্ত স্টক নেই। পণ্যের স্টক পরীক্ষা করুন।');
        }
    }
    if ($saleSource === 'warehouse') {
        $warehouseCheck = $pdo->prepare('SELECT warehouse_name FROM warehouses WHERE id = :id FOR UPDATE');
        $warehouseCheck->execute(['id' => $warehouseId]);
        $warehouseName = $warehouseCheck->fetchColumn();
        if ($warehouseName === false) {
            $pdo->rollBack();
            respond(422, false, 'নির্বাচিত গুদামটি পাওয়া যায়নি।');
        }
        $warehouseStockCheck = $pdo->prepare(
            'SELECT quantity FROM warehouse_stock
             WHERE warehouse_id = :warehouse_id AND product_id = :product_id FOR UPDATE'
        );
        foreach ($saleQuantities as $productId => $quantity) {
            $warehouseStockCheck->execute([
                'warehouse_id' => $warehouseId,
                'product_id' => $productId,
            ]);
            $warehouseStock = $warehouseStockCheck->fetchColumn();
            if ($warehouseStock === false || (float) $warehouseStock + 0.000001 < $quantity) {
                $pdo->rollBack();
                respond(409, false, 'নির্বাচিত গুদামে পর্যাপ্ত স্টক নেই। পণ্যের স্টক পরীক্ষা করুন।');
            }
        }
    }

    $returnAllocationQuery = $pdo->prepare(
        'SELECT id, stock_cost_layer_id, quantity, returned_quantity,
                quantity - returned_quantity AS returnable_quantity
         FROM sale_cost_allocations
         WHERE sale_item_id = :sale_item_id
           AND returned_quantity < quantity
         ORDER BY id DESC
         FOR UPDATE'
    );
    $returnAllocationUpdate = $pdo->prepare(
        'UPDATE sale_cost_allocations
         SET returned_quantity = returned_quantity + :quantity
         WHERE id = :id'
    );
    $restoreLayer = $pdo->prepare(
        'UPDATE stock_cost_layers
         SET remaining_quantity = remaining_quantity + :quantity
         WHERE id = :id'
    );
    $legacyReturnLayer = $pdo->prepare(
        'INSERT INTO stock_cost_layers (
            shop_id, product_id, source_type, location_type, warehouse_id, initial_quantity,
            received_date, remaining_quantity, unit_cost
         ) VALUES (
            :shop_id, :product_id, \'return\', :location_type, :warehouse_id, :quantity,
            :received_date, :remaining_quantity, :unit_cost
         )'
    );
    foreach ($validatedReturnsWithSource as $return) {
        $returnAllocationQuery->execute(['sale_item_id' => $return['sale_item_id']]);
        $allocations = $returnAllocationQuery->fetchAll();
        if ($allocations === []) {
            if ($productCosts[$return['product_id']] === null) {
                $pdo->rollBack();
                respond(409, false, 'পুরোনো বিক্রয়ের ক্রয়মূল্য জানা নেই; পণ্যের ক্রয়মূল্য সেট করে ফেরত দিন।');
            }
            $legacyReturnLayer->execute([
                'shop_id' => $shopId,
                'product_id' => $return['product_id'],
                'location_type' => $return['sale_source'],
                'warehouse_id' => $return['warehouse_id'],
                'quantity' => $return['quantity'],
                'received_date' => date('Y-m-d'),
                'remaining_quantity' => $return['quantity'],
                'unit_cost' => $productCosts[$return['product_id']],
            ]);
            continue;
        }
        $quantityLeft = (float) $return['quantity'];
        $returnableQuantity = array_sum(array_map(
            static fn(array $allocation): float => (float) $allocation['returnable_quantity'],
            $allocations
        ));
        if ($returnableQuantity + 0.000001 < $quantityLeft) {
            $pdo->rollBack();
            respond(409, false, 'বিক্রয় ফেরতের ক্রয়-দর হিসাব মিলছে না; ফেরতের পরিমাণ যাচাই করুন।');
        }
        foreach ($allocations as $allocation) {
            if ($quantityLeft <= 0.000001) {
                break;
            }
            $restored = min($quantityLeft, (float) $allocation['returnable_quantity']);
            if ($restored <= 0) {
                continue;
            }
            $returnAllocationUpdate->execute([
                'quantity' => $restored,
                'id' => $allocation['id'],
            ]);
            $restoreLayer->execute([
                'quantity' => $restored,
                'id' => $allocation['stock_cost_layer_id'],
            ]);
            $quantityLeft -= $restored;
        }
    }

    $bill = $pdo->prepare(
        'INSERT INTO sales (
            shop_id, customer_id, sale_source, warehouse_id, customer_name, invoice_number, sale_date,
            subtotal, vat_amount, discount_amount, special_discount_amount,
            previous_due_amount, sales_return_amount, net_amount, payment_method,
            payment_received, cash_refund_amount, present_due, notes, created_by
         ) VALUES (
             :shop_id, :customer_id, :sale_source, :warehouse_id, :customer_name, :invoice_number, :sale_date,
            :subtotal, :vat_amount, :discount_amount, :special_discount_amount,
            :previous_due_amount, :sales_return_amount, :net_amount, :payment_method,
            :payment_received, :cash_refund_amount, :present_due, :notes, :created_by
         )'
    );
    $bill->execute([
        'shop_id' => $shopId,
        'customer_id' => $customerId,
        'sale_source' => $saleSource,
        'warehouse_id' => $warehouseId,
        'customer_name' => $resolvedCustomerName,
        'invoice_number' => null,
        'sale_date' => $saleDate,
        'subtotal' => $subtotal,
        'vat_amount' => $vatAmount,
        'discount_amount' => $discountAmount,
        'special_discount_amount' => $specialDiscountAmount,
        'previous_due_amount' => $previousDue,
        'sales_return_amount' => $returnTotal,
        'net_amount' => $netAmount,
        'payment_method' => $paymentMethod,
        'payment_received' => $paymentReceived,
        'cash_refund_amount' => $cashRefund,
        'present_due' => $presentDue,
        'notes' => $notes,
        'created_by' => $user['id'],
    ]);
    $saleId = (int) $pdo->lastInsertId();
    $invoiceNumber = sprintf('MRE-%d-%s-%06d', $shopId, date('ymd'), $saleId);
    $updateInvoice = $pdo->prepare('UPDATE sales SET invoice_number = :invoice_number WHERE id = :id');
    $updateInvoice->execute(['invoice_number' => $invoiceNumber, 'id' => $saleId]);
    $saleTimeQuery = $pdo->prepare('SELECT DATE_FORMAT(created_at, \'%H:%i\') FROM sales WHERE id = :id');
    $saleTimeQuery->execute(['id' => $saleId]);
    $saleTime = (string) $saleTimeQuery->fetchColumn();

    $saleItemInsert = $pdo->prepare(
        'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, line_total)
         VALUES (:sale_id, :product_id, :quantity, :unit_price, :line_total)'
    );
    $costLayerQuery = $pdo->prepare(
        'SELECT id, remaining_quantity, unit_cost
         FROM stock_cost_layers
         WHERE shop_id = :shop_id AND product_id = :product_id
           AND location_type = :location_type
           AND warehouse_id <=> :warehouse_id
           AND remaining_quantity > 0
         ORDER BY received_date, id
         FOR UPDATE'
    );
    $costLayerUpdate = $pdo->prepare(
        'UPDATE stock_cost_layers
         SET remaining_quantity = remaining_quantity - :quantity
         WHERE id = :id AND remaining_quantity >= :minimum_quantity'
    );
    $costAllocationInsert = $pdo->prepare(
        'INSERT INTO sale_cost_allocations (
            sale_item_id, stock_cost_layer_id, quantity,
            unit_cost, cost_total
         ) VALUES (
            :sale_item_id, :stock_cost_layer_id, :quantity,
            :unit_cost, :cost_total
         )'
    );
    foreach ($validatedItems as &$item) {
        $saleItemInsert->execute([
            'sale_id' => $saleId,
            'product_id' => $item['product_id'],
            'quantity' => $item['quantity'],
            'unit_price' => $item['unit_price'],
            'line_total' => $item['line_total'],
        ]);
        $saleItemId = (int) $pdo->lastInsertId();
        $item['product_name'] = $productNames[$item['product_id']];
        $item['unit'] = $productUnits[$item['product_id']];
        $costLayerQuery->execute([
            'shop_id' => $shopId,
            'product_id' => $item['product_id'],
            'location_type' => $saleSource,
            'warehouse_id' => $warehouseId,
        ]);
        $layers = $costLayerQuery->fetchAll();
        $availableCostStock = array_sum(array_map(
            static fn(array $layer): float => (float) $layer['remaining_quantity'],
            $layers
        ));
        $quantityLeft = (float) $item['quantity'];
        if ($availableCostStock + 0.000001 < $quantityLeft) {
            $pdo->rollBack();
            respond(409, false, 'নির্বাচিত স্থানের স্টকের ক্রয়-দর হিসাব বর্তমান স্টকের সাথে মিলছে না; স্টক কস্টিং মাইগ্রেশন যাচাই করুন।');
        }
        $item['cost_allocations'] = [];
        $item['cost_total'] = 0.0;
        $item['gross_profit'] = 0.0;
        foreach ($layers as $layer) {
            if ($quantityLeft <= 0.000001) {
                break;
            }
            $allocatedQuantity = min($quantityLeft, (float) $layer['remaining_quantity']);
            $unitCost = (float) $layer['unit_cost'];
            $costTotal = round($allocatedQuantity * $unitCost, 2);
            $revenue = round($allocatedQuantity * (float) $item['unit_price'], 2);
            $grossProfit = round($revenue - $costTotal, 2);
            $costLayerUpdate->execute([
                'quantity' => $allocatedQuantity,
                'minimum_quantity' => $allocatedQuantity,
                'id' => $layer['id'],
            ]);
            if ($costLayerUpdate->rowCount() !== 1) {
                $pdo->rollBack();
                respond(409, false, 'স্টকের ক্রয়-দর হিসাব আপডেট করা যায়নি; আবার চেষ্টা করুন।');
            }
            $costAllocationInsert->execute([
                'sale_item_id' => $saleItemId,
                'stock_cost_layer_id' => $layer['id'],
                'quantity' => $allocatedQuantity,
                'unit_cost' => $unitCost,
                'cost_total' => $costTotal,
            ]);
            $item['cost_allocations'][] = [
                'quantity' => $allocatedQuantity,
                'unit_cost' => $unitCost,
                'sale_unit_price' => (float) $item['unit_price'],
                'cost_total' => $costTotal,
                'gross_profit' => $grossProfit,
            ];
            $item['cost_total'] += $costTotal;
            $item['gross_profit'] += $grossProfit;
            $quantityLeft -= $allocatedQuantity;
        }
    }
    unset($item);

    $returnInsert = $pdo->prepare(
        'INSERT INTO sale_returns (sale_id, original_sale_item_id, return_date, quantity, unit_price, line_total)
         VALUES (:sale_id, :original_sale_item_id, :return_date, :quantity, :unit_price, :line_total)'
    );
    foreach ($validatedReturnsWithSource as $return) {
        $returnInsert->execute([
            'sale_id' => $saleId,
            'original_sale_item_id' => $return['sale_item_id'],
            'return_date' => date('Y-m-d'),
            'quantity' => $return['quantity'],
            'unit_price' => $return['unit_price'],
            'line_total' => $return['line_total'],
        ]);
    }

    $stockUpdate = $pdo->prepare(
        'UPDATE products SET current_stock = current_stock + :stock_change
         WHERE id = :id AND shop_id = :shop_id'
    );
    foreach ($productIds as $productId) {
        $stockChange = ($shopReturnedByProduct[$productId] ?? 0)
            - ($saleSource === 'shop' ? ($saleQuantities[$productId] ?? 0) : 0);
        if (abs($stockChange) <= 0.000001) {
            continue;
        }
        $stockUpdate->execute([
            'stock_change' => $stockChange,
            'id' => $productId,
            'shop_id' => $shopId,
        ]);
    }
    $warehouseStockChanges = $warehouseReturnedByProduct;
    if ($saleSource === 'warehouse') {
        foreach ($saleQuantities as $productId => $quantity) {
            $warehouseStockChanges[$warehouseId][$productId] =
                ($warehouseStockChanges[$warehouseId][$productId] ?? 0) - $quantity;
        }
    }
    $warehouseStockUpsert = $pdo->prepare(
        'INSERT INTO warehouse_stock (warehouse_id, product_id, quantity)
         VALUES (:warehouse_id, :product_id, :quantity)
         ON DUPLICATE KEY UPDATE quantity = quantity + :added_quantity'
    );
    foreach ($warehouseStockChanges as $sourceWarehouseId => $productChanges) {
        foreach ($productChanges as $productId => $stockChange) {
            if (abs($stockChange) <= 0.000001) {
                continue;
            }
            $warehouseStockUpsert->execute([
                'warehouse_id' => $sourceWarehouseId,
                'product_id' => $productId,
                'quantity' => $stockChange,
                'added_quantity' => $stockChange,
            ]);
        }
    }

    if ($customerId !== null) {
        $balanceUpdate = $pdo->prepare(
            'UPDATE customers SET current_balance = :current_balance WHERE id = :id AND shop_id = :shop_id'
        );
        $balanceUpdate->execute([
            'current_balance' => $netAmount,
            'id' => $customerId,
            'shop_id' => $shopId,
        ]);
    }
    $pdo->commit();
    respond(201, true, 'বিক্রয় বিল সংরক্ষণ হয়েছে।', [
        'sale' => [
            'id' => $saleId,
            'customer_id' => $customerId,
            'sale_source' => $saleSource,
            'warehouse_id' => $warehouseId,
            'warehouse_name' => $warehouseName,
            'invoice_number' => $invoiceNumber,
            'customer_name' => $resolvedCustomerName ?? 'ওয়াক-ইন কাস্টমার',
            'customer_mobile_number' => $customerId !== null ? ($customer['mobile_number'] ?? null) : null,
            'customer_address' => $customerId !== null ? ($customer['address'] ?? null) : null,
            'sale_date' => $saleDate,
            'sale_time' => $saleTime,
            'operator_name' => $user['display_name'],
            'subtotal' => $subtotal,
            'vat_amount' => (float) $vatAmount,
            'discount_amount' => (float) $discountAmount,
            'special_discount_amount' => (float) $specialDiscountAmount,
            'previous_due_amount' => $previousDue,
            'sales_return_amount' => $returnTotal,
            'net_amount' => $netAmount,
            'payment_method' => $paymentMethod,
            'payment_received' => (float) $paymentReceived,
            'cash_refund_amount' => $cashRefund,
            'present_due' => $presentDue,
            'items' => $validatedItems,
            'returns' => $validatedReturnsWithSource,
        ],
    ]);
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($exception->getCode() === '23000') {
        respond(409, false, 'বিল সংরক্ষণে একটি রেকর্ডের তথ্য মেলেনি; পণ্য ও কাস্টমার যাচাই করে আবার চেষ্টা করুন।');
    }
    error_log('Sale creation failed: ' . $exception->getMessage());
    respond(500, false, 'বিক্রয় বিল সংরক্ষণ করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
