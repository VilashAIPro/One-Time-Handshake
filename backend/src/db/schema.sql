-- ============================================================
-- OTH Platform — MySQL 8.0 Database Schema
-- One Time Handshake (OTH) — Secure Authentication Platform
-- ============================================================
-- Version: 1.0.0
-- Created: 2026-09-04

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';

-- ─── Database ──────────────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS oth_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE oth_db;

-- ─── Organizations ────────────────────────────────────────────────

CREATE TABLE organizations (
  id              CHAR(36)      NOT NULL DEFAULT (UUID()),
  name            VARCHAR(255)  NOT NULL,
  slug            VARCHAR(100)  NOT NULL UNIQUE,
  plan            ENUM('free','standard','enterprise','government','defence')
                                NOT NULL DEFAULT 'standard',
  api_key_hash    VARCHAR(128)  NOT NULL COMMENT 'SHA-256 of API key',
  webhook_url     VARCHAR(500)  NULL,
  webhook_secret  VARCHAR(128)  NULL     COMMENT 'HMAC secret for webhook signing',
  max_devices     INT           NOT NULL DEFAULT 10,
  max_users       INT           NOT NULL DEFAULT 1000,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  metadata        JSON          NULL,
  created_at      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_org_slug (slug),
  INDEX idx_org_plan (plan),
  INDEX idx_org_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Users ────────────────────────────────────────────────────────

CREATE TABLE users (
  id              CHAR(36)      NOT NULL DEFAULT (UUID()),
  uid             VARCHAR(64)   NOT NULL UNIQUE COMMENT 'Public UID (not the DB ID)',
  org_id          CHAR(36)      NULL,
  phone           VARCHAR(20)   NOT NULL UNIQUE,
  email           VARCHAR(255)  NULL UNIQUE,
  password_hash   VARCHAR(255)  NOT NULL COMMENT 'bcrypt hash (emergency fallback only)',
  full_name       VARCHAR(255)  NULL,
  role            ENUM('user','admin','org_admin','super_admin','govt','defence')
                                NOT NULL DEFAULT 'user',
  status          ENUM('active','suspended','locked','pending')
                                NOT NULL DEFAULT 'pending',
  failed_attempts INT           NOT NULL DEFAULT 0,
  locked_until    DATETIME      NULL,
  phone_verified  BOOLEAN       NOT NULL DEFAULT FALSE,
  email_verified  BOOLEAN       NOT NULL DEFAULT FALSE,
  biometric_enrolled BOOLEAN    NOT NULL DEFAULT FALSE,
  master_key_version INT        NOT NULL DEFAULT 1,
  last_login_at   DATETIME      NULL,
  last_login_ip   VARCHAR(45)   NULL,
  created_at      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at      DATETIME      NULL     COMMENT 'Soft delete',
  PRIMARY KEY (id),
  UNIQUE INDEX idx_user_uid (uid),
  INDEX idx_user_phone (phone),
  INDEX idx_user_email (email),
  INDEX idx_user_org (org_id),
  INDEX idx_user_status (status),
  CONSTRAINT fk_user_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Devices ──────────────────────────────────────────────────────

CREATE TABLE devices (
  id              CHAR(36)      NOT NULL DEFAULT (UUID()),
  uid             VARCHAR(64)   NOT NULL,
  device_id       VARCHAR(255)  NOT NULL COMMENT 'Hardware device identifier',
  device_name     VARCHAR(255)  NULL     COMMENT 'User-given alias',
  platform        ENUM('android','ios','web','feature_phone','unknown')
                                NOT NULL DEFAULT 'android',
  os_version      VARCHAR(50)   NULL,
  app_version     VARCHAR(20)   NULL,
  brand           VARCHAR(100)  NULL,
  model           VARCHAR(100)  NULL,
  imei_hash       VARCHAR(64)   NULL     COMMENT 'SHA-256 of IMEI (privileged devices only)',
  fingerprint     VARCHAR(64)   NOT NULL COMMENT 'Device fingerprint hash',
  fingerprint_confidence ENUM('high','medium','low') NOT NULL DEFAULT 'medium',
  key_version     INT           NOT NULL DEFAULT 1,
  is_trusted      BOOLEAN       NOT NULL DEFAULT FALSE,
  is_primary      BOOLEAN       NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  last_seen_at    DATETIME      NULL,
  last_seen_ip    VARCHAR(45)   NULL,
  fcm_token       VARCHAR(500)  NULL     COMMENT 'Firebase Cloud Messaging token',
  bound_at        DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX idx_device_uid_deviceid (uid, device_id),
  INDEX idx_device_uid (uid),
  INDEX idx_device_trusted (is_trusted),
  INDEX idx_device_active (is_active),
  CONSTRAINT fk_device_user FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Handshakes ───────────────────────────────────────────────────

CREATE TABLE handshakes (
  id              CHAR(36)      NOT NULL DEFAULT (UUID()),
  handshake_id    VARCHAR(64)   NOT NULL UNIQUE COMMENT 'SHA-256(nonce+ts+uid)',
  uid             VARCHAR(64)   NOT NULL,
  device_id       VARCHAR(255)  NOT NULL,
  nonce           VARCHAR(64)   NOT NULL UNIQUE,
  timestamp_ms    BIGINT        NOT NULL,
  status          ENUM('generated','verified','failed','expired','replayed')
                                NOT NULL DEFAULT 'generated',
  auth_method     ENUM('handshake','qr','offline','emergency','imei')
                                NOT NULL DEFAULT 'handshake',
  ip_address      VARCHAR(45)   NULL,
  user_agent      VARCHAR(500)  NULL,
  risk_score      TINYINT       NOT NULL DEFAULT 0 COMMENT '0=safe, 100=critical',
  failure_reason  VARCHAR(255)  NULL,
  generated_at    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  verified_at     DATETIME      NULL,
  expires_at      DATETIME(3)   NOT NULL,
  PRIMARY KEY (id),
  UNIQUE INDEX idx_handshake_id (handshake_id),
  UNIQUE INDEX idx_handshake_nonce (nonce),
  INDEX idx_handshake_uid (uid),
  INDEX idx_handshake_status (status),
  INDEX idx_handshake_device (device_id),
  INDEX idx_handshake_generated (generated_at),
  CONSTRAINT fk_handshake_user FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Sessions ─────────────────────────────────────────────────────

CREATE TABLE sessions (
  id                  CHAR(36)      NOT NULL DEFAULT (UUID()),
  uid                 VARCHAR(64)   NOT NULL,
  device_id           VARCHAR(255)  NOT NULL,
  handshake_id        VARCHAR(64)   NULL,
  jwt_token_hash      VARCHAR(64)   NOT NULL COMMENT 'SHA-256 of JWT for blacklist',
  refresh_token_hash  VARCHAR(64)   NULL,
  ip_address          VARCHAR(45)   NULL,
  user_agent          VARCHAR(500)  NULL,
  is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at          DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at          DATETIME      NOT NULL,
  refresh_expires_at  DATETIME      NULL,
  revoked_at          DATETIME      NULL,
  revoke_reason       VARCHAR(255)  NULL,
  PRIMARY KEY (id),
  INDEX idx_session_uid (uid),
  INDEX idx_session_jwt (jwt_token_hash),
  INDEX idx_session_active (is_active),
  INDEX idx_session_device (device_id),
  CONSTRAINT fk_session_user FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Security Logs ────────────────────────────────────────────────

CREATE TABLE security_logs (
  id          BIGINT        NOT NULL AUTO_INCREMENT,
  uid         VARCHAR(64)   NULL COMMENT 'NULL for unauthenticated events',
  device_id   VARCHAR(255)  NULL,
  event_type  ENUM(
    'login_success', 'login_failed', 'handshake_verified', 'handshake_failed',
    'replay_attack', 'brute_force', 'device_bound', 'device_removed',
    'device_cloning_detected', 'suspicious_location', 'timestamp_mismatch',
    'session_revoked', 'emergency_auth', 'offline_auth', 'qr_auth',
    'key_rotation', 'account_locked', 'account_unlocked', 'password_changed',
    'imei_mismatch', 'fingerprint_mismatch', 'token_expired', 'api_key_used'
  )             NOT NULL,
  severity    ENUM('info','warning','error','critical') NOT NULL DEFAULT 'info',
  ip_address  VARCHAR(45)   NULL,
  user_agent  VARCHAR(500)  NULL,
  risk_score  TINYINT       NOT NULL DEFAULT 0,
  metadata    JSON          NULL,
  timestamp   DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  INDEX idx_seclog_uid (uid),
  INDEX idx_seclog_event (event_type),
  INDEX idx_seclog_severity (severity),
  INDEX idx_seclog_timestamp (timestamp),
  INDEX idx_seclog_risk (risk_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Emergency Tokens ─────────────────────────────────────────────

CREATE TABLE emergency_tokens (
  id              CHAR(36)      NOT NULL DEFAULT (UUID()),
  uid             VARCHAR(64)   NOT NULL,
  device_id       VARCHAR(255)  NULL COMMENT 'Locked device that triggered emergency',
  token_hash      VARCHAR(64)   NOT NULL UNIQUE COMMENT 'SHA-256 of the actual token',
  token_type      ENUM('recovery','offline','trusted_contact','admin_override')
                                NOT NULL DEFAULT 'recovery',
  is_used         BOOLEAN       NOT NULL DEFAULT FALSE,
  usage_count     INT           NOT NULL DEFAULT 0,
  max_usage       INT           NOT NULL DEFAULT 1,
  generated_by    VARCHAR(64)   NULL     COMMENT 'Admin UID if admin-generated',
  ip_address      VARCHAR(45)   NULL,
  created_at      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at      DATETIME      NOT NULL,
  used_at         DATETIME      NULL,
  PRIMARY KEY (id),
  INDEX idx_emergency_uid (uid),
  INDEX idx_emergency_hash (token_hash),
  INDEX idx_emergency_type (token_type),
  CONSTRAINT fk_emergency_user FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Trusted Devices ──────────────────────────────────────────────

CREATE TABLE trusted_devices (
  id          CHAR(36)      NOT NULL DEFAULT (UUID()),
  uid         VARCHAR(64)   NOT NULL,
  device_id   VARCHAR(255)  NOT NULL,
  alias       VARCHAR(100)  NULL COMMENT 'User-given name e.g. "My Phone"',
  trust_level ENUM('full','partial','emergency_only') NOT NULL DEFAULT 'full',
  added_by    VARCHAR(64)   NULL COMMENT 'UID of user who added (self or admin)',
  added_at    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at  DATETIME      NULL     COMMENT 'NULL = permanent trust',
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE INDEX idx_trusted_uid_device (uid, device_id),
  INDEX idx_trusted_uid (uid),
  INDEX idx_trusted_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Offline Tokens ───────────────────────────────────────────────

CREATE TABLE offline_tokens (
  id              CHAR(36)      NOT NULL DEFAULT (UUID()),
  uid             VARCHAR(64)   NOT NULL,
  device_id       VARCHAR(255)  NOT NULL,
  handshake_id    VARCHAR(64)   NOT NULL UNIQUE,
  token_encrypted TEXT          NOT NULL COMMENT 'AES-encrypted offline token',
  checksum        VARCHAR(64)   NOT NULL,
  usage_count     INT           NOT NULL DEFAULT 0,
  max_usage       INT           NOT NULL DEFAULT 3,
  is_synced       BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at      DATETIME      NOT NULL,
  synced_at       DATETIME      NULL,
  PRIMARY KEY (id),
  INDEX idx_offline_uid (uid),
  INDEX idx_offline_device (device_id),
  INDEX idx_offline_synced (is_synced)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── API Keys ─────────────────────────────────────────────────────

CREATE TABLE api_keys (
  id              CHAR(36)      NOT NULL DEFAULT (UUID()),
  org_id          CHAR(36)      NOT NULL,
  name            VARCHAR(100)  NOT NULL,
  key_hash        VARCHAR(64)   NOT NULL UNIQUE COMMENT 'SHA-256 of the API key',
  key_prefix      VARCHAR(10)   NOT NULL COMMENT 'First 8 chars for display',
  permissions     JSON          NOT NULL DEFAULT ('[]'),
  rate_limit      INT           NOT NULL DEFAULT 1000 COMMENT 'Requests per hour',
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  last_used_at    DATETIME      NULL,
  created_at      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at      DATETIME      NULL,
  created_by      VARCHAR(64)   NULL,
  PRIMARY KEY (id),
  INDEX idx_apikey_org (org_id),
  INDEX idx_apikey_hash (key_hash),
  INDEX idx_apikey_active (is_active),
  CONSTRAINT fk_apikey_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── QR Sessions ──────────────────────────────────────────────────

CREATE TABLE qr_sessions (
  id          CHAR(36)      NOT NULL DEFAULT (UUID()),
  uid         VARCHAR(64)   NOT NULL,
  device_id   VARCHAR(255)  NOT NULL,
  nonce       VARCHAR(64)   NOT NULL UNIQUE,
  qr_hash     VARCHAR(64)   NOT NULL COMMENT 'SHA-256 of QR payload',
  status      ENUM('pending','scanned','verified','expired','failed')
                            NOT NULL DEFAULT 'pending',
  scanned_by  VARCHAR(64)   NULL     COMMENT 'UID of user who scanned',
  created_at  DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at  DATETIME      NOT NULL,
  scanned_at  DATETIME      NULL,
  verified_at DATETIME      NULL,
  PRIMARY KEY (id),
  UNIQUE INDEX idx_qr_nonce (nonce),
  INDEX idx_qr_uid (uid),
  INDEX idx_qr_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Seed Data ────────────────────────────────────────────────────

-- Default organization
INSERT INTO organizations (id, name, slug, plan, api_key_hash, max_devices, max_users)
VALUES (
  UUID(),
  'OTH Platform',
  'oth-platform',
  'enterprise',
  SHA2('oth-default-api-key-change-in-production', 256),
  1000,
  100000
);

SET foreign_key_checks = 1;
