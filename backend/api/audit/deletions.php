<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond(405, false, 'ডিলিট লগ দেখতে GET অনুরোধ পাঠান।');
}

$owner = requireOwner();
$search = trim((string) ($_GET['search'] ?? ''));
if ((function_exists('mb_strlen') ? mb_strlen($search, 'UTF-8') : strlen($search)) > 120) {
    respond(422, false, 'সার্চ ১২০ অক্ষরের মধ্যে লিখুন।');
}
$requestedPage = filter_var($_GET['page'] ?? 1, FILTER_VALIDATE_INT);
if ($requestedPage === false || $requestedPage < 1) {
    respond(422, false, 'সঠিক পৃষ্ঠা নম্বর দিন।');
}

try {
    $pdo = database();
    $where = '';
    $parameters = [];
    if ($search !== '') {
        $where = ' WHERE l.actor_name LIKE :actor_name
            OR l.actor_username LIKE :actor_username
            OR l.entity_type LIKE :entity_type
            OR CASE l.entity_type
                WHEN \'product\' THEN \'পণ্য\'
                WHEN \'customer\' THEN \'কাস্টমার\'
                WHEN \'supplier\' THEN \'সাপ্লায়ার\'
                WHEN \'bank_account\' THEN \'ব্যাংক হিসাব\'
                WHEN \'sale\' THEN \'বিক্রয় মেমো\'
                WHEN \'purchase\' THEN \'ক্রয় চালান\'
                WHEN \'user\' THEN \'ইউজার\'
                ELSE l.entity_type
            END LIKE :entity_label
            OR l.record_id LIKE :record_id
            OR l.record_label LIKE :record_label
            OR l.reason LIKE :reason
            OR COALESCE(s.shop_name, \'\') LIKE :shop_name';
        $searchTerm = '%' . $search . '%';
        $parameters = [
            'actor_name' => $searchTerm,
            'actor_username' => $searchTerm,
            'entity_type' => $searchTerm,
            'entity_label' => $searchTerm,
            'record_id' => $searchTerm,
            'record_label' => $searchTerm,
            'reason' => $searchTerm,
            'shop_name' => $searchTerm,
        ];
    }

    $countQuery = $pdo->prepare(
        'SELECT COUNT(*)
         FROM delete_audit_logs l
         LEFT JOIN shops s ON s.id = l.shop_id' . $where
    );
    $countQuery->execute($parameters);
    $total = (int) $countQuery->fetchColumn();
    $pageSize = 50;
    $pageCount = max(1, (int) ceil($total / $pageSize));
    $page = min((int) $requestedPage, $pageCount);
    $offset = ($page - 1) * $pageSize;

    $statement = $pdo->prepare(
        'SELECT l.id, l.shop_id, COALESCE(s.shop_name, \'দোকান সরানো হয়েছে\') AS shop_name,
                l.actor_name, l.actor_username, l.entity_type, l.record_id, l.record_label, l.reason, l.deleted_at
         FROM delete_audit_logs l
         LEFT JOIN shops s ON s.id = l.shop_id' . $where . '
         ORDER BY l.deleted_at DESC, l.id DESC
         LIMIT :page_size OFFSET :offset'
    );
    foreach ($parameters as $key => $value) {
        $statement->bindValue(':' . $key, $value, PDO::PARAM_STR);
    }
    $statement->bindValue(':page_size', $pageSize, PDO::PARAM_INT);
    $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
    $statement->execute();

    respond(200, true, 'ডিলিট লগ পাওয়া গেছে।', [
        'entries' => $statement->fetchAll(),
        'total' => $total,
        'page' => $page,
        'page_size' => $pageSize,
        'page_count' => $pageCount,
        'search' => $search,
    ]);
} catch (PDOException $exception) {
    error_log('Deletion audit lookup failed for owner ' . $owner['id'] . ': ' . $exception->getMessage());
    respond(500, false, 'ডিলিট লগ লোড করা যায়নি। ডেটাবেজ মাইগ্রেশন পরীক্ষা করুন।');
}
