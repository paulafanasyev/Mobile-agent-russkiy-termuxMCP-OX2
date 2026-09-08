import { startupMark } from "./src/core/startup/trace";

startupMark("JS_ENTRY");
import "./src/modules/scheduler/headless-registration";
startupMark("HEADLESS_REGISTRATION_IMPORTED");

import "expo-router/entry";
startupMark("ROUTER_ENTRY_IMPORTED");
