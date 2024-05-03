"use client";

import { useMemo, useState } from "react";
import { ToastContext } from "./context/toast-context";
import Toast, { ToastProps } from "./components/ui/toast";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [toastKey, setToastKey] = useState<number>(1);
  const toastMemoized = useMemo(
    () => ({ toast, setToast, toastKey, setToastKey }),
    [toast, setToast, toastKey, setToastKey]
  );

  return (
    <html lang="en">
      <body>
        <ToastContext.Provider value={toastMemoized}>
          {children}
          {toast && <Toast key={toastKey} {...toast} />}
        </ToastContext.Provider>
      </body>
    </html>
  );
}
