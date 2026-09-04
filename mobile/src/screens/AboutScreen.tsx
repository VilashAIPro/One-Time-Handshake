/**
 * Screen 20: About OTH
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, StatusBar } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius } from '../../theme/colors';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0F172A', '#1E293B']} style={StyleSheet.absoluteFill} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.hero}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <LinearGradient colors={['#2563EB', '#7C3AED']} style={styles.logoBadge}>
            <Text style={styles.logoText}>🔐</Text>
          </LinearGradient>
          <Text style={styles.appName}>One Time Handshake</Text>
          <Text style={styles.tagline}>Secure Authentication Beyond OTP</Text>
          <Text style={styles.version}>v1.0.0</Text>
        </LinearGradient>

        <View style={styles.content}>
          {/* Mission */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎯 Our Mission</Text>
            <Text style={styles.cardText}>
              OTH replaces fragile SMS OTP authentication with military-grade cryptographic handshakes that work offline, in rural areas, defence environments, and during network outages.
            </Text>
          </View>

          {/* How it works */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⚡ How OTH Works</Text>
            {[
              'Your device generates a unique cryptographic fingerprint',
              'A one-time handshake token is created using AES-256 + HMAC-SHA256',
              'The server verifies the token and issues a JWT session',
              'All operations work offline with pre-loaded encrypted tokens',
              'QR codes enable secure authentication across devices',
            ].map((step, i) => (
              <View key={i} style={styles.step}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          {/* Security Stack */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🛡️ Security Architecture</Text>
            <View style={styles.techGrid}>
              {[
                { icon: '🔒', label: 'AES-256-CBC' },
                { icon: '✍️', label: 'HMAC-SHA256' },
                { icon: '🔑', label: 'JWT Sessions' },
                { icon: '📱', label: 'Device Fingerprint' },
                { icon: '⏱️', label: 'Nonce Registry' },
                { icon: '🪪', label: 'Biometric Lock' },
                { icon: '📡', label: 'Offline Tokens' },
                { icon: '🤖', label: 'AI Analysis' },
              ].map((tech) => (
                <View key={tech.label} style={styles.techChip}>
                  <Text style={styles.techIcon}>{tech.icon}</Text>
                  <Text style={styles.techLabel}>{tech.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Target Sectors */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏛️ Target Sectors</Text>
            {[
              { icon: '🪖', label: 'Defence & Military' },
              { icon: '🏛️', label: 'Government Services' },
              { icon: '🏦', label: 'Banking & Fintech' },
              { icon: '🏢', label: 'Enterprise Security' },
              { icon: '🚨', label: 'Emergency Response' },
              { icon: '🌾', label: 'Rural & Remote Areas' },
            ].map((sector) => (
              <View key={sector.label} style={styles.sectorRow}>
                <Text style={styles.sectorIcon}>{sector.icon}</Text>
                <Text style={styles.sectorLabel}>{sector.label}</Text>
              </View>
            ))}
          </View>

          {/* Open Source */}
          <TouchableOpacity style={styles.githubBtn} onPress={() => Linking.openURL('https://github.com/VilashAIPro/One-Time-Handshake')}>
            <Text style={styles.githubText}>⭐ Star on GitHub</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>
            Built with ❤️ for secure, offline-first authentication{'\n'}
            © 2026 OTH Project · MIT License
          </Text>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: { paddingTop: 56, paddingHorizontal: 24, paddingBottom: 32, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', marginBottom: 20 },
  backText: { color: Colors.primary, fontSize: 16 },
  logoBadge: { width: 80, height: 80, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoText: { fontSize: 40 },
  appName: { fontSize: 28, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, marginBottom: 6 },
  tagline: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 10 },
  version: { color: Colors.textMuted, fontSize: 13 },
  content: { paddingHorizontal: 20 },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 16, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, marginBottom: 14 },
  cardText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 22 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  stepNumText: { color: '#fff', fontSize: 12, fontFamily: Typography.fontFamily.bold },
  stepText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, flex: 1 },
  techGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  techChip: { backgroundColor: Colors.primary + '15', borderRadius: BorderRadius.sm, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.primary + '30' },
  techIcon: { fontSize: 14 },
  techLabel: { color: Colors.primary, fontSize: 12, fontFamily: Typography.fontFamily.medium },
  sectorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  sectorIcon: { fontSize: 20 },
  sectorLabel: { color: Colors.textSecondary, fontSize: 14 },
  githubBtn: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.glassBorder, marginBottom: 20 },
  githubText: { color: Colors.textPrimary, fontSize: 15, fontFamily: Typography.fontFamily.semiBold },
  footer: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
});
