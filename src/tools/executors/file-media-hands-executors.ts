/** Hands executors for filesystem and media controls.
 *
 * Important: these functions report `executed_unverified` unless a concrete
 * postcondition is observable. An API call resolving is never treated as proof.
 */
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';
import { z } from 'zod';

const fileUri = z.string().refine((v) => v.startsWith('file://') || v.startsWith('content://'), 'Expected file:// or content:// URI');
export const fileReadHandsSchema = z.object({ uri: fileUri, maxBytes: z.number().int().positive().max(5_000_000).default(100_000) });
export const fileWriteHandsSchema = z.object({ uri: fileUri, content: z.string(), append: z.boolean().default(false) });
export const filePairHandsSchema = z.object({ sourceUri: fileUri, destinationUri: fileUri });
export const fileDeleteHandsSchema = z.object({ uri: fileUri });
export const fileRenameHandsSchema = z.object({ uri: fileUri, newUri: fileUri });

function localFileOnly(uri: string): boolean { return uri.startsWith('file://'); }

export async function executeHandsFileRead(args: z.infer<typeof fileReadHandsSchema>) {
  if (!localFileOnly(args.uri)) return { status: 'unsupported_uri', verified: false, uri: args.uri };
  try {
    const info = await FileSystem.getInfoAsync(args.uri);
    if (!info.exists) return { status: 'not_found', verified: false, uri: args.uri };
    const content = await FileSystem.readAsStringAsync(args.uri, { encoding: FileSystem.EncodingType.UTF8 });
    const truncated = content.length > args.maxBytes;
    return { status: 'read_verified', verified: true, uri: args.uri, sizeBytes: content.length, content: truncated ? content.slice(0, args.maxBytes) : content, truncated };
  } catch { return { status: 'read_failed', verified: false, uri: args.uri }; }
}

export async function executeHandsFileWrite(args: z.infer<typeof fileWriteHandsSchema>) {
  if (!localFileOnly(args.uri)) return { status: 'unsupported_uri', verified: false, uri: args.uri };
  try {
    const previous = args.append ? await FileSystem.readAsStringAsync(args.uri, { encoding: FileSystem.EncodingType.UTF8 }).catch(() => '') : '';
    await FileSystem.writeAsStringAsync(args.uri, previous + args.content, { encoding: FileSystem.EncodingType.UTF8 });
    const after = await FileSystem.readAsStringAsync(args.uri, { encoding: FileSystem.EncodingType.UTF8 });
    const expected = previous + args.content;
    return { status: after === expected ? 'write_verified' : 'write_unverified', verified: after === expected, uri: args.uri, sizeBytes: after.length };
  } catch { return { status: 'write_failed', verified: false, uri: args.uri }; }
}

export async function executeHandsFileMove(args: z.infer<typeof filePairHandsSchema>) {
  if (!localFileOnly(args.sourceUri) || !localFileOnly(args.destinationUri)) return { status: 'unsupported_uri', verified: false };
  try {
    await FileSystem.moveAsync({ from: args.sourceUri, to: args.destinationUri });
    const source = await FileSystem.getInfoAsync(args.sourceUri);
    const destination = await FileSystem.getInfoAsync(args.destinationUri);
    const verified = !source.exists && destination.exists;
    return { status: verified ? 'move_verified' : 'move_unverified', verified, sourceUri: args.sourceUri, destinationUri: args.destinationUri };
  } catch { return { status: 'move_failed', verified: false }; }
}

export async function executeHandsFileDelete(args: z.infer<typeof fileDeleteHandsSchema>) {
  if (!localFileOnly(args.uri)) return { status: 'unsupported_uri', verified: false, uri: args.uri };
  try {
    await FileSystem.deleteAsync(args.uri, { idempotent: false });
    const info = await FileSystem.getInfoAsync(args.uri);
    return { status: !info.exists ? 'delete_verified' : 'delete_unverified', verified: !info.exists, uri: args.uri };
  } catch { return { status: 'delete_failed', verified: false, uri: args.uri }; }
}

export async function executeHandsFileRename(args: z.infer<typeof fileRenameHandsSchema>) {
  return executeHandsFileMove({ sourceUri: args.uri, destinationUri: args.newUri });
}

const mediaActions = {
  play_media: 'android.intent.action.MEDIA_PLAY',
  pause_media: 'android.intent.action.MEDIA_PAUSE',
  next_media: 'android.intent.action.MEDIA_NEXT',
} as const;
export const mediaHandsSchema = z.object({});

export async function executeHandsMedia(action: keyof typeof mediaActions) {
  if (Platform.OS !== 'android') return { status: 'unsupported_platform', verified: false, action };
  try {
    await IntentLauncher.startActivityAsync(mediaActions[action]);
    return { status: 'intent_launched', verified: false, verification: 'intent_only', action };
  } catch { return { status: 'intent_failed', verified: false, action }; }
}
