import { Slot } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppSidebar } from "@/components/ui/app-sidebar";
import { SvetlanaAvatar } from "@/components/svetlana/svetlana-avatar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <View style={styles.root}>
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
  svetlana: {
    position: "absolute",
    right: 14,
    bottom: 88,
  },
});
