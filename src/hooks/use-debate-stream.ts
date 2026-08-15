import { useCallback, useEffect, useRef, useState } from "react";
import {
  streamGenerateDebate,
  type GenerateDebateArgs,
} from "@/lib/gemini";

/**
 * Drives a single AI console panel: holds the streamed text, the streaming
 * state, and any error. `start` aborts any in-flight request before beginning
 * a new one.
 */
export function useDebateStream() {
  const [text, setText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const start = useCallback(async (args: GenerateDebateArgs) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setText("");
    setError(null);
    setIsStreaming(true);

    try {
      for await (const chunk of streamGenerateDebate(args, controller.signal)) {
        setText((previous) => previous + chunk);
      }
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(
          caught instanceof Error ? caught.message : "Generation failed.",
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsStreaming(false);
      }
    }
  }, []);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setText("");
    setError(null);
    setIsStreaming(false);
  }, []);

  return { text, isStreaming, error, start, clear };
}
