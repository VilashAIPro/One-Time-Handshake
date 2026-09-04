/**
 * Screen 1: Splash Screen
 * Animated logo with security particle effect
 */

import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions,
  StatusBar, Image
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Typography } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { isAuthenticated, isDeviceBound } = useAuthStore();

  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const ringScale1 = useRef(new Animated.Value(0)).current;
  const ringScale2 = useRef(new Animated.Value(0)).current;
  const ringOpacity1 = useRef(new Animated.Value(0.6)).current;
  const ringOpacity2 = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 40,
        friction: 8,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Tagline fade in
    Animated.timing(taglineOpacity, {
      toValue: 1,
      duration: 800,
      delay: 1000,
      useNativeDriver: true,
    }).start();

    // Pulsing rings
    const pulseRings = () => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(ringScale1, { toValue: 1.5, duration: 1500, useNativeDriver: true }),
            Animated.timing(ringScale1, { toValue: 1, duration: 1500, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(ringOpacity1, { toValue: 0.1, duration: 1500, useNativeDriver: true }),
            Animated.timing(ringOpacity1, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
          ]),
        ])
      ).start();

      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(ringScale2, { toValue: 2, duration: 2000, useNativeDriver: true }),
            Animated.timing(ringScale2, { toValue: 1, duration: 2000, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(ringOpacity2, { toValue: 0.05, duration: 2000, useNativeDriver: true }),
            Animated.timing(ringOpacity2, { toValue: 0.4, duration: 2000, useNativeDriver: true }),
          ]),
        ])
      ).start();
    };
    pulseRings();

    // Navigate after 2.5s
    const timer = setTimeout(() => {
      if (isAuthenticated && isDeviceBound) {
        router.replace('/dashboard');
      } else if (isAuthenticated) {
        router.replace('/device-binding');
      } else {
        router.replace('/onboarding');
      }
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#0F172A']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Pulse Rings */}
      <Animated.View
        style={[
          styles.ring,
          { transform: [{ scale: ringScale2 }], opacity: ringOpacity2, width: 280, height: 280, borderRadius: 140 }
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          { transform: [{ scale: ringScale1 }], opacity: ringOpacity1, width: 200, height: 200, borderRadius: 100 }
        ]}
      />

      {/* Logo Container */}
      <Animated.View
        style={[
          styles.logoContainer,
          { transform: [{ scale: logoScale }], opacity: logoOpacity }
        ]}
      >
        <LinearGradient
          colors={['#2563EB', '#1D4ED8']}
          style={styles.logoGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.logoIcon}>🔐</Text>
        </LinearGradient>

        <Text style={styles.logoText}>OTH</Text>
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Secure Authentication Beyond OTP
        </Animated.Text>
      </Animated.View>

      {/* Bottom badge */}
      <Animated.View style={[styles.bottomBadge, { opacity: taglineOpacity }]}>
        <Text style={styles.badgeText}>🇮🇳 Made for Defence · Government · Enterprise</Text>
        <Text style={styles.versionText}>v1.0.0</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoIcon: {
    fontSize: 48,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 8,
    fontFamily: Typography.fontFamily.bold,
  },
  tagline: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    letterSpacing: 0.5,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.regular,
  },
  bottomBadge: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  badgeText: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  versionText: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
});
