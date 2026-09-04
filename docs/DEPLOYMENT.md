# One Time Handshake (OTH) — Deployment & APK Guide

## 1. Prerequisites
- Node.js 18+ or Docker Desktop
- Android Studio / Android SDK (for native APK builds)
- Firebase Project with Firestore & Auth enabled

---

## 2. Docker Local Deployment

Build and launch the Express API backend microservices:

```bash
# Clone repository
git clone https://github.com/VilashAIPro/One-Time-Handshake.git
cd One-Time-Handshake

# Copy environment template
cp .env.example .env

# Run via Docker Compose
docker-compose up --build -d
```

Backend will be live at `http://localhost:5000`.

---

## 3. Android APK & AAB Build Guide

```bash
cd mobile

# Install dependencies
npm install

# Prebuild Expo Native Project
npx expo prebuild --platform android

# Build Release APK using EAS CLI or Gradle
cd android
./gradlew assembleRelease
```

The compiled APK file will be located at `mobile/android/app/build/outputs/apk/release/app-release.apk`.

To generate Android App Bundle (AAB) for Google Play Console:

```bash
./gradlew bundleRelease
```

---

## 4. Next.js Web Admin Portal Deployment

```bash
cd web

# Install dependencies
npm install

# Build production bundle
npm run build

# Launch Next.js production server
npm run start
```

Web Admin Dashboard will run on `http://localhost:3002`.

---

## 5. Firebase Cloud Infrastructure Setup

1. Initialize Firebase CLI: `firebase login`
2. Deploy Firestore Rules & Indexes:
```bash
firebase deploy --only firestore
```
