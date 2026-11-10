<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'দোকানের তথ্য পরিবর্তন করতে POST অনুরোধ পাঠান।');
}

requireOwner();
$body = requestJson();
$shopId = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT);
if ($shopId === false || $shopId === null || $shopId < 1) {
    respond(422, false, 'সঠিক দোকান নির্বাচন করুন।');
}
$shop = validatedShopDetails($body);

try {
    $statement = database()->prepare(
        'UPDATE shops SET shop_name = :shop_name, memo_heading = :memo_heading,
         address = :address, contact_number = :contact_number
         WHERE id = :id AND is_active = 1'
    );
    $statement->execute($shop + ['id' => $shopId]);
    if ($statement->rowCount() === 0) {
        $check = database()->prepare('SELECT id FROM shops WHERE id = :id AND is_active = 1');
        $check->execute(['id' => $shopId]);
        if (!$check->fetch()) {
            respond(404, false, 'দোকানটি পাওয়া যায়নি।');
        }
    }
    respond(200, true, 'দোকানের মেমো ও যোগাযোগের তথ্য আপডেট হয়েছে।');
} catch (PDOException $exception) {
    error_log('Shop update failed: ' . $exception->getMessage());
    respond(500, false, 'দোকানের তথ্য আপডেট করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
