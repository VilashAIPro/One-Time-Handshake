// mobile/src/screens/AuthHistoryScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface AuthLogItem {
  id: string;
  type: 'ONLINE_HANDSHAKE' | 'OFFLINE_HANDSHAKE' | 'QR_HANDSHAKE' | 'BIOMETRIC';
  status: 'SUCCESS' | 'FAILED' | 'THREAT_REJECTED';
  timestamp: string;
  ipAddress: string;
  location: string;
  nonce: string;
}

export function AuthHistoryScreen({ navigation }: any) {
  const [logs] = useState<AuthLogItem[]>([
    {
      id: 'log_1',
      type: 'ONLINE_HANDSHAKE',
      status: 'SUCCESS',
      timestamp: '2026-09-04 10:45:12',
      ipAddress: '192.168.1.104',
      location: 'New Delhi, IN',
      nonce: 'a3f89e21...',
    },
    {
      id: 'log_2',
      type: 'OFFLINE_HANDSHAKE',
      status: 'SUCCESS',
      timestamp: '2026-09-04 09:12:05',
      ipAddress: 'Offline Cache',
      location: 'Local Cryptographic Vault',
      nonce: 'f72b901a...',
    },
    {
      id: 'log_3',
      type: 'QR_HANDSHAKE',
      status: 'SUCCESS',
      timestamp: '2026-09-03 18:30:44',
      ipAddress: '10.0.0.12',
      location: 'Government Portal Gateway',
      nonce: '8c2d11e4...',
    },
    {
      id: 'log_4',
      type: 'ONLINE_HANDSHAKE',
      status: 'THREAT_REJECTED',
      timestamp: '2026-09-02 22:15:00',
      ipAddress: '185.220.101.5',
      location: 'Unknown Tor Node',
      nonce: '00000000...',
    },
  ]);

  const getIconAndColor = (type: string, status: string) => {
    if (status === 'THREAT_REJECTED') {
      return { icon: 'shield-alert', color: '#EF4444' };
    }
    switch (type) {
      case 'OFFLINE_HANDSHAKE':
        return { icon: 'cloud-off-outline', color: COLORS.accent };
      case 'QR_HANDSHAKE':
        return { icon: 'qrcode', color: COLORS.secondary };
      case 'BIOMETRIC':
        return { icon: 'fingerprint', color: COLORS.primary };
      default:
        return { icon: 'shield-check', color: COLORS.primary };
    }
  };

  const renderLogItem = ({ item }: { item: AuthLogItem }) => {
    const { icon, color } = getIconAndColor(item.type, item.status);
    return (
      <View style={styles.logCard}>
        <View style={styles.logHeader}>
          <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
            <MaterialCommunityIcons name={icon as any} size={22} color={color} />
          </View>
          <View style={styles.logInfo}>
            <Text style={styles.logTitle}>{item.type.replace('_', ' ')}</Text>
            <Text style={styles.logTime}>{item.timestamp}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  item.status === 'SUCCESS'
                    ? 'rgba(22, 163, 74, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: item.status === 'SUCCESS' ? COLORS.secondary : '#EF4444' },
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.logFooter}>
          <Text style={styles.footerText}>Location: {item.location}</Text>
          <Text style={styles.footerText}>IP: {item.ipAddress}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Authentication History</Text>
      </View>

      <Text style={styles.subtitle}>
        Immutable record of cryptographic handshake attempts for your bound identity.
      </Text>

      <FlatList
        data={logs}
        keyExtractor={item => item.id}
        renderItem={renderLogItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 20,
  },
  logCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logInfo: {
    flex: 1,
  },
  logTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  logTime: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
});
