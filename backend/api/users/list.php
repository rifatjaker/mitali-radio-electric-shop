<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'ইউজার তালিকা দেখতে GET অনুরোধ পাঠান।');
}

$owner = requireOwner();
try {
    $pdo = database();
    $statement = $pdo->query(
        "SELECT u.id, u.shop_id, s.shop_name, u.username, u.display_name, u.role, u.is_active
         FROM users u
         LEFT JOIN shops s ON s.id = u.shop_id
         ORDER BY (u.role = 'owner') DESC, u.display_name ASC"
    );
    $users = [];
    foreach ($statement->fetchAll() as $user) {
        $user['id'] = (int) $user['id'];
        $user['shop_id'] = $user['shop_id'] === null ? null : (int) $user['shop_id'];
        $user['is_active'] = (bool) $user['is_active'];
        $user['permissions'] = userPermissions($pdo, $user['id'], (string) $user['role']);
        $users[] = $user;
    }
    respond(200, true, 'ইউজার তালিকা পাওয়া গেছে।', ['users' => $users, 'owner_id' => $owner['id']]);
} catch (PDOException $exception) {
    error_log('User listing failed: ' . $exception->getMessage());
    respond(500, false, 'ইউজার তালিকা লোড করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
