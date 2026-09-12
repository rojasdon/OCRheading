import { AppRegistry, Image } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { PluginManager } from 'sn-plugin-lib';
import { recordButtonPress } from './pluginButtonBridge';
import { CONVERT_BUTTON_ID, SETTINGS_BUTTON_ID } from './buttonIds';

AppRegistry.registerComponent(appName, () => App);
PluginManager.init();

PluginManager.registerButton(2, ['NOTE', 'DOC'], {
  id: CONVERT_BUTTON_ID,
  name: 'Text OCR Heading',
  icon: Image.resolveAssetSource(
    require('./assets/icon/icon.png'),
  ).uri,
  editDataTypes: [0], // strokes only
  showType: 1,
});

// Normal toolbar button (type 1) — not lasso-specific, since opening
// settings doesn't need a selection first.
PluginManager.registerButton(1, ['NOTE', 'DOC'], {
  id: SETTINGS_BUTTON_ID,
  name: 'OCR Heading Settings',
  icon: Image.resolveAssetSource(
    require('./assets/icon/icon.png'),
  ).uri,
  showType: 1,
});

// Fixes the "works once, then stale" bug: the plugin's React component may
// stay mounted across separate button presses, so App.tsx can't rely on a
// mount-time useEffect alone to detect a NEW press. registerButtonListener
// fires on every press, not just the first.
PluginManager.registerButtonListener({
  onButtonPress(event) {
    recordButtonPress(event.id);
  },
});
