# One Time Handshake (OTH) — Architecture Specification

## Overview

One Time Handshake (OTH) replaces traditional, delay-prone SMS and internet OTP systems with an offline-first, cryptographic zero-knowledge handshake verification model.

```mermaid
graph TD
    UserDevice[Android / iOS Client] -->|1. Generate Local Handshake| CryptoEngine[OTH Crypto Engine]
    CryptoEngine -->|2. Encrypted Token / QR| Transport Layer
    Transport Layer -->|Online: Express API / Offline: Dynamic QR| Backend[Backend Express / Firebase]
    Backend -->|3. Nonce & HMAC Check| NonceRegistry[ReplayGuard Registry]
    Backend -->|4. Gemini AI Risk Scan| AIAnalyzer[Gemini Fraud Detection]
    Backend -->|5. Audit Log| Firestore[(Google Cloud Firestore)]
```

## Core Layers

### 1. Client Layer (React Native / Android Keystore)
- **Device Fingerprint Engine**: Combines Android ID, Installation UUID, Device Model, and RSA/ECC Public Key to construct an immutable hardware fingerprint hash without requesting restricted IMEI permissions.
- **Offline Vault**: Encrypted SQLite storage powered by AES-256 for local handshake queueing and token generation in zero-connectivity environments.

### 2. Cryptographic Engine (TypeScript / Node.js)
- **Symmetric Cipher**: AES-256-GCM for payload encryption.
- **Message Integrity**: HMAC-SHA256 signatures with 32-byte nonces.
- **Replay Guard**: In-memory & distributed Firestore bloom filter / nonce registry ensuring single-use token validity.

### 3. Cloud & Backend Service Layer
- **Express.js Microservices**: REST API endpoints for user registration, handshake verification, dynamic QR generation, and offline batch sync.
- **Firebase Firestore**: Multi-region primary database storing bound device profiles, trusted device registries, and immutable audit logs.
- **Gemini AI Integration**: Analyzes authentication metadata to explain failure causes, rate suspicious logins, and detect impossible travel vectors.

### 4. Enterprise Admin Dashboard (Next.js 15)
- Real-time command center providing threat visualization, user device revocation, live authentication logging, and API key management.
