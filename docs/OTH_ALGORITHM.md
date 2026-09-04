# One Time Handshake (OTH) — Cryptographic Algorithm Specification

## 8-Step Handshake Protocol

```
+------------------+                    +--------------------+
|  Android Client  |                    |  Backend Verifier  |
+------------------+                    +--------------------+
         |                                         |
         | 1. Generate 32-byte Nonce               |
         | 2. Capture Unix Timestamp               |
         | 3. Assemble Canonical Payload           |
         | 4. Compute HMAC-SHA256                   |
         | 5. Encrypt via AES-256-GCM             |
         | 6. Format Token OTHv1.<payload>         |
         |---------------------------------------->|
         |       Transmit Handshake Token          | 7. Validate Timestamp (<30s)
         |                                         | 8. Check Nonce Registry
         |                                         | 9. Decrypt AES-256
         |                                         | 10. Verify HMAC & Public Key
         |                                         | 11. Store Nonce in ReplayGuard
         |<----------------------------------------|
         |     200 OK: JWT Session Issued          |
```

## Detailed Execution Sequence

### Step 1: Cryptographic Nonce Generation
The client generates a 32-byte cryptographically secure random buffer $N$ using CSPRNG.

### Step 2: Canonical Payload Assembly
```json
{
  "uid": "usr_99218",
  "fingerprint": "a8f9c2d13e90",
  "timestamp": 1725445200000,
  "nonce": "f8a92b3c4d5e6f7a8b9c0d1e2f3a4b5c"
}
```

### Step 3: Hashing & HMAC Signature
The canonical JSON string is hashed using SHA-256 and signed with HMAC-SHA256 using the client's bound secret key.

### Step 4: AES-256-GCM Encryption
The combined payload and signature are encrypted with AES-256-GCM, generating cipher text, IV (initialization vector), and an authentication tag.

### Step 5: Token Encoding
The token is Base64URL encoded with the prefix `OTHv1.`.

### Step 6: Server Time-Skew & Nonce Validation
The backend verifies that the timestamp is within $\pm 30$ seconds of the server clock and queries the Nonce Registry to prevent replay attacks.

### Step 7: Signature Verification & Key Match
The server decrypts the payload and validates the HMAC signature against the user's registered public key.

### Step 8: Nonce Consumption
Upon successful verification, the nonce is registered in the ReplayGuard database with a 300-second TTL to permanently reject any re-transmission attempts.
