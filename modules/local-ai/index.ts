import { requireNativeModule } from "expo-modules-core";

export type SvetlanaVoiceCapabilities = {
  supported: boolean;
  offlinePreferred: boolean;
  ttsAvailable: boolean;
  language: string;
};

type NativeSvetlanaVoice = {
  capabilities(): Promise<SvetlanaVoiceCapabilities>;
  listen(): Promise<string>;
  stopListening(): Promise<boolean>;
  speak(text: string): Promise<boolean>;
  stopSpeaking(): Promise<boolean>;
};

export const SvetlanaVoice = requireNativeModule<NativeSvetlanaVoice>("SvetlanaVoice");

export const LocalAi = requireNativeModule<{
  nativeStatus(): Promise<Record<string, unknown>>;
  loadModel(path: string): Promise<Record<string, unknown>>;
  unloadModel(): Promise<void>;
}>("LocalAi");
