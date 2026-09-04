# One Time Handshake (OTH) — API Reference Guide

Base URL: `http://localhost:5000/api` or `https://api.oth-security.gov/api`

## Authentication Endpoints

### 1. Register User & Bind Device
`POST /api/auth/register`

**Request Body:**
```json
{
  "phoneNumber": "+919876543210",
  "deviceFingerprint": {
    "androidId": "a1b2c3d4e5f6",
    "installationId": "uuid-1234-5678",
    "deviceModel": "Google Pixel 8 Pro",
    "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...",
    "fingerprintHash": "a8f9c2d13e90..."
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "uid": "usr_99218",
  "message": "User registered and device bound successfully",
  "jwtToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6Ik..."
}
```

---

### 2. Login via Handshake Token
`POST /api/auth/login`

**Request Body:**
```json
{
  "handshakeToken": "OTHv1.eyJhbGciOiJBRVMyNTZHQ00iLCJpdiI6..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "verified": true,
  "uid": "usr_99218",
  "sessionJwt": "eyJhbGciOiJIUzI1Ni..."
}
```

---

### 3. Verify Handshake Server-Side
`POST /api/handshake/verify`

**Request Body:**
```json
{
  "handshakeToken": "OTHv1.eyJhbGciOiJBRVMyNTZHQ00iLCJpdiI6..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "nonce": "f8a92b3c4d5e6f7a8b9c0d1e2f3a4b5c",
  "timestamp": 1725445200000,
  "deviceFingerprintHash": "a8f9c2d13e90"
}
```

---

### 4. Dynamic QR Code Generation
`POST /api/qr/generate`

**Response (200 OK):**
```json
{
  "qrPayload": "OTHv1.QR.eyJhbGciOiJBRVMyNTZHQ00i...",
  "expiresInSeconds": 30
}
```

---

### 5. Offline Queue Batch Sync
`POST /api/offline/sync`

**Request Body:**
```json
{
  "offlineTokens": [
    "OTHv1.OFFLINE.tok_01...",
    "OTHv1.OFFLINE.tok_02..."
  ]
}
```

**Response (200 OK):**
```json
{
  "syncedCount": 2,
  "status": "SUCCESS"
}
```
