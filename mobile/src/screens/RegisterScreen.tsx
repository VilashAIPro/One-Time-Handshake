/**
 * Screen 3: Register
 * Phone number + password registration with device binding
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Animated,
  Alert, StatusBar, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useRouter } from 'expo-router';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import { OTHApiClient } from '../api/client';

export default function RegisterScreen() {
  const router = useRouter();
  const { setDeviceId } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const validateForm = (): string | null => {
    if (!phone.match(/^\+?[1-9]\d{9,14}$/)) return 'Enter a valid phone number (e.g. +919876543210)';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])/.test(password))
      return 'Password needs uppercase, lowercase, number, and special character';
    if (password !== confirmPassword) return 'Passwords do not match';
    if (!agreedToTerms) return 'Please agree to Terms of Service';
    return null;
  };

  const handleRegister = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }

    setIsLoading(true);
    try {
      const deviceId = Application.androidId ||
        Application.applicationId + '_' + Device.modelName?.replace(/\s/g, '_');

      const response = await OTHApiClient.post('/auth/register', {
        phone: phone.startsWith('+') ? phone : `+91${phone}`,
        password,
        fullName,
        email,
        deviceId,
        platform: Platform.OS,
        osVersion: `${Platform.OS} ${Device.osVersion}`,
        appVersion: Application.nativeApplicationVersion || '1.0.0',
        brand: Device.brand,
        model: Device.modelName,
      });

      setDeviceId(deviceId);

      Alert.alert(
        '✅ Registration Successful',
        'Your account has been created. Please bind your device to start using OTH.',
        [{ text: 'Continue', onPress: () => router.replace('/device-binding') }]
      );
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#1E293B', '#0F172A']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.logoRow}>
            <Text style={styles.lockIcon}>🔐</Text>
            <Text style={styles.headerTitle}>Create Account</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Join OTH — Your identity, cryptographically secured
          </Text>
        </LinearGradient>

        <View style={styles.form}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                placeholder="Arjun Sharma"
                placeholderTextColor={Colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>📱</Text>
              <TextInput
                ref={phoneRef}
                style={styles.input}
                placeholder="+91 9876543210"
                placeholderTextColor={Colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email (Optional)</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                style={styles.input}
                placeholder="arjun@example.com"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputIcon}>🔑</Text>
              <TextInput
                ref={passwordRef}
                style={[styles.input, { flex: 1 }]}
                placeholder="Strong password"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Text>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {/* Password strength */}
            {password.length > 0 && (
              <View style={styles.strengthBar}>
                {['Length 8+', 'Upper', 'Lower', 'Number', 'Special'].map((req, i) => {
                  const checks = [
                    password.length >= 8,
                    /[A-Z]/.test(password),
                    /[a-z]/.test(password),
                    /\d/.test(password),
                    /[@$!%*?&]/.test(password),
                  ];
                  return (
                    <View key={req} style={[styles.strengthChip, { backgroundColor: checks[i] ? Colors.success + '30' : Colors.backgroundTertiary }]}>
                      <Text style={[styles.strengthText, { color: checks[i] ? Colors.success : Colors.textMuted }]}>
                        {checks[i] ? '✓' : '○'} {req}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password *</Text>
            <View style={[styles.inputContainer, {
              borderColor: confirmPassword && password !== confirmPassword ? Colors.error : Colors.border
            }]}>
              <Text style={styles.inputIcon}>🔐</Text>
              <TextInput
                ref={confirmRef}
                style={styles.input}
                placeholder="Repeat password"
                placeholderTextColor={Colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Terms */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
          >
            <View style={[styles.checkbox, { backgroundColor: agreedToTerms ? Colors.primary : 'transparent' }]}>
              {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              I agree to the <Text style={{ color: Colors.primary }}>Terms of Service</Text> and{' '}
              <Text style={{ color: Colors.primary }}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {/* Register Button */}
          <TouchableOpacity onPress={handleRegister} disabled={isLoading} activeOpacity={0.85}>
            <LinearGradient
              colors={['#2563EB', '#1D4ED8']}
              style={[styles.registerButton, isLoading && { opacity: 0.7 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerButtonText}>Create OTH Account →</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => router.replace('/login')}>
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={{ color: Colors.primary }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 24, paddingTop: 56, paddingBottom: 32 },
  backButton: { marginBottom: 20 },
  backText: { color: Colors.primary, fontSize: 16 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  lockIcon: { fontSize: 32 },
  headerTitle: { fontSize: 28, fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary },
  headerSubtitle: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
  form: { padding: 24 },
  inputGroup: { marginBottom: 20 },
  label: { color: Colors.textSecondary, fontSize: 13, fontFamily: Typography.fontFamily.medium, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, paddingVertical: 4 },
  inputIcon: { fontSize: 18, marginRight: 10 },
  input: { flex: 1, color: Colors.textPrimary, fontSize: 16, paddingVertical: 14, fontFamily: Typography.fontFamily.regular },
  eyeBtn: { padding: 8 },
  strengthBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  strengthChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  strengthText: { fontSize: 11, fontFamily: Typography.fontFamily.medium },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 24 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  termsText: { flex: 1, color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
  registerButton: { borderRadius: BorderRadius.md, paddingVertical: 18, alignItems: 'center', marginBottom: 20 },
  registerButtonText: { color: '#fff', fontSize: 17, fontFamily: Typography.fontFamily.semiBold },
  loginLink: { alignItems: 'center', paddingVertical: 8 },
  loginLinkText: { color: Colors.textSecondary, fontSize: 14 },
});
