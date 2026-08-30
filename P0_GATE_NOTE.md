# P0 runtime verification gate

This branch is a verification candidate for the P0 runtime fixes.

Required device evidence before PASS:
1. Text LLM request: HTTP 200; no invalid tool-name error.
2. TTS unavailable: no native exception; text remains visible; user-visible fallback.
3. RECORD_AUDIO denied: permission dialog -> grant -> recognition starts.
4. Speech service unavailable: controlled fallback; no crash.
5. Hands: sanitized tool name -> executor -> Settings opens.

CI green, APK artifact, or static source inspection alone do not close this gate.
