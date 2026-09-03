/** TurboModule spec for react-native-accessibility-controller. */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
export interface Spec extends TurboModule {
  getAccessibilityTree(): Promise<Object[]>;
  getScreenText(): Promise<string>;
  takeScreenshot(): Promise<string>;
  performAction(nodeId: string, action: string): Promise<boolean>;
  tapNode(nodeId: string): Promise<boolean>;
  longPressNode(nodeId: string): Promise<boolean>;
  setNodeText(nodeId: string, text: string): Promise<boolean>;
  scrollNode(nodeId: string, direction: string): Promise<boolean>;
  tap(x: number, y: number): Promise<boolean>;
  longPress(x: number, y: number): Promise<boolean>;
  swipe(startX: number, startY: number, endX: number, endY: number, durationMs: number): Promise<boolean>;
  globalAction(action: string): Promise<boolean>;
  openApp(packageName: string): Promise<boolean>;
  getInstalledApps(): Promise<Object[]>;
  showOverlay(config: Object): Promise<void>;
  updateOverlay(config: Object): Promise<void>;
  hideOverlay(): Promise<void>;
  isServiceEnabled(): Promise<boolean>;
  requestServiceEnable(): Promise<void>;
  canDrawOverlays(): Promise<boolean>;
  requestOverlayPermission(): Promise<void>;
  requestMediaProjection(): Promise<boolean>;
  captureWithMediaProjection(): Promise<string>;
  releaseMediaProjection(): Promise<void>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}
export default TurboModuleRegistry.getEnforcing<Spec>('AccessibilityController');
