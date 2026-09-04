# One Time Handshake (OTH) — Hackathon Demo Script

## Live Demo Step-by-Step Sequence

### Scene 1: The Problem (SMS Failure Scenario)
- **Presenter**: "Watch what happens when a user tries to log into a high-security defense or banking portal in Airplane Mode or a low-network zone."
- **Action**: Show standard SMS OTP screen stuck in "Sending OTP... Telecom Network Unreachable".

### Scene 2: 1-Tap OTH Cryptographic Login
- **Presenter**: "Now watch One Time Handshake in action."
- **Action**: Launch OTH Mobile App -> Tap **"Generate OTH Handshake"**.
- **Result**: App signs payload using local Android Keystore + Device Fingerprint and authenticates in **18 milliseconds**.

### Scene 3: Dynamic 30-Second Security QR
- **Presenter**: "For web portal authentication, OTH generates an encrypted, dynamic QR code that refreshes every 30 seconds with single-use replay protection."
- **Action**: Open QR Login screen -> Point mobile camera to scan web portal QR code -> Live green verification screen pops up instantly!

### Scene 4: Offline Mode & Background Sync
- **Presenter**: "What if the user has ZERO internet connection for days in a rural border outpost?"
- **Action**: Enable Airplane Mode on phone -> Perform Offline Login -> Show token saved in Encrypted SQLite Vault -> Re-enable Wi-Fi -> Watch the Auto-Sync Queue flush tokens to Firebase Firestore in real-time!

### Scene 5: Next.js Admin Command Center & Gemini AI Risk Assistant
- **Presenter**: "Finally, security administrators get full visibility with our Next.js dashboard and Gemini AI assistant explaining threat vectors in natural language."
- **Action**: Open Next.js dashboard -> View Live Verification Stream & Threat Detection alerts.
