USE a2techno_mitali_radio_electric;

ALTER TABLE customers
  ADD COLUMN opening_balance DECIMAL(12, 2) NULL AFTER area;

UPDATE customers c
SET c.opening_balance = COALESCE(
  (SELECT s.previous_due_amount
   FROM sales s
   WHERE s.customer_id = c.id
   ORDER BY s.id
   LIMIT 1),
  c.previous_balance
)
WHERE c.opening_balance IS NULL;

ALTER TABLE customers
  RENAME COLUMN previous_balance TO current_balance;
