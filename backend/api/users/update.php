<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'ইউজার পরিবর্তন করতে POST অনুরোধ পাঠান।');
}

$owner = requireOwner();
$body = requestJson();
$userId = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT);
if ($userId === false || $userId === null || $userId < 1) {
    respond(422, false, 'সঠিক ইউজার নির্বাচন করুন।');
}
if ($userId === $owner['id']) {
    respond(422, false, 'নিজের মালিক অ্যাকাউন্ট এই প্যানেল থেকে পরিবর্তন করা যাবে না।');
}
$input = validatedManagedUser($body, true);
requireManagedShop($input['shop_id']);

try {
    $pdo = database();
    $pdo->beginTransaction();
    $existingStatement = $pdo->prepare('SELECT role FROM users WHERE id = :id FOR UPDATE');
    $existingStatement->execute(['id' => $userId]);
    $existing = $existingStatement->fetch();
    if (!$existing || $existing['role'] === 'owner') {
        $pdo->rollBack();
        respond(404, false, 'পরিবর্তনের জন্য ইউজারটি পাওয়া যায়নি।');
    }

    $sql = 'UPDATE users SET shop_id = :shop_id, username = :username, display_name = :display_name, role = :role';
    $parameters = [
        'shop_id' => $input['shop_id'],
        'username' => $input['username'],
        'display_name' => $input['display_name'],
        'role' => $input['role'],
        'id' => $userId,
    ];
    if ($input['password'] !== '') {
        $sql .= ', password_hash = :password_hash';
        $parameters['password_hash'] = password_hash($input['password'], PASSWORD_DEFAULT);
    }
    $sql .= ' WHERE id = :id';
    $pdo->prepare($sql)->execute($parameters);
    replaceUserPermissions($pdo, $userId, $input['permissions']);
    $pdo->commit();

    respond(200, true, 'ইউজারের তথ্য ও পারমিশন আপডেট হয়েছে।');
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($exception->getCode() === '23000') {
        respond(409, false, 'এই ইউজারনেমটি আগে থেকেই ব্যবহৃত হচ্ছে।');
    }
    error_log('User update failed: ' . $exception->getMessage());
    respond(500, false, 'ইউজার আপডেট করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
