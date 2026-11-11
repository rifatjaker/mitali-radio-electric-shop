<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'নতুন গুদাম খুলতে POST অনুরোধ পাঠান।');
}

$owner = requireOwner();
$warehouse = validatedWarehouseDetails(requestJson());

try {
    $pdo = database();
    $pdo->beginTransaction();
    $ownerLock = $pdo->prepare(
        "SELECT id FROM users WHERE id = :id AND role = 'owner' AND is_active = 1 FOR UPDATE"
    );
    $ownerLock->execute(['id' => $owner['id']]);
    if (!$ownerLock->fetch()) {
        $pdo->rollBack();
        respond(403, false, 'শুধু সক্রিয় System Admin গুদাম খুলতে পারবেন।');
    }

    $warehouseCount = (int) $pdo->query('SELECT COUNT(*) FROM warehouses')->fetchColumn();
    if ($warehouseCount >= MAX_WAREHOUSES) {
        $pdo->rollBack();
        respond(409, false, 'সর্বোচ্চ ৬টি গুদাম খোলা যাবে। সীমা বাড়াতে ডেভেলপারের সাথে যোগাযোগ করুন।');
    }

    $statement = $pdo->prepare(
        'INSERT INTO warehouses (warehouse_name, address, contact_number, created_by)
         VALUES (:warehouse_name, :address, :contact_number, :created_by)'
    );
    $statement->execute($warehouse + ['created_by' => $owner['id']]);
    $warehouseId = (int) $pdo->lastInsertId();
    $pdo->commit();

    respond(201, true, 'নতুন গুদাম সফলভাবে যোগ হয়েছে।', [
        'warehouse' => ['id' => $warehouseId] + $warehouse,
    ]);
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Warehouse creation failed: ' . $exception->getMessage());
    respond(500, false, 'নতুন গুদাম যোগ করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
