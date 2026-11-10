<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

function requestedUserPermissions(array $body): array
{
    $permissions = $body['permissions'] ?? null;
    if (!is_array($permissions)) {
        respond(422, false, 'মেনু ও কাজের পারমিশন নির্বাচন করুন।');
    }

    foreach ($permissions as $permission) {
        if (!is_string($permission) || !in_array($permission, USER_PERMISSION_KEYS, true)) {
            respond(422, false, 'পারমিশনের তালিকায় সঠিক বিকল্প নির্বাচন করুন।');
        }
    }
    return array_values(array_unique($permissions));
}

function replaceUserPermissions(PDO $pdo, int $userId, array $permissions): void
{
    $delete = $pdo->prepare('DELETE FROM user_permissions WHERE user_id = :user_id');
    $delete->execute(['user_id' => $userId]);

    if ($permissions === []) {
        return;
    }

    $insert = $pdo->prepare(
        'INSERT INTO user_permissions (user_id, permission_key)
         VALUES (:user_id, :permission_key)'
    );
    foreach ($permissions as $permission) {
        $insert->execute(['user_id' => $userId, 'permission_key' => $permission]);
    }
}

function validatedManagedUser(array $body, bool $isUpdate = false): array
{
    $shopId = filter_var($body['shop_id'] ?? null, FILTER_VALIDATE_INT);
    if ($shopId === false || $shopId === null || $shopId < 1) {
        respond(422, false, 'ইউজারের জন্য একটি দোকান নির্বাচন করুন।');
    }

    $username = trim((string) ($body['username'] ?? ''));
    if (!preg_match('/^[A-Za-z0-9._-]{3,80}$/', $username)) {
        respond(422, false, 'ইউজারনেম ৩ থেকে ৮০ অক্ষরের ইংরেজি অক্ষর, সংখ্যা, ডট, হাইফেন বা আন্ডারস্কোরে লিখুন।');
    }

    $displayName = trim((string) ($body['display_name'] ?? ''));
    $displayNameLength = function_exists('mb_strlen')
        ? mb_strlen($displayName, 'UTF-8')
        : strlen($displayName);
    if ($displayName === '' || $displayNameLength > 120) {
        respond(422, false, 'নাম লিখুন (সর্বোচ্চ ১২০ অক্ষর)।');
    }

    $role = (string) ($body['role'] ?? '');
    if (!in_array($role, ['manager', 'staff'], true)) {
        respond(422, false, 'ম্যানেজার অথবা কর্মচারী রোল নির্বাচন করুন।');
    }

    $password = (string) ($body['password'] ?? '');
    if ((!$isUpdate || $password !== '') && strlen($password) < 8) {
        respond(422, false, 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।');
    }

    return [
        'username' => $username,
        'display_name' => $displayName,
        'role' => $role,
        'shop_id' => $shopId,
        'password' => $password,
        'permissions' => requestedUserPermissions($body),
    ];
}

function requireManagedShop(int $shopId): void
{
    try {
        if (activeShop(database(), $shopId) === null) {
            respond(422, false, 'তালিকা থেকে একটি সক্রিয় দোকান নির্বাচন করুন।');
        }
    } catch (PDOException $exception) {
        error_log('Managed shop validation failed: ' . $exception->getMessage());
        respond(500, false, 'দোকান যাচাই করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
    }
}
