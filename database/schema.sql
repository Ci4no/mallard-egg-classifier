CREATE DATABASE IF NOT EXISTS mallard_egg_classifier CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mallard_egg_classifier;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','operator') NOT NULL DEFAULT 'operator',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX (expires_at)
);

CREATE TABLE IF NOT EXISTS batches (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  notes TEXT NULL,
  status ENUM('active','closed') NOT NULL DEFAULT 'active',
  created_by BIGINT UNSIGNED NOT NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS devices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  phone_model VARCHAR(120) NULL,
  mount_type VARCHAR(160) NULL,
  target_distance_mm DECIMAL(8,2) NOT NULL,
  distance_tolerance_mm DECIMAL(8,2) NOT NULL DEFAULT 5,
  alignment_tolerance_deg DECIMAL(6,2) NOT NULL DEFAULT 3,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS calibrations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  device_id BIGINT UNSIGNED NULL,
  reference_area_px DECIMAL(14,3) NOT NULL,
  reference_width_mm DECIMAL(8,2) NULL,
  reference_height_mm DECIMAL(8,2) NULL,
  distance_mm DECIMAL(8,2) NOT NULL,
  alignment_deg DECIMAL(6,2) NOT NULL DEFAULT 0,
  sample_count INT UNSIGNED NOT NULL DEFAULT 1,
  variation_percent DECIMAL(7,3) NOT NULL DEFAULT 0,
  is_valid TINYINT(1) NOT NULL DEFAULT 1,
  verified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX (created_at)
);

CREATE TABLE IF NOT EXISTS model_versions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  version VARCHAR(60) NOT NULL,
  type ENUM('vision-rules','ml-api','tensorflow-js','onnx') NOT NULL DEFAULT 'vision-rules',
  endpoint_url VARCHAR(500) NULL,
  notes TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (name, version)
);

CREATE TABLE IF NOT EXISTS scans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  batch_id BIGINT UNSIGNED NOT NULL,
  calibration_id BIGINT UNSIGNED NOT NULL,
  model_version_id BIGINT UNSIGNED NULL,
  predicted_class ENUM('Small','Medium','Large','Extra Large') NOT NULL,
  actual_class ENUM('Small','Medium','Large','Extra Large') NULL,
  confidence DECIMAL(7,6) NOT NULL,
  area_px DECIMAL(14,3) NOT NULL,
  width_px DECIMAL(12,3) NULL,
  height_px DECIMAL(12,3) NULL,
  measured_width_mm DECIMAL(8,2) NULL,
  measured_height_mm DECIMAL(8,2) NULL,
  distance_mm DECIMAL(8,2) NOT NULL,
  alignment_deg DECIMAL(6,2) NOT NULL DEFAULT 0,
  stable TINYINT(1) NOT NULL DEFAULT 1,
  captured_by BIGINT UNSIGNED NOT NULL,
  captured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES batches(id),
  FOREIGN KEY (calibration_id) REFERENCES calibrations(id),
  FOREIGN KEY (model_version_id) REFERENCES model_versions(id) ON DELETE SET NULL,
  FOREIGN KEY (captured_by) REFERENCES users(id),
  INDEX (captured_at), INDEX (batch_id), INDEX (predicted_class)
);

INSERT IGNORE INTO model_versions (name, version, type, notes, is_active)
VALUES ('Mallard area-ratio baseline', '1.0.0', 'vision-rules', 'Otsu segmentation and calibrated area-ratio baseline.', 1);
