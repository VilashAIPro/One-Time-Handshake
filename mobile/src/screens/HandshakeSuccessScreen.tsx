/**
 * Screen 7: Handshake Success
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, BorderRadius } from '../../theme/colors';

export default function HandshakeSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ method?: string; riskScore?: string }>();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 5, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, { toValue: 1.4, duration: 1000, useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    const timer = setTimeout(() => router.replace('/dashboard'), 3000);
    return () => clearTimeout(timer);
  }, []);

  const method = params.method || 'handshake';
  const riskScore = parseInt(params.riskScore || '0');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0F2E0F', '#0F172A']} style={StyleSheet.absoluteFill} />

      <Animated.View style={[styles.ringOuter, { transform: [{ scale: ringAnim }] }]} />
      <Animated.View style={[styles.ringInner, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
        <LinearGradient colors={['#16A34A', '#15803D']} style={styles.checkCircle}>
          <Text style={styles.checkIcon}>✓</Text>
        </LinearGradient>
      </Animated.View>

      <Animated.View style={[styles.content, { opacity: opacityAnim }]}>
        <Text style={styles.title}>Authentication Successful</Text>
        <Text style={styles.subtitle}>OTH Handshake Verified</Text>

        <View style={styles.infoCard}>
          <InfoRow icon="⚡" label="Method" value={method.replace('_', ' ').toUpperCase()} />
          <InfoRow icon="🛡️" label="Risk Score" value={`${riskScore}/100`} valueColor={riskScore < 30 ? Colors.success : Colors.warning} />
          <InfoRow icon="🔐" label="Encryption" value="AES-256-CBC" />
          <InfoRow icon="✍️" label="Signature" value="HMAC-SHA256" />
          <InfoRow icon="🕐" label="Token TTL" value="24 hours" />
        </View>

        <Text style={styles.redirect}>Redirecting to dashboard...</Text>

        <TouchableOpacity onPress={() => router.replace('/dashboard')} style={styles.dashboardBtn}>
          <Text style={styles.dashboardBtnText}>Go to Dashboard →</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function InfoRow({ icon, label, value, valueColor }: { icon: string; label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  ringOuter: { position: 'absolute', width: 300, height: 300, borderRadius: 150, borderWidth: 1, borderColor: Colors.success + '30' },
  ringInner: { marginBottom: 32 },
  checkCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  checkIcon: { fontSize: 48, color: '#fff', fontWeight: 'bold' },
  content: { alignItems: 'center', width: '100%' },
  title: { fontSize: 28, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: Colors.success, fontFamily: Typography.fontFamily.medium, marginBottom: 32 },
  infoCard: { width: '100%', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: 20, borderWidth: 1, borderColor: Colors.success + '30', marginBottom: 24, gap: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoIcon: { fontSize: 18, width: 28 },
  infoLabel: { flex: 1, color: Colors.textSecondary, fontSize: 14 },
  infoValue: { color: Colors.textPrimary, fontSize: 14, fontFamily: Typography.fontFamily.semiBold },
  redirect: { color: Colors.textMuted, fontSize: 13, marginBottom: 16 },
  dashboardBtn: { backgroundColor: Colors.primary + '20', borderRadius: BorderRadius.md, paddingVertical: 14, paddingHorizontal: 32, borderWidth: 1, borderColor: Colors.primary },
  dashboardBtnText: { color: Colors.primary, fontSize: 15, fontFamily: Typography.fontFamily.semiBold },
});
