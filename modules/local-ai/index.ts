import { requireNativeModule } from "expo-modules-core";
import * as SecureStore from "expo-secure-store";
import { PermissionsAndroid, Platform } from "react-native";

export type SvetlanaVoiceCapabilities = {
  supported: boolean;
  offlinePreferred: boolean;
  ttsAvailable: boolean;
  azureVisemeAvailable?: boolean;
  language: string;
  sdk?: string;
};

export type SvetlanaVoiceEvent = {
  audioOffset: number;
  audioOffsetMs: number;
  visemeId: number;
  animation?: string;
};

type NativeSvetlanaVoice = {
  capabilities(): Promise<SvetlanaVoiceCapabilities>;
  listen(): Promise<string>;
  stopListening(): Promise<boolean>;
  speak(text: string, subscriptionKey: string, region: string): Promise<boolean>;
  speakOffline(text: string): Promise<boolean>;
  stopSpeaking(): Promise<boolean>;
  addListener(eventName: string, listener: (event: SvetlanaVoiceEvent) => void): { remove(): void };
};

const AZURE_SPEECH_KEY = "OX2_AZURE_SPEECH_KEY";
const AZURE_SPEECH_REGION = "OX2_AZURE_SPEECH_REGION";
const NativeSvetlanaVoice = requireNativeModule<NativeSvetlanaVoice>("SvetlanaVoice");

async function ensureMicrophonePermission(): Promise<void> {
  if (Platform.OS !== "android") return;

  const permission = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
  const current = await PermissionsAndroid.check(permission);
  if (current) return;

  const result = await PermissionsAndroid.request(permission, {
    title: "Микрофон для Светланы",
    message: "Светлане нужен доступ к микрофону для голосового общения.",
    buttonPositive: "Разрешить",
    buttonNegative: "Не сейчас",
  });

  if (result !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error("Доступ к микрофону не разрешён. Разрешите его в настройках приложения и повторите попытку.");
  }
}

export async function getAzureSpeechCredentials(): Promise<{ subscriptionKey: string; region: string }> {
  const [subscriptionKey, region] = await Promise.all([
    SecureStore.getItemAsync(AZURE_SPEECH_KEY),
    SecureStore.getItemAsync(AZURE_SPEECH_REGION),
  ]);
  if (!subscriptionKey?.trim()) throw new Error("Azure Speech не настроен: добавьте ключ в защищённое хранилище устройства.");
  if (!region?.trim()) throw new Error("Azure Speech не настроен: не указан регион.");
  return { subscriptionKey: subscriptionKey.trim(), region: region.trim() };
}

export async function setAzureSpeechCredentials(subscriptionKey: string, region: string): Promise<void> {
  const key = subscriptionKey.trim();
  const normalizedRegion = region.trim();
  if (!key || !normalizedRegion) throw new Error("Для настройки Azure Speech нужны ключ и регион.");
  await Promise.all([
    SecureStore.setItemAsync(AZURE_SPEECH_KEY, key),
    SecureStore.setItemAsync(AZURE_SPEECH_REGION, normalizedRegion),
  ]);
}

export const SvetlanaVoice = {
  capabilities: () => NativeSvetlanaVoice.capabilities(),
  listen: async () => {
    await ensureMicrophonePermission();
    return NativeSvetlanaVoice.listen();
  },
  stopListening: () => NativeSvetlanaVoice.stopListening(),
  stopSpeaking: () => NativeSvetlanaVoice.stopSpeaking(),
  addListener: (eventName: string, listener: (event: SvetlanaVoiceEvent) => void) => NativeSvetlanaVoice.addListener(eventName, listener),
  speak: async (text: string) => {
    try {
      const credentials = await getAzureSpeechCredentials();
      return await NativeSvetlanaVoice.speak(text, credentials.subscriptionKey, credentials.region);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Azure Speech не настроен")) {
        return NativeSvetlanaVoice.speakOffline(text);
      }
      throw error;
    }
  },
};

export const LocalAi = requireNativeModule<{
  nativeStatus(): Promise<Record<string, unknown>>;
  loadModel(path: string): Promise<Record<string, unknown>>;
  unloadModel(): Promise<void>;
}>("LocalAi");
