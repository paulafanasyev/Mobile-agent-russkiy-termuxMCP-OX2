/** Hands executors for filesystem, screenshot, camera and media controls. */
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { z } from 'zod';
import { nativeScreenshot } from '../../..//modules/accessibility-agent/native';
import { getSystemHandsNative } from '../../../modules/system-hands/src';

const fileUri = z.string().refine((v) => v.startsWith('file://') || v.startsWith('content://'), 'Expected file:// or content:// URI');
export const fileReadHandsSchema = z.object({ uri: fileUri, maxBytes: z.number().int().positive().max(5_000_000).default(100_000) });
export const fileWriteHandsSchema = z.object({ uri: fileUri, content: z.string(), append: z.boolean().default(false) });
export const filePairHandsSchema = z.object({ sourceUri: fileUri, destinationUri: fileUri });
export const fileDeleteHandsSchema = z.object({ uri: fileUri });
export const fileRenameHandsSchema = z.object({ uri: fileUri, newUri: fileUri });

function localFileOnly(uri: string): boolean { return uri.startsWith('file://'); }
function contentFileOnly(uri: string): boolean { return uri.startsWith('content://'); }
function displayNameFromUri(uri: string): string { const raw = uri.split('/').filter(Boolean).pop() || ''; try { return decodeURIComponent(raw); } catch { return raw; } }

export async function executeHandsFileRead(args: z.infer<typeof fileReadHandsSchema>) {
  if (contentFileOnly(args.uri) && Platform.OS === 'android') return getSystemHandsNative().readContent(args.uri, args.maxBytes);
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
  if (contentFileOnly(args.uri) && Platform.OS === 'android') return getSystemHandsNative().writeContent(args.uri, args.content, args.append);
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
  if (contentFileOnly(args.sourceUri) && contentFileOnly(args.destinationUri) && Platform.OS === 'android') return getSystemHandsNative().moveContent(args.sourceUri, args.destinationUri);
  if (!localFileOnly(args.sourceUri) || !localFileOnly(args.destinationUri)) return { status: 'unsupported_uri', verified: false };
  try {
    await FileSystem.moveAsync({ from: args.sourceUri, to: args.destinationUri });
    const source = await FileSystem.getInfoAsync(args.sourceUri); const destination = await FileSystem.getInfoAsync(args.destinationUri);
    const verified = !source.exists && destination.exists;
    return { status: verified ? 'move_verified' : 'move_unverified', verified, sourceUri: args.sourceUri, destinationUri: args.destinationUri };
  } catch { return { status: 'move_failed', verified: false }; }
}

export async function executeHandsFileDelete(args: z.infer<typeof fileDeleteHandsSchema>) {
  if (contentFileOnly(args.uri) && Platform.OS === 'android') return getSystemHandsNative().deleteContent(args.uri);
  if (!localFileOnly(args.uri)) return { status: 'unsupported_uri', verified: false, uri: args.uri };
  try { await FileSystem.deleteAsync(args.uri, { idempotent: false }); const info = await FileSystem.getInfoAsync(args.uri); return { status: !info.exists ? 'delete_verified' : 'delete_unverified', verified: !info.exists, uri: args.uri }; }
  catch { return { status: 'delete_failed', verified: false, uri: args.uri }; }
}

export async function executeHandsFileRename(args: z.infer<typeof fileRenameHandsSchema>) {
  if (contentFileOnly(args.uri) && contentFileOnly(args.newUri) && Platform.OS === 'android') return getSystemHandsNative().renameContent(args.uri, displayNameFromUri(args.newUri));
  return executeHandsFileMove({ sourceUri: args.uri, destinationUri: args.newUri });
}

export async function executeHandsScreenshot() { return nativeScreenshot(); }

export async function executeHandsCamera() {
  if (Platform.OS !== 'android') return { status: 'unsupported_platform', verified: false };
  return getSystemHandsNative().captureCamera();
}

const mediaActions = {
  play_media: 126,
  pause_media: 127,
  next_media: 87,
} as const;
export const mediaHandsSchema = z.object({});

export async function executeHandsMedia(action: keyof typeof mediaActions) {
  if (Platform.OS !== 'android') return { status: 'unsupported_platform', verified: false, action };
  try { return await getSystemHandsNative().sendMediaBroadcast('android.intent.action.MEDIA_BUTTON', mediaActions[action]); }
  catch { return { status: 'broadcast_failed', verified: false, action }; }
}
