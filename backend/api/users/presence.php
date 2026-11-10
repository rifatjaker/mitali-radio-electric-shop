<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'ইউজার উপস্থিতি দেখতে GET অনুরোধ পাঠান।');
}

$user = requireOwner();
$shopId = authorizedShopId($user);

try {
    $pdo = database();
    $statement = $pdo->prepare(
        'SELECT u.id, u.username, u.display_name, u.role, u.is_active, u.last_login_at,
                MAX(p.last_seen_at) AS last_seen_at,
                CASE
                    WHEN u.is_active = 1
                     AND MAX(p.last_seen_at) >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 2 MINUTE)
                    THEN 1 ELSE 0
                END AS is_online
         FROM users u
         LEFT JOIN user_presence_sessions p ON p.user_id = u.id
         WHERE u.shop_id = :shop_id OR u.role = \'owner\'
         GROUP BY u.id, u.username, u.display_name, u.role, u.is_active, u.last_login_at
         ORDER BY is_online DESC, u.display_name ASC, u.username ASC'
    );
    $statement->execute(['shop_id' => $shopId]);
    $users = $statement->fetchAll();
    foreach ($users as &$presenceUser) {
        $presenceUser['id'] = (int) $presenceUser['id'];
        $presenceUser['is_active'] = (int) $presenceUser['is_active'] === 1;
        $presenceUser['is_online'] = (int) $presenceUser['is_online'] === 1;
    }
    unset($presenceUser);

    respond(200, true, 'ইউজার উপস্থিতির তথ্য পাওয়া গেছে।', ['users' => $users]);
} catch (PDOException $exception) {
    error_log('User presence listing failed: ' . $exception->getMessage());
    respond(500, false, 'ইউজার উপস্থিতির তথ্য লোড করা যায়নি। ডেটাবেজ সেটিংস পরীক্ষা করুন।');
}
