/**
 * Screen 19: Help Center
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius } from '../../theme/colors';

const faqs = [
  { q: 'What is OTH?', a: 'One Time Handshake (OTH) is an authentication system that replaces SMS OTP with cryptographic device handshakes. It works offline and is more secure than traditional OTP.' },
  { q: 'Does OTH work without internet?', a: 'Yes! Generate an offline token while connected. It\'s stored encrypted on your device and can authenticate you for up to 24 hours without internet.' },
  { q: 'What if my phone is lost or stolen?', a: 'Use the Emergency QR from another trusted device or contact an admin to remotely revoke all your device sessions from the Admin Portal.' },
  { q: 'How is this more secure than OTP?', a: 'OTP can be intercepted via SIM swapping, SS7 attacks, or phishing. OTH uses AES-256 encrypted tokens tied to your specific device fingerprint — impossible to use on another device.' },
  { q: 'What data does OTH collect?', a: 'OTH collects device fingerprint (Android ID + model), not IMEI. No biometric data leaves your device. All cryptographic keys are stored in the Android Keystore.' },
  { q: 'Why did my authentication fail?', a: 'Possible reasons: expired token (>30s), replay attack detected, device fingerprint mismatch, or device not registered. Use the AI Assistant for a detailed explanation.' },
  { q: 'How do I add a new device?', a: 'Login on the new device and go to Dashboard → Device Binding. You can register up to 5 devices per account.' },
  { q: 'What is the QR authentication?', a: 'QR Login lets you authenticate by showing a dynamic QR code that another device scans. The QR contains an encrypted handshake and expires every 30 seconds.' },
];

export default function HelpScreen() {
  const router = useRouter();
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>❓ Help Center</Text>
        <Text style={styles.headerSub}>Frequently asked questions about OTH</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.aiCard} onPress={() => router.push('/ai-assistant')}>
          <Text style={styles.aiCardIcon}>🤖</Text>
          <View style={styles.aiCardText}>
            <Text style={styles.aiCardTitle}>Ask AI Assistant</Text>
            <Text style={styles.aiCardSub}>Get personalized security help from Gemini</Text>
          </View>
          <Text style={styles.aiCardArrow}>›</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

        {faqs.map((faq, i) => (
          <TouchableOpacity
            key={i}
            style={styles.faqCard}
            onPress={() => setExpanded(expanded === i ? null : i)}
          >
            <View style={styles.faqHeader}>
              <Text style={styles.faqQuestion}>{faq.q}</Text>
              <Text style={[styles.faqToggle, { transform: [{ rotate: expanded === i ? '90deg' : '0deg' }] }]}>›</Text>
            </View>
            {expanded === i && (
              <Text style={styles.faqAnswer}>{faq.a}</Text>
            )}
          </TouchableOpacity>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 24 },
  backBtn: { marginBottom: 16 },
  backText: { color: Colors.primary, fontSize: 16 },
  headerTitle: { fontSize: 24, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, marginBottom: 4 },
  headerSub: { color: Colors.textSecondary, fontSize: 14 },
  content: { flex: 1, paddingHorizontal: 20 },
  aiCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#7C3AED20', borderRadius: BorderRadius.lg, padding: 16, marginTop: 20, marginBottom: 24, borderWidth: 1, borderColor: '#7C3AED40' },
  aiCardIcon: { fontSize: 28, marginRight: 14 },
  aiCardText: { flex: 1 },
  aiCardTitle: { color: Colors.textPrimary, fontSize: 15, fontFamily: Typography.fontFamily.semiBold },
  aiCardSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  aiCardArrow: { color: '#7C3AED', fontSize: 22 },
  sectionTitle: { fontSize: 16, fontFamily: Typography.fontFamily.semiBold, color: Colors.textPrimary, marginBottom: 12 },
  faqCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faqQuestion: { flex: 1, color: Colors.textPrimary, fontSize: 15, fontFamily: Typography.fontFamily.medium, lineHeight: 22 },
  faqToggle: { color: Colors.textMuted, fontSize: 22, marginLeft: 8 },
  faqAnswer: { color: Colors.textSecondary, fontSize: 14, lineHeight: 22, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
});
