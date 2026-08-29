import { Slot } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppSidebar } from "@/components/ui/app-sidebar";
import { SidebarTrigger, SidebarProvider } from "@/components/ui/sidebar";
import { SvetlanaAvatar } from "@/components/svetlana/svetlana-avatar";

export default function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <View style={styles.root}>
        <View pointerEvents="box-none" style={styles.menuButton}>
          <SidebarTrigger accessibilityLabel="Открыть меню" />
        </View>
        <Slot />
        <View pointerEvents="box-none" style={styles.svetlana}>
          <SvetlanaAvatar compact />
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
  svetlana: {
    position: "absolute",
    right: 14,
    bottom: 88,
  },
});
