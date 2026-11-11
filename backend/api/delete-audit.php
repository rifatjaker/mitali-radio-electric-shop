<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

function validatedDeletionReason(array $body): string
{
    $reason = trim((string) ($body['reason'] ?? ''));
    $characterCount = function_exists('mb_strlen')
        ? mb_strlen($reason, 'UTF-8')
        : preg_match_all('/./us', $reason, $matches);
    if ($reason === '' || $characterCount === false || $characterCount > 500
        || preg_match('//u', $reason) !== 1
        || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', $reason)) {
        respond(422, false, 'মুছে ফেলার কারণ লিখুন (সর্বোচ্চ ৫০০ অক্ষর)।');
    }
    return $reason;
}

function recordDeletionAudit(
    PDO $pdo,
    ?int $shopId,
    array $actor,
    string $entityType,
    int $recordId,
    string $recordLabel,
    string $reason
): void {
    $statement = $pdo->prepare(
        'INSERT INTO delete_audit_logs (
            shop_id, actor_user_id, actor_name, actor_username, entity_type, record_id, record_label, reason
         ) VALUES (
            :shop_id, :actor_user_id, :actor_name, :actor_username, :entity_type, :record_id, :record_label, :reason
         )'
    );
    if (function_exists('mb_substr')) {
        $label = mb_substr($recordLabel, 0, 255, 'UTF-8');
    } else {
        $characters = preg_split('//u', $recordLabel, -1, PREG_SPLIT_NO_EMPTY);
        $label = $characters === false
            ? substr($recordLabel, 0, 255)
            : implode('', array_slice($characters, 0, 255));
    }
    $statement->execute([
        'shop_id' => $shopId,
        'actor_user_id' => $actor['id'],
        'actor_name' => $actor['display_name'] ?: $actor['username'],
        'actor_username' => $actor['username'],
        'entity_type' => $entityType,
        'record_id' => $recordId,
        'record_label' => $label,
        'reason' => $reason,
    ]);
}
