import * as React from "react";

/** Escucha navigator.onLine y los eventos online/offline de window. */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(true);
  React.useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return isOnline;
}
