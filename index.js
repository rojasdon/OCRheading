import { AppRegistry, Image } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { PluginManager } from 'sn-plugin-lib';

AppRegistry.registerComponent(appName, () => App);
PluginManager.init();
PluginManager.registerButton(2, ['NOTE', 'DOC'], {
  id: 201, // moved out of the 100-range to avoid any collision with a type-1 side button
  name: 'Text OCR Heading',
  icon: Image.resolveAssetSource(
    require('./assets/icon/icon.png'),
  ).uri,
  editDataTypes: [0], // 0=strokes only — narrowed now that the flow is confirmed working; this is the only selection type this plugin cares about
  showType: 1, // still shows a brief UI — needed so failures are visible without a console; auto-closes itself on success
});
