<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'গুদামের তালিকা দেখতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
if (!userHasPermission($user, 'setup')
    && !userHasPermission($user, 'purchase')
    && !userHasPermission($user, 'sales')
    && !userHasPermission($user, 'reports')) {
    respond(403, false, 'গুদামের তালিকা দেখার অনুমতি আপনার অ্যাকাউন্টে নেই।');
}

try {
    $statement = database()->query(
        'SELECT id, warehouse_name, address, contact_number
         FROM warehouses ORDER BY id ASC'
    );
    $warehouses = $statement->fetchAll();
    foreach ($warehouses as &$warehouse) {
        $warehouse['id'] = (int) $warehouse['id'];
    }
    unset($warehouse);

    respond(200, true, 'গুদামের তালিকা পাওয়া গেছে।', [
        'warehouses' => $warehouses,
        'max_warehouses' => MAX_WAREHOUSES,
    ]);
} catch (PDOException $exception) {
    error_log('Warehouse listing failed for user ' . $user['id'] . ': ' . $exception->getMessage());
    respond(500, false, 'গুদামের তালিকা লোড করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
