import { EventEmitter, requireNativeModule } from 'expo-modules-core';

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

export type AzureVisemeEvent = {
  visemeId: number;
  audioOffsetMs: number;
  resultId?: string;
};

export const AzureViseme = requireNativeModule<{
  speakWithVisemes(
    text: string,
    authorizationToken: string,
    region: string,
    locale: string,
  ): Promise<boolean>;
  stopSpeaking(): Promise<boolean>;
}>('AzureViseme');

export const AzureVisemeEvents = new EventEmitter(AzureViseme);

export const LocalAi = requireNativeModule<{
  nativeStatus(): Promise<Record<string, unknown>>;
  loadModel(path: string): Promise<Record<string, unknown>>;
  unloadModel(): Promise<void>;
}>('LocalAi');
