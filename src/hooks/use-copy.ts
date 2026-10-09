import { useEffect, useState } from "react";

export type CopyStatus = "copied" | "failed";

/** The old way to copy, for a browser that refuses the async clipboard: select a hidden textarea and run "copy". */
function copyWithTextarea(text: string) {
  const el = document.createElement("textarea");
  el.value = text;
  document.body.appendChild(el);
  el.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(el);
  }
}

/**
 * Copy-to-clipboard with feedback that clears itself two seconds after the
 * last copy. `legacyFallback` tries the old textarea copy when the clipboard
 * refuses, and counts it as copied.
 */
export function useCopy({ legacyFallback = false }: { legacyFallback?: boolean } = {}) {
  // An object, so a repeat copy is a new state: it re-announces and restarts the reset timer.
  const [feedback, setFeedback] = useState<{ status: CopyStatus } | null>(null);
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 2000);
    return () => clearTimeout(t);
  }, [feedback]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback({ status: "copied" });
    } catch {
      if (!legacyFallback) {
        setFeedback({ status: "failed" });
        return;
      }
      try {
        copyWithTextarea(text);
        setFeedback({ status: "copied" });
      } catch {
        setFeedback({ status: "failed" });
      }
    }
  };

  return { status: feedback?.status ?? null, copy };
}
