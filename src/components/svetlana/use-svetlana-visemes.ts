import { useEffect, useRef, useState } from "react";
import { shapeAtTime, shapeForViseme, type VisemeKeyframe, type VisemeShape } from "./viseme-timeline";
import { SvetlanaVoice } from "../../../modules/local-ai/src/voice";
import type { VisemeReceivedEvent } from "../../../modules/local-ai/src/voice";

export function useSvetlanaVisemes(speaking: boolean): VisemeShape | null {
  const [shape, setShape] = useState<VisemeShape | null>(null);
  const timelineRef = useRef<VisemeKeyframe[]>([]);
  const startedAtMs = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!speaking) {
      timelineRef.current = [];
      startedAtMs.current = null;
      setShape(null);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = null;
      return;
    }

    const tick = () => {
      if (startedAtMs.current === null) return;
      const elapsed = Math.max(0, Date.now() - startedAtMs.current);
      const events = timelineRef.current;
      if (events.length > 0) setShape(shapeAtTime(events, elapsed));
      timerRef.current = setTimeout(tick, 16);
    };

    const subscription = SvetlanaVoice.addListener("onVisemeReceived", (event: VisemeReceivedEvent) => {
      if (startedAtMs.current === null) {
        startedAtMs.current = Date.now() - event.audioOffsetMs;
        tick();
      }
      const next: VisemeKeyframe = {
        timeMs: Math.max(0, event.audioOffsetMs),
        visemeId: event.visemeId,
        shape: shapeForViseme(event.visemeId),
      };
      timelineRef.current = [...timelineRef.current, next].sort((a, b) => a.timeMs - b.timeMs);
      setShape(shapeAtTime(timelineRef.current, event.audioOffsetMs));
    });

    return () => {
      subscription.remove();
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [speaking]);

  return shape;
}
