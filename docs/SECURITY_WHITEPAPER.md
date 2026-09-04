# One Time Handshake (OTH) — Security & Cryptography Whitepaper

## Executive Summary

Traditional SMS-based One Time Passwords (OTPs) suffer from critical vulnerabilities including SIM swapping, SS7 interception, telecom network outages, and lack of offline accessibility. **One Time Handshake (OTH)** establishes a zero-telecom, cryptographic authentication protocol designed for defense, banking, government, and emergency environments.

## Threat Model & Security Mitigations

| Threat Vector | Traditional SMS OTP Vulnerability | OTH Mitigation Strategy |
| :--- | :--- | :--- |
| **SIM Swapping** | Attacker hijacks victim's phone number to intercept SMS OTPs. | **Hardware Bound Fingerprint**: Authentication requires physical presence of the bound hardware key. Swapping SIM card does not yield the cryptographic private key stored in Android Keystore. |
| **Network Interception (SS7 / IMSI Catcher)** | Interception of plain-text SMS messages over cellular networks. | **Zero Telecom Dependency**: Handshake payload is encrypted using AES-256-GCM and signed with HMAC-SHA256 directly on device. |
| **Replay Attacks** | Capturing an authentication code and re-transmitting it. | **ReplayGuard Nonce Registry**: Every handshake contains a cryptographically secure 256-bit random nonce and strict 30-second timestamp window. Spent nonces are rejected. |
| **Device Cloning** | Copying app state to an unauthorized device. | **Non-Exportable Keystore Keys**: Cryptographic keys are generated inside Hardware-backed Keystore (StrongBox / TEE) and cannot be exported or cloned. |
| **Offline Rural Failures** | Authentication fails completely without cell coverage or internet. | **Offline Cryptographic Vault**: Device computes offline handshake tokens using local HMAC-SHA256 signatures, queued in encrypted SQLite for background server synchronization. |

## Cryptographic Protocol Specification

### 1. Hardware Fingerprinting (Android 10+ Compliant)
Instead of restricted IMEI identifiers, OTH constructs a SHA-256 digest:
$$\text{DeviceFingerprint} = \text{SHA-256}(\text{AndroidID} \mathbin{\Vert} \text{InstallationUUID} \mathbin{\Vert} \text{HardwareModel} \mathbin{\Vert} \text{PublicKey})$$

### 2. Handshake Payload Construction
$$\text{Payload} = \{\text{uid}, \text{fingerprintHash}, \text{timestamp}, \text{nonce}\}$$
$$\text{Signature} = \text{HMAC-SHA256}(\text{Payload}, \text{SecretKey})$$
$$\text{Token} = \text{AES-256-GCM-Encrypt}(\text{Payload} \mathbin{\Vert} \text{Signature})$$

### 3. Server Verification Engine
1. **Timestamp Check**: Ensure $| T_{\text{server}} - T_{\text{client}} | \le 30 \text{ seconds}$.
2. **Replay Check**: Query ReplayGuard registry for $\text{nonce}$. If present, reject replay attempt immediately.
3. **Signature Decryption & Verification**: Decrypt AES-256 payload and verify HMAC signature against stored client public key.
