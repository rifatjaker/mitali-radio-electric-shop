<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'দোকানের তালিকা দেখতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
try {
    $pdo = database();
    if ($user['role'] === 'owner') {
        $statement = $pdo->query(
            'SELECT id, shop_name, memo_heading, address, contact_number
             FROM shops WHERE is_active = 1 ORDER BY id ASC'
        );
        $shops = $statement->fetchAll();
    } else {
        $statement = $pdo->prepare(
            'SELECT id, shop_name, memo_heading, address, contact_number
             FROM shops WHERE id = :id AND is_active = 1 LIMIT 1'
        );
        $statement->execute(['id' => $user['shop_id']]);
        $shops = $statement->fetchAll();
    }
    foreach ($shops as &$shop) {
        $shop['id'] = (int) $shop['id'];
    }
    unset($shop);

    respond(200, true, 'দোকানের তালিকা পাওয়া গেছে।', [
        'shops' => $shops,
        'max_shops' => MAX_ACTIVE_SHOPS,
    ]);
} catch (PDOException $exception) {
    error_log('Shop listing failed: ' . $exception->getMessage());
    respond(500, false, 'দোকানের তালিকা লোড করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
