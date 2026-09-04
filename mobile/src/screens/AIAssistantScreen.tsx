/**
 * Module 6: AI Security Assistant (Gemini API)
 * Conversational security assistant inside the OTH app
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, StatusBar, ActivityIndicator,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Typography, BorderRadius } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import { OTHApiClient } from '../api/client';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  type?: 'analysis' | 'recommendation' | 'alert' | 'normal';
}

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

const SECURITY_CONTEXT = `You are OTH AI — a security assistant embedded inside the One Time Handshake (OTH) authentication platform.

OTH is an Android-first, offline-capable authentication system that replaces SMS OTP with cryptographic handshakes.

Security features:
- AES-256-CBC encryption for all tokens
- HMAC-SHA256 signatures for payload integrity
- Nonce-based replay attack prevention (30-second window)
- Device fingerprint binding (Android ID + model + installation ID)
- Offline authentication with encrypted SQLite storage
- QR-based authentication with single-use tokens
- Emergency recovery tokens for lockout scenarios
- Risk scoring (0-100) for every authentication attempt
- Biometric authentication (Fingerprint + Face ID)

Your job:
1. Explain why authentications failed in plain English
2. Identify security threats and explain their severity
3. Analyze device risk scores and recommend actions
4. Answer questions about OTH security architecture
5. Provide actionable security recommendations

Always be helpful, concise, and avoid overly technical jargon. Never claim OTH is "100% secure" — instead explain what specific threats it mitigates.`;

async function askGemini(messages: Message[], question: string): Promise<string> {
  const history = messages.slice(-8).map((m) => ({
    role: m.role === 'ai' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SECURITY_CONTEXT }] },
      contents: [
        ...history,
        { role: 'user', parts: [{ text: question }] },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 512,
      },
    }),
  });

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not process that request. Please try again.';
}

const QUICK_PROMPTS = [
  '🔍 Why did my login fail?',
  '📊 Analyze my security score',
  '⚠️ Explain replay attack protection',
  '📡 How does offline auth work?',
  '🆘 What is emergency QR?',
  '🛡️ Is my device secure?',
];

export default function AIAssistantScreen() {
  const router = useRouter();
  const { riskScore, lastAuthMethod, user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'ai',
      content: `Hi! I'm **OTH AI**, your security assistant. 🛡️\n\nYour current risk score is **${riskScore}/100**${riskScore < 30 ? ' — excellent!' : riskScore < 60 ? ' — some recommendations available.' : ' — action required!'}\n\nHow can I help you today?`,
      timestamp: new Date(),
      type: 'normal',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Enrich context with user data
      const enrichedQuestion = `${messageText}\n\n[Context: User risk score=${riskScore}, last auth method=${lastAuthMethod || 'none'}, phone=${user?.phone?.slice(-4)}]`;

      const aiResponse = await askGemini(messages, enrichedQuestion);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: aiResponse,
        timestamp: new Date(),
        type: aiResponse.toLowerCase().includes('alert') || aiResponse.toLowerCase().includes('threat')
          ? 'alert'
          : aiResponse.toLowerCase().includes('recommend')
          ? 'recommendation'
          : 'normal',
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: '⚠️ Unable to connect to Gemini API. Check your API key and internet connection.',
        timestamp: new Date(),
        type: 'alert',
      }]);
    }

    setIsTyping(false);
  };

  const getMessageStyle = (msg: Message) => {
    if (msg.role === 'user') return styles.userBubble;
    if (msg.type === 'alert') return [styles.aiBubble, { borderColor: Colors.error + '40' }];
    if (msg.type === 'recommendation') return [styles.aiBubble, { borderColor: Colors.success + '40' }];
    return styles.aiBubble;
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <LinearGradient colors={['#2D1F3D', '#0F172A']} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
            <View style={styles.aiAvatar}>
              <Text style={styles.aiAvatarIcon}>🤖</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>OTH AI Assistant</Text>
              <View style={styles.onlineDot}>
                <View style={styles.dot} />
                <Text style={styles.onlineText}>Powered by Gemini 2.0 Flash</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <View key={msg.id} style={[styles.messageBubble, msg.role === 'user' ? styles.userAlign : styles.aiAlign]}>
              {msg.role === 'ai' && (
                <View style={styles.aiIconSmall}>
                  <Text style={styles.aiIconText}>🤖</Text>
                </View>
              )}
              <View style={getMessageStyle(msg) as object}>
                <Text style={msg.role === 'user' ? styles.userText : styles.aiText}>
                  {msg.content}
                </Text>
                <Text style={styles.timestamp}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          ))}

          {isTyping && (
            <View style={[styles.messageBubble, styles.aiAlign]}>
              <View style={styles.aiIconSmall}><Text style={styles.aiIconText}>🤖</Text></View>
              <View style={styles.aiBubble}>
                <View style={styles.typingIndicator}>
                  <View style={[styles.typingDot, { animationDelay: '0ms' }]} />
                  <View style={[styles.typingDot, { animationDelay: '200ms' }]} />
                  <View style={[styles.typingDot, { animationDelay: '400ms' }]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick Prompts */}
        {messages.length <= 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickPrompts} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {QUICK_PROMPTS.map((prompt) => (
              <TouchableOpacity
                key={prompt}
                style={styles.quickPrompt}
                onPress={() => sendMessage(prompt)}
              >
                <Text style={styles.quickPromptText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your security..."
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={500}
            onSubmitEditing={() => sendMessage()}
          />
          <TouchableOpacity
            onPress={() => sendMessage()}
            disabled={!input.trim() || isTyping}
            style={[styles.sendBtn, (!input.trim() || isTyping) && { opacity: 0.4 }]}
          >
            <LinearGradient colors={['#7C3AED', '#6D28D9']} style={styles.sendGradient}>
              <Text style={styles.sendIcon}>➤</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20 },
  backBtn: { marginBottom: 12 },
  backText: { color: '#A78BFA', fontSize: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  aiAvatar: { width: 48, height: 48, backgroundColor: '#7C3AED30', borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#7C3AED40' },
  aiAvatarIcon: { fontSize: 24 },
  headerTitle: { color: Colors.textPrimary, fontSize: 18, fontFamily: Typography.fontFamily.bold },
  onlineDot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  onlineText: { color: Colors.textMuted, fontSize: 11 },
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 12 },
  messageBubble: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  userAlign: { justifyContent: 'flex-end' },
  aiAlign: { justifyContent: 'flex-start' },
  aiIconSmall: { width: 28, height: 28, backgroundColor: '#7C3AED20', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  aiIconText: { fontSize: 14 },
  userBubble: { backgroundColor: Colors.primary, borderRadius: 18, borderBottomRightRadius: 4, padding: 12, maxWidth: '80%' },
  aiBubble: { backgroundColor: Colors.surface, borderRadius: 18, borderBottomLeftRadius: 4, padding: 12, maxWidth: '80%', borderWidth: 1, borderColor: Colors.glassBorder },
  userText: { color: '#fff', fontSize: 15, lineHeight: 22 },
  aiText: { color: Colors.textPrimary, fontSize: 15, lineHeight: 22 },
  timestamp: { color: Colors.textMuted + '80', fontSize: 10, marginTop: 4, textAlign: 'right' },
  typingIndicator: { flexDirection: 'row', gap: 4, paddingVertical: 4 },
  typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.textMuted },
  quickPrompts: { maxHeight: 50, marginBottom: 8 },
  quickPrompt: { backgroundColor: Colors.surface, borderRadius: BorderRadius.full, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#7C3AED40' },
  quickPromptText: { color: '#A78BFA', fontSize: 13 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  input: { flex: 1, backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, color: Colors.textPrimary, fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  sendGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sendIcon: { color: '#fff', fontSize: 18 },
});
