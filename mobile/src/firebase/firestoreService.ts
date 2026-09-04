/**
 * Firestore Service — All database operations
 * Replaces MySQL entirely for the MVP
 * Collections: users, devices, authLogs, trustedDevices, offlineTokens, notifications, threatLogs
 */
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  addDoc, deleteDoc, query, where, orderBy, limit,
  serverTimestamp, Timestamp, writeBatch,
  type DocumentData, type QueryConstraint
} from 'firebase/firestore';
import { db } from './config';

// ─── Types ────────────────────────────────────────────────────────

export interface OTHUser {
  uid: string;
  phone: string;
  email?: string;
  fullName?: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  securityScore: number;
  publicKey?: string;
  lastLoginAt?: Timestamp;
  lastLoginIp?: string;
  failedAttempts: number;
  createdAt: Timestamp;
}

export interface OTHDevice {
  uid: string;
  deviceId: string;
  platform: string;
  osVersion: string;
  appVersion: string;
  brand?: string;
  model?: string;
  fingerprint: string;
  fingerprintConfidence: string;
  fcmToken?: string;
  isTrusted: boolean;
  isPrimary: boolean;
  isActive: boolean;
  lastSeenAt?: Timestamp;
  lastSeenIp?: string;
  boundAt: Timestamp;
}

export interface AuthLog {
  uid: string;
  deviceId: string;
  method: 'handshake' | 'qr' | 'offline' | 'emergency' | 'password';
  status: 'success' | 'failed';
  ipAddress?: string;
  riskScore: number;
  errorCode?: string;
  timestamp: Timestamp;
  fingerprint?: string;
}

export interface ThreatLog {
  uid?: string;
  deviceId?: string;
  eventType: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  ipAddress?: string;
  riskScore: number;
  metadata?: Record<string, unknown>;
  timestamp: Timestamp;
}

export interface OfflineToken {
  uid: string;
  deviceId: string;
  token: string;
  checksum: string;
  maxUsage: number;
  usageCount: number;
  expiresAt: Timestamp;
  isActive: boolean;
  createdAt: Timestamp;
}

// ─── User Operations ──────────────────────────────────────────────

export const UserService = {
  async create(uid: string, data: Partial<OTHUser>): Promise<void> {
    await setDoc(doc(db, 'users', uid), {
      uid,
      role: 'user',
      status: 'active',
      securityScore: 100,
      failedAttempts: 0,
      createdAt: serverTimestamp(),
      ...data,
    });
  },

  async get(uid: string): Promise<OTHUser | null> {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as OTHUser) : null;
  },

  async getByPhone(phone: string): Promise<OTHUser | null> {
    const q = query(collection(db, 'users'), where('phone', '==', phone), limit(1));
    const snaps = await getDocs(q);
    if (snaps.empty) return null;
    return snaps.docs[0].data() as OTHUser;
  },

  async update(uid: string, data: Partial<OTHUser>): Promise<void> {
    await updateDoc(doc(db, 'users', uid), data as DocumentData);
  },

  async updateLastLogin(uid: string, ip: string): Promise<void> {
    await updateDoc(doc(db, 'users', uid), {
      lastLoginAt: serverTimestamp(),
      lastLoginIp: ip,
      failedAttempts: 0,
    });
  },

  async incrementFailedAttempts(uid: string): Promise<number> {
    const user = await this.get(uid);
    const attempts = (user?.failedAttempts || 0) + 1;
    await updateDoc(doc(db, 'users', uid), { failedAttempts: attempts });
    return attempts;
  },
};

// ─── Device Operations ────────────────────────────────────────────

export const DeviceService = {
  async upsert(uid: string, deviceId: string, data: Partial<OTHDevice>): Promise<void> {
    const docId = `${uid}_${deviceId}`;
    const existing = await getDoc(doc(db, 'devices', docId));

    if (existing.exists()) {
      await updateDoc(doc(db, 'devices', docId), {
        ...data,
        lastSeenAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'devices', docId), {
        uid,
        deviceId,
        isTrusted: false,
        isPrimary: false,
        isActive: true,
        boundAt: serverTimestamp(),
        ...data,
      });
    }
  },

  async get(uid: string, deviceId: string): Promise<OTHDevice | null> {
    const snap = await getDoc(doc(db, 'devices', `${uid}_${deviceId}`));
    return snap.exists() ? (snap.data() as OTHDevice) : null;
  },

  async getByUID(uid: string): Promise<OTHDevice[]> {
    const q = query(collection(db, 'devices'), where('uid', '==', uid), where('isActive', '==', true));
    const snaps = await getDocs(q);
    return snaps.docs.map((d) => d.data() as OTHDevice);
  },

  async deactivate(uid: string, deviceId: string): Promise<void> {
    await updateDoc(doc(db, 'devices', `${uid}_${deviceId}`), { isActive: false });
  },

  async setTrusted(uid: string, deviceId: string, trusted: boolean): Promise<void> {
    await updateDoc(doc(db, 'devices', `${uid}_${deviceId}`), { isTrusted: trusted });
  },

  async count(uid: string): Promise<number> {
    const q = query(collection(db, 'devices'), where('uid', '==', uid), where('isActive', '==', true));
    const snaps = await getDocs(q);
    return snaps.size;
  },
};

// ─── Auth Log Operations ──────────────────────────────────────────

export const AuthLogService = {
  async log(data: Omit<AuthLog, 'timestamp'>): Promise<void> {
    await addDoc(collection(db, 'authLogs'), {
      ...data,
      timestamp: serverTimestamp(),
    });
  },

  async getByUID(uid: string, pageSize = 20): Promise<AuthLog[]> {
    const q = query(
      collection(db, 'authLogs'),
      where('uid', '==', uid),
      orderBy('timestamp', 'desc'),
      limit(pageSize)
    );
    const snaps = await getDocs(q);
    return snaps.docs.map((d) => d.data() as AuthLog);
  },

  async getAll(pageSize = 100): Promise<AuthLog[]> {
    const q = query(collection(db, 'authLogs'), orderBy('timestamp', 'desc'), limit(pageSize));
    const snaps = await getDocs(q);
    return snaps.docs.map((d) => d.data() as AuthLog);
  },
};

// ─── Threat Log Operations ────────────────────────────────────────

export const ThreatLogService = {
  async log(data: Omit<ThreatLog, 'timestamp'>): Promise<void> {
    await addDoc(collection(db, 'threatLogs'), {
      ...data,
      timestamp: serverTimestamp(),
    });
  },

  async getRecent(pageSize = 50): Promise<ThreatLog[]> {
    const q = query(collection(db, 'threatLogs'), orderBy('timestamp', 'desc'), limit(pageSize));
    const snaps = await getDocs(q);
    return snaps.docs.map((d) => d.data() as ThreatLog);
  },

  async getHighSeverity(): Promise<ThreatLog[]> {
    const q = query(
      collection(db, 'threatLogs'),
      where('severity', 'in', ['error', 'critical']),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const snaps = await getDocs(q);
    return snaps.docs.map((d) => d.data() as ThreatLog);
  },
};

// ─── Offline Token Operations ─────────────────────────────────────

export const OfflineTokenService = {
  async store(uid: string, data: Omit<OfflineToken, 'uid' | 'usageCount' | 'createdAt'>): Promise<string> {
    const ref = await addDoc(collection(db, 'offlineTokens'), {
      uid,
      ...data,
      usageCount: 0,
      isActive: true,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },

  async getActive(uid: string, deviceId: string): Promise<OfflineToken[]> {
    const q = query(
      collection(db, 'offlineTokens'),
      where('uid', '==', uid),
      where('deviceId', '==', deviceId),
      where('isActive', '==', true)
    );
    const snaps = await getDocs(q);
    return snaps.docs
      .map((d) => d.data() as OfflineToken)
      .filter((t) => t.expiresAt.toMillis() > Date.now());
  },
};

// ─── Nonce Registry (Firestore-based replay prevention) ───────────

export const NonceService = {
  async checkAndConsume(nonce: string): Promise<boolean> {
    const docRef = doc(db, 'nonces', nonce);
    const snap = await getDoc(docRef);
    if (snap.exists()) return false; // Already used

    await setDoc(docRef, {
      usedAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 60_000), // 60s
    });
    return true;
  },

  async cleanup(): Promise<void> {
    // Called periodically — delete expired nonces
    const q = query(collection(db, 'nonces'), where('expiresAt', '<', Timestamp.now()));
    const snaps = await getDocs(q);
    const batch = writeBatch(db);
    snaps.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  },
};

// ─── Analytics ────────────────────────────────────────────────────

export const AnalyticsService = {
  async getDailyStats(): Promise<{ date: string; total: number; successful: number }[]> {
    // Aggregate authLogs by day — last 30 days
    const q = query(collection(db, 'authLogs'), orderBy('timestamp', 'desc'), limit(500));
    const snaps = await getDocs(q);
    const logs = snaps.docs.map((d) => d.data() as AuthLog);

    const dayMap: Record<string, { total: number; successful: number }> = {};
    logs.forEach((log) => {
      const day = log.timestamp?.toDate().toISOString().slice(0, 10) || '';
      if (!dayMap[day]) dayMap[day] = { total: 0, successful: 0 };
      dayMap[day].total++;
      if (log.status === 'success') dayMap[day].successful++;
    });

    return Object.entries(dayMap)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);
  },

  async getPlatformBreakdown(): Promise<{ platform: string; count: number }[]> {
    const q = query(collection(db, 'devices'), where('isActive', '==', true));
    const snaps = await getDocs(q);
    const map: Record<string, number> = {};
    snaps.docs.forEach((d) => {
      const platform = (d.data() as OTHDevice).platform || 'unknown';
      map[platform] = (map[platform] || 0) + 1;
    });
    return Object.entries(map).map(([platform, count]) => ({ platform, count }));
  },
};
