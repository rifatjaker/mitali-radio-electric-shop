CREATE TABLE IF NOT EXISTS quotations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  shop_id BIGINT UNSIGNED NOT NULL,
  customer_id BIGINT UNSIGNED NULL,
  customer_name VARCHAR(180) NOT NULL,
  mobile_number VARCHAR(20) NULL,
  address VARCHAR(255) NULL,
  quotation_number VARCHAR(60) NULL,
  issue_date DATE NOT NULL,
  valid_until DATE NOT NULL,
  subtotal DECIMAL(14, 2) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  terms TEXT NULL,
  status ENUM('open', 'converted', 'cancelled') NOT NULL DEFAULT 'open',
  converted_sale_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_quotations_shop_number (shop_id, quotation_number),
  UNIQUE KEY uq_quotations_converted_sale (converted_sale_id),
  KEY idx_quotations_shop_date (shop_id, issue_date),
  KEY idx_quotations_customer (customer_id),
  KEY idx_quotations_status_validity (shop_id, status, valid_until),
  CONSTRAINT fk_quotations_shop
    FOREIGN KEY (shop_id) REFERENCES shops (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_quotations_customer
    FOREIGN KEY (customer_id) REFERENCES customers (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_quotations_converted_sale
    FOREIGN KEY (converted_sale_id) REFERENCES sales (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_quotations_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quotation_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  quotation_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NULL,
  product_name VARCHAR(180) NOT NULL,
  product_code VARCHAR(80) NULL,
  unit VARCHAR(30) NULL,
  quantity DECIMAL(12, 3) NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  line_total DECIMAL(14, 2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_quotation_items_quotation (quotation_id),
  KEY idx_quotation_items_product (product_id),
  CONSTRAINT fk_quotation_items_quotation
    FOREIGN KEY (quotation_id) REFERENCES quotations (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_quotation_items_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
