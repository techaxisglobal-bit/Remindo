"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white dark:group-[.toaster]:bg-[#0a0a0a] group-[.toaster]:text-gray-900 dark:group-[.toaster]:text-gray-100 group-[.toaster]:border-gray-100 dark:group-[.toaster]:border-white/[0.04] group-[.toaster]:shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:group-[.toaster]:shadow-[0_8px_30px_rgba(0,0,0,0.4)] group-[.toaster]:rounded-2xl group-[.toaster]:border font-sans px-4 py-3 text-[13px] font-medium",
          description: "group-[.toast]:text-gray-500 dark:group-[.toast]:text-gray-400 text-xs mt-1",
          actionButton:
            "group-[.toast]:bg-[#e0b596] group-[.toast]:text-white group-[.toast]:font-bold group-[.toast]:rounded-lg",
          cancelButton:
            "group-[.toast]:bg-gray-100 dark:group-[.toast]:bg-gray-800 group-[.toast]:text-gray-600 dark:group-[.toast]:text-gray-300 group-[.toast]:rounded-lg",
          success: "group-[.toaster]:border-[#e0b596]/30",
          error: "group-[.toaster]:border-red-200 dark:group-[.toaster]:border-red-900/30 group-[.toast]:text-red-600 dark:group-[.toast]:text-red-400",
          warning: "group-[.toaster]:border-amber-200 dark:group-[.toaster]:border-amber-900/30 group-[.toast]:text-amber-600 dark:group-[.toast]:text-amber-400",
          info: "group-[.toaster]:border-blue-200 dark:group-[.toaster]:border-blue-900/30 group-[.toast]:text-blue-600 dark:group-[.toast]:text-blue-400",
        },
      }}
      style={{
        marginTop: "calc(env(safe-area-inset-top) + 8px)",
      }}
      {...props}
    />
  );
};

export { Toaster };
