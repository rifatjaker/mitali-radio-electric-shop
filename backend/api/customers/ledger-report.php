<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'কাস্টমার লেজার দেখতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'reports');
$shopId = authorizedShopId($user);

function customerLedgerDate(string $value, string $label): string
{
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    if (!$date || $date->format('Y-m-d') !== $value || $value > date('Y-m-d')) {
        respond(422, false, "{$label} সঠিক অতীত/আজকের তারিখ দিন।");
    }
    return $value;
}

$today = date('Y-m-d');
$dateFrom = customerLedgerDate((string) ($_GET['date_from'] ?? date('Y-m-01')), 'শুরুর');
$dateTo = customerLedgerDate((string) ($_GET['date_to'] ?? $today), 'শেষের');
if ($dateFrom > $dateTo) {
    respond(422, false, 'শুরুর তারিখ শেষের তারিখের পরে হতে পারবে না।');
}
$customerId = null;
if (isset($_GET['customer_id']) && $_GET['customer_id'] !== '') {
    $customerId = filter_var($_GET['customer_id'], FILTER_VALIDATE_INT);
    if ($customerId === false || $customerId < 1) {
        respond(422, false, 'সঠিক কাস্টমার নির্বাচন করুন।');
    }
}

try {
    $pdo = database();
    $customerQuery = $pdo->prepare(
        'SELECT id, customer_name, mobile_number, address, opening_balance, current_balance
         FROM customers WHERE shop_id = :shop_id ORDER BY customer_name, id'
    );
    $customerQuery->execute(['shop_id' => $shopId]);
    $customers = $customerQuery->fetchAll();
    foreach ($customers as &$customer) {
        $customer['id'] = (int) $customer['id'];
        $customer['opening_balance'] = (float) ($customer['opening_balance'] ?? 0);
        $customer['current_balance'] = (float) ($customer['current_balance'] ?? 0);
    }
    unset($customer);

    if ($customerId === null) {
        respond(200, true, 'কাস্টমার নির্বাচন করে লেজার দেখুন।', [
            'customers' => $customers,
            'customer' => null,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'opening_balance' => null,
            'closing_balance' => null,
            'current_balance' => null,
            'summary' => ['debit' => 0.0, 'credit' => 0.0, 'transaction_count' => 0],
            'rows' => [],
            'limit' => 5000,
            'truncated' => false,
        ]);
    }

    $selectedCustomer = null;
    foreach ($customers as $customer) {
        if ($customer['id'] === $customerId) {
            $selectedCustomer = $customer;
            break;
        }
    }
    if ($selectedCustomer === null) {
        respond(404, false, 'নির্বাচিত কাস্টমার এই দোকানে পাওয়া যায়নি।');
    }

    $openingQuery = $pdo->prepare(
        'SELECT COALESCE(c.opening_balance, 0)
             + COALESCE((
                 SELECT SUM(s.subtotal + s.vat_amount - s.discount_amount
                            - s.special_discount_amount - s.payment_received)
                 FROM sales s
                 WHERE s.shop_id = :sales_shop_id AND s.customer_id = :sales_customer_id
                   AND s.sale_date < :sales_date_from
             ), 0)
             - COALESCE((
                 SELECT SUM(sr.line_total)
                 FROM sale_returns sr
                 INNER JOIN sales return_sale ON return_sale.id = sr.sale_id
                 WHERE return_sale.shop_id = :returns_shop_id
                   AND return_sale.customer_id = :returns_customer_id
                   AND sr.return_date < :returns_date_from
             ), 0)
             - COALESCE((
                 SELECT SUM(cp.payment_amount)
                 FROM customer_payments cp
                 WHERE cp.shop_id = :payments_shop_id AND cp.customer_id = :payments_customer_id
                   AND DATE(cp.created_at) < :payments_date_from
             ), 0) AS opening_balance
         FROM customers c
         WHERE c.id = :customer_id AND c.shop_id = :customer_shop_id'
    );
    $openingQuery->execute([
        'sales_shop_id' => $shopId,
        'sales_customer_id' => $customerId,
        'sales_date_from' => $dateFrom,
        'returns_shop_id' => $shopId,
        'returns_customer_id' => $customerId,
        'returns_date_from' => $dateFrom,
        'payments_shop_id' => $shopId,
        'payments_customer_id' => $customerId,
        'payments_date_from' => $dateFrom,
        'customer_id' => $customerId,
        'customer_shop_id' => $shopId,
    ]);
    $openingBalance = (float) $openingQuery->fetchColumn();

    $limit = 5000;
    $eventsQuery = $pdo->prepare(
        'SELECT event_type, transaction_date, sort_time, reference, description, debit, credit
         FROM (
            SELECT \'sale\' AS event_type, s.sale_date AS transaction_date, s.created_at AS sort_time,
                   COALESCE(s.invoice_number, CONCAT(\'বিক্রয় #\', s.id)) AS reference,
                   \'বিক্রয়\' AS description,
                   s.subtotal + s.vat_amount - s.discount_amount - s.special_discount_amount AS debit,
                   s.payment_received AS credit
            FROM sales s
            WHERE s.shop_id = :sales_shop_id AND s.customer_id = :sales_customer_id
              AND s.sale_date BETWEEN :sales_date_from AND :sales_date_to
            UNION ALL
            SELECT \'return\' AS event_type, sr.return_date AS transaction_date,
                   return_sale.created_at AS sort_time,
                   COALESCE(return_sale.invoice_number, CONCAT(\'রিটার্ন #\', return_sale.id)) AS reference,
                   CONCAT(\'পণ্য ফেরত · মূল বিল \',
                          COALESCE(original_sale.invoice_number, CONCAT(\'#\', original_sale.id))) AS description,
                   0 AS debit, sr.line_total AS credit
            FROM sale_returns sr
            INNER JOIN sales return_sale ON return_sale.id = sr.sale_id
            INNER JOIN sale_items original_item ON original_item.id = sr.original_sale_item_id
            INNER JOIN sales original_sale ON original_sale.id = original_item.sale_id
            WHERE return_sale.shop_id = :returns_shop_id
              AND return_sale.customer_id = :returns_customer_id
              AND sr.return_date BETWEEN :returns_date_from AND :returns_date_to
            UNION ALL
            SELECT \'payment\' AS event_type, DATE(cp.created_at) AS transaction_date,
                   cp.created_at AS sort_time, CONCAT(\'আদায় #\', cp.id) AS reference,
                   CASE cp.payment_method
                       WHEN \'bank\' THEN \'বাকি আদায় · ব্যাংক\'
                       ELSE \'বাকি আদায় · নগদ\'
                   END AS description,
                   0 AS debit, cp.payment_amount AS credit
            FROM customer_payments cp
            WHERE cp.shop_id = :payments_shop_id AND cp.customer_id = :payments_customer_id
              AND DATE(cp.created_at) BETWEEN :payments_date_from AND :payments_date_to
         ) ledger_events
         ORDER BY transaction_date, sort_time, event_type, reference
         LIMIT 5001'
    );
    $eventsQuery->execute([
        'sales_shop_id' => $shopId,
        'sales_customer_id' => $customerId,
        'sales_date_from' => $dateFrom,
        'sales_date_to' => $dateTo,
        'returns_shop_id' => $shopId,
        'returns_customer_id' => $customerId,
        'returns_date_from' => $dateFrom,
        'returns_date_to' => $dateTo,
        'payments_shop_id' => $shopId,
        'payments_customer_id' => $customerId,
        'payments_date_from' => $dateFrom,
        'payments_date_to' => $dateTo,
    ]);
    $events = $eventsQuery->fetchAll();
    $truncated = count($events) > $limit;
    if ($truncated) {
        $events = array_slice($events, 0, $limit);
    }

    $balance = $openingBalance;
    $totalDebit = 0.0;
    $totalCredit = 0.0;
    $rows = [];
    foreach ($events as $event) {
        $debit = round((float) $event['debit'], 2);
        $credit = round((float) $event['credit'], 2);
        $balance = round($balance + $debit - $credit, 2);
        $totalDebit += $debit;
        $totalCredit += $credit;
        $rows[] = [
            'event_type' => $event['event_type'],
            'transaction_date' => $event['transaction_date'],
            'reference' => $event['reference'],
            'description' => $event['description'],
            'debit' => $debit,
            'credit' => $credit,
            'balance' => $balance,
        ];
    }

    respond(200, true, 'কাস্টমার লেজার তৈরি হয়েছে।', [
        'customers' => $customers,
        'customer' => $selectedCustomer,
        'date_from' => $dateFrom,
        'date_to' => $dateTo,
        'opening_balance' => round($openingBalance, 2),
        'closing_balance' => $balance,
        'current_balance' => $selectedCustomer['current_balance'],
        'summary' => [
            'debit' => round($totalDebit, 2),
            'credit' => round($totalCredit, 2),
            'transaction_count' => count($rows),
        ],
        'rows' => $rows,
        'limit' => $limit,
        'truncated' => $truncated,
    ]);
} catch (PDOException $exception) {
    error_log('Customer ledger report failed for user ' . $user['id'] . ': ' . $exception->getMessage());
    respond(500, false, 'কাস্টমার লেজার তৈরি করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
