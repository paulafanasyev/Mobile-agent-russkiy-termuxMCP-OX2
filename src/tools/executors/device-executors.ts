/**
 * P1-2: Native executors for device tools.
 *
 * Architecture (cycle 145):
 * - device-tools.ts = the single source of session approval state;
 * - this file = execution only, consuming the public approval API;
 * - registry = contracts; executors = machine.
 *
 * SAF restriction: only content:// URIs with granted permissions.
 * QUERY_ALL_PACKAGES is intentionally not used (approved-only v1).
 */
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { requireNativeModule } from 'expo';
import { z } from 'zod';
import { isAppApprovedForSession, getSessionApprovedPackages } from '../device-tools';

const packageNamePattern = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/i;

export const openAppSchema = z.object({
  packageName: z.string().regex(packageNamePattern, 'Invalid Android package name').max(255),
});

export const listAppsSchema = z.object({});

export const readFileSchema = z.object({
  uri: z.string().startsWith('content://'),
  maxBytes: z.number().int().positive().max(5_000_000).default(100_000),
});

type NativeAccessibilityAgent = {
  getTree(maxNodes: number): Promise<Array<{ id: string; packageName: string | null }>>;
};

const Native = Platform.OS === 'android'
  ? requireNativeModule<NativeAccessibilityAgent>('AccessibilityAgent')
  : null;

export async function executeListApps(): Promise<{
  status: string;
  count: number;
  apps: Array<{ name: string; packageName: string }>;
}> {
  const apps = getSessionApprovedPackages().map((pkg) => ({
    name: pkg.split('.').pop() ?? pkg,
    packageName: pkg,
  }));
  return { status: 'listed', count: apps.length, apps };
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

async function waitForForegroundPackage(packageName: string, timeoutMs = 3000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  do {
    if (await getForegroundPackage() === packageName) return true;
    if (Date.now() >= deadline) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  } while (true);
  return false;
}

/** device.open_app — launch only after explicit session approval and verify foreground postcondition. */
export async function executeOpenApp(
  args: z.infer<typeof openAppSchema>,
): Promise<{ status: string; packageName: string; verified: boolean }> {
  if (!isAppApprovedForSession(args.packageName)) {
    return { status: 'needs_approval', packageName: args.packageName, verified: false };
  }

  try {
    await IntentLauncher.openApplication(args.packageName);
  } catch {
    return { status: 'launch_failed', packageName: args.packageName, verified: false };
  }

  // A successful request must be verified by the observable foreground state.
  // Re-opening an already focused app is still valid; do not require a transition.
  const verified = await waitForForegroundPackage(args.packageName);

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
