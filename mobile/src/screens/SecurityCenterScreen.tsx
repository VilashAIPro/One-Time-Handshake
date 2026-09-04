/**
 * Screen 10: Security Center
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Switch, Alert
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius } from '../../theme/colors';
import { OTHApiClient } from '../api/client';
import { useAuthStore } from '../../store/authStore';

interface ThreatLog {
  event_type: string;
  severity: string;
  timestamp: number;
  ip_address: string;
  risk_score: number;
}

export default function SecurityCenterScreen() {
  const router = useRouter();
  const { riskScore, user } = useAuthStore();
  const [threats, setThreats] = useState<ThreatLog[]>([]);
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadThreats();
  }, []);

  const loadThreats = async () => {
    try {
      const resp = await OTHApiClient.get('/admin/threats?limit=10');
      setThreats(resp.data.data || []);
    } catch { /* offline */ }
    setLoading(false);
  };

  const handleLogoutAll = () => {
    Alert.alert(
      '⚠️ Logout All Devices',
      'This will terminate all active sessions across all your devices. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout All',
          style: 'destructive',
          onPress: async () => {
            try {
              await OTHApiClient.post('/auth/logout-all');
              Alert.alert('Done', 'All sessions terminated.');
            } catch {
              Alert.alert('Error', 'Failed to logout all devices.');
            }
          },
        },
      ]
    );
  };

  const securityLevel = riskScore < 20 ? 'EXCELLENT' : riskScore < 50 ? 'GOOD' : riskScore < 80 ? 'AT RISK' : 'CRITICAL';
  const securityColor = riskScore < 20 ? Colors.success : riskScore < 50 ? Colors.primary : riskScore < 80 ? Colors.warning : Colors.error;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🛡️ Security Center</Text>
        <Text style={styles.headerSub}>Your security overview and controls</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Security Score */}
        <View style={[styles.scoreCard, { borderColor: securityColor + '40' }]}>
          <LinearGradient colors={[securityColor + '20', 'transparent']} style={styles.scoreGradient}>
            <View style={styles.scoreHeader}>
              <View>
                <Text style={styles.scoreTitle}>Security Score</Text>
                <Text style={[styles.scoreLevel, { color: securityColor }]}>{securityLevel}</Text>
              </View>
              <View style={[styles.scoreCircle, { borderColor: securityColor }]}>
                <Text style={[styles.scoreNum, { color: securityColor }]}>{100 - riskScore}</Text>
                <Text style={styles.scoreMax}>/100</Text>
              </View>
            </View>

            <View style={styles.scoreBar}>
              <View style={[styles.scoreBarFill, {
                width: `${100 - riskScore}%`,
                backgroundColor: securityColor
              }]} />
            </View>
            <Text style={styles.scoreHint}>
              {riskScore < 20
                ? '✅ Your account is highly secure'
                : riskScore < 50
                ? '⚠️ Some security improvements recommended'
                : '🚨 Immediate action required'}
            </Text>
          </LinearGradient>
        </View>

        {/* Security Controls */}
        <Text style={styles.sectionTitle}>Security Controls</Text>
        <View style={styles.controlsCard}>
          {[
            { icon: '🪪', label: 'Biometric Authentication', sub: 'Fingerprint / Face ID', value: biometricEnabled, onChange: setBiometricEnabled },
            { icon: '🔔', label: 'Security Notifications', sub: 'Alerts for suspicious activity', value: notificationsEnabled, onChange: setNotificationsEnabled },
          ].map((ctrl) => (
            <View key={ctrl.label} style={styles.controlRow}>
              <View style={styles.controlLeft}>
                <Text style={styles.controlIcon}>{ctrl.icon}</Text>
                <View>
                  <Text style={styles.controlLabel}>{ctrl.label}</Text>
                  <Text style={styles.controlSub}>{ctrl.sub}</Text>
                </View>
              </View>
              <Switch
                value={ctrl.value}
                onValueChange={ctrl.onChange}
                trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
                thumbColor={ctrl.value ? Colors.primary : Colors.textMuted}
              />
            </View>
          ))}
        </View>

        {/* Quick Security Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            { icon: '📱', label: 'Active Devices', route: '/devices', color: Colors.primary },
            { icon: '🔑', label: 'Trusted Devices', route: '/trusted-devices', color: Colors.success },
            { icon: '📋', label: 'Auth History', route: '/history', color: '#7C3AED' },
            { icon: '🆘', label: 'Emergency QR', route: '/emergency-qr', color: Colors.error },
          ].map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.actionCard, { borderColor: action.color + '30' }]}
              onPress={() => router.push(action.route as never)}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={[styles.actionLabel, { color: action.color }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Threat Log */}
        <Text style={styles.sectionTitle}>Recent Threats</Text>
        {threats.length === 0 ? (
          <View style={styles.noThreats}>
            <Text style={styles.noThreatsIcon}>✅</Text>
            <Text style={styles.noThreatsText}>No threats detected</Text>
            <Text style={styles.noThreatsSubtext}>Your account is clean</Text>
          </View>
        ) : (
          threats.map((threat, i) => (
            <ThreatCard key={i} threat={threat} />
          ))
        )}

        {/* Danger Zone */}
        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <TouchableOpacity style={styles.dangerButton} onPress={handleLogoutAll}>
          <Text style={styles.dangerIcon}>⚠️</Text>
          <View style={styles.dangerText}>
            <Text style={styles.dangerTitle}>Logout All Devices</Text>
            <Text style={styles.dangerSub}>Terminate all active sessions</Text>
          </View>
          <Text style={styles.dangerArrow}>›</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function ThreatCard({ threat }: { threat: ThreatLog }) {
  const severityColor = threat.severity === 'critical' ? Colors.error
    : threat.severity === 'warning' ? Colors.warning
    : Colors.primary;

  const timeStr = new Date(threat.timestamp).toLocaleTimeString();

  return (
    <View style={[styles.threatCard, { borderLeftColor: severityColor }]}>
      <View style={styles.threatHeader}>
        <Text style={[styles.threatType, { color: severityColor }]}>
          {threat.event_type.replace(/_/g, ' ').toUpperCase()}
        </Text>
        <View style={[styles.severityBadge, { backgroundColor: severityColor + '20' }]}>
          <Text style={[styles.severityText, { color: severityColor }]}>
            {threat.severity.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.threatMeta}>
        {threat.ip_address} · {timeStr} · Risk: {threat.risk_score}/100
      </Text>
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
  sectionTitle: { fontSize: 16, fontFamily: Typography.fontFamily.semiBold, color: Colors.textPrimary, marginTop: 24, marginBottom: 12 },
  scoreCard: { marginTop: 20, borderRadius: BorderRadius.lg, borderWidth: 1, overflow: 'hidden' },
  scoreGradient: { padding: 20 },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  scoreTitle: { color: Colors.textSecondary, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  scoreLevel: { fontSize: 22, fontFamily: Typography.fontFamily.bold, marginTop: 4 },
  scoreCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontSize: 20, fontFamily: Typography.fontFamily.bold },
  scoreMax: { color: Colors.textMuted, fontSize: 10 },
  scoreBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, marginBottom: 12 },
  scoreBarFill: { height: 6, borderRadius: 3 },
  scoreHint: { color: Colors.textSecondary, fontSize: 13 },
  controlsCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  controlLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  controlIcon: { fontSize: 22 },
  controlLabel: { color: Colors.textPrimary, fontSize: 15, fontFamily: Typography.fontFamily.medium },
  controlSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: '47%', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 16, alignItems: 'center', borderWidth: 1 },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 13, fontFamily: Typography.fontFamily.semiBold, textAlign: 'center' },
  noThreats: { backgroundColor: Colors.success + '10', borderRadius: BorderRadius.lg, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: Colors.success + '30' },
  noThreatsIcon: { fontSize: 40, marginBottom: 8 },
  noThreatsText: { color: Colors.success, fontSize: 16, fontFamily: Typography.fontFamily.semiBold },
  noThreatsSubtext: { color: Colors.textMuted, fontSize: 13, marginTop: 4 },
  threatCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 14, marginBottom: 8, borderLeftWidth: 3, borderWidth: 1, borderColor: Colors.border },
  threatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  threatType: { fontSize: 12, fontFamily: Typography.fontFamily.semiBold },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  severityText: { fontSize: 10, fontFamily: Typography.fontFamily.bold },
  threatMeta: { color: Colors.textMuted, fontSize: 12 },
  dangerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.error + '10', borderRadius: BorderRadius.md, padding: 16, borderWidth: 1, borderColor: Colors.error + '40' },
  dangerIcon: { fontSize: 24, marginRight: 12 },
  dangerText: { flex: 1 },
  dangerTitle: { color: Colors.error, fontSize: 15, fontFamily: Typography.fontFamily.semiBold },
  dangerSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  dangerArrow: { color: Colors.error, fontSize: 22 },
});
