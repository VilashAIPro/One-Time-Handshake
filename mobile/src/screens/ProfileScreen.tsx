/**
 * Screens: Profile (17), Settings (18), Help (19), About (20)
 * History (13), Trusted Devices (12), Notifications (15)
 */

// ─── Profile Screen ───────────────────────────────────────────────
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import { OTHApiClient } from '../api/client';
import { TokenStorage } from '../api/client';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try { await OTHApiClient.post('/auth/logout'); } catch {}
          await TokenStorage.clearTokens();
          logout();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>👤 Profile</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <LinearGradient colors={['#2563EB', '#7C3AED']} style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.fullName || user?.phone || '?')[0].toUpperCase()}
            </Text>
          </LinearGradient>
          <Text style={styles.userName}>{user?.fullName || 'OTH User'}</Text>
          <Text style={styles.userPhone}>{user?.phone}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{(user?.role || 'user').toUpperCase()}</Text>
          </View>
        </View>

        {/* Info Cards */}
        <View style={styles.infoCard}>
          {[
            { label: 'Phone', value: user?.phone || '—' },
            { label: 'Email', value: user?.email || 'Not set' },
            { label: 'Status', value: user?.status || 'active' },
            { label: 'UID', value: user?.uid?.slice(0, 16) + '...' || '—' },
          ].map((item) => (
            <View key={item.label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Quick Links */}
        {[
          { icon: '🛡️', label: 'Security Center', route: '/security-center' },
          { icon: '📱', label: 'My Devices', route: '/devices' },
          { icon: '🤖', label: 'AI Security Assistant', route: '/ai-assistant' },
          { icon: '⚙️', label: 'Settings', route: '/settings' },
        ].map((link) => (
          <TouchableOpacity key={link.route} style={styles.navCard} onPress={() => router.push(link.route as never)}>
            <Text style={styles.navIcon}>{link.icon}</Text>
            <Text style={styles.navLabel}>{link.label}</Text>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Sign Out</Text>
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
  avatarSection: { alignItems: 'center', paddingVertical: 32 },
  avatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarText: { fontSize: 36, color: '#fff', fontFamily: Typography.fontFamily.bold },
  userName: { fontSize: 22, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, marginBottom: 4 },
  userPhone: { fontSize: 15, color: Colors.textSecondary, marginBottom: 10 },
  roleBadge: { backgroundColor: Colors.primary + '20', borderRadius: BorderRadius.full, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: Colors.primary + '40' },
  roleBadgeText: { color: Colors.primary, fontSize: 11, fontFamily: Typography.fontFamily.bold, letterSpacing: 1 },
  infoCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: 20, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { color: Colors.textSecondary, fontSize: 14 },
  infoValue: { color: Colors.textPrimary, fontSize: 14, fontFamily: Typography.fontFamily.medium },
  navCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  navIcon: { fontSize: 22, marginRight: 14 },
  navLabel: { flex: 1, color: Colors.textPrimary, fontSize: 15, fontFamily: Typography.fontFamily.medium },
  navArrow: { color: Colors.textMuted, fontSize: 22 },
  logoutBtn: { backgroundColor: Colors.error + '15', borderRadius: BorderRadius.md, padding: 16, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: Colors.error + '30' },
  logoutText: { color: Colors.error, fontSize: 15, fontFamily: Typography.fontFamily.semiBold },
});
