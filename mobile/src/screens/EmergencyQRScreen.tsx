/**
 * Screen 16: Emergency Recovery QR
 * One-time emergency access code with countdown
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator, TextInput
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Colors, Typography, BorderRadius } from '../../theme/colors';
import { OTHApiClient, isOnline } from '../api/client';
import { useAuthStore } from '../../store/authStore';

export default function EmergencyQRScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [mode, setMode] = useState<'generate' | 'use'>('generate');
  const [phone, setPhone] = useState(user?.phone || '');
  const [emergencyToken, setEmergencyToken] = useState('');
  const [qrData, setQrData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [online, setOnline] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    isOnline().then(setOnline);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const generateEmergencyToken = async () => {
    if (!online) {
      Alert.alert('Offline', 'Internet connection required to generate emergency tokens.');
      return;
    }

    setIsLoading(true);
    try {
      const resp = await OTHApiClient.post('/emergency/generate', { ttlHours: 1 });
      const { token, expiresAt } = resp.data;

      // Create QR data with token
      const qrPayload = JSON.stringify({
        type: 'oth_emergency',
        phone: user?.phone,
        token,
        expiresAt,
        version: '1.0',
      });

      setQrData(qrPayload);
      setEmergencyToken(token);

      // Start countdown
      const ttlMs = new Date(expiresAt).getTime() - Date.now();
      setTimeLeft(Math.floor(ttlMs / 1000));

      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            setQrData(null);
            setEmergencyToken('');
            Alert.alert('Expired', 'Emergency token has expired. Generate a new one if needed.');
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      Alert.alert('Error', (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to generate emergency token.');
    }
    setIsLoading(false);
  };

  const handleEmergencyLogin = async () => {
    if (!phone || !emergencyToken) {
      Alert.alert('Required', 'Please enter phone number and emergency token.');
      return;
    }

    setIsLoading(true);
    try {
      const resp = await OTHApiClient.post('/emergency/auth', { phone, emergencyToken });
      Alert.alert(
        '✅ Emergency Access Granted',
        resp.data.warning + '\n\nToken valid for 2 hours.',
        [
          { text: 'Continue', onPress: () => router.replace('/dashboard') }
        ]
      );
    } catch {
      Alert.alert('Failed', 'Invalid or expired emergency token.');
    }
    setIsLoading(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#2D1010', '#0F172A']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🆘 Emergency Access</Text>
        <Text style={styles.headerSub}>Use only when normal OTH login is unavailable</Text>
      </LinearGradient>

      {/* Mode Toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity style={[styles.modeTab, mode === 'generate' && styles.modeTabActive]} onPress={() => setMode('generate')}>
          <Text style={[styles.modeTabText, mode === 'generate' && styles.modeTabTextActive]}>📤 Generate QR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeTab, mode === 'use' && styles.modeTabActive]} onPress={() => setMode('use')}>
          <Text style={[styles.modeTabText, mode === 'use' && styles.modeTabTextActive]}>🔑 Use Token</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {mode === 'generate' ? (
          <>
            <View style={styles.warningBanner}>
              <Text style={styles.warningText}>
                ⚠️ Emergency tokens are single-use and expire in 1 hour. Store securely.
              </Text>
            </View>

            {qrData ? (
              <View style={styles.qrSection}>
                <View style={styles.qrWrapper}>
                  <QRCode value={qrData} size={200} color="#F8FAFC" backgroundColor="transparent" />
                </View>

                <View style={[styles.timerBadge, { borderColor: timeLeft > 300 ? Colors.warning : Colors.error }]}>
                  <Text style={[styles.timerText, { color: timeLeft > 300 ? Colors.warning : Colors.error }]}>
                    ⏰ Expires in {formatTime(timeLeft)}
                  </Text>
                </View>

                <View style={styles.tokenDisplay}>
                  <Text style={styles.tokenLabel}>Emergency Token</Text>
                  <Text style={styles.tokenValue} selectable>{emergencyToken}</Text>
                </View>

                <Text style={styles.tokenHint}>
                  Share this QR or token with a trusted administrator to gain emergency access
                </Text>
              </View>
            ) : (
              <TouchableOpacity onPress={generateEmergencyToken} disabled={isLoading || !online} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#DC2626', '#991B1B']}
                  style={[styles.generateBtn, !online && { opacity: 0.5 }]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.generateText}>🆘 Generate Emergency Token</Text>}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <Text style={styles.useLabel}>Enter your credentials below to log in using an emergency token</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>📱</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+91 9876543210"
                  placeholderTextColor={Colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Emergency Token</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>🔑</Text>
                <TextInput
                  style={styles.input}
                  placeholder="64-character hex token"
                  placeholderTextColor={Colors.textMuted}
                  value={emergencyToken}
                  onChangeText={setEmergencyToken}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <TouchableOpacity onPress={handleEmergencyLogin} disabled={isLoading} activeOpacity={0.85}>
              <LinearGradient
                colors={['#DC2626', '#991B1B']}
                style={styles.generateBtn}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.generateText}>🆘 Emergency Login</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 24 },
  backBtn: { marginBottom: 16 },
  backText: { color: Colors.error, fontSize: 16 },
  headerTitle: { fontSize: 24, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, marginBottom: 4 },
  headerSub: { color: Colors.textSecondary, fontSize: 13 },
  modeToggle: { flexDirection: 'row', margin: 20, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 4 },
  modeTab: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.sm, alignItems: 'center' },
  modeTabActive: { backgroundColor: Colors.error },
  modeTabText: { color: Colors.textSecondary, fontSize: 13, fontFamily: Typography.fontFamily.medium },
  modeTabTextActive: { color: '#fff' },
  content: { flex: 1, paddingHorizontal: 20 },
  warningBanner: { backgroundColor: Colors.error + '15', borderRadius: BorderRadius.md, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: Colors.error + '40' },
  warningText: { color: Colors.error, fontSize: 13, lineHeight: 20 },
  qrSection: { alignItems: 'center' },
  qrWrapper: { backgroundColor: Colors.backgroundSecondary, padding: 20, borderRadius: BorderRadius.lg, marginBottom: 16, borderWidth: 1, borderColor: Colors.error + '40' },
  timerBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 2, marginBottom: 16 },
  timerText: { fontSize: 16, fontFamily: Typography.fontFamily.bold },
  tokenDisplay: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 16, width: '100%', borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  tokenLabel: { color: Colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  tokenValue: { color: Colors.textPrimary, fontSize: 12, fontFamily: Typography.fontFamily.mono, letterSpacing: 1 },
  tokenHint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  generateBtn: { borderRadius: BorderRadius.md, paddingVertical: 18, alignItems: 'center' },
  generateText: { color: '#fff', fontSize: 16, fontFamily: Typography.fontFamily.semiBold },
  useLabel: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  label: { color: Colors.textSecondary, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16 },
  inputIcon: { fontSize: 18, marginRight: 10 },
  input: { flex: 1, color: Colors.textPrimary, fontSize: 15, paddingVertical: 14 },
});
