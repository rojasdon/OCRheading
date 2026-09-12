/**
 * Text OCR Heading
 *
 * @format
 */
import React from 'react';
import {
  ActivityIndicator,
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

/**
 * Plugin View
 * Runs the handwriting-to-heading conversion on EVERY button press — not
 * just once on mount. The component may stay alive across separate
 * presses, so re-running only requires reacting to the button-press event
 * (via pluginButtonBridge), not remounting.
 */
function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [result, setResult] = React.useState<ConversionResult | null>(null);
  const [step, setStep] = React.useState<string>('Converting…');
  const textColor = { color: isDarkMode ? '#ffffff' : '#000000' };

  const handleClose = () => {
    PluginManager.closePluginView();
  };

  const runOnce = React.useCallback(() => {
    let cancelled = false;
    setResult(null);
    setStep('Starting…');
    convertHandwritingToHeading((s) => {
      if (!cancelled) setStep(s);
    }).then((res) => {
      if (cancelled) return;
      setResult(res);
      if (res.success) {
        setTimeout(() => {
          if (!cancelled) PluginManager.closePluginView();
        }, 400);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    // Clear any pending press recorded before this listener could attach —
    // we always run once on mount regardless (mount only happens as a
    // direct result of a press when showType:1), this just avoids a stale
    // pending flag lingering into a future re-subscription.
    checkPendingButton();
    let cleanupCurrent = runOnce();

    // React to every SUBSEQUENT press while this component stays mounted.
    const sub = DeviceEventEmitter.addListener('pluginButton', () => {
      cleanupCurrent();
      cleanupCurrent = runOnce();
    });

    return () => {
      cleanupCurrent();
      sub.remove();
    };
  }, [runOnce]);

  return (
    <View style={styles.container}>
      <Pressable style={styles.closeButton} onPress={handleClose}>
        <Text style={[styles.closeText, textColor]}>✕</Text>
      </Pressable>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#000000' : '#ffffff'}
      />
      {result === null && (
        <>
          <ActivityIndicator size="large" color={isDarkMode ? '#ffffff' : '#000000'} />
          <Text style={[styles.statusText, textColor]}>{step}</Text>
        </>
      )}
      {result?.success && <Text style={[styles.statusText, textColor]}>✅ Done</Text>}
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
