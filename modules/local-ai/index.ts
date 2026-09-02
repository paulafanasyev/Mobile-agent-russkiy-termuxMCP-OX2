import { requireNativeModule } from "expo-modules-core";
import { Platform } from "react-native";
import * as Speech from "expo-speech";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import TTSKit from "react-native-tts-kit";

export type MobileAgentVoiceCapabilities = {
  supported: boolean;
  systemSttAvailable: boolean;
  whisperAvailable: boolean;
  neuralTtsAvailable: boolean;
  systemTtsAvailable: boolean;
  language: string;
};

let listening = false;
let neuralTtsEnabled = true;

export const MobileAgentVoice = {
  capabilities: async (): Promise<MobileAgentVoiceCapabilities> => {
    let neuralTtsAvailable = false;
    try {
      neuralTtsAvailable = typeof TTSKit?.speak === "function";
    } catch {
      neuralTtsAvailable = false;
    }

    return {
      supported: Platform.OS === "android" ? ExpoSpeechRecognitionModule.isRecognitionAvailable() : true,
      systemSttAvailable: Platform.OS === "android" ? ExpoSpeechRecognitionModule.isRecognitionAvailable() : false,
      whisperAvailable: false,
      neuralTtsAvailable,
      systemTtsAvailable: true,
      language: "ru-RU",
    };
  },

  listen: async (): Promise<string> => {
    if (Platform.OS !== "android") return "";
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) throw new Error("Разрешение на микрофон не предоставлено");

    return new Promise<string>((resolve, reject) => {
      let settled = false;
      const cleanup = () => {
        resultSub.remove();
        errorSub.remove();
        endSub.remove();
        listening = false;
      };
      const resultSub = ExpoSpeechRecognitionModule.addListener("result", (event: any) => {
        const text = event?.results?.[0]?.transcript?.trim?.() ?? "";
        if (event?.isFinal && text && !settled) {
          settled = true;
          cleanup();
          resolve(text);
        }
      });
      const errorSub = ExpoSpeechRecognitionModule.addListener("error", (event: any) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error(event?.message || `Speech recognition error: ${event?.error ?? "unknown"}`));
      });
      const endSub = ExpoSpeechRecognitionModule.addListener("end", () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error("Распознавание речи завершилось без результата"));
      });

      listening = true;
      ExpoSpeechRecognitionModule.start({
        lang: "ru-RU",
        interimResults: true,
        maxAlternatives: 1,
        requiresOnDeviceRecognition: false,
      });
    });
  },

  stopListening: async (): Promise<boolean> => {
    if (Platform.OS === "android" && listening) ExpoSpeechRecognitionModule.stop();
    listening = false;
    return true;
  },

  setNeuralTtsEnabled: (enabled: boolean) => {
    neuralTtsEnabled = enabled;
  },

  speak: async (text: string): Promise<boolean> => {
    if (!text.trim()) return true;

    if (neuralTtsEnabled) {
      try {
        if (typeof TTSKit?.speak === "function") {
          await TTSKit.speak(text, { voice: "F1", language: "ru" });
          return true;
        }
      } catch {
        // Fall through to the stable Android system TTS.
      }
    }

    await Speech.stop();
    Speech.speak(text, { language: "ru-RU", rate: 0.95, pitch: 1.0 });
    return true;
  },

  stopSpeaking: async (): Promise<boolean> => {
    try {
      if (typeof TTSKit?.stop === "function") await TTSKit.stop();
    } catch {
      // System TTS cleanup below remains authoritative.
    }
    await Speech.stop();
    return true;
  },
};

export const LocalAi = requireNativeModule<{
  nativeStatus(): Promise<Record<string, unknown>>;
  loadModel(path: string): Promise<Record<string, unknown>>;
  unloadModel(): Promise<void>;
}>("LocalAi");
