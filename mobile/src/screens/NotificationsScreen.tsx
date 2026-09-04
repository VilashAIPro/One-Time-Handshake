// mobile/src/screens/NotificationsScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type: 'SECURITY' | 'HANDSHAKE' | 'DEVICE' | 'SYSTEM';
}

export function NotificationsScreen({ navigation }: any) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif_1',
      title: 'Successful Handshake',
      body: 'Verified login on Google Pixel 8 Pro via OTH Cryptography Engine.',
      time: '10 min ago',
      read: false,
      type: 'HANDSHAKE',
    },
    {
      id: 'notif_2',
      title: 'Offline Vault Synced',
      body: '3 queued offline handshake tokens successfully synced with Firestore.',
      time: '2 hours ago',
      read: true,
      type: 'SYSTEM',
    },
    {
      id: 'notif_3',
      title: 'New Trusted Device Added',
      body: 'Samsung Galaxy Tab S9 was bound to your cryptographic identity.',
      time: 'Yesterday',
      read: true,
      type: 'DEVICE',
    },
    {
      id: 'notif_4',
      title: 'Threat Detection Alert',
      body: 'Blocked 1 unauthorized login attempt from untrusted IP 185.220.101.5.',
      time: '2 days ago',
      read: true,
      type: 'SECURITY',
    },
  ]);

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'SECURITY':
        return { name: 'shield-alert', color: '#EF4444' };
      case 'DEVICE':
        return { name: 'cellphone-key', color: COLORS.accent };
      case 'SYSTEM':
        return { name: 'cloud-sync', color: COLORS.secondary };
      default:
        return { name: 'bell-check', color: COLORS.primary };
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const icon = getIcon(item.type);
    return (
      <View style={[styles.card, !item.read && styles.unreadCard]}>
        <View style={[styles.iconWrapper, { backgroundColor: `${icon.color}15` }]}>
          <MaterialCommunityIcons name={icon.name as any} size={22} color={icon.color} />
        </View>
        <View style={styles.contentWrapper}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardTime}>{item.time}</Text>
          </View>
          <Text style={styles.cardBody}>{item.body}</Text>
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
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllAsRead} style={styles.readAllButton}>
          <Text style={styles.readAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
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
    justifyContent: 'space-between',
    marginTop: 40,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 12,
  },
  readAllButton: {
    padding: 6,
  },
  readAllText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  unreadCard: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentWrapper: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  cardTime: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  cardBody: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
