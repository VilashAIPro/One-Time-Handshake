// mobile/src/screens/ScanQRScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { COLORS } from '../theme/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';

export function ScanQRScreen({ navigation }: any) {
  const [scanning, setScanning] = useState(true);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const { verifyHandshakeToken } = useAuthStore();

  const handleSimulateScan = async () => {
    // Simulated OTH QR code scan payload
    const mockQRToken = "OTHv1.1.2.3.4.5.6.7.8.9.0.a.b.c.d";
    setScannedResult(mockQRToken);
    setScanning(false);

    try {
      // Perform verification
      navigation.navigate('HandshakeSuccess', {
        deviceFingerprint: 'FP-MOCK-99238',
        timestamp: Date.now(),
        verified: true,
      });
    } catch (err: any) {
      navigation.navigate('HandshakeFailed', {
        reason: err.message || 'QR Verification failed or expired',
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan OTH QR Code</Text>
      </View>

      <View style={styles.scannerContainer}>
        <View style={styles.cameraBox}>
          <MaterialCommunityIcons name="qrcode-scan" size={140} color={COLORS.primary} />
          <View style={styles.scanLine} />
        </View>
        <Text style={styles.hintText}>
          Align the OTH QR code within the frame to authenticate instantly.
        </Text>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.scanButton} onPress={handleSimulateScan}>
          <MaterialCommunityIcons name="camera" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.scanButtonText}>Simulate Camera Scan</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
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
  scannerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBox: {
    width: 260,
    height: 260,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    position: 'relative',
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    top: '50%',
    width: '100%',
    height: 2,
    backgroundColor: COLORS.secondary,
  },
  hintText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  actionContainer: {
    marginBottom: 30,
  },
  scanButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
});
