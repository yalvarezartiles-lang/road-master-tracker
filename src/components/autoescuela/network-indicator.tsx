import * as React from "react";
import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useStore } from "@/lib/autoescuela/store";
import { readPending, writePending } from "@/lib/autoescuela/offline-queue";

let syncing = false;

/** Icono de sin conexión + sincronización diferida de evaluaciones pendientes. */
export function NetworkIndicator() {
  const isOnline = useNetworkStatus();
  const { addLesson } = useStore();

  React.useEffect(() => {
    if (!isOnline || syncing) return;
    const pending = readPending();
    if (!pending.length) return;
    syncing = true;
    void (async () => {
      const failed = [];
      for (const item of pending) {
        try {
          await addLesson(item.studentId, item.input);
        } catch {
          failed.push(item);
        }
      }
      writePending(failed);
      syncing = false;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  if (isOnline) return null;
  return (
    <span
      role="status"
      aria-label="Sin conexión"
      title="Sin conexión"
      className="relative flex size-9 items-center justify-center rounded-xl border border-destructive/40 bg-destructive/10 text-destructive md:size-12 md:rounded-2xl"
    >
      <WifiOff className="size-5" />
    </span>
  );
}
