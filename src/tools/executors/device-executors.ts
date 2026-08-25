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
import { z } from 'zod';
import {
  isAppApprovedForSession,
  getSessionApprovedPackages,
} from '../device-tools';

// ── Schemas ────────────────────────────────────────────────────────────────────
export const openAppSchema = z.object({
  packageName: z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i),
});

export const listAppsSchema = z.object({});

export const readFileSchema = z.object({
  uri: z.string().startsWith('content://'),
  maxBytes: z.number().int().positive().max(5_000_000).default(100_000),
});

// ── Executors ──────────────────────────────────────────────────────────────────

/** device.apps.list — v1 approved-only. */
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

/** device.open_app — launch only after explicit session approval. */
export async function executeOpenApp(
  args: z.infer<typeof openAppSchema>,
): Promise<{ status: string; packageName: string }> {
  if (!isAppApprovedForSession(args.packageName)) {
    return { status: 'needs_approval', packageName: args.packageName };
  }

  // Expo SDK 57 exposes openApplication(packageName) for this operation.
  IntentLauncher.openApplication(args.packageName);
  return { status: 'launched', packageName: args.packageName };
}

/** device.files.read — SAF content:// read with an LLM-context cap. */
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
