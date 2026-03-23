import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, Vibration, Alert,
  Animated
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/lib/i18n';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenContainer } from '@/components/screen-container';

const PIN_STORAGE_KEY = 'app_pin';
const PIN_ENABLED_KEY = 'app_pin_enabled';

export default function PinLockScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const [pin, setPin] = useState('');
  const [mode, setMode] = useState<'verify' | 'set' | 'confirm'>('verify');
  const [tempPin, setTempPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkPinExists();
  }, []);

  useEffect(() => {
    if (locked && lockTimer > 0) {
      const timer = setTimeout(() => setLockTimer(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (lockTimer === 0 && locked) {
      setLocked(false);
      setAttempts(0);
    }
  }, [locked, lockTimer]);

  const checkPinExists = async () => {
    const pinEnabled = await AsyncStorage.getItem(PIN_ENABLED_KEY);
    const savedPin = await AsyncStorage.getItem(PIN_STORAGE_KEY);
    if (!savedPin || pinEnabled !== 'true') {
      setMode('set');
    } else {
      setMode('verify');
    }
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleDigit = (digit: string) => {
    if (locked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 6) {
        setTimeout(() => handlePinComplete(newPin), 100);
      }
    }
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin(prev => prev.slice(0, -1));
  };

  const handlePinComplete = async (enteredPin: string) => {
    if (mode === 'verify') {
      const savedPin = await AsyncStorage.getItem(PIN_STORAGE_KEY);
      if (enteredPin === savedPin) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        shake();
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin('');
        if (newAttempts >= 5) {
          setLocked(true);
          setLockTimer(30);
        }
      }
    } else if (mode === 'set') {
      setTempPin(enteredPin);
      setPin('');
      setMode('confirm');
    } else if (mode === 'confirm') {
      if (enteredPin === tempPin) {
        await AsyncStorage.setItem(PIN_STORAGE_KEY, enteredPin);
        await AsyncStorage.setItem(PIN_ENABLED_KEY, 'true');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        shake();
        setPin('');
        setMode('set');
        setTempPin('');
      }
    }
  };

  const dots = Array(6).fill(0);
  const title = mode === 'verify'
    ? (isRTL ? 'أدخل رمز PIN' : 'Enter PIN')
    : mode === 'set'
    ? (isRTL ? 'أنشئ رمز PIN جديد' : 'Create New PIN')
    : (isRTL ? 'أكّد رمز PIN' : 'Confirm PIN');

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.container}>
        {/* Icon */}
        <View style={[styles.iconBg, { backgroundColor: colors.primary + '20' }]}>
          <IconSymbol name="lock.fill" size={36} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>

        {locked && (
          <Text style={[styles.lockedText, { color: colors.error }]}>
            {isRTL ? `محظور لمدة ${lockTimer} ثانية` : `Locked for ${lockTimer}s`}
          </Text>
        )}

        {attempts > 0 && !locked && mode === 'verify' && (
          <Text style={[styles.attemptsText, { color: colors.warning }]}>
            {isRTL ? `${5 - attempts} محاولات متبقية` : `${5 - attempts} attempts left`}
          </Text>
        )}

        {/* PIN Dots */}
        <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
          {dots.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i < pin.length ? colors.primary : 'transparent',
                  borderColor: i < pin.length ? colors.primary : colors.border,
                }
              ]}
            />
          ))}
        </Animated.View>

        {/* Keypad */}
        <View style={styles.keypad}>
          {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', 'del']].map((row, ri) => (
            <View key={ri} style={styles.keyRow}>
              {row.map((key, ki) => (
                <Pressable
                  key={ki}
                  style={({ pressed }) => [
                    styles.key,
                    { backgroundColor: key === '' ? 'transparent' : colors.surface, borderColor: colors.border },
                    pressed && key !== '' && { backgroundColor: colors.primary + '30', transform: [{ scale: 0.95 }] }
                  ]}
                  onPress={() => {
                    if (key === 'del') handleDelete();
                    else if (key !== '') handleDigit(key);
                  }}
                  disabled={locked}
                >
                  {key === 'del' ? (
                    <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
                  ) : (
                    <Text style={[styles.keyText, { color: key === '' ? 'transparent' : colors.foreground }]}>
                      {key}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>
          ))}
        </View>

        {mode === 'verify' && (
          <Pressable
            style={({ pressed }) => [styles.forgotBtn, pressed && { opacity: 0.7 }]}
            onPress={() => {
              Alert.alert(
                isRTL ? 'إعادة تعيين PIN' : 'Reset PIN',
                isRTL ? 'هل تريد إعادة تعيين رمز PIN؟' : 'Reset your PIN code?',
                [
                  { text: t('cancel'), style: 'cancel' },
                  {
                    text: isRTL ? 'إعادة تعيين' : 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                      await AsyncStorage.removeItem(PIN_STORAGE_KEY);
                      await AsyncStorage.removeItem(PIN_ENABLED_KEY);
                      setMode('set');
                      setPin('');
                    }
                  }
                ]
              );
            }}
          >
            <Text style={[styles.forgotText, { color: colors.primary }]}>
              {isRTL ? 'نسيت رمز PIN؟' : 'Forgot PIN?'}
            </Text>
          </Pressable>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  lockedText: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  attemptsText: {
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 14,
    marginVertical: 28,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  keypad: {
    width: '100%',
    maxWidth: 300,
    gap: 12,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  key: {
    flex: 1,
    aspectRatio: 1.4,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '500',
  },
  forgotBtn: {
    marginTop: 24,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
