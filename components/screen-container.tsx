/**
 * ScreenContainer – base wrapper for all screens.
 * Handles safe area, background color, and optional scroll.
 */
import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/use-colors';

interface ScreenContainerProps {
  children: ReactNode;
  /** Optional extra style for the outer safe area */
  style?: ViewStyle;
  /** For NativeWind className compat – ignored at runtime */
  containerClassName?: string;
  /** Skip SafeAreaView (e.g. for full-screen modals) */
  noSafeArea?: boolean;
}

export function ScreenContainer({
  children,
  style,
  noSafeArea = false,
}: ScreenContainerProps) {
  const colors = useColors();
  const bgStyle = { backgroundColor: colors.background };

  if (noSafeArea) {
    return (
      <View style={[styles.flex, bgStyle, style]}>
        {children}
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, bgStyle, style]} edges={['top', 'left', 'right']}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
