<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'স্টক রিপোর্ট দেখতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'reports');
$shopId = authorizedShopId($user);

function stockReportDate(string $value, string $label): string
{
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    if (!$date || $date->format('Y-m-d') !== $value || $value > date('Y-m-d')) {
        respond(422, false, "{$label} সঠিক অতীত/আজকের তারিখ দিন।");
    }
    return $value;
}

$dateFrom = stockReportDate((string) ($_GET['date_from'] ?? date('Y-m-d')), 'শুরুর');
$dateTo = stockReportDate((string) ($_GET['date_to'] ?? date('Y-m-d')), 'শেষের');
if ($dateFrom > $dateTo) {
    respond(422, false, 'শুরুর তারিখ শেষের তারিখের পরে হতে পারবে না।');
}
$search = trim((string) ($_GET['search'] ?? ''));
if ((function_exists('mb_strlen') ? mb_strlen($search, 'UTF-8') : strlen($search)) > 120) {
    respond(422, false, 'পণ্য খোঁজার লেখা ১২০ অক্ষরের মধ্যে লিখুন।');
}
$category = trim((string) ($_GET['category'] ?? ''));
if ((function_exists('mb_strlen') ? mb_strlen($category, 'UTF-8') : strlen($category)) > 100) {
    respond(422, false, 'ক্যাটাগরি ১০০ অক্ষরের মধ্যে লিখুন।');
}
$productId = null;
if (isset($_GET['product_id']) && $_GET['product_id'] !== '') {
    $productId = filter_var($_GET['product_id'], FILTER_VALIDATE_INT);
    if ($productId === false || $productId === null || $productId < 1) {
        respond(422, false, 'সঠিক পণ্য নির্বাচন করুন।');
    }
}

try {
    $pdo = database();
    $statement = $pdo->prepare(
        'WITH movements AS (
            SELECT pi.product_id, pb.purchase_date AS movement_date, pi.quantity AS purchase_quantity,
                   0 AS sale_quantity, 0 AS customer_return_quantity,
                   0 AS supplier_return_quantity, 0 AS damage_quantity, 0 AS transfer_quantity
            FROM purchase_items pi
            INNER JOIN purchase_bills pb ON pb.id = pi.purchase_id
            WHERE pb.shop_id = :purchase_shop_id AND pb.destination_type = \'shop\'
            UNION ALL
            SELECT si.product_id, s.sale_date, 0, si.quantity, 0, 0, 0, 0
            FROM sale_items si
            INNER JOIN sales s ON s.id = si.sale_id
            WHERE s.shop_id = :sale_shop_id AND s.sale_source = \'shop\'
            UNION ALL
            SELECT si.product_id, sr.return_date, 0, 0, sr.quantity, 0, 0, 0
            FROM sale_returns sr
            INNER JOIN sale_items si ON si.id = sr.original_sale_item_id
            INNER JOIN sales s ON s.id = sr.sale_id
            INNER JOIN sales original_sale ON original_sale.id = si.sale_id
            WHERE s.shop_id = :customer_return_shop_id
              AND original_sale.sale_source = \'shop\'
            UNION ALL
            SELECT sri.product_id, sr.return_date, 0, 0, 0, sri.quantity, 0, 0
            FROM supplier_return_items sri
            INNER JOIN supplier_returns sr ON sr.id = sri.supplier_return_id
            WHERE sr.shop_id = :supplier_return_shop_id
            UNION ALL
            SELECT sa.product_id, sa.adjustment_date, 0, 0, 0, 0, sa.quantity, 0
            FROM stock_adjustments sa
            WHERE sa.shop_id = :damage_shop_id AND sa.adjustment_type = \'damage\'
            UNION ALL
            SELECT wsti.product_id, wst.transfer_date, 0, 0, 0, 0, 0, wsti.quantity
            FROM warehouse_stock_transfer_items wsti
            INNER JOIN warehouse_stock_transfers wst ON wst.id = wsti.transfer_id
            WHERE wst.shop_id = :transfer_shop_id
        ),
        totals AS (
            SELECT product_id,
                   SUM(CASE WHEN movement_date >= :opening_start
                       THEN purchase_quantity - sale_quantity + customer_return_quantity
                            - supplier_return_quantity - damage_quantity + transfer_quantity ELSE 0 END) AS delta_after_start,
                   SUM(CASE WHEN movement_date BETWEEN :period_start AND :period_end
                       THEN purchase_quantity ELSE 0 END) AS purchases,
                   SUM(CASE WHEN movement_date BETWEEN :sales_start AND :sales_end
                       THEN sale_quantity ELSE 0 END) AS sales,
                   SUM(CASE WHEN movement_date BETWEEN :customer_start AND :customer_end
                       THEN customer_return_quantity ELSE 0 END) AS customer_returns,
                   SUM(CASE WHEN movement_date BETWEEN :supplier_start AND :supplier_end
                       THEN supplier_return_quantity ELSE 0 END) AS supplier_returns,
                   SUM(CASE WHEN movement_date BETWEEN :damage_start AND :damage_end
                       THEN damage_quantity ELSE 0 END) AS damage,
                   SUM(CASE WHEN movement_date BETWEEN :transfer_start AND :transfer_end
                       THEN transfer_quantity ELSE 0 END) AS transfers
            FROM movements
            GROUP BY product_id
        )
        SELECT p.id AS product_id, p.product_name, p.product_code, p.category, p.unit,
               COALESCE(p.current_stock, 0) - COALESCE(t.delta_after_start, 0) AS previous_day_stock,
               COALESCE(t.purchases, 0) AS today_purchase,
               COALESCE(t.sales, 0) AS today_sale,
               COALESCE(t.customer_returns, 0) AS today_customer_return,
               COALESCE(t.supplier_returns, 0) AS today_supplier_return,
               COALESCE(t.damage, 0) AS today_damage,
               COALESCE(t.transfers, 0) AS today_transfer,
               COALESCE(p.current_stock, 0) - COALESCE(t.delta_after_start, 0)
                 + COALESCE(t.purchases, 0) - COALESCE(t.sales, 0)
                 + COALESCE(t.customer_returns, 0) - COALESCE(t.supplier_returns, 0)
                 - COALESCE(t.damage, 0) + COALESCE(t.transfers, 0) AS balance
        FROM products p
        LEFT JOIN totals t ON t.product_id = p.id
        WHERE p.shop_id = :products_shop_id
          AND (:product_filter = 0 OR p.id = :product_match)
          AND (:search_text = \'\' OR p.product_name LIKE :product_name_search
               OR p.product_code LIKE :product_code_search)
          AND (:category_filter = \'\' OR p.category = :category_match)
        ORDER BY p.product_name, p.id'
    );
    $searchPattern = '%' . $search . '%';
    $statement->execute([
        'purchase_shop_id' => $shopId,
        'sale_shop_id' => $shopId,
        'customer_return_shop_id' => $shopId,
        'supplier_return_shop_id' => $shopId,
        'damage_shop_id' => $shopId,
        'transfer_shop_id' => $shopId,
        'opening_start' => $dateFrom,
        'period_start' => $dateFrom,
        'period_end' => $dateTo,
        'sales_start' => $dateFrom,
        'sales_end' => $dateTo,
        'customer_start' => $dateFrom,
        'customer_end' => $dateTo,
        'supplier_start' => $dateFrom,
        'supplier_end' => $dateTo,
        'damage_start' => $dateFrom,
        'damage_end' => $dateTo,
        'transfer_start' => $dateFrom,
        'transfer_end' => $dateTo,
        'products_shop_id' => $shopId,
        'product_filter' => $productId ?? 0,
        'product_match' => $productId ?? 0,
        'search_text' => $search,
        'product_name_search' => $searchPattern,
        'product_code_search' => $searchPattern,
        'category_filter' => $category,
        'category_match' => $category,
    ]);
    $rows = $statement->fetchAll();
    foreach ($rows as &$row) {
        $row['product_id'] = (int) $row['product_id'];
        foreach ([
            'previous_day_stock',
            'today_purchase',
            'today_sale',
            'today_customer_return',
            'today_supplier_return',
            'today_damage',
            'today_transfer',
            'balance',
        ] as $field) {
            $row[$field] = (float) $row[$field];
        }
    }
    unset($row);
    $productsStatement = $pdo->prepare(
        'SELECT id AS product_id, product_name, product_code
         FROM products WHERE shop_id = :shop_id
         ORDER BY product_name, id'
    );
    $productsStatement->execute(['shop_id' => $shopId]);
    $products = $productsStatement->fetchAll();
    foreach ($products as &$product) {
        $product['product_id'] = (int) $product['product_id'];
    }
    unset($product);

    $categoriesStatement = $pdo->prepare(
        'SELECT DISTINCT category FROM products
         WHERE shop_id = :shop_id AND category IS NOT NULL AND TRIM(category) <> \'\'
         ORDER BY category'
    );
    $categoriesStatement->execute(['shop_id' => $shopId]);

    respond(200, true, 'স্টক রিপোর্ট তৈরি হয়েছে।', [
        'date_from' => $dateFrom,
        'date_to' => $dateTo,
        'rows' => $rows,
        'products' => $products,
        'categories' => array_column($categoriesStatement->fetchAll(), 'category'),
    ]);
} catch (PDOException $exception) {
    error_log('Stock report generation failed: ' . $exception->getMessage());
    respond(500, false, 'স্টক রিপোর্ট তৈরি করা যায়নি। stock_movement.sql migration চালানো হয়েছে কিনা পরীক্ষা করুন।');
}
