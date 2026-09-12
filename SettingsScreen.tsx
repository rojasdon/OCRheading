/**
 * Settings screen: font-size stepper + heading style picker.
 * Saves immediately on every change without Save button - add later?).
 */
import React from 'react';
import {StyleSheet, Text, View, Pressable, useColorScheme} from 'react-native';
import {
  Settings,
  DEFAULT_SETTINGS,
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
  FONT_SIZE_STEP,
  HEADING_STYLES,
  clampFontSize,
  loadSettings,
  saveSettings,
} from './settings';

type Props = {
  onClose: () => void;
};

export default function SettingsScreen({onClose}: Props): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const textColor = {color: isDarkMode ? '#ffffff' : '#000000'};
  const [settings, setSettings] = React.useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    loadSettings().then((s) => {
      if (!cancelled) {
        setSettings(s);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (next: Settings) => {
    setSettings(next);
    saveSettings(next); // fire-and-forget; errors are logged inside saveSettings
  };

  const adjustFontSize = (delta: number) => {
    update({...settings, fontSize: clampFontSize(settings.fontSize + delta)});
  };

  if (!loaded) {
    return (
      <View style={styles.container}>
        <Text style={[styles.label, textColor]}>Loading settings…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.closeButton} onPress={onClose}>
        <Text style={[styles.closeText, textColor]}>✕</Text>
      </Pressable>

      <Text style={[styles.title, textColor]}>Heading Settings</Text>

      <Text style={[styles.label, textColor]}>Font size</Text>
      <View style={styles.stepperRow}>
        <Pressable
          style={[styles.stepperButton, settings.fontSize <= FONT_SIZE_MIN && styles.stepperButtonDisabled]}
          onPress={() => adjustFontSize(-FONT_SIZE_STEP)}
          disabled={settings.fontSize <= FONT_SIZE_MIN}>
          <Text style={styles.stepperButtonText}>−</Text>
        </Pressable>
        <Text style={[styles.stepperValue, textColor]}>{settings.fontSize}</Text>
        <Pressable
          style={[styles.stepperButton, settings.fontSize >= FONT_SIZE_MAX && styles.stepperButtonDisabled]}
          onPress={() => adjustFontSize(FONT_SIZE_STEP)}
          disabled={settings.fontSize >= FONT_SIZE_MAX}>
          <Text style={styles.stepperButtonText}>+</Text>
        </Pressable>
      </View>

      <Text style={[styles.label, textColor, styles.sectionSpacing]}>Heading style</Text>
      <View style={styles.styleGrid}>
        {HEADING_STYLES.map((s) => {
          const selected = settings.headingStyle === s.key;
          return (
            <Pressable
              key={s.key}
              style={[styles.styleOption, selected && styles.styleOptionSelected]}
              onPress={() => update({...settings, headingStyle: s.key})}>
              <Text style={[styles.styleOptionText, selected && styles.styleOptionTextSelected]}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 48,
    backgroundColor: '#ffffff',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  closeText: {
    fontSize: 18,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionSpacing: {
    marginTop: 24,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#888888',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonDisabled: {
    opacity: 0.35,
  },
  stepperButtonText: {
    fontSize: 24,
    fontWeight: '700',
  },
  stepperValue: {
    fontSize: 20,
    fontWeight: '600',
    width: 64,
    textAlign: 'center',
  },
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  styleOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#888888',
  },
  styleOptionSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  styleOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
  },
  styleOptionTextSelected: {
    color: '#ffffff',
  },
});
