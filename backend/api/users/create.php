<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'ইউজার তৈরি করতে POST অনুরোধ পাঠান।');
}

requireOwner();
$input = validatedManagedUser(requestJson());
requireManagedShop($input['shop_id']);

try {
    $pdo = database();
    $pdo->beginTransaction();
    $statement = $pdo->prepare(
        'INSERT INTO users (shop_id, username, password_hash, display_name, role)
         VALUES (:shop_id, :username, :password_hash, :display_name, :role)'
    );
    $statement->execute([
        'shop_id' => $input['shop_id'],
        'username' => $input['username'],
        'password_hash' => password_hash($input['password'], PASSWORD_DEFAULT),
        'display_name' => $input['display_name'],
        'role' => $input['role'],
    ]);
    $userId = (int) $pdo->lastInsertId();
    replaceUserPermissions($pdo, $userId, $input['permissions']);
    $pdo->commit();

    respond(201, true, 'নতুন ইউজার সফলভাবে তৈরি হয়েছে।', ['user_id' => $userId]);
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($exception->getCode() === '23000') {
        respond(409, false, 'এই ইউজারনেমটি আগে থেকেই ব্যবহৃত হয়েছে।');
    }
    error_log('User creation failed: ' . $exception->getMessage());
    respond(500, false, 'ইউজার তৈরি করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
