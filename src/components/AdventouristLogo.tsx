const AdventouristLogo = ({ size = 48 }: { size?: number }) => {
  const half = size / 2;
  const gap = 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      {/* Sun - top left */}
      <rect x={0} y={0} width={half - gap} height={half - gap} rx={4} fill="hsl(var(--blaze))" />
      <circle cx={half / 2 - gap / 2} cy={half / 2 - gap / 2} r={6} fill="hsl(var(--horizon))" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const r = 9;
        const cx = half / 2 - gap / 2 + Math.cos((angle * Math.PI) / 180) * r;
        const cy = half / 2 - gap / 2 + Math.sin((angle * Math.PI) / 180) * r;
        return <circle key={angle} cx={cx} cy={cy} r={1.2} fill="hsl(var(--horizon))" />;
      })}

      {/* Mountains - top right */}
      <rect x={half + gap} y={0} width={half - gap} height={half - gap} rx={4} fill="hsl(var(--ridge))" />
      <polygon
        points={`${half + gap + 4},${half - gap - 2} ${half + gap + (half - gap) / 2},${4} ${size - 4},${half - gap - 2}`}
        fill="hsl(var(--lagoon))"
        opacity={0.8}
      />

      {/* Waves - bottom left */}
      <rect x={0} y={half + gap} width={half - gap} height={half - gap} rx={4} fill="hsl(var(--lagoon))" />
      <path
        d={`M ${2} ${half + gap + (half - gap) / 2} Q ${(half - gap) / 4} ${half + gap + (half - gap) / 2 - 6}, ${(half - gap) / 2} ${half + gap + (half - gap) / 2} Q ${(3 * (half - gap)) / 4} ${half + gap + (half - gap) / 2 + 6}, ${half - gap - 2} ${half + gap + (half - gap) / 2}`}
        stroke="white"
        strokeWidth={1.5}
        fill="none"
      />

      {/* Heart - bottom right */}
      <rect x={half + gap} y={half + gap} width={half - gap} height={half - gap} rx={4} fill="hsl(var(--horizon))" />
      <path
        d={`M ${half + gap + (half - gap) / 2} ${half + gap + (half - gap) * 0.7} 
          C ${half + gap + 3} ${half + gap + (half - gap) * 0.45}, ${half + gap + 3} ${half + gap + 5}, ${half + gap + (half - gap) / 2} ${half + gap + (half - gap) * 0.38}
          C ${size - 3} ${half + gap + 5}, ${size - 3} ${half + gap + (half - gap) * 0.45}, ${half + gap + (half - gap) / 2} ${half + gap + (half - gap) * 0.7} Z`}
        fill="hsl(var(--blaze))"
      />
    </svg>
  );
};

export default AdventouristLogo;
