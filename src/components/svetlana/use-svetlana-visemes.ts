import { useEffect, useRef, useState } from "react";
import { SvetlanaVoice } from "../../../modules/local-ai/src/voice";
import type { VisemeReceivedEvent } from "../../../modules/local-ai/src/voice";

export function useSvetlanaVisemes(speaking: boolean) {
  const [visemeId, setVisemeId] = useState<number | null>(null);
  const lastOffsetMs = useRef(-1);

  useEffect(() => {
    if (!speaking) {
      setVisemeId(null);
      lastOffsetMs.current = -1;
      return;
    }

    const subscription = SvetlanaVoice.addListener(
      "onVisemeReceived",
      (event: VisemeReceivedEvent) => {
        if (event.audioOffsetMs < lastOffsetMs.current) return;
        lastOffsetMs.current = event.audioOffsetMs;
        setVisemeId(event.visemeId);
      },
    );

    return () => subscription.remove();
  }, [speaking]);

  return visemeId;
}
