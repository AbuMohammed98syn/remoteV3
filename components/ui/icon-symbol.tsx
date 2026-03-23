/**
 * IconSymbol – cross-platform icon component.
 * Maps SF Symbol names (used in the app) to MaterialCommunityIcons on Android.
 */
import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

// Map SF Symbol names → MaterialCommunityIcons / Ionicons names
const SF_TO_MCI: Record<string, { lib: 'mci' | 'mi' | 'ion'; name: string }> = {
  // Navigation & UI
  'xmark':                  { lib: 'mci', name: 'close' },
  'chevron.right':          { lib: 'mci', name: 'chevron-right' },
  'chevron.left':           { lib: 'mci', name: 'chevron-left' },
  'chevron.down':           { lib: 'mci', name: 'chevron-down' },
  'chevron.up':             { lib: 'mci', name: 'chevron-up' },

  // Devices
  'desktopcomputer':        { lib: 'mci', name: 'monitor' },
  'display':                { lib: 'mci', name: 'monitor-screenshot' },
  'keyboard':               { lib: 'mci', name: 'keyboard' },
  'cursorarrow':            { lib: 'mci', name: 'cursor-default' },

  // Connectivity
  'wifi':                   { lib: 'mci', name: 'wifi' },
  'wifi.slash':             { lib: 'mci', name: 'wifi-off' },
  'network':                { lib: 'mci', name: 'lan' },

  // Files
  'folder.fill':            { lib: 'mci', name: 'folder' },
  'folder':                 { lib: 'mci', name: 'folder-outline' },
  'doc.fill':               { lib: 'mci', name: 'file-document' },
  'doc':                    { lib: 'mci', name: 'file-document-outline' },
  'arrow.up.doc':           { lib: 'mci', name: 'file-upload' },
  'arrow.down.doc':         { lib: 'mci', name: 'file-download' },
  'tray.and.arrow.up':      { lib: 'mci', name: 'upload' },
  'tray.and.arrow.down':    { lib: 'mci', name: 'download' },

  // Terminal & Tools
  'terminal.fill':          { lib: 'mci', name: 'console' },
  'terminal':               { lib: 'mci', name: 'console-line' },

  // Media & Calls
  'phone.fill':             { lib: 'mci', name: 'phone' },
  'phone':                  { lib: 'mci', name: 'phone-outline' },
  'video.fill':             { lib: 'mci', name: 'video' },
  'video':                  { lib: 'mci', name: 'video-outline' },
  'mic.fill':               { lib: 'mci', name: 'microphone' },
  'mic':                    { lib: 'mci', name: 'microphone-outline' },
  'mic.slash':              { lib: 'mci', name: 'microphone-off' },
  'speaker.wave.2':         { lib: 'mci', name: 'volume-high' },
  'speaker.slash':          { lib: 'mci', name: 'volume-off' },

  // System
  'power':                  { lib: 'mci', name: 'power' },
  'moon.stars':             { lib: 'mci', name: 'weather-night' },
  'sun.max':                { lib: 'mci', name: 'weather-sunny' },
  'lock.fill':              { lib: 'mci', name: 'lock' },
  'lock':                   { lib: 'mci', name: 'lock-outline' },
  'lock.open':              { lib: 'mci', name: 'lock-open-outline' },
  'arrow.clockwise':        { lib: 'mci', name: 'restart' },
  'sleep':                  { lib: 'mci', name: 'sleep' },

  // Misc
  'globe':                  { lib: 'mci', name: 'earth' },
  'gearshape.fill':         { lib: 'mci', name: 'cog' },
  'gearshape':              { lib: 'mci', name: 'cog-outline' },
  'printer.fill':           { lib: 'mci', name: 'printer' },
  'list.dash':              { lib: 'mci', name: 'format-list-bulleted' },
  'chart.line.uptrend.xyaxis': { lib: 'mci', name: 'chart-line' },
  'paintbrush.fill':        { lib: 'mci', name: 'brush' },
  'paintbrush':             { lib: 'mci', name: 'brush-outline' },
  'square.and.arrow.up':    { lib: 'mci', name: 'share' },
  'plus':                   { lib: 'mci', name: 'plus' },
  'minus':                  { lib: 'mci', name: 'minus' },
  'trash.fill':             { lib: 'mci', name: 'delete' },
  'trash':                  { lib: 'mci', name: 'delete-outline' },
  'pencil':                 { lib: 'mci', name: 'pencil' },
  'magnifyingglass':        { lib: 'mci', name: 'magnify' },
  'arrow.uturn.left':       { lib: 'mci', name: 'undo' },
  'clipboard':              { lib: 'mci', name: 'clipboard-text-outline' },
  'clipboard.fill':         { lib: 'mci', name: 'clipboard-text' },
  'info.circle':            { lib: 'mci', name: 'information-outline' },
  'exclamationmark.triangle': { lib: 'mci', name: 'alert-outline' },
  'checkmark.circle.fill':  { lib: 'mci', name: 'check-circle' },
  'arrow.left':             { lib: 'mci', name: 'arrow-left' },
  'arrow.right':            { lib: 'mci', name: 'arrow-right' },
  'house.fill':             { lib: 'mci', name: 'home' },
  'house':                  { lib: 'mci', name: 'home-outline' },
  'cpu':                    { lib: 'mci', name: 'cpu-64-bit' },
  'memorychip':             { lib: 'mci', name: 'memory' },
  'internaldrive':          { lib: 'mci', name: 'harddisk' },
};

interface IconSymbolProps {
  name: string;
  size?: number;
  color?: string;
  style?: object;
}

export function IconSymbol({ name, size = 24, color = '#fff', style }: IconSymbolProps) {
  const mapping = SF_TO_MCI[name];

  if (!mapping) {
    // Fallback: try Ionicons with the raw name, or show a dot
    return (
      <MaterialCommunityIcons
        name={'circle-small' as never}
        size={size}
        color={color}
        style={style}
      />
    );
  }

  if (mapping.lib === 'mi') {
    return (
      <MaterialIcons
        name={mapping.name as never}
        size={size}
        color={color}
        style={style}
      />
    );
  }

  if (mapping.lib === 'ion') {
    return (
      <Ionicons
        name={mapping.name as never}
        size={size}
        color={color}
        style={style}
      />
    );
  }

  return (
    <MaterialCommunityIcons
      name={mapping.name as never}
      size={size}
      color={color}
      style={style}
    />
  );
}
