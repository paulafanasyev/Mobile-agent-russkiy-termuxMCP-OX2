import { NativeModule, requireNativeModule } from "expo";
import * as SecureStore from "expo-secure-store";

export type VisemeReceivedEvent = {
  audioOffset: number;
  audioOffsetMs: number;
  visemeId: number;
  animation?: string;
};

type VoiceEvents = {
  onVisemeReceived: (event: VisemeReceivedEvent) => void;
  onSpeechCompleted: (event: { resultId?: string }) => void;
  onSpeechError: (event: { message: string }) => void;
};

const AZURE_SPEECH_KEY = "OX2_AZURE_SPEECH_KEY";
const AZURE_SPEECH_REGION = "OX2_AZURE_SPEECH_REGION";

export class SvetlanaVoiceModule extends NativeModule<VoiceEvents> {
  capabilities!: () => Promise<{
    supported: boolean;
    offlinePreferred: boolean;
    ttsAvailable: boolean;
    azureVisemeAvailable: boolean;
    language: string;
    sdk: string;
  }>;
  listen!: () => Promise<string>;
  stopListening!: () => Promise<boolean>;
  speak!: (text: string, subscriptionKey: string, region: string) => Promise<boolean>;
  stopSpeaking!: () => Promise<boolean>;
}

export const SvetlanaVoice = requireNativeModule<SvetlanaVoiceModule>("SvetlanaVoice");

export async function getAzureSpeechCredentials(): Promise<{ subscriptionKey: string; region: string }> {
  const [subscriptionKey, region] = await Promise.all([
    SecureStore.getItemAsync(AZURE_SPEECH_KEY),
    SecureStore.getItemAsync(AZURE_SPEECH_REGION),
  ]);

  if (!subscriptionKey?.trim()) {
    throw new Error("Azure Speech не настроен: добавьте ключ в защищённое хранилище устройства.");
  }
  if (!region?.trim()) {
    throw new Error("Azure Speech не настроен: не указан регион.");
  }

  return { subscriptionKey: subscriptionKey.trim(), region: region.trim() };
}

export async function setAzureSpeechCredentials(subscriptionKey: string, region: string): Promise<void> {
  if (!subscriptionKey.trim() || !region.trim()) {
    throw new Error("Для настройки Azure Speech нужны ключ и регион.");
  }
  await Promise.all([
    SecureStore.setItemAsync(AZURE_SPEECH_KEY, subscriptionKey.trim()),
    SecureStore.setItemAsync(AZURE_SPEECH_REGION, region.trim()),
  ]);
}
