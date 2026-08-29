import { Redirect } from "expo-router";

export default function Index() {
  // Keep the existing text chat as the main screen; Svetlana voice and Hands
  // are capabilities added to the existing application, not a replacement UI.
  return <Redirect href="/chat" />;
}
