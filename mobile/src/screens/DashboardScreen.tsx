/**
 * Screen 9: Dashboard
 * Main authenticated user dashboard
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, Dimensions
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius, Shadows } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import { OTHApiClient, isOnline } from '../api/client';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const router = useRouter();
  const { user, lastAuthMethod, lastAuthAt, riskScore, isOfflineMode } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalLogins: 0, devicesCount: 0, successRate: 100, offlineTokens: 0 });
  const [recentActivity, setRecentActivity] = useState<{ method: string; status: string; timestamp: number; ip?: string }[]>([]);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    loadDashboard();
    isOnline().then(setOnline);
  }, []);

  const loadDashboard = async () => {
    try {
      const [historyResp] = await Promise.allSettled([
        OTHApiClient.get('/handshake/history?limit=5'),
      ]);

      if (historyResp.status === 'fulfilled') {
        const data = historyResp.value.data;
        setRecentActivity(data.data || []);
        setStats((s) => ({ ...s, totalLogins: data.pagination?.total || 0 }));
      }
    } catch { /* offline — show cached */ }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const securityLevel = riskScore < 20 ? 'HIGH' : riskScore < 60 ? 'MEDIUM' : 'LOW';
  const securityColor = riskScore < 20 ? Colors.success : riskScore < 60 ? Colors.warning : Colors.error;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.fullName || user?.phone || 'User'}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.notifBtn}>
            <Text style={styles.notifIcon}>🔔</Text>
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {/* Security Score Card */}
        <View style={styles.securityScoreCard}>
          <View style={styles.scoreLeft}>
            <Text style={styles.scoreLabel}>Security Level</Text>
            <Text style={[styles.scoreValue, { color: securityColor }]}>{securityLevel}</Text>
            <Text style={styles.scoreSubtext}>Risk Score: {riskScore}/100</Text>
          </View>
          <View style={styles.scoreRight}>
            <View style={[styles.scoreRing, { borderColor: securityColor }]}>
              <Text style={[styles.scorePercent, { color: securityColor }]}>
                {100 - riskScore}%
              </Text>
            </View>
          </View>
        </View>

        {/* Status Chips */}
        <View style={styles.chips}>
          <StatusChip icon={online ? '🌐' : '📡'} label={online ? 'Online' : 'Offline Mode'} color={online ? Colors.success : Colors.warning} />
          <StatusChip icon="🔐" label={lastAuthMethod?.toUpperCase() || 'OTH'} color={Colors.primary} />
          <StatusChip icon="🛡️" label="Protected" color={Colors.success} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          {[
            { icon: '📷', label: 'QR Login', route: '/qr-login', color: '#7C3AED' },
            { icon: '📡', label: 'Offline\nMode', route: '/offline-mode', color: Colors.warning },
            { icon: '🛡️', label: 'Security\nCenter', route: '/security-center', color: Colors.success },
            { icon: '🆘', label: 'Emergency', route: '/emergency-qr', color: Colors.error },
          ].map((action) => (
            <TouchableOpacity key={action.route} style={styles.quickAction} onPress={() => router.push(action.route as never)}>
              <LinearGradient colors={[action.color + '30', action.color + '10']} style={styles.quickActionGradient}>
                <Text style={styles.quickActionIcon}>{action.icon}</Text>
                <Text style={[styles.quickActionLabel, { color: action.color }]}>{action.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats Row */}
        <Text style={styles.sectionTitle}>Authentication Stats</Text>
        <View style={styles.statsRow}>
          <StatCard icon="⚡" label="Total Logins" value={stats.totalLogins.toString()} color={Colors.primary} />
          <StatCard icon="📱" label="Devices" value={stats.devicesCount.toString()} color={Colors.success} />
          <StatCard icon="✓" label="Success" value={`${stats.successRate}%`} color={Colors.success} />
        </View>

        {/* Recent Activity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => router.push('/history')}>
            <Text style={styles.viewAll}>View All →</Text>
          </TouchableOpacity>
        </View>

        {recentActivity.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No authentication history yet</Text>
          </View>
        ) : (
          recentActivity.map((item, i) => (
            <ActivityCard key={i} item={item} />
          ))
        )}

        {/* Navigation Cards */}
        <Text style={styles.sectionTitle}>Management</Text>
        {[
          { icon: '📱', title: 'Active Devices', subtitle: 'Manage trusted devices', route: '/devices' },
          { icon: '📋', title: 'Auth History', subtitle: 'View all login events', route: '/history' },
          { icon: '🔑', title: 'Trusted Devices', subtitle: 'Device whitelist', route: '/trusted-devices' },
          { icon: '👤', title: 'Profile', subtitle: 'Account settings', route: '/profile' },
        ].map((card) => (
          <TouchableOpacity key={card.route} style={styles.navCard} onPress={() => router.push(card.route as never)}>
            <View style={styles.navCardLeft}>
              <View style={styles.navCardIcon}>
                <Text style={styles.navCardIconText}>{card.icon}</Text>
              </View>
              <View>
                <Text style={styles.navCardTitle}>{card.title}</Text>
                <Text style={styles.navCardSubtitle}>{card.subtitle}</Text>
              </View>
            </View>
            <Text style={styles.navCardArrow}>›</Text>
          </TouchableOpacity>
        ))}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

function StatusChip({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: color + '20', borderColor: color + '40' }]}>
      <Text style={styles.chipIcon}>{icon}</Text>
      <Text style={[styles.chipLabel, { color }]}>{label}</Text>
    </View>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActivityCard({ item }: { item: { method: string; status: string; timestamp: number; ip?: string } }) {
  const statusColor = item.status === 'verified' ? Colors.success : Colors.error;
  const timeDiff = Math.round((Date.now() - item.timestamp) / 60000);
  const timeStr = timeDiff < 60 ? `${timeDiff}m ago` : `${Math.round(timeDiff / 60)}h ago`;

  return (
    <View style={styles.activityCard}>
      <View style={[styles.activityDot, { backgroundColor: statusColor }]} />
      <View style={styles.activityContent}>
        <Text style={styles.activityMethod}>{item.method?.replace('_', ' ').toUpperCase() || 'OTH'}</Text>
        <Text style={styles.activityMeta}>{item.ip || 'Unknown IP'} · {timeStr}</Text>
      </View>
      <View style={[styles.activityBadge, { backgroundColor: statusColor + '20' }]}>
        <Text style={[styles.activityStatus, { color: statusColor }]}>
          {item.status === 'verified' ? '✓' : '✕'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { color: Colors.textSecondary, fontSize: 14 },
  userName: { color: Colors.textPrimary, fontSize: 22, fontFamily: Typography.fontFamily.bold, marginTop: 2 },
  notifBtn: { width: 44, height: 44, backgroundColor: Colors.surface, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  notifIcon: { fontSize: 20 },
  notifDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.error },
  securityScoreCard: { backgroundColor: Colors.glass, borderRadius: BorderRadius.lg, padding: 16, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: Colors.glassBorder },
  scoreLeft: {},
  scoreLabel: { color: Colors.textSecondary, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  scoreValue: { fontSize: 28, fontFamily: Typography.fontFamily.bold, marginTop: 4 },
  scoreSubtext: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  scoreRight: {},
  scoreRing: { width: 70, height: 70, borderRadius: 35, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  scorePercent: { fontSize: 18, fontFamily: Typography.fontFamily.bold },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full, borderWidth: 1 },
  chipIcon: { fontSize: 12 },
  chipLabel: { fontSize: 11, fontFamily: Typography.fontFamily.medium },
  content: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontFamily: Typography.fontFamily.semiBold, color: Colors.textPrimary, marginTop: 24, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 },
  viewAll: { color: Colors.primary, fontSize: 13 },
  quickActions: { flexDirection: 'row', gap: 12 },
  quickAction: { flex: 1, borderRadius: BorderRadius.md, overflow: 'hidden' },
  quickActionGradient: { padding: 16, alignItems: 'center', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.glassBorder, aspectRatio: 0.9 },
  quickActionIcon: { fontSize: 24, marginBottom: 8 },
  quickActionLabel: { fontSize: 11, fontFamily: Typography.fontFamily.semiBold, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 22, fontFamily: Typography.fontFamily.bold },
  statLabel: { color: Colors.textMuted, fontSize: 11, marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
  activityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  activityContent: { flex: 1 },
  activityMethod: { color: Colors.textPrimary, fontSize: 13, fontFamily: Typography.fontFamily.semiBold },
  activityMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  activityBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  activityStatus: { fontSize: 14, fontWeight: 'bold' },
  navCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  navCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  navCardIcon: { width: 42, height: 42, backgroundColor: Colors.primary + '20', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  navCardIconText: { fontSize: 20 },
  navCardTitle: { color: Colors.textPrimary, fontSize: 15, fontFamily: Typography.fontFamily.semiBold },
  navCardSubtitle: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  navCardArrow: { color: Colors.textMuted, fontSize: 22 },
});
