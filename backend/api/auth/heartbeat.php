<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'সেশন সচল রাখতে POST অনুরোধ পাঠান।');
}

$user = authenticatedUser();
$token = bearerToken();
if ($token === null) {
    respond(401, false, 'আপনার লগইন সেশন পাওয়া যায়নি। আবার লগইন করুন।');
}

try {
    $pdo = database();
    $statement = $pdo->prepare(
        'INSERT INTO user_presence_sessions (token_hash, user_id, last_seen_at)
         VALUES (:token_hash, :user_id, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), last_seen_at = CURRENT_TIMESTAMP'
    );
    $statement->execute([
        'token_hash' => hash('sha256', $token),
        'user_id' => $user['id'],
    ]);
    respond(200, true, 'সেশন সচল রাখা হয়েছে।');
} catch (PDOException $exception) {
    error_log('User presence heartbeat failed: ' . $exception->getMessage());
    respond(500, false, 'সেশন সচল রাখা যায়নি। ডেটাবেজ সেটিংস পরীক্ষা করুন।');
}
