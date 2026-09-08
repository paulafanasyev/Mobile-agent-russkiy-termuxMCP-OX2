import { AppRegistry } from "react-native";

import { startupMark } from "@/core/startup/trace";
import { runSchedulerHeadlessTick } from "./headless";

startupMark("HEADLESS_REGISTRATION_MODULE");

export const SCHEDULER_WAKE_TASK_KEY = "SchedulerWakeTask";

AppRegistry.registerHeadlessTask(
  SCHEDULER_WAKE_TASK_KEY,
  () => async (taskData: { scheduleId?: string }) => {
    startupMark("HEADLESS_TASK_BEGIN");
    try {
      await runSchedulerHeadlessTick();
      startupMark("HEADLESS_TASK_END");
    } catch (error) {
      console.error("[scheduler:headless] Wake task failed:", error);
    }
  },
);
