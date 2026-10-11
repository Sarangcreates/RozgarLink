import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";
import App from "./App";
const root = document.getElementById("root")!;
const iconAnimations = new WeakMap<Element, Animation>();
function popIcon(event: Event) {
  // Start on touch-down, before a navigation can replace the clicked icon.
  if (event instanceof MouseEvent && event.type === "click" && event.detail > 0)
    return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const control = (event.target as Element).closest("button, a");
  if (!control || control.matches(":disabled, [aria-disabled='true']")) return;
  control.querySelectorAll<SVGElement>("svg.lucide").forEach((icon) => {
    const target = control.classList.contains("icon-btn") ? control : icon;
    iconAnimations.get(target)?.cancel();
    const base = getComputedStyle(target).transform;
    const transform = base === "none" ? "" : base;
    iconAnimations.set(
      target,
      target.animate(
        [
          { transform: `${transform} translateY(0) scale(1)`, offset: 0 },
          {
            transform: `${transform} translateY(-8px) scale(1.45)`,
            offset: 0.35,
          },
          {
            transform: `${transform} translateY(2px) scale(0.92)`,
            offset: 0.7,
          },
          { transform: `${transform} translateY(0) scale(1)`, offset: 1 },
        ],
        { duration: 550, easing: "ease-out" },
      ),
    );
  });
}
root.addEventListener("pointerdown", popIcon);
root.addEventListener("click", popIcon);
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
