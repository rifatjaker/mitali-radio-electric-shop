<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'কোটেশনের তালিকা দেখতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'sales');
$shopId = authorizedShopId($user);
$search = trim((string) ($_GET['search'] ?? ''));
if ((function_exists('mb_strlen') ? mb_strlen($search, 'UTF-8') : strlen($search)) > 120) {
    respond(422, false, 'অনুসন্ধানের লেখা ১২০ অক্ষরের মধ্যে লিখুন।');
}

try {
    $statement = database()->prepare(
        'SELECT q.id, q.quotation_number, q.customer_name, q.mobile_number,
                q.issue_date, q.valid_until, q.total_amount, q.status,
                q.converted_sale_id, s.invoice_number
         FROM quotations q
         LEFT JOIN sales s ON s.id = q.converted_sale_id AND s.shop_id = q.shop_id
         WHERE q.shop_id = :shop_id
           AND (
               :search_empty = \'\'
               OR q.quotation_number LIKE :number_search
               OR q.customer_name LIKE :name_search
               OR q.mobile_number LIKE :mobile_search
           )
         ORDER BY q.issue_date DESC, q.id DESC
         LIMIT 500'
    );
    $pattern = '%' . $search . '%';
    $statement->execute([
        'shop_id' => $shopId,
        'search_empty' => $search,
        'number_search' => $pattern,
        'name_search' => $pattern,
        'mobile_search' => $pattern,
    ]);
    $quotations = $statement->fetchAll();
    foreach ($quotations as &$quotation) {
        $quotation['id'] = (int) $quotation['id'];
        $quotation['converted_sale_id'] = $quotation['converted_sale_id'] === null
            ? null
            : (int) $quotation['converted_sale_id'];
        $quotation['total_amount'] = (float) $quotation['total_amount'];
        if ($quotation['status'] === 'open' && $quotation['valid_until'] < date('Y-m-d')) {
            $quotation['status'] = 'expired';
        }
    }
    unset($quotation);

    respond(200, true, 'কোটেশনের তালিকা পাওয়া গেছে।', ['quotations' => $quotations]);
} catch (PDOException $exception) {
    error_log('Quotation list failed for user ' . $user['id'] . ': ' . $exception->getMessage());
    respond(500, false, 'কোটেশনের তালিকা লোড করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
