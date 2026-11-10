CREATE DATABASE IF NOT EXISTS a2techno_mitali_radio_electric
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE a2techno_mitali_radio_electric;

CREATE TABLE IF NOT EXISTS shops (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  shop_name VARCHAR(180) NOT NULL,
  memo_heading VARCHAR(180) NOT NULL,
  address VARCHAR(255) NULL,
  contact_number VARCHAR(120) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_shops_active_name (is_active, shop_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO shops (shop_name, memo_heading)
SELECT 'মিতালী রেডিও ইলেকট্রিক', 'মেসার্স মিতালী রেডিও ইলেকট্রিক'
WHERE NOT EXISTS (SELECT 1 FROM shops);

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  shop_id BIGINT UNSIGNED NULL,
  username VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  role ENUM('owner', 'manager', 'staff') NOT NULL DEFAULT 'owner',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  KEY idx_users_shop_id (shop_id),
  CONSTRAINT fk_users_shop
    FOREIGN KEY (shop_id) REFERENCES shops (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS warehouses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  warehouse_name VARCHAR(180) NOT NULL,
  address VARCHAR(255) NULL,
  contact_number VARCHAR(120) NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_warehouses_name (warehouse_name),
  CONSTRAINT fk_warehouses_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id BIGINT UNSIGNED NOT NULL,
  permission_key VARCHAR(40) NOT NULL,
  PRIMARY KEY (user_id, permission_key),
  CONSTRAINT fk_user_permissions_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  shop_id BIGINT UNSIGNED NOT NULL,
  customer_name VARCHAR(180) NOT NULL,
  mobile_number VARCHAR(20) NULL,
  address VARCHAR(255) NULL,
  area VARCHAR(120) NULL,
  opening_balance DECIMAL(12, 2) NULL,
  current_balance DECIMAL(12, 2) NULL,
  credit_limit DECIMAL(12, 2) NULL,
  customer_level VARCHAR(30) NOT NULL DEFAULT 'সাধারণ',
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_customers_shop_id (shop_id),
  KEY idx_customers_customer_name (customer_name),
  KEY idx_customers_mobile_number (mobile_number),
  CONSTRAINT fk_customers_shop
    FOREIGN KEY (shop_id) REFERENCES shops (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_customers_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  shop_id BIGINT UNSIGNED NOT NULL,
  supplier_name VARCHAR(180) NOT NULL,
  mobile_number VARCHAR(20) NULL,
  address VARCHAR(255) NULL,
  previous_balance DECIMAL(12, 2) NULL,
  contact_person VARCHAR(120) NULL,
  contact_mobile VARCHAR(20) NULL,
  bank_details TEXT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_suppliers_shop_id (shop_id),
  KEY idx_suppliers_supplier_name (supplier_name),
  KEY idx_suppliers_mobile_number (mobile_number),
  CONSTRAINT fk_suppliers_shop
    FOREIGN KEY (shop_id) REFERENCES shops (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_suppliers_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO users (shop_id, username, password_hash, display_name, role)
VALUES (
  NULL,
  'system.admin',
  '$2y$12$bwQ.h5JbwokLifCxQDm8AOWPZB9lEmDUE1bO5JNWHbYsW7ua5XpiS',
  'System Admin',
  'owner'
)
ON DUPLICATE KEY UPDATE username = VALUES(username);

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  shop_id BIGINT UNSIGNED NOT NULL,
  product_name VARCHAR(180) NOT NULL,
  product_code VARCHAR(80) NULL,
  category VARCHAR(100) NULL,
  brand VARCHAR(100) NULL,
  unit VARCHAR(40) NULL,
  purchase_price DECIMAL(12, 2) NULL,
  sale_price DECIMAL(12, 2) NULL,
  current_stock DECIMAL(12, 3) NOT NULL DEFAULT 0,
  min_stock DECIMAL(12, 3) NOT NULL DEFAULT 0,
  tracks_serial_number TINYINT(1) NOT NULL DEFAULT 0,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_shop_product_code (shop_id, product_code),
  KEY idx_products_shop_id (shop_id),
  KEY idx_products_product_name (product_name),
  CONSTRAINT fk_products_shop
    FOREIGN KEY (shop_id) REFERENCES shops (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_products_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_bills (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  shop_id BIGINT UNSIGNED NOT NULL,
  supplier_id BIGINT UNSIGNED NOT NULL,
  destination_type ENUM('shop', 'warehouse') NOT NULL,
  warehouse_id BIGINT UNSIGNED NULL,
  bill_number VARCHAR(80) NULL,
  purchase_date DATE NOT NULL,
  total_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  notes VARCHAR(500) NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_purchase_shop_bill (shop_id, bill_number),
  KEY idx_purchase_shop_date (shop_id, purchase_date),
  KEY idx_purchase_supplier (supplier_id),
  CONSTRAINT fk_purchase_shop
    FOREIGN KEY (shop_id) REFERENCES shops (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_purchase_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_purchase_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_purchase_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  purchase_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(12, 3) NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  line_total DECIMAL(14, 2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_purchase_items_purchase (purchase_id),
  KEY idx_purchase_items_product (product_id),
  CONSTRAINT fk_purchase_items_purchase
    FOREIGN KEY (purchase_id) REFERENCES purchase_bills (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_purchase_items_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  shop_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NULL,
  sale_source ENUM('shop', 'warehouse') NOT NULL DEFAULT 'shop',
  warehouse_id BIGINT UNSIGNED NULL,
  customer_name VARCHAR(180) NULL,
  invoice_number VARCHAR(50) NULL,
  sale_date DATE NOT NULL,
  subtotal DECIMAL(14, 2) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  special_discount_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  previous_due_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  sales_return_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  payment_method ENUM('cash', 'mobile_banking', 'credit') NOT NULL,
  payment_received DECIMAL(14, 2) NOT NULL DEFAULT 0,
  cash_refund_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  present_due DECIMAL(14, 2) NOT NULL DEFAULT 0,
  notes VARCHAR(500) NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_shop_invoice (shop_id, invoice_number),
  KEY idx_sales_shop_date (shop_id, sale_date),
  KEY idx_sales_customer (customer_id),
  KEY idx_sales_warehouse (warehouse_id),
  CONSTRAINT fk_sales_shop
    FOREIGN KEY (shop_id) REFERENCES shops (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_sales_customer
    FOREIGN KEY (customer_id) REFERENCES customers (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_sales_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_sales_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sale_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sale_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(12, 3) NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  line_total DECIMAL(14, 2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_sale_items_sale (sale_id),
  KEY idx_sale_items_product (product_id),
  CONSTRAINT fk_sale_items_sale
    FOREIGN KEY (sale_id) REFERENCES sales (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_sale_items_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sale_returns (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sale_id BIGINT UNSIGNED NOT NULL,
  original_sale_item_id BIGINT UNSIGNED NOT NULL,
  return_date DATE NOT NULL,
  quantity DECIMAL(12, 3) NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  line_total DECIMAL(14, 2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_sale_returns_sale (sale_id),
  KEY idx_sale_returns_original_item (original_sale_item_id),
  CONSTRAINT fk_sale_returns_sale
    FOREIGN KEY (sale_id) REFERENCES sales (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_sale_returns_original_item
    FOREIGN KEY (original_sale_item_id) REFERENCES sale_items (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS supplier_returns (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  shop_id BIGINT UNSIGNED NOT NULL,
  supplier_id BIGINT UNSIGNED NOT NULL,
  purchase_bill_id BIGINT UNSIGNED NOT NULL,
  return_date DATE NOT NULL,
  notes VARCHAR(500) NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_supplier_returns_shop_date (shop_id, return_date),
  KEY idx_supplier_returns_bill (purchase_bill_id),
  CONSTRAINT fk_supplier_returns_shop
    FOREIGN KEY (shop_id) REFERENCES shops (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_supplier_returns_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_supplier_returns_purchase
    FOREIGN KEY (purchase_bill_id) REFERENCES purchase_bills (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_supplier_returns_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS supplier_return_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  supplier_return_id BIGINT UNSIGNED NOT NULL,
  original_purchase_item_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(12, 3) NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  line_total DECIMAL(14, 2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_supplier_return_items_return (supplier_return_id),
  KEY idx_supplier_return_items_purchase_item (original_purchase_item_id),
  KEY idx_supplier_return_items_product (product_id),
  CONSTRAINT fk_supplier_return_items_return
    FOREIGN KEY (supplier_return_id) REFERENCES supplier_returns (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_supplier_return_items_purchase_item
    FOREIGN KEY (original_purchase_item_id) REFERENCES purchase_items (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_supplier_return_items_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  shop_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  adjustment_type ENUM('damage') NOT NULL,
  adjustment_date DATE NOT NULL,
  quantity DECIMAL(12, 3) NOT NULL,
  notes VARCHAR(500) NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_stock_adjustments_shop_date (shop_id, adjustment_date),
  KEY idx_stock_adjustments_product (product_id),
  CONSTRAINT fk_stock_adjustments_shop
    FOREIGN KEY (shop_id) REFERENCES shops (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_stock_adjustments_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_stock_adjustments_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS warehouse_stock (
  warehouse_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(12, 3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (warehouse_id, product_id),
  KEY idx_warehouse_stock_product (product_id),
  CONSTRAINT fk_warehouse_stock_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_warehouse_stock_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS warehouse_stock_transfers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  shop_id BIGINT UNSIGNED NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  transfer_date DATE NOT NULL,
  notes VARCHAR(500) NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_warehouse_transfers_shop_date (shop_id, transfer_date),
  KEY idx_warehouse_transfers_warehouse (warehouse_id),
  CONSTRAINT fk_warehouse_transfers_shop
    FOREIGN KEY (shop_id) REFERENCES shops (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_warehouse_transfers_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_warehouse_transfers_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS warehouse_stock_transfer_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  transfer_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(12, 3) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_warehouse_transfer_items_transfer (transfer_id),
  KEY idx_warehouse_transfer_items_product (product_id),
  CONSTRAINT fk_warehouse_transfer_items_transfer
    FOREIGN KEY (transfer_id) REFERENCES warehouse_stock_transfers (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_warehouse_transfer_items_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_cost_layers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  shop_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  source_type ENUM('opening', 'purchase', 'return', 'transfer') NOT NULL,
  location_type ENUM('shop', 'warehouse') NOT NULL DEFAULT 'shop',
  warehouse_id BIGINT UNSIGNED NULL,
  purchase_item_id BIGINT UNSIGNED NULL,
  transfer_item_id BIGINT UNSIGNED NULL,
  received_date DATE NOT NULL,
  initial_quantity DECIMAL(12, 3) NOT NULL,
  remaining_quantity DECIMAL(12, 3) NOT NULL,
  unit_cost DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_stock_cost_layer_purchase_item (purchase_item_id),
  KEY idx_stock_cost_layers_transfer_item (transfer_item_id),
  KEY idx_stock_cost_layers_fifo (shop_id, product_id, received_date, id, remaining_quantity),
  KEY idx_stock_cost_layers_location (shop_id, location_type, warehouse_id, product_id, received_date, id),
  CONSTRAINT fk_stock_cost_layers_shop
    FOREIGN KEY (shop_id) REFERENCES shops (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_stock_cost_layers_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_stock_cost_layers_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_stock_cost_layers_purchase_item
    FOREIGN KEY (purchase_item_id) REFERENCES purchase_items (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_stock_cost_layers_transfer_item
    FOREIGN KEY (transfer_item_id) REFERENCES warehouse_stock_transfer_items (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sale_cost_allocations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sale_item_id BIGINT UNSIGNED NOT NULL,
  stock_cost_layer_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(12, 3) NOT NULL,
  returned_quantity DECIMAL(12, 3) NOT NULL DEFAULT 0,
  unit_cost DECIMAL(12, 2) NOT NULL,
  cost_total DECIMAL(14, 2) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sale_cost_allocation_layer (sale_item_id, stock_cost_layer_id),
  KEY idx_sale_cost_allocations_layer (stock_cost_layer_id),
  CONSTRAINT fk_sale_cost_allocations_item
    FOREIGN KEY (sale_item_id) REFERENCES sale_items (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_sale_cost_allocations_layer
    FOREIGN KEY (stock_cost_layer_id) REFERENCES stock_cost_layers (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
