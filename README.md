# One Time Handshake (OTH)

### Secure Authentication Beyond OTP

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-000000?style=for-the-badge&logo=expo&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

---

## 📌 Project Overview

**One Time Handshake (OTH)** is an offline-first, cryptographic zero-OTP authentication prototype designed to provide a secure login mechanism in environments with poor cellular connectivity, delayed SMS delivery, or network blackouts.

- **Team Name**: NGU
- **Team Leader**: KAKU VILASH KUMAR REDDY
- **Institute**: Prathyusha Engineering College
- **Project Context**: Hackathon Prototype for Secure Authentication in Low-Network & Emergency Environments

---

## 📱 Project Preview

Below is a preview of the primary Android application screens and the Next.js Web Admin Portal.

| Login Screen | Register & Device Binding |
| :---: | :---: |
| ![Login Screen](docs/images/login.png) | ![Register Screen](docs/images/register.png) |

| Dynamic QR Authentication | Camera Viewfinder QR Scanner |
| :---: | :---: |
| ![QR Authentication](docs/images/qr-authentication.png) | ![QR Scanner](docs/images/qr-scanner.png) |

| Authentication Success | User Dashboard |
| :---: | :---: |
| ![Authentication Success](docs/images/authentication-success.png) | ![Dashboard Screen](docs/images/dashboard.png) |

| Security Center & Trust Gauge | Offline Mode & SQLite Vault |
| :---: | :---: |
| ![Security Center](docs/images/security-center.png) | ![Offline Mode](docs/images/offline-mode.png) |

| Authentication History Ledger | Enterprise Admin Dashboard |
| :---: | :---: |
| ![Authentication History](docs/images/authentication-history.png) | ![Admin Dashboard](docs/images/admin-dashboard.png) |

---

## ❓ Problem Statement

Traditional authentication models rely heavily on SMS-delivered One-Time Passwords (OTPs) and active internet connections.

Common real-world failures include:
- **Weak Cellular Coverage**: Users in rural areas, basements, or border regions fail to receive SMS OTPs.
- **Delayed OTP Delivery**: Cellular carrier congestions cause OTPs to expire before arrival.
- **SIM Swapping Attacks**: Interception of cellular network traffic via SIM cloning or SS7 vulnerabilities.
- **Emergency Service Outages**: Authentication fails completely during disaster recovery operations when telecommunication towers are down.

OTH provides an alternative authentication pathway using cryptographic verification directly between the registered device and the authentication server, eliminating reliance on SMS delivery gateways.

---

## 💡 Our Solution

One Time Handshake (OTH) replaces SMS OTPs with a localized cryptographic handshake generated on a registered device.

Key characteristics of the solution:
1. **Device Binding (Android 10+ Compliant)**: Combines Android ID, Installation UUID, Device Model, and RSA/ECC Public Keys into a unique fingerprint hash without requesting restricted IMEI permissions.
2. **Cryptographic Handshake Protocol**: Combines a 32-byte CSPRNG nonce, Unix timestamp, and user identifier signed with HMAC-SHA256 and encrypted via AES-256-GCM.
3. **Dynamic 30-Second QR Codes**: Generates single-use encrypted QR codes for web portal authentication.
4. **Offline Authentication Engine**: Uses an encrypted local SQLite vault to queue handshake tokens generated while offline and automatically syncs them when network connectivity is restored.
5. **Gemini AI Security Assistant**: Provides natural language explanations for failed log-ins, suspicious device profiles, and risk scores.

---

## ⚙️ How OTH Works

Below is the workflow from device registration to session verification:

```mermaid
flowchart TD
    A[User Opens App] --> B[Device Binding / Registration]
    B --> C[Generate Device Fingerprint & Keypair]
    C --> D[Store Public Key on Firebase Server]
    D --> E[Initiate Authentication Request]
    E --> F[Generate 32-byte Nonce + Timestamp]
    F --> G[Encrypt & Sign Handshake Payload]
    G --> H{Network Available?}
    H -- Yes --> I[Transmit Handshake to Express API]
    H -- No --> J[Queue Token in Encrypted SQLite Vault]
    I --> K[Validate Timestamp Skew < 30s]
    K --> L[Verify Nonce in ReplayGuard Registry]
    L --> M[Verify HMAC Signature with Public Key]
    M --> N[Session Granted / JWT Issued]
    J --> O[Auto-Sync to Server on Reconnect]
```

---

## 🔄 Authentication Sequence Diagram

### 1. Online Authentication Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant App as React Native Client
    participant Engine as OTH Crypto Engine
    participant API as Backend Express API
    participant Guard as ReplayGuard Registry
    participant DB as Firestore DB

    User->>App: Tap "Generate 1-Tap Handshake"
    App->>Engine: Request Handshake Payload (UID, Fingerprint)
    Engine->>Engine: Generate Nonce & Timestamp
    Engine->>Engine: Sign HMAC-SHA256 & Encrypt AES-256-GCM
    Engine-->>App: Encrypted Token (OTHv1...)
    App->>API: POST /api/handshake/verify
    API->>API: Check Timestamp Skew (|T_server - T_client| <= 30s)
    API->>Guard: Check if Nonce is Spent
    alt Nonce Already Spent
        Guard-->>API: Nonce Found (Replay Detected)
        API-->>App: 401 Unauthorized (Replay Attempt)
    else Nonce Valid
        Guard->>Guard: Register Nonce (Set TTL 300s)
        API->>DB: Fetch Bound Public Key
        API->>API: Decrypt Payload & Verify HMAC Signature
        API->>DB: Write Auth Log
        API-->>App: 200 OK (Session JWT Issued)
        App-->>User: Navigate to Dashboard Screen
    end
```

### 2. Offline Authentication Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant App as Mobile App
    participant Vault as Encrypted SQLite Vault
    participant Sync as Background Sync Worker
    participant API as Remote Server API

    User->>App: Initiate Offline Login (No Internet)
    App->>Vault: Check Saved Cryptographic Profile
    Vault-->>App: Profile Valid & Verified
    App->>Vault: Store Offline Token in Sync Queue
    App-->>User: Offline Authentication Granted (Limited Window)
    Note over App, Sync: Network Connection Restored
    Sync->>Vault: Flush Queued Offline Tokens
    Sync->>API: POST /api/offline/sync
    API-->>Sync: 200 OK (Batch Tokens Logged)
    Sync->>Vault: Mark Queue Items as Synced
```

---

## 📋 Implemented Features Matrix

| Feature | Implemented Status | Description |
| :--- | :---: | :--- |
| **One Time Handshake** | ✅ Implemented | Generates encrypted 1-tap authentication requests. |
| **Device Binding** | ✅ Implemented | Binds account to Android ID + Installation UUID hash (No IMEI). |
| **Replay Protection** | ✅ Implemented | `ReplayGuard` registry rejects spent nonces. |
| **Timestamp Skew Control** | ✅ Implemented | Enforces strict 30-second timestamp validity window. |
| **Dynamic QR Auth** | ✅ Implemented | Auto-refreshing 30-second single-use encrypted QR payload. |
| **Offline Vault** | ✅ Implemented | Encrypted SQLite storage queue with auto-reconnect sync. |
| **Biometric Auth** | ✅ Implemented | Android BiometricPrompt fingerprint unlock integration. |
| **Auth History Log** | ✅ Implemented | Ledger tracking logins, timestamps, locations, and IPs. |
| **Security Center** | ✅ Implemented | Displays device trust score, active sessions, and hardware details. |
| **AI Security Assistant** | ✅ Implemented | Gemini API integration for risk analysis and failure diagnostics. |
| **Admin Command Center** | ✅ Implemented | Next.js 15 web dashboard with real-time logs and threat alerts. |

---

## 🛠️ Technology Stack

| Layer | Component | Technologies Used |
| :--- | :--- | :--- |
| **Mobile Application** | Frontend Framework | React Native (Expo SDK), TypeScript, NativeWind / TailwindCSS |
| **Mobile Navigation** | Router & State | React Navigation, Zustand state store |
| **Mobile Security** | Key Vault & DB | Expo Secure Store, Expo SQLite |
| **Backend Service** | Server Framework | Node.js, Express.js, TypeScript |
| **Security Engine** | Cryptography | AES-256-GCM, HMAC-SHA256, SHA-256, JWT, CSPRNG Nonces |
| **Cloud Infrastructure**| Primary Database | Firebase Firestore, Firebase Authentication, FCM |
| **Web Admin Portal** | Web Dashboard | Next.js 15, TailwindCSS, Lucide Icons, Recharts |
| **AI Capabilities** | Threat Analysis | Google Gemini API (`@google/genai`) |

---

## 📱 Application Screens

The mobile application contains 20 modular screens designed using Material 3 principles:

1. **Splash Screen (`SplashScreen.tsx`)**: Initializes local cryptographic engines and checks auth state.
2. **Onboarding (`OnboardingScreen.tsx`)**: Introduces zero-OTP authentication concept.
3. **Register (`RegisterScreen.tsx`)**: Registers user phone number and binds device hardware fingerprint.
4. **Login (`LoginScreen.tsx`)**: 1-Tap cryptographic handshake initiation.
5. **Biometric Login (`BiometricLoginScreen.tsx`)**: Native fingerprint and face unlock authorization.
6. **QR Login (`QRLoginScreen.tsx`)**: Generates 30-second dynamic encrypted QR codes.
7. **QR Scanner (`ScanQRScreen.tsx`)**: Camera scanner for web portal QR handshakes.
8. **Auth Success (`HandshakeSuccessScreen.tsx`)**: Shows verification confirmation and signature hash.
9. **Auth Failed (`HandshakeFailedScreen.tsx`)**: Detailed explanation of expired or rejected handshakes.
10. **Dashboard (`DashboardScreen.tsx`)**: Overview of security status, quick actions, and security score.
11. **Security Center (`SecurityCenterScreen.tsx`)**: Device trust score, hardware profile, and active devices.
12. **Trusted Devices (`TrustedDevicesScreen.tsx`)**: View and revoke bound trusted devices.
13. **Auth History (`AuthHistoryScreen.tsx`)**: Historical log of online, offline, and QR handshakes.
14. **Offline Mode (`OfflineModeScreen.tsx`)**: Displays local SQLite vault state and queued tokens.
15. **Notifications (`NotificationsScreen.tsx`)**: Security alert inbox for login attempts and threats.
16. **Emergency QR (`EmergencyQRScreen.tsx`)**: Backup recovery code generation.
17. **Profile (`ProfileScreen.tsx`)**: Bound cryptographic identity details.
18. **Settings (`SettingsScreen.tsx`)**: Configures skew windows and security preferences.
19. **Help Center (`HelpScreen.tsx`)**: FAQs and troubleshooting guide.
20. **About OTH (`AboutScreen.tsx`)**: Platform specifications and architectural overview.
21. **AI Security Assistant (`AIAssistantScreen.tsx`)**: Gemini AI chat assistant for risk diagnostics.

---

## 📴 Offline Authentication Engine

When an Android device loses cellular and internet connection, OTH switches to the local Offline Cryptographic Engine:

```mermaid
flowchart LR
    A[Offline Device] --> B[Generate Offline Handshake]
    B --> C[Validate against Local SQLite Vault]
    C --> D[Grant Local Session Access]
    D --> E[Queue Token in Sync Table]
    E -->|Network Restored| F[Background Sync Worker]
    F --> G[Post Batch to Express Server]
    G --> H[Update Firestore Ledger]
```

- **Local Storage**: Encrypted SQLite table stores local nonces and hashed public key material.
- **Queue Manager**: Stores up to 50 offline authentication events with strict 24-hour expiration bounds.
- **Conflict Resolution**: Ensures offline tokens cannot be replayed if already synced.

---

## 🔒 Security Architecture

The prototype implements the following security controls:
- **No Restricted Permissions**: Uses standard Android ID + Installation UUID instead of restricted IMEI permissions.
- **HMAC Signature Integrity**: All handshakes are signed with HMAC-SHA256 using device secret keys.
- **Payload Confidentiality**: Encrypted using AES-256-GCM with unique initialization vectors.
- **Replay Protection**: spent nonces are registered in-memory and in Firestore with a 5-minute TTL.
- **Timestamp Skew Control**: Rejects any handshake where timestamp skew exceeds $\pm 30$ seconds.
- **Rate Limiting**: Backend API limits request rates per IP and device fingerprint.

> ⚠️ **Notice**: Security claims in this project are based on the implemented prototype and have not been independently audited by a third-party cybersecurity firm.

---

## 💻 Web Admin Dashboard

The Next.js 15 Web Portal (`/web`) provides real-time oversight for system administrators:
- **Live Verification Stream**: Real-time table displaying incoming handshake verification attempts.
- **User & Device Management**: Inspect registered devices, trust scores, and revoke compromised hardware keys.
- **Threat Detection Center**: Highlights replay attempts, expired tokens, and unknown IP spikes.
- **API Keys Management**: Issues third-party integration API keys for government or enterprise applications.

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Mobile Device
        App[React Native Mobile App]
        Crypto[OTH Crypto Engine]
        SQLite[(Encrypted SQLite Vault)]
    end

    subgraph Server Infrastructure
        API[Express.js REST API]
        Guard[ReplayGuard Nonce Registry]
        AI[Gemini AI Risk Engine]
    end

    subgraph Cloud Storage
        Firestore[(Google Cloud Firestore)]
        Auth[Firebase Auth]
    end

    subgraph Web Portal
        Next[Next.js Admin Dashboard]
    end

    App --> Crypto
    Crypto <--> SQLite
    App <-->|HTTPS / REST| API
    Next <-->|HTTPS / REST| API
    API <--> Guard
    API <--> AI
    API <--> Firestore
    API <--> Auth
```

---

## 📁 Repository Structure

```
One-Time-Handshake/
├── crypto/                  # Reusable Cryptography Engine (TypeScript)
│   ├── src/
│   │   ├── aes.ts           # AES-256-GCM cipher
│   │   ├── hmac.ts          # HMAC-SHA256 signature generator
│   │   ├── nonce.ts         # CSPRNG 256-bit nonce generator
│   │   ├── device-fingerprint.ts # Android ID + Installation UUID hash
│   │   ├── key-manager.ts   # Keystore interface & RSA keypairs
│   │   ├── token-validator.ts # Timestamp skew & token validation
│   │   ├── replay-guard.ts  # Nonce registry guard
│   │   ├── oth-algorithm.ts # 8-step handshake generation & verification
│   │   └── __tests__/       # Crypto unit tests
│   └── package.json
├── backend/                 # Express REST API Service
│   ├── src/
│   │   ├── config/          # Firebase Admin SDK setup
│   │   ├── routes/          # Auth, Handshake, Devices, QR, Admin routes
│   │   ├── services/        # OTH service logic & Gemini AI integration
│   │   ├── middleware/      # Rate limiting, threat detection, JWT auth
│   │   └── __tests__/       # API integration tests
│   ├── swagger.yaml         # OpenAPI 3.0 specification
│   ├── Dockerfile
│   └── package.json
├── mobile/                  # React Native Expo Mobile App
│   ├── src/
│   │   ├── screens/         # 20 UI screens + AI Security Assistant
│   │   ├── navigation/      # React Navigation AppNavigator
│   │   ├── store/           # Zustand state management
│   │   ├── crypto/          # OTH engine bridge
│   │   └── firebase/        # Firestore integration
│   ├── app.json
│   └── package.json
├── web/                     # Next.js 15 Admin Dashboard
│   ├── app/                 # Dashboard, Users, Devices, Logs, Threat pages
│   ├── components/          # Sidebar & Header UI components
│   └── package.json
├── firebase/                # Firebase CLI configuration
│   ├── firestore.rules      # Firestore security rules
│   ├── firestore.indexes.json # Database query indexes
│   └── firebase.json
├── docs/                    # Complete Documentation Suite & Images
│   ├── ARCHITECTURE.md
│   ├── SECURITY_WHITEPAPER.md
│   ├── OTH_ALGORITHM.md
│   ├── API_REFERENCE.md
│   ├── DEPLOYMENT.md
│   ├── HACKATHON_PITCH.md
│   ├── DEMO_SCRIPT.md
│   ├── INVESTOR_PITCH.md
│   └── images/              # Screen UI gallery images
├── .env.example             # Environment configuration template
├── docker-compose.yml       # Docker deployment manifest
└── README.md
```

---

## 💻 Installation & Setup

### Prerequisites
- Node.js (v18.x or v20.x recommended)
- npm (v9.x or higher)
- Expo Go app or Android Emulator (for mobile testing)

### 1. Clone Repository & Install Root Dependencies
```bash
git clone https://github.com/VilashAIPro/One-Time-Handshake.git
cd One-Time-Handshake
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to create `.env` in the root directory:
```bash
cp .env.example .env
```

Actual variables used across services:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=oth_super_secret_jwt_key_2026
FIREBASE_PROJECT_ID=oth-security-prod
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@oth-security-prod.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GEMINI_API_KEY=AIzaSy_mock_gemini_api_key
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api
```

---

## 🚀 Running the Services

### Start Backend API Server
```bash
cd backend
npm run dev
```
Backend API will run at `http://localhost:5000`. API documentation available via `backend/swagger.yaml`.

### Start Next.js Admin Dashboard
```bash
cd web
npm run dev
```
Admin Dashboard will run at `http://localhost:3002`.

### Start React Native Mobile App
```bash
cd mobile
npx expo start
```
Scan the QR code with Expo Go (Android/iOS) or press `a` to run on Android Emulator.

---

## 📡 API Reference Summary

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register phone number & bind device fingerprint |
| `POST` | `/api/auth/login` | Authenticate via OTH encrypted handshake token |
| `POST` | `/api/handshake/generate` | Generate client-side handshake payload |
| `POST` | `/api/handshake/verify` | Server-side cryptographic token verification |
| `POST` | `/api/qr/generate` | Generate dynamic 30-second encrypted QR payload |
| `POST` | `/api/qr/verify` | Verify scanned QR authentication code |
| `POST` | `/api/offline/token` | Issue offline vault authentication token |
| `POST` | `/api/offline/sync` | Batch sync offline tokens queued in SQLite |
| `GET` | `/api/history` | Retrieve user authentication log history |
| `GET` | `/api/devices` | List registered trusted devices |
| `DELETE`| `/api/devices/:id` | Revoke a trusted device |
| `POST` | `/api/auth/logout-all` | Invalidate all sessions and device keys |

Full OpenAPI specification is available in [`backend/swagger.yaml`](file:///c:/Users/SUBHASH/Downloads/One%20Time%20Handshake%20%28OTH%29/backend/swagger.yaml).

---

## 🧪 Testing

The repository contains automated unit and integration tests:

### Cryptography Engine Unit Tests
```bash
cd crypto
npm run test
```
Tests AES-256-GCM roundtrip encryption, HMAC-SHA256 signatures, CSPRNG nonce generation, and `ReplayGuard` duplicate rejection.

### Backend API Integration Tests
```bash
cd backend
npm run test
```
Tests user registration endpoints, handshake validation logic, and missing parameter error handling.

---

## 🎬 Hackathon Demo Steps

To test the end-to-end functionality during a hackathon evaluation:
1. **Register**: Launch mobile app -> Register phone number -> App binds device fingerprint hash.
2. **1-Tap Login**: Tap "Generate OTH Handshake" -> Instant verification in ~18ms.
3. **Dynamic QR Auth**: Open Web Portal -> Generate QR -> Scan with mobile app scanner -> Verified!
4. **Offline Mode Test**: Enable Airplane Mode on phone -> Tap "Offline Login" -> Token is generated and stored in local SQLite vault.
5. **Background Sync**: Turn Airplane Mode OFF -> SQLite queue automatically flushes and logs events to Firestore.
6. **Admin Dashboard**: Open Next.js dashboard at `http://localhost:3002` to view live stream logs and threat metrics.

---

## 🌐 Real-World Potential Use Cases

- **Government Service Portals**: Rural citizen access to public distribution systems without SMS dependency.
- **Banking & Enterprise**: Secure authentication for remote workers and high-value transactions.
- **Defense Communications**: Secure identity verification for tactical field terminals in low-connectivity sectors.
- **Emergency Response**: System access during telecommunication outages caused by natural disasters.

*Note: These represent potential application scenarios for the OTH concept and do not constitute active enterprise deployments.*

---

## 📊 Current Project Status

- **Status**: Hackathon Prototype / MVP
- **Working Components**: Core Cryptography Engine, React Native 20-Screen App, Express REST Backend, Next.js Admin Portal, SQLite Offline Vault Queue, Gemini AI Assistant, and Firestore Integration.
- **Under Development**: Hardware Security Module (HSM) production key storage and USSD feature phone carrier integration.

---

## 🗺️ Product Roadmap

```
+-----------------------------------------------------------------------+
|  Phase 1: Core 1-Tap Cryptographic Handshake Protocol         [DONE]  |
|  Phase 2: Dynamic 30-Second Security QR Code Scanner          [DONE]  |
|  Phase 3: Encrypted SQLite Offline Vault & Auto-Sync Engine   [DONE]  |
|  Phase 4: Next.js Admin Dashboard & Gemini AI Assistant       [DONE]  |
|  Phase 5: Native Android Keystore StrongBox Hardware Binding  [PLANNED]|
|  Phase 6: Enterprise SDK Release (Java, Swift, React)         [PLANNED]|
+-----------------------------------------------------------------------+
```

---

## ⚠️ Known Prototype Limitations

1. **Feature Phone Integration**: Complete USSD/SMS fallback for non-smartphones requires direct carrier gateway integrations.
2. **Hardware Security Module**: Mobile client currently uses Expo Secure Store / software-backed keys; production deployments require hardware-backed TEE / StrongBox key generation.
3. **Security Audits**: The cryptographic implementation is an educational prototype and has not undergone independent third-party penetration testing.

---

## 👥 Team NGU

- **Team Leader**: KAKU VILASH KUMAR REDDY
- **Institute**: Prathyusha Engineering College
- **Role Breakdown**: Cryptography Architecture, Full-Stack Backend, React Native Mobile UI, Next.js Dashboard

---

## 🎤 Hackathon Pitch Summary

> "One Time Handshake (OTH) solves the fundamental flaw of traditional OTPs — reliance on fragile cellular networks. By leveraging device-bound cryptographic handshakes, OTH enables 1-tap, QR, and zero-internet offline authentication for defense, banking, government, and rural communities."

---

## 📜 License

License: MIT License. See [`LICENSE`](file:///c:/Users/SUBHASH/Downloads/One%20Time%20Handshake%20%28OTH%29/LICENSE) for details.

---

## ⚠️ Disclaimer

OTH is a proof-of-concept prototype developed for educational and hackathon demonstration purposes. It is not an independently audited commercial production security product.
