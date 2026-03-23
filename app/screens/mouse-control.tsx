import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, PanResponder, Dimensions
} from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/lib/i18n';
import { useConnection } from '@/lib/connection';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_W } = Dimensions.get('window');

export default function MouseControlScreen() {
  const colors = useColors();
  const { t, language } = useI18n();
  const { sendMessage, status } = useConnection();
  const [sensitivity, setSensitivity] = useState(2);
  const [isScrollMode, setIsScrollMode] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const isConnected = status === 'connected';

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      lastPos.current = { x: evt.nativeEvent.locationX, y: evt.nativeEvent.locationY };
    },
    onPanResponderMove: (evt, gestureState) => {
      if (!isConnected) return;
      if (isScrollMode) {
        const dy = gestureState.vy;
        sendMessage('mouse_scroll', { delta: dy > 0 ? -3 : 3 });
      } else {
        const dx = gestureState.vx * sensitivity * 5;
        const dy = gestureState.vy * sensitivity * 5;
        sendMessage('mouse_move_relative', { dx: Math.round(dx), dy: Math.round(dy) });
      }
    },
  });

  const handleClick = (type: 'left' | 'right' | 'middle') => {
    if (!isConnected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    sendMessage(`mouse_${type}_click`);
  };

  const handleScroll = (dir: 'up' | 'down') => {
    if (!isConnected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage('mouse_scroll', { delta: dir === 'up' ? 3 : -3 });
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {language === 'ar' ? 'الماوس' : 'Mouse Control'}
        </Text>
        <View style={[styles.modeBadge, { backgroundColor: isScrollMode ? '#00D4FF20' : '#7C3AED20' }]}>
          <Text style={[styles.modeText, { color: isScrollMode ? '#00D4FF' : '#7C3AED' }]}>
            {isScrollMode ? (language === 'ar' ? 'تمرير' : 'Scroll') : (language === 'ar' ? 'تحريك' : 'Move')}
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        {/* Trackpad */}
        <View
          style={[styles.trackpad, { backgroundColor: colors.surface, borderColor: isScrollMode ? '#00D4FF' : colors.border }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.trackpadCenter}>
            <IconSymbol name={isScrollMode ? 'arrow.up.arrow.down' : 'cursorarrow'} size={32} color={colors.muted} />
            <Text style={[styles.trackpadHint, { color: colors.muted }]}>
              {isScrollMode
                ? (language === 'ar' ? 'اسحب للتمرير' : 'Drag to scroll')
                : (language === 'ar' ? 'اسحب لتحريك المؤشر' : 'Drag to move cursor')}
            </Text>
          </View>
        </View>

        {/* Mode Toggle */}
        <Pressable
          style={({ pressed }) => [
            styles.modeToggle,
            { backgroundColor: isScrollMode ? '#00D4FF20' : colors.surface, borderColor: isScrollMode ? '#00D4FF' : colors.border },
            pressed && { opacity: 0.8 }
          ]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsScrollMode(!isScrollMode); }}
        >
          <IconSymbol name="arrow.up.arrow.down" size={18} color={isScrollMode ? '#00D4FF' : colors.muted} />
          <Text style={[styles.modeToggleText, { color: isScrollMode ? '#00D4FF' : colors.muted }]}>
            {language === 'ar' ? 'وضع التمرير' : 'Scroll Mode'}
          </Text>
          <View style={[styles.toggleIndicator, { backgroundColor: isScrollMode ? '#00D4FF' : colors.border }]}>
            <View style={[styles.toggleKnob, { backgroundColor: '#fff', transform: [{ translateX: isScrollMode ? 16 : 0 }] }]} />
          </View>
        </Pressable>

        {/* Click Buttons */}
        <View style={styles.clickRow}>
          <Pressable
            style={({ pressed }) => [styles.clickBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { transform: [{ scale: 0.95 }] }]}
            onPress={() => handleClick('left')}
          >
            <IconSymbol name="cursorarrow.click" size={24} color="#00D4FF" />
            <Text style={[styles.clickLabel, { color: colors.foreground }]}>
              {language === 'ar' ? 'يسار' : 'Left'}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.clickBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { transform: [{ scale: 0.95 }] }]}
            onPress={() => handleClick('middle')}
          >
            <IconSymbol name="hand.point.up" size={24} color="#F59E0B" />
            <Text style={[styles.clickLabel, { color: colors.foreground }]}>
              {language === 'ar' ? 'وسط' : 'Middle'}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.clickBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { transform: [{ scale: 0.95 }] }]}
            onPress={() => handleClick('right')}
          >
            <IconSymbol name="cursorarrow.click" size={24} color="#7C3AED" />
            <Text style={[styles.clickLabel, { color: colors.foreground }]}>
              {language === 'ar' ? 'يمين' : 'Right'}
            </Text>
          </Pressable>
        </View>

        {/* Scroll Buttons */}
        <View style={styles.scrollRow}>
          <Pressable
            style={({ pressed }) => [styles.scrollBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.8 }]}
            onPress={() => handleScroll('up')}
          >
            <IconSymbol name="arrow.up" size={20} color={colors.primary} />
            <Text style={[styles.scrollLabel, { color: colors.muted }]}>
              {language === 'ar' ? 'أعلى' : 'Up'}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.scrollBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.8 }]}
            onPress={() => handleScroll('down')}
          >
            <IconSymbol name="arrow.down" size={20} color={colors.primary} />
            <Text style={[styles.scrollLabel, { color: colors.muted }]}>
              {language === 'ar' ? 'أسفل' : 'Down'}
            </Text>
          </Pressable>
        </View>

        {/* Sensitivity */}
        <View style={[styles.sensitivityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sensitivityLabel, { color: colors.muted }]}>
            {language === 'ar' ? 'الحساسية' : 'Sensitivity'}: {sensitivity}x
          </Text>
          <View style={styles.sensitivityBtns}>
            {[1, 2, 3, 4, 5].map((val) => (
              <Pressable
                key={val}
                style={({ pressed }) => [
                  styles.senBtn,
                  { backgroundColor: sensitivity === val ? colors.primary : colors.background, borderColor: colors.border },
                  pressed && { opacity: 0.8 }
                ]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSensitivity(val); }}
              >
                <Text style={[styles.senBtnText, { color: sensitivity === val ? '#fff' : colors.muted }]}>{val}</Text>
              </Pressable>
            ))}
          </View>
        </View>
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
  modeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  modeText: { fontSize: 12, fontWeight: '600' },
  trackpad: {
    height: 220,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackpadCenter: { alignItems: 'center', gap: 8 },
  trackpadHint: { fontSize: 13 },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    gap: 10,
  },
  modeToggleText: { flex: 1, fontSize: 14, fontWeight: '500' },
  toggleIndicator: { width: 40, height: 24, borderRadius: 12, justifyContent: 'center', paddingHorizontal: 2 },
  toggleKnob: { width: 20, height: 20, borderRadius: 10 },
  clickRow: { flexDirection: 'row', gap: 10 },
  clickBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  clickLabel: { fontSize: 12, fontWeight: '600' },
  scrollRow: { flexDirection: 'row', gap: 10 },
  scrollBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  scrollLabel: { fontSize: 13, fontWeight: '500' },
  sensitivityCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 10 },
  sensitivityLabel: { fontSize: 13, fontWeight: '500' },
  sensitivityBtns: { flexDirection: 'row', gap: 8 },
  senBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  senBtnText: { fontSize: 13, fontWeight: '600' },
});
