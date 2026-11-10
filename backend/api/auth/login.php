<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'লগইন করতে POST অনুরোধ পাঠান।');
}

$body = requestJson();
$username = trim((string) ($body['username'] ?? ''));
$password = (string) ($body['password'] ?? '');
if ($username === '' || $password === '') {
    respond(422, false, 'ব্যবহারকারীর নাম ও পাসওয়ার্ড লিখুন।');
}

try {
    $pdo = database();
    $statement = $pdo->prepare(
        'SELECT id, shop_id, username, password_hash, display_name, role, is_active
         FROM users WHERE username = :username LIMIT 1'
    );
    $statement->execute(['username' => $username]);
    $user = $statement->fetch();
} catch (PDOException $exception) {
    error_log('Login query failed: ' . $exception->getMessage());
    respond(500, false, 'লগইন যাচাই করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}

if (!$user || !password_verify($password, $user['password_hash'])) {
    respond(401, false, 'ব্যবহারকারীর নাম অথবা পাসওয়ার্ড সঠিক নয়।');
}
if ((int) $user['is_active'] !== 1) {
    respond(403, false, 'এই অ্যাকাউন্টটি নিষ্ক্রিয়। দোকানের মালিকের সাথে যোগাযোগ করুন।');
}

$token = createToken($user);
$permissions = [];
try {
    $permissions = userPermissions($pdo, (int) $user['id'], (string) $user['role']);
} catch (PDOException $exception) {
    error_log('Login permission lookup failed: ' . $exception->getMessage());
    respond(500, false, 'অ্যাকাউন্টের পারমিশন লোড করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}

respond(200, true, 'সফলভাবে লগইন হয়েছে।', [
    'token' => $token,
    'token_type' => 'Bearer',
    'expires_in' => max(300, (int) (getenv('JWT_TTL') ?: 28800)),
    'user' => [
        'id' => (int) $user['id'],
        'shop_id' => $user['shop_id'] === null ? null : (int) $user['shop_id'],
        'username' => $user['username'],
        'display_name' => $user['display_name'],
        'role' => $user['role'],
        'permissions' => $permissions,
    ],
]);
