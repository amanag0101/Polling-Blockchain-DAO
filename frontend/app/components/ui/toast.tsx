import React, { useEffect, useState } from "react";

export interface ToastProps {
  message: string;
  timeout?: number;
  type: "error" | "success";
}

const Toast: React.FC<ToastProps> = ({ message, timeout = 5000, type }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, timeout);

    return () => {
      clearTimeout(timer);
    };
  }, [timeout]);

  return (
    <div
      className={`${
        type === "success" ? "bg-[#33bcb0]" : "bg-[#b51414]"
      } text-white fixed bottom-4 left-4 py-2 px-6 transition-opacity ${
        visible ? "opacity-100 z-10" : "opacity-0"
      }`}
    >
      {message}
    </div>
  );
};

export default Toast;
