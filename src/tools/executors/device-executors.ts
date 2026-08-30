/**
 * P0 native executors for device tools.
 *
 * App discovery is launcher-scoped so Android 11+ package visibility rules are
 * respected without QUERY_ALL_PACKAGES. App launches are protected by the
 * normal tool-approval layer; there is no second, dead session-approval gate.
 */
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { requireNativeModule } from 'expo';
import { z } from 'zod';

export const openAppSchema = z.object({
  packageName: z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i),
});

export const listAppsSchema = z.object({});

export const readFileSchema = z.object({
  uri: z.string().startsWith('content://'),
  maxBytes: z.number().int().positive().max(5_000_000).default(100_000),
});

type NativeAccessibilityAgent = {
  getTree(maxNodes: number): Promise<Array<{ id: string; packageName: string | null }>>;
  listLaunchableApps(): Promise<Array<{ name: string; packageName: string }>>;
};

const Native = Platform.OS === 'android'
  ? requireNativeModule<NativeAccessibilityAgent>('AccessibilityAgent')
  : null;

export async function executeListApps(): Promise<{
  status: string;
  count: number;
  apps: Array<{ name: string; packageName: string }>;
}> {
  if (!Native) return { status: 'unsupported_platform', count: 0, apps: [] };
  try {
    const apps = await Native.listLaunchableApps();
    return { status: 'listed', count: apps.length, apps };
  } catch {
    return { status: 'discovery_failed', count: 0, apps: [] };
  }
}

async function getForegroundPackage(): Promise<string | null> {
  if (!Native) return null;
  try {
    const nodes = await Native.getTree(1);
    return nodes.find((node) => node.id === '0')?.packageName ?? nodes[0]?.packageName ?? null;
  } catch {
    return null;
  }
}

async function waitForForegroundPackage(
  packageName: string,
  previousPackage: string | null,
  timeoutMs = 2500,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  do {
    const current = await getForegroundPackage();
    // Verification requires an observed foreground transition. This prevents
    // a launch request from being reported verified merely because the target
    // app was already foreground before the request.
    if (current === packageName && previousPackage !== packageName) return true;
    if (Date.now() >= deadline) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  } while (true);
  return false;
}

/** device.open_app — launch after the normal tool-approval layer and verify foreground transition. */
export async function executeOpenApp(
  args: z.infer<typeof openAppSchema>,
): Promise<{ status: string; packageName: string; verified: boolean }> {
  const previousPackage = await getForegroundPackage();

  try {
    await IntentLauncher.openApplication(args.packageName);
  } catch {
    return { status: 'launch_failed', packageName: args.packageName, verified: false };
  }

  const verified = await waitForForegroundPackage(args.packageName, previousPackage);
  return {
    status: verified ? 'launched_verified' : 'launched_unverified',
    packageName: args.packageName,
    verified,
  };
}

export async function executeFileRead(
  args: z.infer<typeof readFileSchema>,
): Promise<{
  status: string;
  sizeBytes: number;
  content: string;
  truncated: boolean;
}> {
  const content = await FileSystem.readAsStringAsync(args.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const truncated = content.length > args.maxBytes;
  const slice = truncated ? content.slice(0, args.maxBytes) : content;
  return {
    status: 'read',
    sizeBytes: content.length,
    content: slice,
    truncated,
  };
}
