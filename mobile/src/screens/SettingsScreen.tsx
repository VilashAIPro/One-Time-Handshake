/**
 * Screen 18: Settings
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, StatusBar } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';

export default function SettingsScreen() {
  const router = useRouter();
  const [biometric, setBiometric] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [autoLock, setAutoLock] = useState(true);
  const [aiAssistant, setAiAssistant] = useState(true);

  const settings = [
    {
      section: '🔐 Security',
      items: [
        { label: 'Biometric Authentication', sub: 'Fingerprint / Face ID', value: biometric, onChange: setBiometric },
        { label: 'Auto-Lock App', sub: 'Lock after 5 minutes idle', value: autoLock, onChange: setAutoLock },
      ],
    },
    {
      section: '🔔 Notifications',
      items: [
        { label: 'Push Notifications', sub: 'Login alerts & security events', value: notifications, onChange: setNotifications },
      ],
    },
    {
      section: '📡 Connectivity',
      items: [
        { label: 'Offline Mode', sub: 'Pre-generate offline tokens', value: offlineMode, onChange: setOfflineMode },
      ],
    },
    {
      section: '🤖 AI Features',
      items: [
        { label: 'AI Security Assistant', sub: 'Gemini-powered security analysis', value: aiAssistant, onChange: setAiAssistant },
      ],
    },
    {
      section: '🎨 Appearance',
      items: [
        { label: 'Dark Mode', sub: 'Recommended for security', value: darkMode, onChange: setDarkMode },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⚙️ Settings</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {settings.map((section) => (
          <View key={section.section} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.section}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => (
                <View key={item.label} style={[styles.settingRow, idx < section.items.length - 1 && styles.settingBorder]}>
                  <View style={styles.settingLeft}>
                    <Text style={styles.settingLabel}>{item.label}</Text>
                    <Text style={styles.settingSubtext}>{item.sub}</Text>
                  </View>
                  <Switch
                    value={item.value}
                    onValueChange={item.onChange}
                    trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
                    thumbColor={item.value ? Colors.primary : Colors.textMuted}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Version Info */}
        <View style={styles.versionCard}>
          <Text style={styles.versionText}>One Time Handshake (OTH)</Text>
          <Text style={styles.versionNumber}>Version 1.0.0 · Build 1</Text>
          <Text style={styles.versionSub}>AES-256 · HMAC-SHA256 · Firebase</Text>
        </View>

        <TouchableOpacity style={styles.aboutBtn} onPress={() => router.push('/about')}>
          <Text style={styles.aboutText}>About OTH →</Text>
        </TouchableOpacity>
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
  headerTitle: { fontSize: 24, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  content: { flex: 1, paddingHorizontal: 20 },
  section: { marginTop: 24 },
  sectionTitle: { color: Colors.textSecondary, fontSize: 13, fontFamily: Typography.fontFamily.semiBold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  sectionCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  settingBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  settingLeft: { flex: 1, marginRight: 12 },
  settingLabel: { color: Colors.textPrimary, fontSize: 15, fontFamily: Typography.fontFamily.medium },
  settingSubtext: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  versionCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: 20, marginTop: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  versionText: { color: Colors.textPrimary, fontSize: 16, fontFamily: Typography.fontFamily.semiBold, marginBottom: 4 },
  versionNumber: { color: Colors.textSecondary, fontSize: 13 },
  versionSub: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  aboutBtn: { alignItems: 'center', padding: 16 },
  aboutText: { color: Colors.primary, fontSize: 14 },
});
