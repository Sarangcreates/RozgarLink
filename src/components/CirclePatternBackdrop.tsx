export default function CirclePatternBackdrop() {
  return (
    <div className="hero-circle-backdrop" aria-hidden="true">
      <svg viewBox="0 0 1000 1000" focusable="false">
        <g fill="none" stroke="currentColor">
          {Array.from({ length: 24 }, (_, index) => (
            <circle
              key={index}
              cx="500"
              cy="170"
              r="164"
              transform={`rotate(${index * 15} 500 500)`}
            />
          ))}
          <circle cx="500" cy="500" r="166" />
          <circle cx="500" cy="500" r="494" />
        </g>
      </svg>
    </div>
  );
}
