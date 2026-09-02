import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  beddaGetTree,
  beddaGlobalAction,
  beddaIsEnabled,
  beddaOpenApp,
  beddaTapNode,
  beddaWaitForNode,
} from '../../bedda-legacy-bridge';

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

        const enabled = await beddaIsEnabled();
        log(`ACCESSIBILITY_CONTROLLER_SERVICE_ENABLED=${enabled}`);
        if (!enabled) throw new Error('OX2BeddaAccessibilityService is not enabled');

        let tree = await beddaGetTree();
        for (let attempt = 0; attempt < 20 && tree.length === 0; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          tree = await beddaGetTree();
        }
        if (tree.length === 0) throw new Error('Accessibility tree is empty');
        log(`ACCESSIBILITY_CONTROLLER_RUNTIME service_bound=true tree_nodes=${tree.length}`);

        const target = await beddaWaitForNode(
          { text: 'ACCESSIBILITY_CONTROLLER_TARGET_OFF' },
          { timeoutMs: 10000, pollIntervalMs: 250 },
        );
        log(`ACCESSIBILITY_CONTROLLER_TARGET_FOUND node_id=${target.nodeId}`);

        const tapped = await beddaTapNode(target.nodeId);
        log(`ACCESSIBILITY_CONTROLLER_TAP_RESULT=${tapped}`);
        if (!tapped) throw new Error('tapNode returned false');

        await beddaWaitForNode(
          { text: 'ACCESSIBILITY_CONTROLLER_TARGET_ON' },
          { timeoutMs: 5000, pollIntervalMs: 200 },
        );
        log('PASS:ACCESSIBILITY_CONTROLLER_TAP_VERIFIED');

        const settingsOpened = await beddaOpenApp('com.android.settings');
        log(`ACCESSIBILITY_CONTROLLER_OPEN_SETTINGS=${settingsOpened}`);
        if (!settingsOpened) throw new Error('openApp(com.android.settings) returned false');

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
    return () => { cancelled = true; };
  }, []);

  return (
    <View style={{ flex: 1, padding: 24, gap: 16 }}>
      <Text>Forensic: bedda-tech legacy controller</Text>
      <Text>Статус: {status}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`ACCESSIBILITY_CONTROLLER_TARGET_${targetState}`}
        onPress={() => setTargetState((value) => (value === 'OFF' ? 'ON' : 'OFF'))}
        style={{ padding: 24 }}
      >
        <Text>ACCESSIBILITY_CONTROLLER_TARGET_{targetState}</Text>
      </Pressable>
      {evidence.map((line, index) => <Text key={`${index}-${line}`}>{line}</Text>)}
      <Pressable onPress={() => void beddaGlobalAction('back')}>
        <Text>Назад</Text>
      </Pressable>
    </View>
  );
}
