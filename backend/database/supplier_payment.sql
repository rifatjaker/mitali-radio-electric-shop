CREATE TABLE IF NOT EXISTS supplier_payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  shop_id BIGINT UNSIGNED NOT NULL,
  supplier_id BIGINT UNSIGNED NOT NULL,
  payment_amount DECIMAL(12, 2) NOT NULL,
  payment_method ENUM('cash', 'bank') NOT NULL,
  bank_account_id BIGINT UNSIGNED NULL,
  note VARCHAR(500) NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_supplier_payments_shop_date (shop_id, created_at),
  KEY idx_supplier_payments_supplier (supplier_id),
  KEY idx_supplier_payments_bank_account (bank_account_id),
  CONSTRAINT fk_supplier_payments_shop
    FOREIGN KEY (shop_id) REFERENCES shops (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_supplier_payments_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_supplier_payments_bank_account
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_supplier_payments_created_by
    FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
