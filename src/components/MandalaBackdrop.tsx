// Original vector ornament inspired by the reference's layered lotus petals.
const rings = [
  {
    count: 48,
    offset: 0,
    paths: [
      "M500 35 Q462 76 500 132 Q538 76 500 35Z",
      "M500 54 Q480 82 500 112 Q520 82 500 54Z",
    ],
  },
  {
    count: 24,
    offset: 7.5,
    paths: [
      "M500 145 C450 185 548 220 490 262 Q475 282 482 302 C450 285 478 250 460 224 C438 191 471 168 500 145Z",
    ],
  },
  {
    count: 12,
    offset: 0,
    paths: [
      "M500 215 C443 266 410 335 445 401 Q465 446 500 485 Q535 446 555 401 C590 335 557 266 500 215Z",
      "M500 245 C462 285 438 341 465 400 L500 457 L535 400 C562 341 538 285 500 245Z",
      "M500 275 C480 308 463 350 480 391 L500 425 L520 391 C537 350 520 308 500 275Z",
    ],
  },
  {
    count: 12,
    offset: 15,
    paths: [
      "M500 340 C450 368 458 454 500 480 C537 444 550 395 500 340Z",
      "M500 362 Q475 411 500 462 Q525 409 500 362Z",
    ],
  },
];

export default function MandalaBackdrop() {
  return (
    <div className="hero-mandala-backdrop" aria-hidden="true">
      <svg viewBox="0 0 1000 1000" focusable="false">
        <g
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {rings.map((ring, ringIndex) =>
            Array.from({ length: ring.count }, (_, index) => (
              <g
                key={`${ringIndex}-${index}`}
                transform={`rotate(${ring.offset + (index * 360) / ring.count} 500 500)`}
              >
                {ring.paths.map((path) => (
                  <path key={path} d={path} />
                ))}
              </g>
            )),
          )}
          <circle cx="500" cy="500" r="22" />
          <circle cx="500" cy="500" r="29" />
        </g>
      </svg>
    </div>
  );
}
