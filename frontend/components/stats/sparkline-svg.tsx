export function SparklineSvg({ data }: { data: number[] }) {
  const h = 56;
  const w = 400;
  const max = Math.max(...data, 1);
  const step = w / (data.length - 1);
  const pts = data
    .map((v, i) => `${i * step},${h - (v / max) * (h - 4)}`)
    .join(" ");
  const areaPts = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill="url(#spark-fill)" />
      <polyline
        points={pts}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
