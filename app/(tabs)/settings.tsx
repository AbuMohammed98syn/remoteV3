import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch, StyleSheet, Alert } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/lib/i18n';
import { useConnection } from '@/lib/connection';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const colors = useColors();
  const { t, language, setLanguage, isRTL } = useI18n();
  const { profiles, deleteProfile, disconnect, status } = useConnection();
  const colorScheme = useColorScheme();
  const [keepAwake, setKeepAwake] = useState(true);
  const [haptics, setHaptics] = useState(true);

  const isConnected = status === 'connected';

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t('settingsTitle')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Language */}
        <SectionCard title={t('language')} icon="globe" iconColor="#00D4FF" colors={colors}>
          <View style={styles.langRow}>
            <LangButton
              label="English"
              active={language === 'en'}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLanguage('en'); }}
              colors={colors}
            />
            <LangButton
              label="العربية"
              active={language === 'ar'}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLanguage('ar'); }}
              colors={colors}
            />
          </View>
        </SectionCard>

        {/* Appearance */}
        <SectionCard title={t('appearance')} icon="sun.max" iconColor="#F59E0B" colors={colors}>
          <View style={styles.themeRow}>
            {(['dark', 'light'] as const).map((theme) => (
              <Pressable
                key={theme}
                style={({ pressed }) => [
                  styles.themeBtn,
                  { borderColor: colors.border, backgroundColor: colors.background },
                  colorScheme === theme && { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <IconSymbol
                  name={theme === 'dark' ? 'moon.stars' : 'sun.max'}
                  size={20}
                  color={colorScheme === theme ? colors.primary : colors.muted}
                />
                <Text style={[styles.themeBtnText, { color: colorScheme === theme ? colors.primary : colors.muted }]}>
                  {theme === 'dark' ? t('dark') : t('light')}
                </Text>
              </Pressable>
            ))}
          </View>
        </SectionCard>

        {/* Connection */}
        <SectionCard title={t('connection')} icon="wifi" iconColor="#10B981" colors={colors}>
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.settingLabel, { color: colors.foreground }]}>{t('keepScreenOn')}</Text>
            <Switch
              value={keepAwake}
              onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setKeepAwake(v); }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.foreground }]}>{t('hapticFeedback')}</Text>
            <Switch
              value={haptics}
              onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setHaptics(v); }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </SectionCard>

        {/* Saved Profiles */}
        {profiles.length > 0 && (
          <SectionCard title={t('connectionProfiles')} icon="desktopcomputer" iconColor="#3B82F6" colors={colors}>
            {profiles.map((profile, idx) => (
              <View
                key={profile.id}
                style={[styles.profileRow, { borderTopColor: colors.border, borderTopWidth: idx > 0 ? 0.5 : 0 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.profileName, { color: colors.foreground }]}>{profile.name}</Text>
                  <Text style={[styles.profileIp, { color: colors.muted }]}>{profile.ip}:{profile.port}</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.deleteBtn, { backgroundColor: colors.error + '15' }, pressed && { opacity: 0.7 }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    Alert.alert(t('delete'), `Delete ${profile.name}?`, [
                      { text: t('cancel'), style: 'cancel' },
                      { text: t('delete'), onPress: () => deleteProfile(profile.id), style: 'destructive' }
                    ]);
                  }}
                >
                  <IconSymbol name="trash" size={16} color={colors.error} />
                </Pressable>
              </View>
            ))}
          </SectionCard>
        )}

        {/* About */}
        <SectionCard title={t('about')} icon="info.circle" iconColor="#8B5CF6" colors={colors}>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutLabel, { color: colors.muted }]}>{t('appName')}</Text>
            <Text style={[styles.aboutValue, { color: colors.foreground }]}>RemoteCtrl</Text>
          </View>
          <View style={[styles.aboutRow, { borderTopColor: colors.border, borderTopWidth: 0.5 }]}>
            <Text style={[styles.aboutLabel, { color: colors.muted }]}>{t('version')}</Text>
            <Text style={[styles.aboutValue, { color: colors.foreground }]}>1.0.0</Text>
          </View>
          <View style={[styles.aboutRow, { borderTopColor: colors.border, borderTopWidth: 0.5 }]}>
            <Text style={[styles.aboutLabel, { color: colors.muted }]}>Developer</Text>
            <Text style={[styles.aboutValue, { color: colors.foreground }]}>Kin Kali</Text>
          </View>
        </SectionCard>

        {/* PowerShell List */}
        <Pressable
          style={({ pressed }) => [
            styles.listBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && { opacity: 0.8 }
          ]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/screens/powershell-list' as any); }}
        >
          <View style={[styles.listBtnIcon, { backgroundColor: '#1D4ED820' }]}>
            <IconSymbol name="terminal.fill" size={20} color="#1D4ED8" />
          </View>
          <Text style={[styles.listBtnText, { color: colors.foreground }]}>
            {language === 'ar' ? 'أهم 100 أمر في باور شيل' : 'Top 100 PowerShell Commands'}
          </Text>
          <IconSymbol name="chevron.right" size={16} color={colors.muted} />
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

function SectionCard({ title, icon, iconColor, colors, children }: any) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: iconColor + '20' }]}>
          <IconSymbol name={icon} size={18} color={iconColor} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function LangButton({ label, active, onPress, colors }: any) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.langBtn,
        { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + '15' : colors.background },
        pressed && { opacity: 0.8 }
      ]}
      onPress={onPress}
    >
      <Text style={[styles.langBtnText, { color: active ? colors.primary : colors.muted }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  sectionCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '600' },
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  langBtnText: { fontSize: 14, fontWeight: '600' },
  themeRow: { flexDirection: 'row', gap: 10 },
  themeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  themeBtnText: { fontSize: 13, fontWeight: '600' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  settingLabel: { fontSize: 14 },
  profileRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  profileName: { fontSize: 14, fontWeight: '500' },
  profileIp: { fontSize: 12, marginTop: 1 },
  deleteBtn: { padding: 8, borderRadius: 8 },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  aboutLabel: { fontSize: 13 },
  aboutValue: { fontSize: 13, fontWeight: '500' },
  listBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16, borderWidth: 1, gap: 12 },
  listBtnIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  listBtnText: { flex: 1, fontSize: 14, fontWeight: '500' },
});
