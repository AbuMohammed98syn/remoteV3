import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, PanResponder, Dimensions
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/lib/i18n';
import { useConnection } from '@/lib/connection';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CANVAS_H = SCREEN_H - 200;

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#7C3AED', '#EC4899', '#00D4FF', '#FFFFFF', '#000000'];
const THICKNESSES = [2, 4, 6, 10, 16];

interface DrawPath {
  d: string;
  color: string;
  thickness: number;
}

export default function DrawingBoardScreen() {
  const colors = useColors();
  const { language } = useI18n();
  const { sendMessage, status } = useConnection();
  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [selectedColor, setSelectedColor] = useState('#00D4FF');
  const [selectedThickness, setSelectedThickness] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const isConnected = status === 'connected';

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentPath(`M${locationX},${locationY}`);
    },
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      setCurrentPath(prev => `${prev} L${locationX},${locationY}`);
    },
    onPanResponderRelease: () => {
      if (currentPath) {
        setPaths(prev => [...prev, {
          d: currentPath,
          color: isEraser ? '#0A0E1A' : selectedColor,
          thickness: isEraser ? selectedThickness * 3 : selectedThickness,
        }]);
        setCurrentPath('');
      }
    },
  });

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPaths([]);
  };

  const handleUndo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPaths(prev => prev.slice(0, -1));
  };

  const handleSend = () => {
    if (!isConnected) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Send drawing data as SVG paths
    const drawingData = paths.map(p => ({
      d: p.d,
      color: p.color,
      thickness: p.thickness,
      canvasWidth: SCREEN_W,
      canvasHeight: CANVAS_H,
    }));
    sendMessage('draw_on_screen', { paths: drawingData });
  };

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {language === 'ar' ? 'لوحة الرسم' : 'Drawing Board'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            style={({ pressed }) => [styles.headerBtn, { backgroundColor: colors.background }, pressed && { opacity: 0.7 }]}
            onPress={handleUndo}
          >
            <IconSymbol name="arrow.counterclockwise" size={18} color={colors.muted} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.headerBtn, { backgroundColor: colors.error + '20' }, pressed && { opacity: 0.7 }]}
            onPress={handleClear}
          >
            <IconSymbol name="trash" size={18} color={colors.error} />
          </Pressable>
        </View>
      </View>

      {/* Canvas */}
      <View style={[styles.canvas, { backgroundColor: '#0A0E1A' }]} {...panResponder.panHandlers}>
        <Svg width={SCREEN_W} height={CANVAS_H}>
          {paths.map((path, idx) => (
            <Path
              key={idx}
              d={path.d}
              stroke={path.color}
              strokeWidth={path.thickness}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentPath && (
            <Path
              d={currentPath}
              stroke={isEraser ? '#0A0E1A' : selectedColor}
              strokeWidth={isEraser ? selectedThickness * 3 : selectedThickness}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </Svg>
        {paths.length === 0 && !currentPath && (
          <View style={styles.canvasHint}>
            <IconSymbol name="pencil" size={32} color="#333" />
            <Text style={{ color: '#444', marginTop: 8, fontSize: 13 }}>
              {language === 'ar' ? 'ارسم هنا...' : 'Draw here...'}
            </Text>
          </View>
        )}
      </View>

      {/* Toolbar */}
      <View style={[styles.toolbar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {/* Colors */}
        <View style={styles.colorRow}>
          {COLORS.map((c) => (
            <Pressable
              key={c}
              style={[
                styles.colorDot,
                { backgroundColor: c, borderColor: selectedColor === c && !isEraser ? '#fff' : 'transparent' }
              ]}
              onPress={() => { setIsEraser(false); setSelectedColor(c); }}
            />
          ))}
          <Pressable
            style={[styles.eraserBtn, { backgroundColor: isEraser ? '#fff' : colors.background, borderColor: colors.border }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsEraser(!isEraser); }}
          >
            <IconSymbol name="eraser" size={16} color={isEraser ? '#000' : colors.muted} />
          </Pressable>
        </View>

        {/* Thickness */}
        <View style={styles.thicknessRow}>
          {THICKNESSES.map((t) => (
            <Pressable
              key={t}
              style={[styles.thicknessBtn, { backgroundColor: colors.background, borderColor: selectedThickness === t ? colors.primary : colors.border }]}
              onPress={() => setSelectedThickness(t)}
            >
              <View style={[styles.thicknessLine, { height: t, backgroundColor: selectedColor }]} />
            </Pressable>
          ))}
          <Pressable
            style={({ pressed }) => [styles.sendBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.85 }]}
            onPress={handleSend}
          >
            <IconSymbol name="paperplane.fill" size={16} color="#fff" />
            <Text style={styles.sendBtnText}>{language === 'ar' ? 'إرسال' : 'Send'}</Text>
          </Pressable>
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
  headerBtn: { padding: 8, borderRadius: 10 },
  canvas: {
    flex: 1,
    position: 'relative',
  },
  canvasHint: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toolbar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    gap: 10,
  },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
  eraserBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  thicknessRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thicknessBtn: { flex: 1, height: 36, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  thicknessLine: { width: '60%', borderRadius: 2 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, gap: 4 },
  sendBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
});
