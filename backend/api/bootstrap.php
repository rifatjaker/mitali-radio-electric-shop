<?php
declare(strict_types=1);

const API_BASE_DIR = __DIR__;
const USER_PERMISSION_KEYS = [
    'overview',
    'setup',
    'purchase',
    'sales',
    'warranty',
    'reports',
    'can_edit',
    'can_delete',
];
const MAX_ACTIVE_SHOPS = 3;
const MAX_WAREHOUSES = 3;

function loadEnvironment(): void
{
    $configuredPath = getenv('MRE_ENV_PATH');
    $candidates = $configuredPath !== false && $configuredPath !== ''
        ? [$configuredPath]
        : [
            dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env',
            dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . 'private'
                . DIRECTORY_SEPARATOR . 'mre' . DIRECTORY_SEPARATOR . '.env',
        ];
    $path = null;
    foreach ($candidates as $candidate) {
        if (is_file($candidate) && is_readable($candidate)) {
            $path = $candidate;
            break;
        }
    }

    if ($path === null) {
        error_log('Mitali Radio Electric environment file was not found or is not readable.');
        respond(500, false, 'সার্ভার কনফিগারেশন ফাইল পাওয়া যায়নি। Hosting সেটিংস পরীক্ষা করুন।');
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES);
    if ($lines === false) {
        error_log('Unable to read backend environment file.');
        respond(500, false, 'সার্ভার কনফিগারেশন ফাইল পড়া যায়নি।');
    }

    foreach ($lines as $lineNumber => $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        $separator = strpos($line, '=');
        if ($separator === false) {
            error_log('Invalid backend environment line: ' . ($lineNumber + 1));
            respond(500, false, 'সার্ভার কনফিগারেশন ফাইলে ভুল আছে।');
        }

        $key = trim(substr($line, 0, $separator));
        $value = trim(substr($line, $separator + 1));
        if (!preg_match('/^[A-Z_][A-Z0-9_]*$/', $key)) {
            error_log('Invalid backend environment key at line: ' . ($lineNumber + 1));
            respond(500, false, 'সার্ভার কনফিগারেশন ফাইলে ভুল আছে।');
        }
        if (
            strlen($value) >= 2
            && (($value[0] === '"' && $value[-1] === '"') || ($value[0] === "'" && $value[-1] === "'"))
        ) {
            $value = substr($value, 1, -1);
        }

        if (getenv($key) === false) {
            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
        }
    }
}

function respond(int $status, bool $success, string $message, array $data = []): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(
        ['success' => $success, 'message' => $message, 'data' => $data],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit;
}

function bootstrapApi(): void
{
    $origin = getenv('APP_ORIGIN') ?: 'http://localhost:5173';
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Shop-Id');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Cache-Control: no-store');

    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    if (!in_array($_SERVER['REQUEST_METHOD'] ?? '', ['GET', 'POST'], true)) {
        respond(405, false, 'এই অনুরোধের পদ্ধতি সমর্থিত নয়।');
    }
}

function requestJson(): array
{
    $rawBody = file_get_contents('php://input');
    if ($rawBody === false || $rawBody === '') {
        respond(400, false, 'অনুরোধের তথ্য পাওয়া যায়নি।');
    }

    try {
        $body = json_decode($rawBody, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        respond(400, false, 'অনুরোধের তথ্য সঠিক JSON নয়।');
    }

    if (!is_array($body)) {
        respond(400, false, 'অনুরোধের তথ্য সঠিক নয়।');
    }
    return $body;
}

function database(): PDO
{
    $host = getenv('DB_HOST') ?: '127.0.0.1';
    $port = getenv('DB_PORT') ?: '3306';
    $name = getenv('DB_NAME') ?: 'mitali_radio_electric';
    $user = getenv('DB_USER') ?: 'root';
    $password = getenv('DB_PASSWORD') ?: '';
    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";

    try {
        return new PDO($dsn, $user, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (PDOException $exception) {
        error_log('Database connection failed: ' . $exception->getMessage());
        respond(500, false, 'ডেটাবেজে সংযোগ করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
    }
}

function jwtSecret(): string
{
    $secret = getenv('JWT_SECRET') ?: '';
    if (strlen($secret) < 32) {
        respond(500, false, 'JWT_SECRET সেটিংসটি অন্তত ৩২ অক্ষরের হতে হবে।');
    }
    return $secret;
}

function jwtIssuer(): string
{
    return getenv('JWT_ISSUER') ?: 'mitali-radio-electric';
}

function base64UrlEncode(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function createToken(array $user): string
{
    $now = time();
    $ttl = max(300, (int) (getenv('JWT_TTL') ?: 28800));
    $header = ['typ' => 'JWT', 'alg' => 'HS256'];
    $payload = [
        'iss' => jwtIssuer(),
        'sub' => (string) $user['id'],
        'username' => $user['username'],
        'name' => $user['display_name'],
        'role' => $user['role'],
        'iat' => $now,
        'exp' => $now + $ttl,
    ];
    $unsigned = base64UrlEncode(json_encode($header, JSON_THROW_ON_ERROR))
        . '.' . base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR));
    $signature = hash_hmac('sha256', $unsigned, jwtSecret(), true);
    return $unsigned . '.' . base64UrlEncode($signature);
}

function userPermissions(PDO $pdo, int $userId, string $role): array
{
    if ($role === 'owner') {
        return USER_PERMISSION_KEYS;
    }

    $statement = $pdo->prepare(
        'SELECT permission_key FROM user_permissions WHERE user_id = :user_id'
    );
    $statement->execute(['user_id' => $userId]);
    return array_values(array_map(
        static fn (array $row): string => (string) $row['permission_key'],
        $statement->fetchAll()
    ));
}

function authenticatedUser(): array
{
    $token = bearerToken();
    $claims = $token === null ? null : decodeToken($token);
    if ($claims === null || !isset($claims['sub'])) {
        respond(401, false, 'আপনার লগইন সেশনের মেয়াদ শেষ হয়েছে। আবার লগইন করুন।');
    }

    try {
        $pdo = database();
        $statement = $pdo->prepare(
            'SELECT id, shop_id, username, display_name, role, is_active
             FROM users WHERE id = :id LIMIT 1'
        );
        $statement->execute(['id' => $claims['sub']]);
        $user = $statement->fetch();
        if (!$user || (int) $user['is_active'] !== 1) {
            respond(401, false, 'এই অ্যাকাউন্টে প্রবেশের অনুমতি নেই। আবার লগইন করুন।');
        }

        $user['id'] = (int) $user['id'];
        $user['shop_id'] = $user['shop_id'] === null ? null : (int) $user['shop_id'];
        if ($user['role'] !== 'owner' && $user['shop_id'] === null) {
            respond(403, false, 'এই ইউজারের জন্য কোনো দোকান নির্ধারিত নেই। মালিকের সাথে যোগাযোগ করুন।');
        }
        $user['permissions'] = userPermissions($pdo, $user['id'], (string) $user['role']);
        return $user;
    } catch (PDOException $exception) {
        error_log('Authenticated user lookup failed: ' . $exception->getMessage());
        respond(500, false, 'অ্যাকাউন্টের অনুমতি যাচাই করা যায়নি। সার্ভার সেটিংস পরীক্ষা করুন।');
    }
}

function userHasPermission(array $user, string $permission): bool
{
    return $user['role'] === 'owner'
        || in_array($permission, $user['permissions'] ?? [], true);
}

function requirePermission(array $user, string $permission): void
{
    if (!userHasPermission($user, $permission)) {
        respond(403, false, 'এই কাজটি করার অনুমতি আপনার অ্যাকাউন্টে নেই।');
    }
}

function requireOwner(): array
{
    $user = authenticatedUser();
    if ($user['role'] !== 'owner') {
        respond(403, false, 'শুধু দোকানের মালিক ইউজার ও পারমিশন পরিচালনা করতে পারবেন।');
    }
    return $user;
}

function activeShop(PDO $pdo, int $shopId): ?array
{
    $statement = $pdo->prepare(
        'SELECT id, shop_name, memo_heading, address, contact_number
         FROM shops WHERE id = :id AND is_active = 1 LIMIT 1'
    );
    $statement->execute(['id' => $shopId]);
    $shop = $statement->fetch();
    if (!$shop) {
        return null;
    }
    $shop['id'] = (int) $shop['id'];
    return $shop;
}

function requestShopId(): ?int
{
    $rawShopId = $_SERVER['HTTP_X_SHOP_ID'] ?? '';
    if ($rawShopId === '') {
        return null;
    }
    $shopId = filter_var($rawShopId, FILTER_VALIDATE_INT);
    return $shopId !== false && $shopId > 0 ? $shopId : null;
}

function authorizedShopId(array $user): int
{
    $pdo = database();
    $requestedShopId = requestShopId();
    if ($user['role'] === 'owner') {
        if ($requestedShopId === null || activeShop($pdo, $requestedShopId) === null) {
            respond(422, false, 'কাজ করার আগে একটি সক্রিয় দোকান নির্বাচন করুন।');
        }
        return $requestedShopId;
    }

    $assignedShopId = (int) ($user['shop_id'] ?? 0);
    if ($assignedShopId < 1 || ($requestedShopId !== null && $requestedShopId !== $assignedShopId)) {
        respond(403, false, 'এই দোকানে প্রবেশের অনুমতি আপনার নেই।');
    }
    if (activeShop($pdo, $assignedShopId) === null) {
        respond(403, false, 'আপনার নির্ধারিত দোকানটি সক্রিয় নেই।');
    }
    return $assignedShopId;
}

function decodeToken(string $token): ?array
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }
    [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;
    $headerJson = base64_decode(strtr($encodedHeader, '-_', '+/'));
    $payloadJson = base64_decode(strtr($encodedPayload, '-_', '+/'));
    $signature = base64_decode(strtr($encodedSignature, '-_', '+/'));
    if ($headerJson === false || $payloadJson === false || $signature === false) {
        return null;
    }

    try {
        $header = json_decode($headerJson, true, 512, JSON_THROW_ON_ERROR);
        $payload = json_decode($payloadJson, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        return null;
    }

    if (!is_array($header) || ($header['alg'] ?? null) !== 'HS256' || !is_array($payload)) {
        return null;
    }
    $unsigned = $encodedHeader . '.' . $encodedPayload;
    $expectedSignature = hash_hmac('sha256', $unsigned, jwtSecret(), true);
    if (!hash_equals($expectedSignature, $signature)) {
        return null;
    }
    if (($payload['iss'] ?? null) !== jwtIssuer() || (int) ($payload['exp'] ?? 0) <= time()) {
        return null;
    }
    return $payload;
}

function bearerToken(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+(\S+)$/i', $header, $matches)) {
        return null;
    }
    return $matches[1];
}

loadEnvironment();
bootstrapApi();
