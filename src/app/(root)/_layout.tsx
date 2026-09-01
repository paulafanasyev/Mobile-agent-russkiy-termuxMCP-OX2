import { Slot } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppSidebar } from "@/components/ui/app-sidebar";
import { SidebarTrigger, SidebarProvider } from "@/components/ui/sidebar";
import { VoiceControl } from "@/components/voice/voice-control";

export default function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <View style={styles.root}>
        <View pointerEvents="box-none" style={styles.menuButton}>
          <SidebarTrigger accessibilityLabel="Открыть меню" />
        </View>
        <Slot />
        <View style={styles.voice} pointerEvents="box-none">
          <VoiceControl />
        </View>
      </View>
    </SidebarProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  menuButton: {
    position: "absolute",
    left: 12,
    top: 12,
    zIndex: 100,
  },
  voice: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 86,
    zIndex: 90,
  },
});
