/**
 * Text OCR Heading
 *
 * @format
 */
import React from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Pressable,
} from 'react-native';
import { PluginManager } from 'sn-plugin-lib';
import { convertHandwritingToHeading, ConversionResult } from './ocr2heading';

/**
 * Plugin View
 * Runs the handwriting-to-heading conversion immediately on open.
 * On success, closes itself automatically. On failure, stays open
 * with the error shown so it can be diagnosed without a console.
 */
function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [result, setResult] = React.useState<ConversionResult | null>(null);
  const textColor = { color: isDarkMode ? '#ffffff' : '#000000' };

  const handleClose = () => {
    PluginManager.closePluginView();
  };

  React.useEffect(() => {
    let cancelled = false;
    convertHandwritingToHeading().then((res) => {
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
          <Text style={[styles.statusText, textColor]}>Converting…</Text>
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
