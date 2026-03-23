import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Alert, Platform
} from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/lib/i18n';
import { useConnection } from '@/lib/connection';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';

type CallState = 'idle' | 'calling' | 'connected' | 'mic_stream';
type CallMode = 'voice' | 'mic_stream';

export default function VoiceCallScreen() {
  const colors = useColors();
  const { t, language } = useI18n();
  const { sendMessage, status, ws } = useConnection();
  const [callState, setCallState] = useState<CallState>('idle');
  const [callMode, setCallMode] = useState<CallMode>('voice');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isConnected = status === 'connected';

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!ws) return;
    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'call_accepted') {
          setCallState('connected');
          startDurationTimer();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (msg.type === 'call_ended') {
          endCall();
        }
      } catch {}
    };
    ws.addEventListener('message', handler);
    return () => ws.removeEventListener('message', handler);
  }, [ws]);

  const startDurationTimer = () => {
    setCallDuration(0);
    durationRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startCall = (mode: CallMode) => {
    if (!isConnected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCallMode(mode);
    setCallState('calling');
    sendMessage('start_call', { mode });
    // Auto-connect after 2s (simulated)
    setTimeout(() => {
      setCallState('connected');
      startDurationTimer();
    }, 2000);
  };

  const endCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (durationRef.current) clearInterval(durationRef.current);
    setCallState('idle');
    setCallDuration(0);
    sendMessage('end_call');
  };

  const toggleMute = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsMuted(!isMuted);
    sendMessage('call_mute', { muted: !isMuted });
  };

  const toggleSpeaker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSpeakerOn(!isSpeakerOn);
  };

  const startMicStream = () => {
    if (!isConnected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCallMode('mic_stream');
    setCallState('mic_stream');
    sendMessage('start_mic_stream');
  };

  const stopMicStream = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCallState('idle');
    sendMessage('stop_mic_stream');
  };

  if (callState === 'calling') {
    return (
      <View style={[styles.callScreen, { backgroundColor: '#0A0E1A' }]}>
        <View style={styles.callingContainer}>
          <View style={[styles.avatarRing, { borderColor: colors.primary + '40' }]}>
            <View style={[styles.avatarRing2, { borderColor: colors.primary + '70' }]}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + '30' }]}>
                <IconSymbol name="desktopcomputer" size={50} color={colors.primary} />
              </View>
            </View>
          </View>
          <Text style={styles.callingTitle}>
            {language === 'ar' ? 'جارٍ الاتصال...' : 'Calling...'}
          </Text>
          <Text style={styles.callingSubtitle}>
            {language === 'ar' ? 'حاسوبك' : 'Your PC'}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.endCallBtn, { backgroundColor: '#EF4444' }, pressed && { opacity: 0.85 }]}
            onPress={endCall}
          >
            <IconSymbol name="phone.down.fill" size={28} color="#fff" />
          </Pressable>
        </View>
      </View>
    );
  }

  if (callState === 'connected') {
    return (
      <View style={[styles.callScreen, { backgroundColor: '#0A0E1A' }]}>
        <View style={styles.connectedContainer}>
          <View style={[styles.avatar, { backgroundColor: colors.success + '20', width: 100, height: 100, borderRadius: 50 }]}>
            <IconSymbol name="desktopcomputer" size={50} color={colors.success} />
          </View>
          <Text style={styles.connectedTitle}>
            {language === 'ar' ? 'متصل' : 'Connected'}
          </Text>
          <Text style={[styles.durationText, { color: colors.primary }]}>{formatDuration(callDuration)}</Text>

          {/* Call Controls */}
          <View style={styles.callControls}>
            <Pressable
              style={({ pressed }) => [styles.callCtrlBtn, { backgroundColor: isMuted ? '#EF444430' : '#1E3A5F' }, pressed && { opacity: 0.8 }]}
              onPress={toggleMute}
            >
              <IconSymbol name={isMuted ? 'mic.slash.fill' : 'mic.fill'} size={24} color={isMuted ? '#EF4444' : '#fff'} />
              <Text style={[styles.ctrlLabel, { color: isMuted ? '#EF4444' : '#94A3B8' }]}>
                {isMuted ? (language === 'ar' ? 'كتم' : 'Muted') : (language === 'ar' ? 'ميكروفون' : 'Mic')}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.endCallBtn, { backgroundColor: '#EF4444' }, pressed && { opacity: 0.85 }]}
              onPress={endCall}
            >
              <IconSymbol name="phone.down.fill" size={28} color="#fff" />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.callCtrlBtn, { backgroundColor: isSpeakerOn ? '#00D4FF30' : '#1E3A5F' }, pressed && { opacity: 0.8 }]}
              onPress={toggleSpeaker}
            >
              <IconSymbol name={isSpeakerOn ? 'speaker.wave.3.fill' : 'speaker.fill'} size={24} color={isSpeakerOn ? '#00D4FF' : '#fff'} />
              <Text style={[styles.ctrlLabel, { color: isSpeakerOn ? '#00D4FF' : '#94A3B8' }]}>
                {language === 'ar' ? 'مكبر' : 'Speaker'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (callState === 'mic_stream') {
    return (
      <View style={[styles.callScreen, { backgroundColor: '#0A0E1A' }]}>
        <View style={styles.micStreamContainer}>
          <View style={[styles.micPulse, { borderColor: '#00D4FF40' }]}>
            <View style={[styles.micPulse2, { borderColor: '#00D4FF70' }]}>
              <View style={[styles.micCenter, { backgroundColor: '#00D4FF20' }]}>
                <IconSymbol name="mic.fill" size={50} color="#00D4FF" />
              </View>
            </View>
          </View>
          <Text style={styles.micStreamTitle}>
            {language === 'ar' ? 'جارٍ بث الميكروفون' : 'Microphone Streaming'}
          </Text>
          <Text style={styles.micStreamSubtitle}>
            {language === 'ar' ? 'صوتك يُبث إلى الحاسوب' : 'Your voice is streaming to PC'}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.stopBtn, { backgroundColor: '#EF4444' }, pressed && { opacity: 0.85 }]}
            onPress={stopMicStream}
          >
            <IconSymbol name="stop.fill" size={24} color="#fff" />
            <Text style={styles.stopBtnText}>{language === 'ar' ? 'إيقاف البث' : 'Stop Stream'}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Idle state
  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {language === 'ar' ? 'الاتصال الصوتي والمرئي' : 'Voice & Video Call'}
        </Text>
      </View>

      <View style={{ flex: 1, padding: 20, gap: 16 }}>
        {/* PC Avatar */}
        <View style={styles.pcCard}>
          <View style={[styles.pcAvatar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="desktopcomputer" size={60} color={colors.primary} />
          </View>
          <Text style={[styles.pcName, { color: colors.foreground }]}>
            {language === 'ar' ? 'حاسوبك' : 'Your PC'}
          </Text>
          <View style={[styles.pcStatus, { backgroundColor: isConnected ? colors.success + '20' : colors.error + '20' }]}>
            <View style={[styles.pcDot, { backgroundColor: isConnected ? colors.success : colors.error }]} />
            <Text style={[styles.pcStatusText, { color: isConnected ? colors.success : colors.error }]}>
              {isConnected ? (language === 'ar' ? 'متصل' : 'Online') : (language === 'ar' ? 'غير متصل' : 'Offline')}
            </Text>
          </View>
        </View>

        {/* Call Options */}
        <Pressable
          style={({ pressed }) => [
            styles.callOptionCard,
            { backgroundColor: colors.surface, borderColor: '#16A34A40' },
            pressed && { transform: [{ scale: 0.98 }] },
            !isConnected && { opacity: 0.5 }
          ]}
          onPress={() => startCall('voice')}
          disabled={!isConnected}
        >
          <View style={[styles.callOptionIcon, { backgroundColor: '#16A34A20' }]}>
            <IconSymbol name="phone.fill" size={28} color="#16A34A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.callOptionTitle, { color: colors.foreground }]}>
              {language === 'ar' ? 'مكالمة صوتية' : 'Voice Call'}
            </Text>
            <Text style={[styles.callOptionDesc, { color: colors.muted }]}>
              {language === 'ar' ? 'مكالمة صوتية مباشرة مع الحاسوب' : 'Direct voice call with PC'}
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={18} color={colors.muted} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.callOptionCard,
            { backgroundColor: colors.surface, borderColor: '#7C3AED40' },
            pressed && { transform: [{ scale: 0.98 }] },
            !isConnected && { opacity: 0.5 }
          ]}
          onPress={() => router.push('/screens/video-call' as any)}
          disabled={!isConnected}
        >
          <View style={[styles.callOptionIcon, { backgroundColor: '#7C3AED20' }]}>
            <IconSymbol name="video.fill" size={28} color="#7C3AED" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.callOptionTitle, { color: colors.foreground }]}>
              {language === 'ar' ? 'مكالمة مرئية' : 'Video Call'}
            </Text>
            <Text style={[styles.callOptionDesc, { color: colors.muted }]}>
              {language === 'ar' ? 'مكالمة مرئية مع كاميرا الحاسوب' : 'Video call with PC camera'}
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={18} color={colors.muted} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.callOptionCard,
            { backgroundColor: colors.surface, borderColor: '#0891B240' },
            pressed && { transform: [{ scale: 0.98 }] },
            !isConnected && { opacity: 0.5 }
          ]}
          onPress={startMicStream}
          disabled={!isConnected}
        >
          <View style={[styles.callOptionIcon, { backgroundColor: '#0891B220' }]}>
            <IconSymbol name="mic.fill" size={28} color="#0891B2" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.callOptionTitle, { color: colors.foreground }]}>
              {language === 'ar' ? 'بث الميكروفون' : 'Mic Stream'}
            </Text>
            <Text style={[styles.callOptionDesc, { color: colors.muted }]}>
              {language === 'ar' ? 'بث صوت الميكروفون إلى الحاسوب' : 'Stream microphone audio to PC'}
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={18} color={colors.muted} />
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700' },
  callScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  callingContainer: { alignItems: 'center', gap: 20 },
  avatarRing: { width: 160, height: 160, borderRadius: 80, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarRing2: { width: 130, height: 130, borderRadius: 65, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  callingTitle: { color: '#E2E8F0', fontSize: 22, fontWeight: '600' },
  callingSubtitle: { color: '#94A3B8', fontSize: 15 },
  connectedContainer: { alignItems: 'center', gap: 16 },
  connectedTitle: { color: '#E2E8F0', fontSize: 22, fontWeight: '600' },
  durationText: { fontSize: 32, fontWeight: '300', letterSpacing: 2 },
  callControls: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 20 },
  callCtrlBtn: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', gap: 4 },
  ctrlLabel: { fontSize: 10 },
  endCallBtn: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  micStreamContainer: { alignItems: 'center', gap: 20 },
  micPulse: { width: 160, height: 160, borderRadius: 80, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  micPulse2: { width: 130, height: 130, borderRadius: 65, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  micCenter: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  micStreamTitle: { color: '#E2E8F0', fontSize: 20, fontWeight: '600' },
  micStreamSubtitle: { color: '#94A3B8', fontSize: 14, textAlign: 'center' },
  stopBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  stopBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  pcCard: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  pcAvatar: { width: 100, height: 100, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  pcName: { fontSize: 20, fontWeight: '700' },
  pcStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  pcDot: { width: 6, height: 6, borderRadius: 3 },
  pcStatusText: { fontSize: 12, fontWeight: '600' },
  callOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  callOptionIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  callOptionTitle: { fontSize: 15, fontWeight: '600' },
  callOptionDesc: { fontSize: 12, marginTop: 2 },
});
