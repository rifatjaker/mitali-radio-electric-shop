<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

function setupTableHasColumn(PDO $pdo, string $table, string $column): bool
{
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $table)) {
        throw new InvalidArgumentException('Invalid table name.');
    }

    $tables = $pdo->query('SHOW TABLES');
    foreach ($tables->fetchAll(PDO::FETCH_COLUMN) as $existingTable) {
        if ($existingTable === $table) {
            $columns = $pdo->query("SHOW COLUMNS FROM `{$table}`");
            foreach ($columns->fetchAll(PDO::FETCH_ASSOC) as $existingColumn) {
                if ($existingColumn['Field'] === $column) {
                    return true;
                }
            }
            return false;
        }
    }
    return false;
}

function setupReferenceExists(PDO $pdo, array $tableColumns, string $column, int $recordId): bool
{
    foreach ($tableColumns as $table) {
        if (!setupTableHasColumn($pdo, $table, $column)) {
            continue;
        }
        $statement = $pdo->prepare("SELECT 1 FROM `{$table}` WHERE `{$column}` = :record_id LIMIT 1");
        $statement->execute(['record_id' => $recordId]);
        if ($statement->fetchColumn()) {
            return true;
        }
    }
    return false;
}

function setupForeignKeyReferenceExists(PDO $pdo, string $parentTable, int $recordId): bool
{
    $references = [
        'customers' => [
            ['sales', 'customer_id'],
            ['customer_payments', 'customer_id'],
        ],
        'products' => [
            ['purchase_items', 'product_id'],
            ['sale_items', 'product_id'],
            ['supplier_return_items', 'product_id'],
            ['stock_adjustments', 'product_id'],
            ['warehouse_stock', 'product_id'],
            ['warehouse_stock_transfer_items', 'product_id'],
            ['stock_cost_layers', 'product_id'],
        ],
        'suppliers' => [
            ['purchase_bills', 'supplier_id'],
            ['supplier_returns', 'supplier_id'],
            ['supplier_payments', 'supplier_id'],
        ],
    ];

    foreach ($references[$parentTable] ?? [] as [$table, $column]) {
        if (setupReferenceExists($pdo, [$table], $column, $recordId)) {
            return true;
        }
    }
    return false;
}

function setupCanEdit(array $user): bool
{
    return userHasPermission($user, 'can_edit');
}

function setupCanDelete(array $user): bool
{
    return userHasPermission($user, 'can_delete');
}
