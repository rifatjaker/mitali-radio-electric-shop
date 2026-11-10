<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, false, 'ইউজার সক্রিয় করতে POST অনুরোধ পাঠান।');
}

$owner = requireOwner();
$body = requestJson();
$userId = filter_var($body['id'] ?? null, FILTER_VALIDATE_INT);
if ($userId === false || $userId === null || $userId < 1 || $userId === $owner['id']) {
    respond(422, false, 'সক্রিয় করার জন্য সঠিক ইউজার নির্বাচন করুন।');
}

try {
    $statement = database()->prepare(
        "UPDATE users SET is_active = 1 WHERE id = :id AND role <> 'owner' AND is_active = 0"
    );
    $statement->execute(['id' => $userId]);
    if ($statement->rowCount() !== 1) {
        respond(404, false, 'নিষ্ক্রিয় কর্মচারী ইউজারটি পাওয়া যায়নি।');
    }
    respond(200, true, 'ইউজারটি আবার সক্রিয় হয়েছে।');
} catch (PDOException $exception) {
    error_log('User reactivation failed: ' . $exception->getMessage());
    respond(500, false, 'ইউজার সক্রিয় করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
}
