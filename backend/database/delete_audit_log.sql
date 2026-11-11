CREATE TABLE IF NOT EXISTS delete_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  shop_id BIGINT UNSIGNED NULL,
  actor_user_id BIGINT UNSIGNED NOT NULL,
  actor_name VARCHAR(120) NOT NULL,
  actor_username VARCHAR(80) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  record_id BIGINT UNSIGNED NOT NULL,
  record_label VARCHAR(255) NOT NULL,
  reason VARCHAR(1000) NOT NULL,
  deleted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_delete_audit_shop_date (shop_id, deleted_at),
  KEY idx_delete_audit_actor_date (actor_user_id, deleted_at),
  KEY idx_delete_audit_type_date (entity_type, deleted_at),
  CONSTRAINT fk_delete_audit_actor
    FOREIGN KEY (actor_user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
