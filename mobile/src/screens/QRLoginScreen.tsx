/**
 * Screen 5: QR Login — Display QR code for authentication
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Animated, Alert, Image
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Colors, Typography, BorderRadius } from '../../theme/colors';
import { OTHApiClient } from '../api/client';
import { useAuthStore } from '../../store/authStore';

const QR_TTL = 30; // seconds

export default function QRLoginScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [qrData, setQrData] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(QR_TTL);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshCount, setRefreshCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const generateQR = useCallback(async () => {
    setIsLoading(true);
    try {
      const resp = await OTHApiClient.post('/qr/generate');
      setQrData(resp.data.qrData);
      setTimeLeft(QR_TTL);
      setRefreshCount((c) => c + 1);

      // Animate progress bar countdown
      progressAnim.setValue(1);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: QR_TTL * 1000,
        useNativeDriver: false,
      }).start();
    } catch {
      Alert.alert('Error', 'Failed to generate QR code. Check your connection.');
    }
    setIsLoading(false);
  }, [progressAnim]);

  useEffect(() => {
    generateQR();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (qrData) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            generateQR();
            return QR_TTL;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [qrData]);

  const urgencyColor = timeLeft > 15 ? Colors.success : timeLeft > 7 ? Colors.warning : Colors.error;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📷 QR Login</Text>
        <Text style={styles.headerSub}>Show this QR to authenticate on another device</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* QR Container */}
        <View style={styles.qrContainer}>
          <LinearGradient colors={['#1E293B', '#334155']} style={styles.qrWrapper}>
            {/* Corner decorations */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {isLoading ? (
              <View style={styles.qrPlaceholder}>
                <Text style={styles.loadingText}>Generating secure QR...</Text>
              </View>
            ) : qrData ? (
              <Animated.View style={{ opacity: fadeAnim }}>
                <QRCode
                  value={qrData}
                  size={220}
                  color={Colors.textPrimary}
                  backgroundColor="transparent"
                  logo={undefined}
                  quietZone={10}
                />
              </Animated.View>
            ) : null}
          </LinearGradient>
        </View>

        {/* Timer */}
        <View style={styles.timerContainer}>
          <View style={styles.timerBar}>
            <Animated.View
              style={[styles.timerFill, {
                width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                backgroundColor: urgencyColor,
              }]}
            />
          </View>
          <Text style={[styles.timerText, { color: urgencyColor }]}>
            🕐 Refreshes in {timeLeft}s
          </Text>
        </View>

        {/* Security Info */}
        <View style={styles.infoCard}>
          <InfoRow icon="🔐" text="AES-256 encrypted payload" />
          <InfoRow icon="⏱️" text="Single-use, expires in 30 seconds" />
          <InfoRow icon="🛡️" text="Device fingerprint embedded" />
          <InfoRow icon="🔄" text={`QR #${refreshCount} generated this session`} />
        </View>

        {/* Manual Refresh */}
        <TouchableOpacity onPress={generateQR} style={styles.refreshButton} disabled={isLoading}>
          <Text style={styles.refreshText}>🔄 Generate New QR</Text>
        </TouchableOpacity>

        {/* Scanner button */}
        <TouchableOpacity onPress={() => router.push('/scan-qr')} style={styles.scanButton}>
          <LinearGradient colors={['#7C3AED', '#6D28D9']} style={styles.scanGradient}>
            <Text style={styles.scanText}>📸 Scan Someone's QR Instead</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoText}>{text}</Text>
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
  content: { flex: 1, alignItems: 'center', padding: 24 },
  qrContainer: { marginBottom: 24 },
  qrWrapper: { padding: 24, borderRadius: 24, position: 'relative', borderWidth: 1, borderColor: Colors.glassBorder },
  corner: { position: 'absolute', width: 20, height: 20, borderColor: Colors.primary, zIndex: 1 },
  cornerTL: { top: 8, left: 8, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  cornerTR: { top: 8, right: 8, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  cornerBL: { bottom: 8, left: 8, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 8, right: 8, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
  qrPlaceholder: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.textSecondary, fontSize: 14 },
  timerContainer: { width: '100%', alignItems: 'center', marginBottom: 20 },
  timerBar: { width: '100%', height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
  timerFill: { height: 4, borderRadius: 2 },
  timerText: { fontSize: 14, fontFamily: Typography.fontFamily.medium },
  infoCard: { width: '100%', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: 16, gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoIcon: { fontSize: 16 },
  infoText: { color: Colors.textSecondary, fontSize: 13, flex: 1 },
  refreshButton: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, paddingVertical: 14, paddingHorizontal: 32, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  refreshText: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center' },
  scanButton: { width: '100%', borderRadius: BorderRadius.md, overflow: 'hidden' },
  scanGradient: { paddingVertical: 16, alignItems: 'center' },
  scanText: { color: '#fff', fontSize: 15, fontFamily: Typography.fontFamily.semiBold },
});
