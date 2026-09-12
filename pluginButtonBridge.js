/**
 * Shared button-press state between index.js (registers the listener,
 * writes here) and App.tsx (reads/subscribes here). Kept in its own module
 * so index.js and App.tsx don't have to import each other.
 */
import { DeviceEventEmitter } from 'react-native';

let pendingButtonId = null;

export function recordButtonPress(id) {
  pendingButtonId = id;
  DeviceEventEmitter.emit('pluginButton', { id });
}

// Consume once — call on mount, to catch a press that happened before a
// listener could attach.
export function checkPendingButton() {
  const val = pendingButtonId;
  pendingButtonId = null;
  return val;
}
