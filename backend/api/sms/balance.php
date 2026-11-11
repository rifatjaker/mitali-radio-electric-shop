<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(__DIR__) . '/sms.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'SMS ব্যালেন্স দেখতে GET অনুরোধ পাঠান।');
}

$user = authenticatedUser();
requirePermission($user, 'overview');
authorizedShopId($user);

respond(200, true, 'SMS ব্যালেন্সের অবস্থা পাওয়া গেছে।', [
    'sms_balance' => fetchSmsBalance(),
]);
