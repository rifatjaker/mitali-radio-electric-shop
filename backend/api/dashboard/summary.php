<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'ড্যাশবোর্ডের সারাংশ দেখতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'overview');
$shopId = authorizedShopId($user);

try {
    $pdo = database();
    $statement = $pdo->prepare(
        'SELECT
            (
                SELECT COALESCE(SUM(
                    subtotal + vat_amount - discount_amount
                    - sales_return_amount - special_discount_amount
                ), 0)
                FROM sales
                WHERE shop_id = :sales_shop_id AND sale_date = CURRENT_DATE
            ) AS today_sales,
            (
                SELECT COALESCE(SUM(total_amount), 0)
                FROM purchase_bills
                WHERE shop_id = :purchase_shop_id AND purchase_date = CURRENT_DATE
            ) AS today_purchases,
            (
                SELECT COUNT(*)
                FROM products
                WHERE shop_id = :products_shop_id
            ) AS total_products,
            (
                SELECT COUNT(*)
                FROM customers
                WHERE shop_id = :customers_shop_id
            ) AS total_customers,
            (
                SELECT COUNT(*)
                FROM suppliers
                WHERE shop_id = :suppliers_shop_id
            ) AS total_suppliers,
            (
                SELECT COUNT(*)
                FROM bank_accounts
                WHERE shop_id = :bank_accounts_shop_id
            ) AS total_bank_accounts,
            (
                SELECT COUNT(*)
                FROM sales
                WHERE shop_id = :total_sales_shop_id
            ) AS total_sales,
            (
                SELECT COUNT(*)
                FROM purchase_bills
                WHERE shop_id = :total_purchases_shop_id
            ) AS total_purchases,
            (
                SELECT COUNT(*)
                FROM sale_returns sr
                INNER JOIN sales s ON s.id = sr.sale_id
                WHERE s.shop_id = :total_sales_returns_shop_id
            ) AS total_sales_returns,
            (
                SELECT COUNT(*)
                FROM supplier_returns
                WHERE shop_id = :total_supplier_returns_shop_id
            ) AS total_supplier_returns,
            (
                SELECT COUNT(*)
                FROM supplier_payments
                WHERE shop_id = :total_supplier_payments_shop_id
            ) AS total_supplier_payments,
            (
                SELECT COUNT(*)
                FROM customer_payments
                WHERE shop_id = :total_customer_payments_shop_id
            ) AS total_customer_payments,
            (
                SELECT COUNT(*)
                FROM stock_adjustments
                WHERE shop_id = :total_stock_damages_shop_id
            ) AS total_stock_damages,
            (
                SELECT COUNT(*)
                FROM warehouse_stock_transfers
                WHERE shop_id = :total_transfers_shop_id
            ) AS total_transfers,
            (
                SELECT COUNT(*)
                FROM users
                WHERE shop_id = :total_users_shop_id
            ) AS total_users,
            (
                SELECT COUNT(*)
                FROM shops
                WHERE is_active = 1
            ) AS total_shops,
            (
                SELECT COUNT(*)
                FROM warehouses
            ) AS total_warehouses,
            (
                SELECT COUNT(*)
                FROM warehouse_stock ws
                INNER JOIN products p ON p.id = ws.product_id
                WHERE p.shop_id = :warehouse_stock_shop_id AND ws.quantity > 0
            ) AS total_warehouse_stock_items'
    );
    $statement->execute([
        'sales_shop_id' => $shopId,
        'purchase_shop_id' => $shopId,
        'products_shop_id' => $shopId,
        'customers_shop_id' => $shopId,
        'suppliers_shop_id' => $shopId,
        'bank_accounts_shop_id' => $shopId,
        'total_sales_shop_id' => $shopId,
        'total_purchases_shop_id' => $shopId,
        'total_sales_returns_shop_id' => $shopId,
        'total_supplier_returns_shop_id' => $shopId,
        'total_supplier_payments_shop_id' => $shopId,
        'total_customer_payments_shop_id' => $shopId,
        'total_stock_damages_shop_id' => $shopId,
        'total_transfers_shop_id' => $shopId,
        'total_users_shop_id' => $shopId,
        'warehouse_stock_shop_id' => $shopId,
    ]);
    $summary = $statement->fetch();
    if (!$summary) {
        throw new RuntimeException('Dashboard summary query returned no result.');
    }

    $activityStatement = $pdo->prepare(
        'SELECT activity_type, activity_id, reference, party, amount, activity_date
         FROM (
            SELECT \'sale\' AS activity_type,
                   COALESCE(s.invoice_number, CONCAT(\'বিক্রয় #\', s.id)) AS reference,
                   COALESCE(NULLIF(s.customer_name, \'\'), c.customer_name, \'ওয়াক-ইন কাস্টমার\') AS party,
                   s.subtotal + s.vat_amount - s.discount_amount
                     - s.sales_return_amount - s.special_discount_amount AS amount,
                   s.sale_date AS activity_date,
                   s.created_at AS sort_date,
                   s.id AS activity_id
            FROM sales s
            LEFT JOIN customers c ON c.id = s.customer_id
            WHERE s.shop_id = :activity_sales_shop_id
            UNION ALL
            SELECT \'purchase\' AS activity_type,
                   COALESCE(pb.bill_number, CONCAT(\'ক্রয় #\', pb.id)) AS reference,
                   su.supplier_name AS party,
                   pb.total_amount AS amount,
                   pb.purchase_date AS activity_date,
                   pb.created_at AS sort_date,
                   pb.id AS activity_id
            FROM purchase_bills pb
            INNER JOIN suppliers su ON su.id = pb.supplier_id
            WHERE pb.shop_id = :activity_purchases_shop_id
            UNION ALL
            SELECT \'supplier_payment\' AS activity_type,
                   CONCAT(\'পেমেন্ট #\', sp.id) AS reference,
                   su.supplier_name AS party,
                   sp.payment_amount AS amount,
                   DATE(sp.created_at) AS activity_date,
                   sp.created_at AS sort_date,
                   sp.id AS activity_id
            FROM supplier_payments sp
            INNER JOIN suppliers su ON su.id = sp.supplier_id
            WHERE sp.shop_id = :activity_supplier_payments_shop_id
            UNION ALL
            SELECT \'customer_payment\' AS activity_type,
                   CONCAT(\'আদায় #\', cp.id) AS reference,
                   c.customer_name AS party,
                   cp.payment_amount AS amount,
                   DATE(cp.created_at) AS activity_date,
                   cp.created_at AS sort_date,
                   cp.id AS activity_id
            FROM customer_payments cp
            INNER JOIN customers c ON c.id = cp.customer_id
            WHERE cp.shop_id = :activity_customer_payments_shop_id
         ) activity
         ORDER BY sort_date DESC, activity_type, activity_id DESC
         LIMIT 10'
    );
    $activityStatement->execute([
        'activity_sales_shop_id' => $shopId,
        'activity_purchases_shop_id' => $shopId,
        'activity_supplier_payments_shop_id' => $shopId,
        'activity_customer_payments_shop_id' => $shopId,
    ]);

    respond(200, true, 'ড্যাশবোর্ডের সারাংশ পাওয়া গেছে।', [
        'today_sales' => (float) $summary['today_sales'],
        'today_purchases' => (float) $summary['today_purchases'],
        'total_products' => (int) $summary['total_products'],
        'total_customers' => (int) $summary['total_customers'],
        'total_suppliers' => (int) $summary['total_suppliers'],
        'total_bank_accounts' => (int) $summary['total_bank_accounts'],
        'total_sales' => (int) $summary['total_sales'],
        'total_purchases' => (int) $summary['total_purchases'],
        'total_sales_returns' => (int) $summary['total_sales_returns'],
        'total_supplier_returns' => (int) $summary['total_supplier_returns'],
        'total_supplier_payments' => (int) $summary['total_supplier_payments'],
        'total_customer_payments' => (int) $summary['total_customer_payments'],
        'total_stock_damages' => (int) $summary['total_stock_damages'],
        'total_transfers' => (int) $summary['total_transfers'],
        'total_users' => (int) $summary['total_users'],
        'total_shops' => (int) $summary['total_shops'],
        'total_warehouses' => (int) $summary['total_warehouses'],
        'total_warehouse_stock_items' => (int) $summary['total_warehouse_stock_items'],
        'warranty_claims' => null,
        'recent_activity' => $activityStatement->fetchAll(),
    ]);
} catch (PDOException $exception) {
    error_log('Dashboard summary failed: ' . $exception->getMessage());
    respond(500, false, 'ড্যাশবোর্ডের সারাংশ লোড করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
} catch (RuntimeException $exception) {
    error_log('Dashboard summary failed: ' . $exception->getMessage());
    respond(500, false, 'ড্যাশবোর্ডের সারাংশ লোড করা যায়নি।');
}
