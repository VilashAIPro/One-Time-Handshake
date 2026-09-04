/**
 * Screen 14: Offline Mode
 * Generate and manage offline authentication tokens
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useRouter } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import { Colors, Typography, BorderRadius } from '../../theme/colors';
import { OTHApiClient, isOnline } from '../api/client';
import { OTHEngine } from '../crypto/OTHEngine';
import { useAuthStore } from '../../store/authStore';

interface OfflineToken {
  id: number;
  handshake_id: string;
  expires_at: number;
  usage_count: number;
  max_usage: number;
  is_synced: number;
}

export default function OfflineModeScreen() {
  const router = useRouter();
  const { user, deviceId, setOfflineToken, setOfflineMode } = useAuthStore();
  const [tokens, setTokens] = useState<OfflineToken[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [online, setOnline] = useState(false);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);

  useEffect(() => {
    initDB();
    isOnline().then(setOnline);
  }, []);

  const initDB = async () => {
    const database = await SQLite.openDatabaseAsync('oth_offline.db');
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS offline_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        handshake_id TEXT NOT NULL,
        token TEXT NOT NULL,
        checksum TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        usage_count INTEGER DEFAULT 0,
        max_usage INTEGER DEFAULT 3,
        is_synced INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
      );
    `);
    setDb(database);
    loadTokens(database);
  };

  const loadTokens = async (database: SQLite.SQLiteDatabase) => {
    const result = await database.getAllAsync<OfflineToken>(
      'SELECT * FROM offline_tokens WHERE expires_at > ? ORDER BY created_at DESC',
      [Date.now()]
    );
    setTokens(result);
  };

  const generateOfflineToken = async () => {
    if (!online) {
      Alert.alert('Offline', 'Internet required to generate offline tokens. Connect and try again.');
      return;
    }

    setIsGenerating(true);
    try {
      // Generate on server
      const resp = await OTHApiClient.post('/handshake/offline', { ttlHours: 24, maxUsage: 3 });
      const { offlineToken } = resp.data;

      // Also generate locally
      const localToken = await OTHEngine.generateOfflineToken(
        user!.uid,
        deviceId || 'unknown',
        24
      );

      // Store in local SQLite
      if (db) {
        await db.runAsync(
          'INSERT INTO offline_tokens (handshake_id, token, checksum, expires_at, max_usage) VALUES (?, ?, ?, ?, ?)',
          [offlineToken.handshakeId, offlineToken.token, offlineToken.checksum, offlineToken.expiresAt, offlineToken.maxUsage]
        );
        loadTokens(db);
      }

      setOfflineToken(offlineToken.token, offlineToken.expiresAt);
      setOfflineMode(true);

      Alert.alert(
        '✅ Offline Token Ready',
        `Valid for 24 hours · Can be used ${offlineToken.maxUsage} times\n\nYou can now authenticate without internet.`
      );
    } catch {
      Alert.alert('Error', 'Failed to generate offline token. Please try again.');
    }
    setIsGenerating(false);
  };

  const syncTokens = async () => {
    if (!online) {
      Alert.alert('Offline', 'Connect to internet to sync tokens.');
      return;
    }
    try {
      await OTHApiClient.post('/offline/sync');
      if (db) {
        await db.runAsync('UPDATE offline_tokens SET is_synced = 1');
        loadTokens(db);
      }
      Alert.alert('✅ Synced', 'All offline tokens synced to server.');
    } catch {
      Alert.alert('Sync Failed', 'Please try again when connected.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={online ? ['#1E3A5F', '#0F172A'] : ['#2D1F0F', '#0F172A']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📡 Offline Mode</Text>
        <View style={styles.statusChip}>
          <View style={[styles.statusDot, { backgroundColor: online ? Colors.success : Colors.warning }]} />
          <Text style={[styles.statusText, { color: online ? Colors.success : Colors.warning }]}>
            {online ? 'Connected — Ready to generate' : 'Offline — Using cached tokens'}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* How it works */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How Offline Auth Works</Text>
          {[
            '1. Generate an offline token while connected',
            '2. Token is encrypted and stored on-device',
            '3. Authenticate without internet for 24 hours',
            '4. Token syncs to server when reconnected',
          ].map((step) => (
            <Text key={step} style={styles.infoStep}>{step}</Text>
          ))}
        </View>

        {/* Generate Button */}
        <TouchableOpacity onPress={generateOfflineToken} disabled={isGenerating || !online} activeOpacity={0.85}>
          <LinearGradient
            colors={online ? ['#2563EB', '#1D4ED8'] : ['#374151', '#1F2937']}
            style={[styles.generateBtn, !online && { opacity: 0.6 }]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            {isGenerating
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.generateText}>⚡ Generate Offline Token</Text>
            }
          </LinearGradient>
        </TouchableOpacity>

        {/* Token List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Stored Tokens ({tokens.length})</Text>
          {tokens.some((t) => !t.is_synced) && (
            <TouchableOpacity onPress={syncTokens} style={styles.syncBtn}>
              <Text style={styles.syncText}>↑ Sync</Text>
            </TouchableOpacity>
          )}
        </View>

        {tokens.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>No offline tokens yet</Text>
            <Text style={styles.emptySub}>Generate one while connected to use offline later</Text>
          </View>
        ) : (
          tokens.map((token) => <TokenCard key={token.id} token={token} />)
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function TokenCard({ token }: { token: OfflineToken }) {
  const timeLeft = Math.max(0, Math.round((token.expires_at - Date.now()) / 3600000));
  const isExpired = Date.now() > token.expires_at;
  const usageLeft = token.max_usage - token.usage_count;

  return (
    <View style={[styles.tokenCard, isExpired && { opacity: 0.5 }]}>
      <View style={styles.tokenHeader}>
        <Text style={styles.tokenId}>{token.handshake_id.slice(0, 16)}...</Text>
        <View style={[styles.syncBadge, { backgroundColor: token.is_synced ? Colors.success + '20' : Colors.warning + '20' }]}>
          <Text style={[styles.syncBadgeText, { color: token.is_synced ? Colors.success : Colors.warning }]}>
            {token.is_synced ? '↑ Synced' : '○ Local'}
          </Text>
        </View>
      </View>
      <View style={styles.tokenMeta}>
        <Text style={styles.tokenStat}>⏳ {isExpired ? 'Expired' : `${timeLeft}h left`}</Text>
        <Text style={styles.tokenStat}>🔢 {usageLeft}/{token.max_usage} uses left</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 24 },
  backBtn: { marginBottom: 16 },
  backText: { color: Colors.primary, fontSize: 16 },
  headerTitle: { fontSize: 24, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, marginBottom: 12 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontFamily: Typography.fontFamily.medium },
  content: { flex: 1, paddingHorizontal: 20 },
  infoCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: 16, marginTop: 20, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  infoTitle: { color: Colors.textPrimary, fontSize: 14, fontFamily: Typography.fontFamily.semiBold, marginBottom: 10 },
  infoStep: { color: Colors.textSecondary, fontSize: 13, lineHeight: 22 },
  generateBtn: { borderRadius: BorderRadius.md, paddingVertical: 18, alignItems: 'center', marginBottom: 24 },
  generateText: { color: '#fff', fontSize: 16, fontFamily: Typography.fontFamily.semiBold },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontFamily: Typography.fontFamily.semiBold, color: Colors.textPrimary },
  syncBtn: { backgroundColor: Colors.primary + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  syncText: { color: Colors.primary, fontSize: 13, fontFamily: Typography.fontFamily.semiBold },
  emptyState: { alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: Colors.textSecondary, fontSize: 16, fontFamily: Typography.fontFamily.medium },
  emptySub: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 6 },
  tokenCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  tokenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tokenId: { color: Colors.textPrimary, fontSize: 13, fontFamily: Typography.fontFamily.mono },
  syncBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  syncBadgeText: { fontSize: 11, fontFamily: Typography.fontFamily.semiBold },
  tokenMeta: { flexDirection: 'row', gap: 16 },
  tokenStat: { color: Colors.textMuted, fontSize: 12 },
});
