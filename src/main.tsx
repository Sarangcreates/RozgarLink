import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import App from "./App";
const root = document.getElementById("root")!;
const iconAnimations = new WeakMap<SVGElement, Animation>();
root.addEventListener("click", (event) => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const control = (event.target as Element).closest("button, a");
  if (!control || control.matches(":disabled, [aria-disabled='true']")) return;
  control.querySelectorAll<SVGElement>("svg.lucide").forEach((icon) => {
    iconAnimations.get(icon)?.cancel();
    iconAnimations.set(
      icon,
      icon.animate(
        [
          { scale: "1", offset: 0 },
          { scale: "1.3", offset: 0.4 },
          { scale: "0.95", offset: 0.75 },
          { scale: "1", offset: 1 },
        ],
        { duration: 360, easing: "ease-out" },
      ),
    );
  });
});
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
