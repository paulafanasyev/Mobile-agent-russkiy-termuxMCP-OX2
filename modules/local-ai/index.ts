import { requireNativeModule } from 'expo-modules-core';

export type SvetlanaVoiceCapabilities = {
  supported: boolean;
  offlinePreferred: boolean;
  ttsAvailable: boolean;
  language: string;
};

export const SvetlanaVoice = requireNativeModule<{
  capabilities(): Promise<SvetlanaVoiceCapabilities>;
  listen(): Promise<string>;
  stopListening(): Promise<boolean>;
  speak(text: string): Promise<boolean>;
  stopSpeaking(): Promise<boolean>;
}>('SvetlanaVoice');

export const LocalAi = requireNativeModule<{
  nativeStatus(): Promise<Record<string, unknown>>;
  loadModel(path: string): Promise<Record<string, unknown>>;
  unloadModel(): Promise<void>;
}>('LocalAi');
