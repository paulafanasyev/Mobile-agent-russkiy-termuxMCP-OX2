import { NativeModule, requireNativeModule } from "expo";

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
