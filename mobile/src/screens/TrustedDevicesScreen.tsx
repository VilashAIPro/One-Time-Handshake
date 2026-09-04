// mobile/src/screens/TrustedDevicesScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { COLORS } from '../theme/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface DeviceItem {
  id: string;
  name: string;
  model: string;
  fingerprintHash: string;
  lastActive: string;
  isCurrent: boolean;
  trustScore: number;
}

export function TrustedDevicesScreen({ navigation }: any) {
  const [devices, setDevices] = useState<DeviceItem[]>([
    {
      id: 'dev_1',
      name: 'Google Pixel 8 Pro',
      model: 'Pixel 8 Pro (Android 14)',
      fingerprintHash: 'a8f9c2d1...3e90',
      lastActive: 'Active Now',
      isCurrent: true,
      trustScore: 98,
    },
    {
      id: 'dev_2',
      name: 'Samsung Galaxy Tab S9',
      model: 'SM-X910 (Android 13)',
      fingerprintHash: '7b2a5f4c...1d88',
      lastActive: '2 hours ago',
      isCurrent: false,
      trustScore: 92,
    },
    {
      id: 'dev_3',
      name: 'Defense Terminal Alpha',
      model: 'Secure-OS (Embedded Linux)',
      fingerprintHash: '3c8e9f11...5b77',
      lastActive: 'Yesterday',
      isCurrent: false,
      trustScore: 100,
    },
  ]);

  const handleRevokeDevice = (id: string, name: string) => {
    Alert.alert(
      'Revoke Device Trust',
      `Are you sure you want to revoke trust for ${name}? It will be logged out immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => {
            setDevices(devices.filter(d => d.id !== id));
            Alert.alert('Device Revoked', `${name} has been removed from trusted devices.`);
          },
        },
      ]
    );
  };

  const renderDeviceItem = ({ item }: { item: DeviceItem }) => (
    <View style={styles.deviceCard}>
      <View style={styles.deviceHeader}>
        <View style={styles.deviceIconWrapper}>
          <MaterialCommunityIcons
            name={item.model.includes('Tab') ? 'tablet' : item.model.includes('Secure') ? 'server-security' : 'cellphone'}
            size={24}
            color={COLORS.primary}
          />
        </View>
        <View style={styles.deviceInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.deviceName}>{item.name}</Text>
            {item.isCurrent && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>THIS DEVICE</Text>
              </View>
            )}
          </View>
          <Text style={styles.deviceModel}>{item.model}</Text>
          <Text style={styles.deviceMeta}>
            Fingerprint: {item.fingerprintHash} • {item.lastActive}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.trustScoreBadge}>
          <MaterialCommunityIcons name="shield-check" size={14} color={COLORS.secondary} />
          <Text style={styles.trustScoreText}>Trust Score: {item.trustScore}%</Text>
        </View>
        {!item.isCurrent && (
          <TouchableOpacity
            style={styles.revokeButton}
            onPress={() => handleRevokeDevice(item.id, item.name)}
          >
            <Text style={styles.revokeButtonText}>Revoke Trust</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trusted Devices</Text>
      </View>

      <Text style={styles.subtitle}>
        Devices bound to your cryptographically signed One Time Handshake profile.
      </Text>

      <FlatList
        data={devices}
        keyExtractor={item => item.id}
        renderItem={renderDeviceItem}
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
  deviceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  currentBadge: {
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentBadgeText: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  deviceModel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  deviceMeta: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  trustScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trustScoreText: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  revokeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  revokeButtonText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
});
