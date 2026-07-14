"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "@/lib/notifications";

type NotificationData = {
  items: NotificationItem[];
  unreadCount: number;
};

export function NotificationBell() {
  const [data, setData] = useState<NotificationData | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) setData((await res.json()) as NotificationData);
    } catch {
      /* silent */
    }
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    const handleUpdate = () => refresh();
    const handleOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("notifications:updated", handleUpdate as EventListener);
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      clearInterval(id);
      window.removeEventListener("notifications:updated", handleUpdate as EventListener);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const items = data?.items ?? [];
  const count = data?.unreadCount ?? 0;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`${count} notifications`}
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] transition-colors hover:bg-black/5"
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-bold text-white shadow">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-3 w-96 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl shadow-black/10">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-xs text-[var(--muted)]">{count} unread</p>
            </div>
            <Link href="/notifications" className="text-xs font-medium text-[var(--primary)]" onClick={() => setOpen(false)}>
              Open center
            </Link>
          </div>

          <div className="max-h-96 overflow-auto p-2">
            {items.length ? (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-xl px-3 py-3 transition-colors hover:bg-black/5",
                    item.createdAt ? "" : ""
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-[var(--muted)]">{item.description}</p>
                    </div>
                    <span className="rounded-full bg-black/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {item.type}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-3 py-8 text-center text-sm text-[var(--muted)]">No new notifications.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
