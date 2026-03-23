import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/lib/i18n';
import { useConnection } from '@/lib/connection';
import * as Haptics from 'expo-haptics';

type CallState = 'idle' | 'calling' | 'connected';

export default function VideoCallScreen() {
  const colors = useColors();
  const { language } = useI18n();
  const { sendMessage, status, ws } = useConnection();
  const [callState, setCallState] = useState<CallState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteFrame, setRemoteFrame] = useState<string | null>(null);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isConnected = status === 'connected';

  useEffect(() => {
    if (!ws) return;
    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'video_frame') {
          setRemoteFrame(msg.data);
        } else if (msg.type === 'call_accepted') {
          setCallState('connected');
          startTimer();
        } else if (msg.type === 'call_ended') {
          endCall();
        }
      } catch {}
    };
    ws.addEventListener('message', handler);
    return () => ws.removeEventListener('message', handler);
  }, [ws]);

  const startTimer = () => {
    setCallDuration(0);
    durationRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startCall = () => {
    if (!isConnected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCallState('calling');
    sendMessage('start_video_call');
    setTimeout(() => {
      setCallState('connected');
      startTimer();
    }, 2000);
  };

  const endCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (durationRef.current) clearInterval(durationRef.current);
    setCallState('idle');
    setCallDuration(0);
    setRemoteFrame(null);
    sendMessage('end_call');
  };

  if (callState === 'calling' || callState === 'connected') {
    return (
      <View style={[styles.callScreen, { backgroundColor: '#000' }]}>
        {/* Remote Video */}
        <View style={styles.remoteVideo}>
          {remoteFrame ? (
            <Image source={{ uri: `data:image/jpeg;base64,${remoteFrame}` }} style={styles.remoteImage} resizeMode="cover" />
          ) : (
            <View style={[styles.noVideo, { backgroundColor: '#111' }]}>
              <IconSymbol name="video.slash" size={50} color="#444" />
              <Text style={{ color: '#666', marginTop: 10 }}>
                {callState === 'calling'
                  ? (language === 'ar' ? 'جارٍ الاتصال...' : 'Connecting...')
                  : (language === 'ar' ? 'لا توجد صورة' : 'No video')}
              </Text>
            </View>
          )}
        </View>

        {/* Duration */}
        {callState === 'connected' && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable
            style={({ pressed }) => [styles.ctrlBtn, { backgroundColor: isMuted ? '#EF444440' : 'rgba(255,255,255,0.15)' }, pressed && { opacity: 0.8 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsMuted(!isMuted); sendMessage('call_mute', { muted: !isMuted }); }}
          >
            <IconSymbol name={isMuted ? 'mic.slash.fill' : 'mic.fill'} size={24} color={isMuted ? '#EF4444' : '#fff'} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.endBtn, { backgroundColor: '#EF4444' }, pressed && { opacity: 0.85 }]}
            onPress={endCall}
          >
            <IconSymbol name="phone.down.fill" size={28} color="#fff" />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.ctrlBtn, { backgroundColor: isCameraOff ? '#EF444440' : 'rgba(255,255,255,0.15)' }, pressed && { opacity: 0.8 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsCameraOff(!isCameraOff); sendMessage('call_camera', { off: !isCameraOff }); }}
          >
            <IconSymbol name={isCameraOff ? 'video.slash.fill' : 'video.fill'} size={24} color={isCameraOff ? '#EF4444' : '#fff'} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {language === 'ar' ? 'مكالمة مرئية' : 'Video Call'}
        </Text>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24 }}>
        <View style={[styles.videoPreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="video.fill" size={60} color={colors.primary} />
          <Text style={[styles.previewText, { color: colors.muted }]}>
            {language === 'ar' ? 'معاينة الكاميرا' : 'Camera Preview'}
          </Text>
        </View>

        <Text style={[styles.infoText, { color: colors.muted }]}>
          {language === 'ar' ? 'ستتصل بكاميرا الحاسوب عبر الشبكة المحلية' : 'Connect to PC camera over local network'}
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.startCallBtn,
            { backgroundColor: '#7C3AED' },
            pressed && { opacity: 0.85 },
            !isConnected && { opacity: 0.5 }
          ]}
          onPress={startCall}
          disabled={!isConnected}
        >
          <IconSymbol name="video.fill" size={22} color="#fff" />
          <Text style={styles.startCallText}>
            {language === 'ar' ? 'بدء المكالمة المرئية' : 'Start Video Call'}
          </Text>
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
  callScreen: { flex: 1 },
  remoteVideo: { flex: 1 },
  remoteImage: { width: '100%', height: '100%' },
  noVideo: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  durationBadge: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  durationText: { color: '#fff', fontSize: 16, fontWeight: '300', letterSpacing: 2 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  ctrlBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  endBtn: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  videoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  previewText: { fontSize: 14 },
  infoText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  startCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  startCallText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
