import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, ScrollView
} from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/lib/i18n';
import { useConnection } from '@/lib/connection';
import * as Haptics from 'expo-haptics';

interface TerminalLine {
  text: string;
  type: 'input' | 'output' | 'error' | 'system';
}

export default function TerminalScreen() {
  const colors = useColors();
  const { t, language } = useI18n();
  const { sendMessage, status, ws } = useConnection();
  const [lines, setLines] = useState<TerminalLine[]>([
    { text: language === 'ar' ? 'موجه الأوامر - متصل بالحاسوب' : 'Command Prompt - Connected to PC', type: 'system' },
    { text: 'Microsoft Windows [Version 10.0]', type: 'system' },
    { text: '(c) Microsoft Corporation. All rights reserved.', type: 'system' },
    { text: '', type: 'output' },
  ]);
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentDir, setCurrentDir] = useState('C:\\Users\\User');
  const scrollRef = useRef<ScrollView>(null);
  const isConnected = status === 'connected';

  useEffect(() => {
    if (!ws) return;
    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'terminal_output') {
          const outputLines = (msg.data || '').split('\n').filter((l: string) => l.length > 0);
          setLines(prev => [...prev, ...outputLines.map((l: string) => ({ text: l, type: 'output' as const }))]);
          if (msg.currentDir) setCurrentDir(msg.currentDir);
          setTimeout(() => scrollRef.current?.scrollToEnd(), 100);
        } else if (msg.type === 'terminal_error') {
          setLines(prev => [...prev, { text: msg.data, type: 'error' }]);
          setTimeout(() => scrollRef.current?.scrollToEnd(), 100);
        }
      } catch {}
    };
    ws.addEventListener('message', handler);
    return () => ws.removeEventListener('message', handler);
  }, [ws]);

  const executeCommand = () => {
    if (!command.trim() || !isConnected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const cmd = command.trim();
    setLines(prev => [...prev, { text: `${currentDir}> ${cmd}`, type: 'input' }]);
    setHistory(prev => [cmd, ...prev.slice(0, 49)]);
    setHistoryIndex(-1);
    sendMessage('terminal_exec', { command: cmd });
    setCommand('');
    setTimeout(() => scrollRef.current?.scrollToEnd(), 100);
  };

  const handleSpecialKey = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (key === 'up') {
      const newIdx = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(newIdx);
      if (history[newIdx]) setCommand(history[newIdx]);
    } else if (key === 'down') {
      const newIdx = Math.max(historyIndex - 1, -1);
      setHistoryIndex(newIdx);
      setCommand(newIdx === -1 ? '' : history[newIdx]);
    } else if (key === 'clear') {
      setLines([{ text: '', type: 'output' }]);
    } else if (key === 'ctrl+c') {
      sendMessage('terminal_interrupt');
      setLines(prev => [...prev, { text: '^C', type: 'error' }]);
    }
  };

  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'input': return '#00D4FF';
      case 'error': return '#EF4444';
      case 'system': return '#7C3AED';
      default: return '#00FF41';
    }
  };

  if (!isConnected) {
    return (
      <ScreenContainer>
        <View style={styles.emptyState}>
          <IconSymbol name="terminal.fill" size={60} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t('terminalTitle')}</Text>
          <Pressable style={[styles.backBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>{t('back')}</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#0A0E1A' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#111827', borderBottomColor: '#1E3A5F' }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <IconSymbol name="arrow.left" size={24} color="#E2E8F0" />
        </Pressable>
        <View style={styles.terminalTitleBar}>
          <View style={styles.terminalDot} />
          <View style={[styles.terminalDot, { backgroundColor: '#F59E0B' }]} />
          <View style={[styles.terminalDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.terminalTitle}>
            {language === 'ar' ? 'موجه الأوامر' : 'Command Prompt'}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.clearBtn, pressed && { opacity: 0.7 }]}
          onPress={() => handleSpecialKey('clear')}
        >
          <IconSymbol name="trash" size={18} color="#94A3B8" />
        </Pressable>
      </View>

      {/* Terminal Output */}
      <ScrollView
        ref={scrollRef}
        style={styles.outputArea}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd()}
      >
        {lines.map((line, idx) => (
          <Text key={idx} style={[styles.terminalLine, { color: getLineColor(line.type) }]} selectable>
            {line.text}
          </Text>
        ))}
      </ScrollView>

      {/* Quick Keys */}
      <View style={[styles.quickKeys, { backgroundColor: '#111827', borderTopColor: '#1E3A5F' }]}>
        {['↑', '↓', 'Ctrl+C', 'Tab', 'Clear'].map((key) => (
          <Pressable
            key={key}
            style={({ pressed }) => [styles.quickKey, { backgroundColor: '#1A2235', borderColor: '#1E3A5F' }, pressed && { backgroundColor: '#00D4FF20' }]}
            onPress={() => {
              if (key === '↑') handleSpecialKey('up');
              else if (key === '↓') handleSpecialKey('down');
              else if (key === 'Ctrl+C') handleSpecialKey('ctrl+c');
              else if (key === 'Clear') handleSpecialKey('clear');
              else sendMessage('terminal_key', { key: 'tab' });
            }}
          >
            <Text style={[styles.quickKeyText, { color: '#94A3B8' }]}>{key}</Text>
          </Pressable>
        ))}
      </View>

      {/* Input */}
      <View style={[styles.inputArea, { backgroundColor: '#111827', borderTopColor: '#1E3A5F' }]}>
        <Text style={styles.promptText}>{currentDir}&gt;</Text>
        <TextInput
          style={styles.cmdInput}
          value={command}
          onChangeText={setCommand}
          onSubmitEditing={executeCommand}
          returnKeyType="send"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={language === 'ar' ? 'أدخل أمراً...' : 'Enter command...'}
          placeholderTextColor="#334155"
          selectionColor="#00D4FF"
        />
        <Pressable
          style={({ pressed }) => [styles.sendBtn, { backgroundColor: '#00D4FF' }, pressed && { opacity: 0.85 }]}
          onPress={executeCommand}
        >
          <IconSymbol name="play.fill" size={16} color="#000" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 10,
    paddingTop: 50,
  },
  terminalTitleBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  terminalDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  terminalTitle: { color: '#94A3B8', fontSize: 13, fontWeight: '500', marginLeft: 4 },
  clearBtn: { padding: 6 },
  outputArea: { flex: 1 },
  terminalLine: { fontSize: 12, lineHeight: 20, fontFamily: 'monospace' },
  quickKeys: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
    borderTopWidth: 0.5,
  },
  quickKey: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickKeyText: { fontSize: 11, fontWeight: '600' },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: 24,
    borderTopWidth: 0.5,
    gap: 8,
  },
  promptText: { color: '#00D4FF', fontFamily: 'monospace', fontSize: 12 },
  cmdInput: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  sendBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '600' },
  backBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
});
