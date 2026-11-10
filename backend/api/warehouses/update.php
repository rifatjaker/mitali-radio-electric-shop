<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'গুদামের তথ্য পরিবর্তন করতে POST অনুরোধ পাঠান।');
}

requireOwner();
$body = requestJson();
$warehouseId = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT);
if ($warehouseId === false || $warehouseId === null || $warehouseId < 1) {
    respond(422, false, 'সঠিক গুদাম নির্বাচন করুন।');
}
$warehouse = validatedWarehouseDetails($body);

try {
    $pdo = database();
    $statement = $pdo->prepare(
        'UPDATE warehouses SET warehouse_name = :warehouse_name,
         address = :address, contact_number = :contact_number
         WHERE id = :id'
    );
    $statement->execute($warehouse + ['id' => $warehouseId]);
    if ($statement->rowCount() === 0) {
        $check = $pdo->prepare('SELECT id FROM warehouses WHERE id = :id');
        $check->execute(['id' => $warehouseId]);
        if (!$check->fetch()) {
            respond(404, false, 'গুদামটি পাওয়া যায়নি।');
        }
    }
    respond(200, true, 'গুদামের তথ্য আপডেট হয়েছে।');
} catch (PDOException $exception) {
    error_log('Warehouse update failed: ' . $exception->getMessage());
    respond(500, false, 'গুদামের তথ্য আপডেট করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
