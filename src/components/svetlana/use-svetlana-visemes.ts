import { useEffect, useRef, useState } from "react";
import { shapeAtTime, shapeForViseme, type VisemeKeyframe, type VisemeShape } from "./viseme-timeline";
import { SvetlanaVoice } from "../../../modules/local-ai/src/voice";
import type { VisemeReceivedEvent } from "../../../modules/local-ai/src/voice";

export function useSvetlanaVisemes(speaking: boolean): VisemeShape | null {
  const [shape, setShape] = useState<VisemeShape | null>(null);
  const timelineRef = useRef<VisemeKeyframe[]>([]);
  const startedAtMs = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!speaking) {
      timelineRef.current = [];
      startedAtMs.current = null;
      setShape(null);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      return;
    }

    const tick = () => {
      if (startedAtMs.current === null) return;
      const elapsed = Math.max(0, Date.now() - startedAtMs.current);
      const events = timelineRef.current;
      if (events.length > 0) setShape(shapeAtTime(events, elapsed));
      frameRef.current = requestAnimationFrame(tick);
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
      const events = timelineRef.current;
      const last = events[events.length - 1];
      if (last?.timeMs === next.timeMs) {
        events[events.length - 1] = next;
      } else if (!last || last.timeMs < next.timeMs) {
        events.push(next);
      } else {
        events.push(next);
        events.sort((a, b) => a.timeMs - b.timeMs);
      }
      setShape(shapeAtTime(events, event.audioOffsetMs));
    });

    return () => {
      subscription.remove();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [speaking]);

  return shape;
}
