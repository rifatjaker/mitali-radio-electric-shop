<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'এই তথ্য দেখতে GET অনুরোধ পাঠান।');
}

try {
    $user = authenticatedUser();
} catch (PDOException $exception) {
    error_log('Session query failed: ' . $exception->getMessage());
    respond(500, false, 'সেশন যাচাই করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}

respond(200, true, 'আপনার লগইন সেশন যাচাই হয়েছে।', [
    'user' => [
        'id' => (int) $user['id'],
        'shop_id' => $user['shop_id'],
        'username' => $user['username'],
        'display_name' => $user['display_name'],
        'role' => $user['role'],
        'permissions' => $user['permissions'],
    ],
]);
