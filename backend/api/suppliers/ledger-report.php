<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'সাপ্লায়ার লেজার দেখতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'reports');
$shopId = authorizedShopId($user);

function supplierLedgerDate(string $value, string $label): string
{
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    if (!$date || $date->format('Y-m-d') !== $value || $value > date('Y-m-d')) {
        respond(422, false, "{$label} সঠিক অতীত/আজকের তারিখ দিন।");
    }
    return $value;
}

$today = date('Y-m-d');
$dateFrom = supplierLedgerDate((string) ($_GET['date_from'] ?? date('Y-m-01')), 'শুরুর');
$dateTo = supplierLedgerDate((string) ($_GET['date_to'] ?? $today), 'শেষের');
if ($dateFrom > $dateTo) {
    respond(422, false, 'শুরুর তারিখ শেষের তারিখের পরে হতে পারবে না।');
}

$supplierId = null;
if (isset($_GET['supplier_id']) && $_GET['supplier_id'] !== '') {
    $supplierId = filter_var($_GET['supplier_id'], FILTER_VALIDATE_INT);
    if ($supplierId === false || $supplierId < 1) {
        respond(422, false, 'সঠিক সাপ্লায়ার নির্বাচন করুন।');
    }
}

try {
    $pdo = database();
    $supplierQuery = $pdo->prepare(
        'SELECT s.id, s.supplier_name, s.mobile_number, s.address,
                COALESCE(s.previous_balance, 0)
                    + COALESCE(purchase_totals.amount, 0)
                    - COALESCE(return_totals.amount, 0)
                    - COALESCE(payment_totals.amount, 0) AS current_due
         FROM suppliers s
         LEFT JOIN (
             SELECT supplier_id, SUM(total_amount) AS amount
             FROM purchase_bills
             WHERE shop_id = :purchase_shop_id
             GROUP BY supplier_id
         ) purchase_totals ON purchase_totals.supplier_id = s.id
         LEFT JOIN (
             SELECT sr.supplier_id, SUM(sri.line_total) AS amount
             FROM supplier_returns sr
             INNER JOIN supplier_return_items sri ON sri.supplier_return_id = sr.id
             WHERE sr.shop_id = :return_shop_id
             GROUP BY sr.supplier_id
         ) return_totals ON return_totals.supplier_id = s.id
         LEFT JOIN (
             SELECT supplier_id, SUM(payment_amount) AS amount
             FROM supplier_payments
             WHERE shop_id = :payment_shop_id
             GROUP BY supplier_id
         ) payment_totals ON payment_totals.supplier_id = s.id
         WHERE s.shop_id = :shop_id
         ORDER BY s.supplier_name, s.id'
    );
    $supplierQuery->execute([
        'purchase_shop_id' => $shopId,
        'return_shop_id' => $shopId,
        'payment_shop_id' => $shopId,
        'shop_id' => $shopId,
    ]);
    $suppliers = $supplierQuery->fetchAll();
    foreach ($suppliers as &$supplier) {
        $supplier['id'] = (int) $supplier['id'];
        $supplier['current_due'] = round((float) $supplier['current_due'], 2);
    }
    unset($supplier);

    if ($supplierId === null) {
        respond(200, true, 'সাপ্লায়ার নির্বাচন করে লেজার দেখুন।', [
            'suppliers' => $suppliers,
            'supplier' => null,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'opening_balance' => null,
            'closing_balance' => null,
            'current_due' => null,
            'summary' => [
                'purchase' => 0.0,
                'returns' => 0.0,
                'payments' => 0.0,
                'debit' => 0.0,
                'credit' => 0.0,
                'transaction_count' => 0,
            ],
            'rows' => [],
            'limit' => 5000,
            'truncated' => false,
        ]);
    }

    $selectedSupplier = null;
    foreach ($suppliers as $supplier) {
        if ($supplier['id'] === $supplierId) {
            $selectedSupplier = $supplier;
            break;
        }
    }
    if ($selectedSupplier === null) {
        respond(404, false, 'নির্বাচিত সাপ্লায়ার এই দোকানে পাওয়া যায়নি।');
    }

    $openingQuery = $pdo->prepare(
        'SELECT COALESCE(s.previous_balance, 0)
             + COALESCE((
                 SELECT SUM(pb.total_amount)
                 FROM purchase_bills pb
                 WHERE pb.shop_id = :purchase_shop_id AND pb.supplier_id = :purchase_supplier_id
                   AND pb.purchase_date < :purchase_date_from
             ), 0)
             - COALESCE((
                 SELECT SUM(sri.line_total)
                 FROM supplier_returns sr
                 INNER JOIN supplier_return_items sri ON sri.supplier_return_id = sr.id
                 WHERE sr.shop_id = :return_shop_id AND sr.supplier_id = :return_supplier_id
                   AND sr.return_date < :return_date_from
             ), 0)
             - COALESCE((
                 SELECT SUM(sp.payment_amount)
                 FROM supplier_payments sp
                 WHERE sp.shop_id = :payment_shop_id AND sp.supplier_id = :payment_supplier_id
                   AND DATE(sp.created_at) < :payment_date_from
             ), 0) AS opening_balance
         FROM suppliers s
         WHERE s.id = :supplier_id AND s.shop_id = :supplier_shop_id'
    );
    $openingQuery->execute([
        'purchase_shop_id' => $shopId,
        'purchase_supplier_id' => $supplierId,
        'purchase_date_from' => $dateFrom,
        'return_shop_id' => $shopId,
        'return_supplier_id' => $supplierId,
        'return_date_from' => $dateFrom,
        'payment_shop_id' => $shopId,
        'payment_supplier_id' => $supplierId,
        'payment_date_from' => $dateFrom,
        'supplier_id' => $supplierId,
        'supplier_shop_id' => $shopId,
    ]);
    $openingBalance = (float) $openingQuery->fetchColumn();

    $limit = 5000;
    $eventsQuery = $pdo->prepare(
        'SELECT event_type, transaction_date, sort_time, reference, description, debit, credit
         FROM (
            SELECT \'purchase\' AS event_type, pb.purchase_date AS transaction_date, pb.created_at AS sort_time,
                   COALESCE(pb.bill_number, CONCAT(\'ক্রয় #\', pb.id)) AS reference,
                   CASE pb.destination_type
                       WHEN \'warehouse\' THEN \'গুদাম ক্রয়\' ELSE \'দোকান ক্রয়\'
                   END AS description,
                   pb.total_amount AS debit, 0 AS credit
            FROM purchase_bills pb
            WHERE pb.shop_id = :purchase_shop_id AND pb.supplier_id = :purchase_supplier_id
              AND pb.purchase_date BETWEEN :purchase_date_from AND :purchase_date_to
            UNION ALL
            SELECT \'return\' AS event_type, sr.return_date AS transaction_date, sr.created_at AS sort_time,
                   CONCAT(\'রিটার্ন #\', sr.id) AS reference,
                   CONCAT(\'সাপ্লায়ার রিটার্ন · মূল চালান \',
                          COALESCE(pb.bill_number, CONCAT(\'#\', pb.id))) AS description,
                   0 AS debit, SUM(sri.line_total) AS credit
            FROM supplier_returns sr
            INNER JOIN purchase_bills pb ON pb.id = sr.purchase_bill_id
            INNER JOIN supplier_return_items sri ON sri.supplier_return_id = sr.id
            WHERE sr.shop_id = :return_shop_id AND sr.supplier_id = :return_supplier_id
              AND sr.return_date BETWEEN :return_date_from AND :return_date_to
            GROUP BY sr.id, sr.return_date, sr.created_at, pb.bill_number, pb.id
            UNION ALL
            SELECT \'payment\' AS event_type, DATE(sp.created_at) AS transaction_date, sp.created_at AS sort_time,
                   CONCAT(\'পেমেন্ট #\', sp.id) AS reference,
                   CASE sp.payment_method
                       WHEN \'bank\' THEN CONCAT(\'সাপ্লায়ার পেমেন্ট · ব্যাংক · \', COALESCE(ba.bank_name, \'ব্যাংক হিসাব\'))
                       ELSE \'সাপ্লায়ার পেমেন্ট · নগদ\'
                   END AS description,
                   0 AS debit, sp.payment_amount AS credit
            FROM supplier_payments sp
            LEFT JOIN bank_accounts ba ON ba.id = sp.bank_account_id
            WHERE sp.shop_id = :payment_shop_id AND sp.supplier_id = :payment_supplier_id
              AND DATE(sp.created_at) BETWEEN :payment_date_from AND :payment_date_to
         ) ledger_events
         ORDER BY transaction_date, sort_time, event_type, reference
         LIMIT 5001'
    );
    $eventsQuery->execute([
        'purchase_shop_id' => $shopId,
        'purchase_supplier_id' => $supplierId,
        'purchase_date_from' => $dateFrom,
        'purchase_date_to' => $dateTo,
        'return_shop_id' => $shopId,
        'return_supplier_id' => $supplierId,
        'return_date_from' => $dateFrom,
        'return_date_to' => $dateTo,
        'payment_shop_id' => $shopId,
        'payment_supplier_id' => $supplierId,
        'payment_date_from' => $dateFrom,
        'payment_date_to' => $dateTo,
    ]);
    $events = $eventsQuery->fetchAll();
    $truncated = count($events) > $limit;
    if ($truncated) {
        $events = array_slice($events, 0, $limit);
    }

    $balance = $openingBalance;
    $totalPurchases = 0.0;
    $totalReturns = 0.0;
    $totalPayments = 0.0;
    $rows = [];
    foreach ($events as $event) {
        $debit = round((float) $event['debit'], 2);
        $credit = round((float) $event['credit'], 2);
        $balance = round($balance + $debit - $credit, 2);
        if ($event['event_type'] === 'purchase') {
            $totalPurchases += $debit;
        } elseif ($event['event_type'] === 'return') {
            $totalReturns += $credit;
        } elseif ($event['event_type'] === 'payment') {
            $totalPayments += $credit;
        }
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
    $totalCredit = $totalReturns + $totalPayments;

    respond(200, true, 'সাপ্লায়ার লেজার তৈরি হয়েছে।', [
        'suppliers' => $suppliers,
        'supplier' => $selectedSupplier,
        'date_from' => $dateFrom,
        'date_to' => $dateTo,
        'opening_balance' => round($openingBalance, 2),
        'closing_balance' => $balance,
        'current_due' => $selectedSupplier['current_due'],
        'summary' => [
            'purchase' => round($totalPurchases, 2),
            'returns' => round($totalReturns, 2),
            'payments' => round($totalPayments, 2),
            'debit' => round($totalPurchases, 2),
            'credit' => round($totalCredit, 2),
            'transaction_count' => count($rows),
        ],
        'rows' => $rows,
        'limit' => $limit,
        'truncated' => $truncated,
    ]);
} catch (PDOException $exception) {
    error_log('Supplier ledger report failed for user ' . $user['id'] . ': ' . $exception->getMessage());
    respond(500, false, 'সাপ্লায়ার লেজার তৈরি করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
