/**
 * Text OCR Heading
 *
 * @format
 */
import React from 'react';
import {
  DeviceEventEmitter,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Pressable,
} from 'react-native';
import { PluginManager } from 'sn-plugin-lib';
import { convertHandwritingToHeading, ConversionResult } from './ocr2heading';
import { checkPendingButton } from './pluginButtonBridge';
import { CONVERT_BUTTON_ID, SETTINGS_BUTTON_ID } from './buttonIds';
import SettingsScreen from './SettingsScreen';

/**
 * Plugin View
 * Routes between the conversion flow and the settings screen based on
 * which button fired (CONVERT_BUTTON_ID vs SETTINGS_BUTTON_ID). Re-runs
 * on EVERY button press, not just on mount — the component may stay
 * alive across separate presses, so this reacts to the press event
 * (via pluginButtonBridge) rather than assuming a fresh mount each time.
 *
 * On success: shows nothing at all and closes immediately — no spinner,
 * no "Done" flash. Only a failed conversion renders any UI, since that's
 * the only case where the user has no other way to know what happened
 * (no console access in normal use).
 */
function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [showSettings, setShowSettings] = React.useState(false);
  const [result, setResult] = React.useState<ConversionResult | null>(null);
  const [step, setStep] = React.useState<string>('Starting…');
  const textColor = { color: isDarkMode ? '#ffffff' : '#000000' };

  const handleClose = () => {
    PluginManager.closePluginView();
  };

  const runConversion = React.useCallback(() => {
    let cancelled = false;
    setResult(null);
    setStep('Starting…');
    convertHandwritingToHeading((s) => {
      if (!cancelled) setStep(s);
    }).then((res) => {
      if (cancelled) return;
      setResult(res);
      if (res.success) {
        // Close immediately — nothing was ever shown to preserve.
        if (!cancelled) PluginManager.closePluginView();
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Call runConversion (or show settings) DIRECTLY from the event handler,
  // every time it fires — never routed through React state-change
  // detection. setState bails out (skips re-render / dependent effects)
  // when the new value equals the current one, which silently broke
  // repeat presses of the SAME button when this was previously wired as
  // "setButtonId(id)" + a separate effect watching buttonId. Two presses
  // of the lasso button in a row sent the same id both times, so the
  // effect never re-fired on the second press. Calling the handler
  // imperatively here sidesteps that entirely.
  React.useEffect(() => {
    let cleanupCurrent: (() => void) | undefined;

    const handlePress = (id: number | null) => {
      cleanupCurrent?.();
      if (id === SETTINGS_BUTTON_ID) {
        setShowSettings(true);
        cleanupCurrent = undefined;
      } else {
        setShowSettings(false);
        cleanupCurrent = runConversion();
      }
    };

    handlePress(checkPendingButton() ?? CONVERT_BUTTON_ID);

    const sub = DeviceEventEmitter.addListener('pluginButton', (e) => {
      handlePress(e.id);
    });

    return () => {
      cleanupCurrent?.();
      sub.remove();
    };
  }, [runConversion]);

  if (showSettings) {
    return <SettingsScreen onClose={handleClose} />;
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.closeButton} onPress={handleClose}>
        <Text style={[styles.closeText, textColor]}>✕</Text>
      </Pressable>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#000000' : '#ffffff'}
      />
      {/* Nothing rendered while loading or on success — blank screen,
          just the close button above. Uncomment the spinner/step text
          below together with the report() calls in ocr2heading.ts to
          restore visible progress for debugging. */}
      {/*
      {result === null && (
        <>
          <ActivityIndicator size="large" color={isDarkMode ? '#ffffff' : '#000000'} />
          <Text style={[styles.statusText, textColor]}>{step}</Text>
        </>
      )}
      {result?.success && <Text style={[styles.statusText, textColor]}>✅ Done</Text>}
      */}
      {result && !result.success && (
        <Text style={[styles.errorText, textColor]}>❌ {result.message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  statusText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
    maxWidth: 320,
  },
});
export default App;
