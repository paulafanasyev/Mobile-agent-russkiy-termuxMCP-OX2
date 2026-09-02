import { requireNativeModule } from "expo-modules-core";
import { Platform } from "react-native";
import * as Speech from "expo-speech";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";

export type VoiceCapabilities = {
  recognitionAvailable: boolean;
  onDeviceRecognitionSupported: boolean;
  ttsAvailable: boolean;
  language: string;
};

let listening = false;

export const MobileAgentVoice = {
  capabilities: async (): Promise<VoiceCapabilities> => ({
    recognitionAvailable:
      Platform.OS === "android"
        ? ExpoSpeechRecognitionModule.isRecognitionAvailable()
        : false,
    onDeviceRecognitionSupported:
      Platform.OS === "android"
        ? ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()
        : false,
    ttsAvailable: true,
    language: "ru-RU",
  }),

  listen: async (): Promise<string> => {
    if (Platform.OS !== "android") return "";
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) throw new Error("Разрешение на микрофон не предоставлено");

    return new Promise<string>((resolve, reject) => {
      let settled = false;
      const resultSub = ExpoSpeechRecognitionModule.addListener("result", (event: any) => {
        const text = event?.results?.[0]?.transcript?.trim?.() ?? "";
        if (event?.isFinal && text && !settled) {
          settled = true;
          resultSub.remove();
          errorSub.remove();
          endSub.remove();
          listening = false;
          resolve(text);
        }
      });
      const errorSub = ExpoSpeechRecognitionModule.addListener("error", (event: any) => {
        if (settled) return;
        settled = true;
        resultSub.remove();
        errorSub.remove();
        endSub.remove();
        listening = false;
        reject(new Error(event?.message || `Speech recognition error: ${event?.error ?? "unknown"}`));
      });
      const endSub = ExpoSpeechRecognitionModule.addListener("end", () => {
        if (settled) return;
        settled = true;
        resultSub.remove();
        errorSub.remove();
        endSub.remove();
        listening = false;
        reject(new Error("Распознавание речи завершилось без результата"));
      });

      listening = true;
      ExpoSpeechRecognitionModule.start({
        lang: "ru-RU",
        interimResults: true,
        maxAlternatives: 1,
        // Network/system recognition remains the compatibility path on Android 12/API 30.
        // Strict on-device mode will be enabled only after an installed ru-RU offline model is verified.
        requiresOnDeviceRecognition: false,
      });
    });
  },

  stopListening: async (): Promise<boolean> => {
    if (Platform.OS === "android" && listening) ExpoSpeechRecognitionModule.stop();
    listening = false;
    return true;
  },

  speak: async (text: string): Promise<boolean> => {
    await Speech.stop();
    Speech.speak(text, { language: "ru-RU", rate: 0.95, pitch: 1.0 });
    return true;
  },

  stopSpeaking: async (): Promise<boolean> => {
    await Speech.stop();
    return true;
  },
};

export const LocalAi = requireNativeModule<{
  nativeStatus(): Promise<Record<string, unknown>>;
  loadModel(path: string): Promise<Record<string, unknown>>;
  unloadModel(): Promise<void>;
}>("LocalAi");
