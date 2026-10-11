import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";

function wavePath(x: number) {
  return `M-120 330 C${x - 300} 330 ${x - 190} 45 ${x} 45 C${x + 190} 45 ${x + 300} 330 1320 330`;
}

export default function HoverWaveGrid({ children }: { children: ReactNode }) {
  const path = useRef<SVGPathElement>(null);
  const current = useRef(600);
  const target = useRef(600);
  const frame = useRef<number>();
  const previousTime = useRef<number>();
  const [active, setActive] = useState(false);
  useEffect(
    () => () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    },
    [],
  );

  function follow(time: number) {
    const elapsed = Math.min(50, time - (previousTime.current ?? time - 16));
    previousTime.current = time;
    current.current +=
      (target.current - current.current) * (1 - Math.exp(-elapsed / 95));
    if (Math.abs(target.current - current.current) < 0.5)
      current.current = target.current;
    path.current?.setAttribute("d", wavePath(current.current));
    if (current.current !== target.current)
      frame.current = requestAnimationFrame(follow);
    else {
      frame.current = undefined;
      previousTime.current = undefined;
    }
  }
  function animateTo(x: number) {
    target.current = x;
    if (frame.current === undefined)
      frame.current = requestAnimationFrame(follow);
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setActive(true);
    animateTo(
      Math.max(
        100,
        Math.min(1100, ((event.clientX - bounds.left) / bounds.width) * 1200),
      ),
    );
  }

  return (
    <div
      className={`how-grid${active ? " wave-active" : ""}`}
      onPointerEnter={move}
      onPointerMove={move}
      onPointerLeave={() => {
        setActive(false);
        animateTo(600);
      }}
    >
      <svg
        className="how-wave"
        viewBox="0 0 1200 400"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          ref={path}
          d={wavePath(600)}
          fill="none"
          stroke="currentColor"
          strokeWidth="32"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {children}
    </div>
  );
}
