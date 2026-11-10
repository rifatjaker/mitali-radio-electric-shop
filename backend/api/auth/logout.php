<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'লগআউট করতে POST অনুরোধ পাঠান।');
}

$user = authenticatedUser();
$token = bearerToken();
if ($token === null) {
    respond(401, false, 'আপনার লগইন সেশন পাওয়া যায়নি। আবার লগইন করুন।');
}

try {
    $pdo = database();
    $statement = $pdo->prepare(
        'DELETE FROM user_presence_sessions WHERE token_hash = :token_hash AND user_id = :user_id'
    );
    $statement->execute([
        'token_hash' => hash('sha256', $token),
        'user_id' => $user['id'],
    ]);
    respond(200, true, 'সেশন বন্ধ করা হয়েছে।');
} catch (PDOException $exception) {
    error_log('User presence logout failed: ' . $exception->getMessage());
    respond(500, false, 'সেশন বন্ধ করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
