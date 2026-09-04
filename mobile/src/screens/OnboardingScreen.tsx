/**
 * Screen 2: Onboarding
 * 3-slide carousel introducing OTH
 */

import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Animated,
  Dimensions, TouchableOpacity, StatusBar
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing } from '../../theme/colors';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    icon: '🛡️',
    title: 'No OTP Required',
    subtitle: 'Works Offline',
    description:
      'OTH replaces SMS OTP with a military-grade encrypted handshake. Authenticate without internet, SMS, or mobile signal.',
    gradient: ['#1E3A5F', '#0F172A'],
    accent: '#2563EB',
  },
  {
    id: '2',
    icon: '🔐',
    title: 'Device Binding',
    subtitle: 'Your Device = Your Key',
    description:
      'Your device fingerprint, IMEI, and cryptographic keys create a unique handshake. No two devices are alike.',
    gradient: ['#1A2E1A', '#0F172A'],
    accent: '#16A34A',
  },
  {
    id: '3',
    icon: '⚡',
    title: 'Works Everywhere',
    subtitle: 'Defence · Government · Bank',
    description:
      'From rural areas to bunkers — OTH authenticates in zero-signal environments using pre-loaded encrypted tokens.',
    gradient: ['#2D1F3D', '#0F172A'],
    accent: '#7C3AED',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (activeIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      router.replace('/register');
    }
  };

  const handleSkip = () => router.replace('/login');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveIndex(index);
        }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <LinearGradient
              colors={item.gradient as string[]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />

            {/* Icon */}
            <View style={[styles.iconContainer, { borderColor: item.accent + '40', backgroundColor: item.accent + '20' }]}>
              <Text style={styles.icon}>{item.icon}</Text>
            </View>

            {/* Text */}
            <View style={styles.textContainer}>
              <Text style={[styles.subtitle, { color: item.accent }]}>{item.subtitle}</Text>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>

            {/* Security Features */}
            {item.id === '1' && (
              <View style={styles.featureList}>
                {['AES-256 Encryption', 'HMAC-SHA256 Signing', 'Replay Protection'].map((f) => (
                  <View key={f} style={styles.feature}>
                    <Text style={styles.featureIcon}>✓</Text>
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dotsContainer}>
        {slides.map((_, i) => {
          const dotWidth = scrollX.interpolate({
            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });
          const dotOpacity = scrollX.interpolate({
            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={i}
              style={[styles.dot, { width: dotWidth, opacity: dotOpacity }]}
            />
          );
        })}
      </View>

      {/* CTA Button */}
      <TouchableOpacity onPress={handleNext} activeOpacity={0.85}>
        <LinearGradient
          colors={['#2563EB', '#1D4ED8']}
          style={styles.ctaButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.ctaText}>
            {activeIndex === slides.length - 1 ? 'Get Started →' : 'Next →'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={styles.loginLink} onPress={() => router.replace('/login')}>
        <Text style={styles.loginLinkText}>Already registered? <Text style={{ color: Colors.primary }}>Sign In</Text></Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  skipButton: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontFamily: Typography.fontFamily.medium,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 200,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  icon: {
    fontSize: 64,
  },
  textContainer: {
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semiBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  featureList: {
    marginTop: 32,
    gap: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIcon: {
    color: Colors.success,
    fontSize: 16,
    fontWeight: 'bold',
  },
  featureText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 170,
    left: 0,
    right: 0,
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  ctaButton: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: Typography.fontFamily.semiBold,
    letterSpacing: 0.5,
  },
  loginLink: {
    position: 'absolute',
    bottom: 56,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  loginLinkText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
