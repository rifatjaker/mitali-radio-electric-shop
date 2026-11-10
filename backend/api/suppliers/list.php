<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/setup/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'সাপ্লায়ারের তালিকা দেখতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
if (!userHasPermission($user, 'setup') && !userHasPermission($user, 'purchase')) {
    respond(403, false, 'সাপ্লায়ারের তালিকা দেখার অনুমতি আপনার অ্যাকাউন্টে নেই।');
}
$shopId = authorizedShopId($user);

try {
    $statement = database()->prepare(
        'SELECT id, supplier_name, mobile_number, address, previous_balance,
                contact_person, contact_mobile, bank_details
         FROM suppliers WHERE shop_id = :shop_id ORDER BY supplier_name, id'
    );
    $statement->execute(['shop_id' => $shopId]);
    $suppliers = $statement->fetchAll();
    $pdo = database();
    foreach ($suppliers as &$supplier) {
        $supplier['id'] = (int) $supplier['id'];
        $supplier['has_transactions'] = setupReferenceExists(
            $pdo,
            ['purchase_bills', 'supplier_payments'],
            'supplier_id',
            $supplier['id'],
        ) || setupForeignKeyReferenceExists($pdo, 'suppliers', $supplier['id']);
        $supplier['can_delete'] = !$supplier['has_transactions']
            && (float) ($supplier['previous_balance'] ?? 0) === 0.0;
    }
    unset($supplier);
    respond(200, true, 'সাপ্লায়ারের তালিকা পাওয়া গেছে।', ['suppliers' => $suppliers]);
} catch (PDOException $exception) {
    error_log('Purchase supplier listing failed: ' . $exception->getMessage());
    respond(500, false, 'সাপ্লায়ারের তালিকা লোড করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
