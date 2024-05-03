import { createContext } from "react";
import { ToastProps } from "../components/ui/toast";

export const ToastContext = createContext({
  toast: null as ToastProps | null,
  setToast: (toast: ToastProps | null) => {},
  setToastKey: (key: (prev: number) => number) => {},
});
