import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  findNode,
  getAccessibilityTree,
  globalAction,
  isServiceEnabled,
  openApp,
  tapNode,
  waitForNode,
} from 'react-native-accessibility-controller';

type SmokeStatus = 'idle' | 'running' | 'pass' | 'fail';

export default function AccessibilityControllerSmokeScreen() {
  const [status, setStatus] = useState<SmokeStatus>('idle');
  const [targetState, setTargetState] = useState<'OFF' | 'ON'>('OFF');
  const [evidence, setEvidence] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const logs: string[] = [];
    const log = (message: string) => {
      logs.push(message);
      console.log(message);
    };

    const run = async () => {
      try {
        setStatus('running');
        log('ACCESSIBILITY_CONTROLLER_SMOKE_START');

        const enabled = await isServiceEnabled();
        log(`ACCESSIBILITY_CONTROLLER_SERVICE_ENABLED=${enabled}`);
        if (!enabled) {
          throw new Error('AccessibilityControllerService is not enabled');
        }

        let tree = await getAccessibilityTree();
        for (let attempt = 0; attempt < 20 && tree.length === 0; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          tree = await getAccessibilityTree();
        }
        if (tree.length === 0) {
          throw new Error('Accessibility tree is empty');
        }
        log(`ACCESSIBILITY_CONTROLLER_RUNTIME service_bound=true tree_nodes=${tree.length}`);

        const target = await waitForNode(
          { text: 'ACCESSIBILITY_CONTROLLER_TARGET_OFF' },
          { timeoutMs: 10000, pollIntervalMs: 250 },
        );
        log(`ACCESSIBILITY_CONTROLLER_TARGET_FOUND node_id=${target.nodeId}`);

        const tapped = await tapNode(target.nodeId);
        log(`ACCESSIBILITY_CONTROLLER_TAP_RESULT=${tapped}`);
        if (!tapped) {
          throw new Error('tapNode returned false');
        }

        const onTarget = await waitForNode(
          { text: 'ACCESSIBILITY_CONTROLLER_TARGET_ON' },
          { timeoutMs: 5000, pollIntervalMs: 200 },
        );
        if (!onTarget) {
          throw new Error('Postcondition node was not found');
        }
        log('PASS:ACCESSIBILITY_CONTROLLER_TAP_VERIFIED');

        const settingsOpened = await openApp('com.android.settings');
        log(`ACCESSIBILITY_CONTROLLER_OPEN_SETTINGS=${settingsOpened}`);
        if (!settingsOpened) {
          throw new Error('openApp(com.android.settings) returned false');
        }
        log('ACCESSIBILITY_CONTROLLER_SMOKE_PASS');
        if (!cancelled) setStatus('pass');
      } catch (error) {
        log(`ACCESSIBILITY_CONTROLLER_SMOKE_FAIL ${error instanceof Error ? error.message : String(error)}`);
        if (!cancelled) setStatus('fail');
      } finally {
        if (!cancelled) setEvidence([...logs]);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={{ flex: 1, padding: 24, gap: 16 }}>
      <Text>Accessibility Controller Smoke</Text>
      <Text>Статус: {status}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`ACCESSIBILITY_CONTROLLER_TARGET_${targetState}`}
        onPress={() => setTargetState((value) => (value === 'OFF' ? 'ON' : 'OFF'))}
        style={{ padding: 24 }}
      >
        <Text>
          ACCESSIBILITY_CONTROLLER_TARGET_{targetState}
        </Text>
      </Pressable>
      {evidence.map((line, index) => (
        <Text key={`${index}-${line}`}>{line}</Text>
      ))}
      <Pressable onPress={() => void globalAction('back')}>
        <Text>Назад</Text>
      </Pressable>
    </View>
  );
}
