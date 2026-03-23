import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Image,
  Dimensions, PanResponder, Alert
} from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/lib/i18n';
import { useConnection } from '@/lib/connection';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function RemoteScreenView() {
  const colors = useColors();
  const { t, language } = useI18n();
  const { status, sendMessage, ws } = useConnection();
  const [screenData, setScreenData] = useState<string | null>(null);
  const [showToolbar, setShowToolbar] = useState(true);
  const [quality, setQuality] = useState(50);
  const [isScrollMode, setIsScrollMode] = useState(false);
  const [isRightClick, setIsRightClick] = useState(false);
  const lastTap = useRef(0);
  const lastPos = useRef({ x: 0, y: 0 });
  const streamInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const isConnected = status === 'connected';

  // Set up screen stream listener
  React.useEffect(() => {
    if (!ws || !isConnected) return;
    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'screen_frame') {
          setScreenData(msg.data);
        }
      } catch {
        // Binary data
      }
    };
    ws.addEventListener('message', handler);
    // Start streaming
    sendMessage('start_screen_stream', { quality, fps: 10 });
    return () => {
      ws.removeEventListener('message', handler);
      sendMessage('stop_screen_stream');
    };
  }, [ws, isConnected]);

  const getRelativePos = (x: number, y: number) => {
    const relX = x / SCREEN_W;
    const relY = y / (SCREEN_H - 120);
    return { x: Math.max(0, Math.min(1, relX)), y: Math.max(0, Math.min(1, relY)) };
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      lastPos.current = { x: locationX, y: locationY };
      const now = Date.now();
      if (now - lastTap.current < 300) {
        // Double tap = double click
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const pos = getRelativePos(locationX, locationY);
        sendMessage('mouse_double_click', pos);
      }
      lastTap.current = now;
    },
    onPanResponderMove: (evt, gestureState) => {
      const { locationX, locationY } = evt.nativeEvent;
      if (isScrollMode) {
        const dy = gestureState.dy;
        sendMessage('mouse_scroll', { delta: dy > 0 ? -3 : 3 });
      } else {
        const pos = getRelativePos(locationX, locationY);
        sendMessage('mouse_move', pos);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      const { locationX, locationY } = evt.nativeEvent;
      const dist = Math.sqrt(gestureState.dx ** 2 + gestureState.dy ** 2);
      if (dist < 5) {
        // Tap = click
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const pos = getRelativePos(locationX, locationY);
        if (isRightClick) {
          sendMessage('mouse_right_click', pos);
        } else {
          sendMessage('mouse_click', pos);
        }
      }
    },
  });

  if (!isConnected) {
    return (
      <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
        <View style={[styles.notConnected, { backgroundColor: colors.background }]}>
          <IconSymbol name="wifi.slash" size={60} color={colors.muted} />
          <Text style={[styles.notConnectedText, { color: colors.foreground }]}>
            {language === 'ar' ? 'غير متصل' : 'Not Connected'}
          </Text>
          <Pressable
            style={[styles.backBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>{t('back')}</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      {/* Screen View */}
      <View style={styles.screenArea} {...panResponder.panHandlers}>
        {screenData ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${screenData}` }}
            style={styles.screenImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.waitingScreen}>
            <IconSymbol name="display" size={60} color="#444" />
            <Text style={{ color: '#666', marginTop: 12 }}>
              {language === 'ar' ? 'جارٍ تحميل الشاشة...' : 'Loading screen...'}
            </Text>
          </View>
        )}
      </View>

      {/* Toolbar Toggle */}
      <Pressable
        style={[styles.toolbarToggle, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
        onPress={() => setShowToolbar(!showToolbar)}
      >
        <IconSymbol name={showToolbar ? 'chevron.up' : 'chevron.down'} size={16} color="#fff" />
      </Pressable>

      {/* Toolbar */}
      {showToolbar && (
        <View style={[styles.toolbar, { backgroundColor: 'rgba(10,14,26,0.95)' }]}>
          <ToolBtn
            icon="arrow.left"
            label={language === 'ar' ? 'رجوع' : 'Back'}
            onPress={() => router.back()}
            color="#fff"
          />
          <ToolBtn
            icon="keyboard"
            label={language === 'ar' ? 'لوحة' : 'Keys'}
            onPress={() => router.push('/screens/keyboard-control' as any)}
            color="#10B981"
          />
          <ToolBtn
            icon="scroll"
            label={language === 'ar' ? 'تمرير' : 'Scroll'}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsScrollMode(!isScrollMode); }}
            color={isScrollMode ? '#00D4FF' : '#fff'}
            active={isScrollMode}
          />
          <ToolBtn
            icon="cursorarrow.click"
            label={language === 'ar' ? 'يمين' : 'R.Click'}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsRightClick(!isRightClick); }}
            color={isRightClick ? '#EF4444' : '#fff'}
            active={isRightClick}
          />
          <ToolBtn
            icon="paintbrush"
            label={language === 'ar' ? 'رسم' : 'Draw'}
            onPress={() => router.push('/screens/drawing-board' as any)}
            color="#F59E0B"
          />
          <ToolBtn
            icon="arrow.clockwise"
            label={language === 'ar' ? 'تحديث' : 'Refresh'}
            onPress={() => sendMessage('start_screen_stream', { quality, fps: 10 })}
            color="#7C3AED"
          />
        </View>
      )}
    </View>
  );
}

function ToolBtn({ icon, label, onPress, color, active }: any) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.toolBtn,
        active && { backgroundColor: color + '30' },
        pressed && { opacity: 0.7 }
      ]}
      onPress={onPress}
    >
      <IconSymbol name={icon} size={20} color={color} />
      <Text style={[styles.toolBtnLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screenArea: { flex: 1 },
  screenImage: { width: '100%', height: '100%' },
  waitingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toolbarToggle: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 10,
    paddingBottom: 24,
    borderTopWidth: 0.5,
    borderTopColor: '#1E3A5F',
  },
  toolBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    gap: 3,
  },
  toolBtnLabel: { fontSize: 9, fontWeight: '600' },
  notConnected: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  notConnectedText: { fontSize: 18, fontWeight: '600' },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
});
