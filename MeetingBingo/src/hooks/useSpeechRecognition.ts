import { useCallback, useEffect, useRef, useState } from 'react';
import { SpeechRecognitionState } from '../types';

// The Web Speech API is still vendor-prefixed in some browsers.
const SpeechRecognitionImpl: typeof SpeechRecognition | undefined =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
    : undefined;

// Keep only the tail of the running transcript so memory stays bounded over a
// long meeting (the detector only needs recent context).
const MAX_TRANSCRIPT_CHARS = 500;

export function useSpeechRecognition() {
  const [state, setState] = useState<SpeechRecognitionState>({
    isSupported: !!SpeechRecognitionImpl,
    isListening: false,
    transcript: '',
    interimTranscript: '',
    error: null,
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultCallback = useRef<((transcript: string) => void) | null>(null);
  // Source of truth for the auto-restart decision in `onend`. A ref avoids the
  // stale-closure / impure-updater bug of reading listening state in setState.
  const shouldListenRef = useRef(false);

  useEffect(() => {
    if (!SpeechRecognitionImpl) return;

    const recognition = new SpeechRecognitionImpl();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }

      if (final) {
        setState((prev) => ({
          ...prev,
          transcript: (prev.transcript + final).slice(-MAX_TRANSCRIPT_CHARS),
          interimTranscript: '',
        }));
        onResultCallback.current?.(final);
      } else {
        setState((prev) => ({ ...prev, interimTranscript: interim }));
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // "no-speech" / "aborted" are benign; keep listening on those.
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      shouldListenRef.current = false;
      setState((prev) => ({ ...prev, error: event.error, isListening: false }));
    };

    recognition.onend = () => {
      // Auto-restart if the user still wants to listen (recognition stops on
      // its own after silence in some browsers).
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch {
          // Already started — ignore.
        }
      }
    };

    recognitionRef.current = recognition;
    return () => {
      shouldListenRef.current = false;
      recognition.stop();
    };
  }, []);

  const startListening = useCallback((onResult?: (transcript: string) => void) => {
    if (!recognitionRef.current) return;
    onResultCallback.current = onResult ?? null;
    shouldListenRef.current = true;
    setState((prev) => ({ ...prev, isListening: true, interimTranscript: '', error: null }));
    try {
      recognitionRef.current.start();
    } catch {
      // Already started — ignore.
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    shouldListenRef.current = false;
    setState((prev) => ({ ...prev, isListening: false, interimTranscript: '' }));
    recognitionRef.current.stop();
    onResultCallback.current = null;
  }, []);

  const resetTranscript = useCallback(() => {
    setState((prev) => ({ ...prev, transcript: '', interimTranscript: '' }));
  }, []);

  return { ...state, startListening, stopListening, resetTranscript };
}
