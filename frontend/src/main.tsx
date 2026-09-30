
  import { createRoot } from "react-dom/client";
  import { Haptics, ImpactStyle } from '@capacitor/haptics';
  import App from "./app/App.tsx";
  import "./styles/index.css";

  // Global click interceptor for instant haptic feedback on all tappable elements
  if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const isClickable = target.closest('button, a, [role="button"], .cursor-pointer');
      if (isClickable) {
        try {
          Haptics.impact({ style: ImpactStyle.Light });
        } catch (err) {}
      }
    }, { capture: true, passive: true });
  }

  createRoot(document.getElementById("root")!).render(<App />);
  