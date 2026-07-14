"use client";

import { useEffect } from "react";

export function MarkNotificationsSeen() {
  useEffect(() => {
    let cancelled = false;

    async function markSeen() {
      try {
        await fetch("/api/notifications/seen", { method: "POST" });
        if (!cancelled) {
          window.dispatchEvent(new Event("notifications:updated"));
        }
      } catch {
        /* silent */
      }
    }

    markSeen();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
