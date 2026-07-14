-- MySQL structure reference for Tailor Shop Management System
-- Source of truth remains prisma/schema.prisma.

CREATE TABLE users (
  id VARCHAR(191) PRIMARY KEY,
  tenant_id VARCHAR(36) NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(60) NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL
);

CREATE TABLE customers (
  id VARCHAR(191) PRIMARY KEY,
  tenant_id VARCHAR(36) NULL,
  customer_number VARCHAR(40) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  alternative_phone VARCHAR(30) NULL,
  email VARCHAR(190) NULL,
  address VARCHAR(255) NULL,
  city VARCHAR(120) NULL,
  gender ENUM('MALE','FEMALE','OTHER') NULL,
  notes TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_customers_tenant_phone (tenant_id, phone),
  INDEX idx_customers_tenant_name (tenant_id, full_name)
);

CREATE TABLE garment_types (
  id VARCHAR(191) PRIMARY KEY,
  tenant_id VARCHAR(36) NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_garment_type_tenant_name (tenant_id, name)
);

CREATE TABLE measurement_profiles (
  id VARCHAR(191) PRIMARY KEY,
  tenant_id VARCHAR(36) NULL,
  customer_id VARCHAR(191) NOT NULL,
  garment_type_id VARCHAR(191) NOT NULL,
  name VARCHAR(120) NOT NULL,
  notes TEXT NULL,
  measured_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_measurements_profile_customer (tenant_id, customer_id),
  CONSTRAINT fk_profile_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_profile_garment FOREIGN KEY (garment_type_id) REFERENCES garment_types(id) ON DELETE RESTRICT
);

CREATE TABLE measurements (
  id VARCHAR(191) PRIMARY KEY,
  tenant_id VARCHAR(36) NULL,
  measurement_profile_id VARCHAR(191) NOT NULL,
  field_name VARCHAR(120) NOT NULL,
  field_value VARCHAR(120) NOT NULL,
  unit VARCHAR(20) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_measurements_profile (tenant_id, measurement_profile_id),
  CONSTRAINT fk_measurement_profile FOREIGN KEY (measurement_profile_id) REFERENCES measurement_profiles(id) ON DELETE CASCADE
);

CREATE TABLE orders (
  id VARCHAR(191) PRIMARY KEY,
  tenant_id VARCHAR(36) NULL,
  order_number VARCHAR(40) NOT NULL UNIQUE,
  customer_id VARCHAR(191) NOT NULL,
  order_date DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  delivery_date DATETIME(3) NULL,
  priority ENUM('LOW','NORMAL','HIGH','URGENT') NOT NULL DEFAULT 'NORMAL',
  status ENUM('PENDING','CUTTING','SEWING','FINISHING','READY','DELIVERED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  overpayment_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_orders_tenant_date (tenant_id, order_date),
  INDEX idx_orders_tenant_status (tenant_id, status),
  CONSTRAINT fk_order_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);

CREATE TABLE order_items (
  id VARCHAR(191) PRIMARY KEY,
  tenant_id VARCHAR(36) NULL,
  order_id VARCHAR(191) NOT NULL,
  garment_type_id VARCHAR(191) NOT NULL,
  measurement_profile_id VARCHAR(191) NULL,
  fabric VARCHAR(120) NULL,
  color VARCHAR(60) NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  tailoring_instructions TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_order_items_order (tenant_id, order_id),
  CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_garment FOREIGN KEY (garment_type_id) REFERENCES garment_types(id) ON DELETE RESTRICT,
  CONSTRAINT fk_item_profile FOREIGN KEY (measurement_profile_id) REFERENCES measurement_profiles(id) ON DELETE SET NULL
);

CREATE TABLE payment_methods (
  id VARCHAR(191) PRIMARY KEY,
  tenant_id VARCHAR(36) NULL,
  code ENUM('CASH','CARD','BANK_TRANSFER','MOBILE_MONEY','OTHER') NOT NULL,
  label VARCHAR(60) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_payment_method_tenant_code (tenant_id, code)
);

CREATE TABLE payments (
  id VARCHAR(191) PRIMARY KEY,
  tenant_id VARCHAR(36) NULL,
  order_id VARCHAR(191) NOT NULL,
  customer_id VARCHAR(191) NOT NULL,
  payment_method_id VARCHAR(191) NOT NULL,
  received_by_id VARCHAR(191) NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_date DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  reference_no VARCHAR(120) NULL,
  notes TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_payments_order (tenant_id, order_id),
  INDEX idx_payments_customer (tenant_id, customer_id),
  INDEX idx_payments_date (tenant_id, payment_date),
  CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_method FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_receiver FOREIGN KEY (received_by_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE activity_logs (
  id VARCHAR(191) PRIMARY KEY,
  tenant_id VARCHAR(36) NULL,
  actor_user_id VARCHAR(191) NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  action VARCHAR(60) NOT NULL,
  message TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_activity_tenant_date (tenant_id, created_at),
  CONSTRAINT fk_activity_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE settings (
  id VARCHAR(191) PRIMARY KEY,
  tenant_id VARCHAR(36) NULL,
  `key` VARCHAR(120) NOT NULL,
  `value` TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_settings_tenant_key (tenant_id, `key`)
);
