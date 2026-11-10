<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'নতুন দোকান খুলতে POST অনুরোধ পাঠান।');
}

$owner = requireOwner();
$shop = validatedShopDetails(requestJson());

try {
    $pdo = database();
    $pdo->beginTransaction();
    $ownerLock = $pdo->prepare(
        "SELECT id FROM users WHERE id = :id AND role = 'owner' AND is_active = 1 FOR UPDATE"
    );
    $ownerLock->execute(['id' => $owner['id']]);
    if (!$ownerLock->fetch()) {
        $pdo->rollBack();
        respond(403, false, 'শুধু System Admin নতুন দোকান খুলতে পারবেন।');
    }

    $shopCount = (int) $pdo->query('SELECT COUNT(*) FROM shops')->fetchColumn();
    if ($shopCount >= MAX_ACTIVE_SHOPS) {
        $pdo->rollBack();
        respond(409, false, 'সর্বোচ্চ ৩টি দোকান খোলা যাবে। সীমা বাড়াতে ডেভেলপারের সাথে যোগাযোগ করুন।');
    }

    $statement = $pdo->prepare(
        'INSERT INTO shops (shop_name, memo_heading, address, contact_number)
         VALUES (:shop_name, :memo_heading, :address, :contact_number)'
    );
    $statement->execute($shop);
    $shopId = (int) $pdo->lastInsertId();
    $pdo->commit();

    respond(201, true, 'নতুন দোকান সফলভাবে খোলা হয়েছে।', [
        'shop' => ['id' => $shopId] + $shop,
    ]);
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Shop creation failed: ' . $exception->getMessage());
    respond(500, false, 'নতুন দোকান খোলা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
