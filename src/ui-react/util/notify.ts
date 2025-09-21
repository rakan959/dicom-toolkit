// Adapter that prefers the ToastProvider context if available
export type NotifyVariant = "info" | "success" | "warning" | "error";
export function showNotification(message: string, variant: NotifyVariant = "info") {
  // Try to use a global hook exposed on window by the app root
  const anyWin = globalThis as any;
  const toastApi = anyWin.__DTK_TOAST__ as
    | { notify: (m: string, v?: NotifyVariant) => void }
    | undefined;
  if (toastApi && typeof toastApi.notify === "function") {
    toastApi.notify(message, variant);
    return;
  }
   
  if (typeof window !== "undefined" && typeof (window as any).alert === "function") {
    window.alert(message);
    return;
  }
  // As a fallback in tests or non-browser env
   
  console.log(`NOTICE${variant !== "info" ? `(${variant})` : ""}:`, message);
}
