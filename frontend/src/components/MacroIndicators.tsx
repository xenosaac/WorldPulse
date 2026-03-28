'use client';

interface Indicator {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  sparkline: number[];
}

const INDICATORS: Indicator[] = [
  { label: 'WTI Crude', value: '$87.42', change: '+3.2%', positive: false, sparkline: [72, 74, 73, 78, 82, 79, 84, 87] },
  { label: 'Baltic Dry', value: '1,847', change: '+12.1%', positive: false, sparkline: [1420, 1510, 1580, 1620, 1710, 1780, 1820, 1847] },
  { label: 'Semi Index', value: '4,291', change: '-5.8%', positive: false, sparkline: [4600, 4550, 4480, 4420, 4380, 4350, 4310, 4291] },
  { label: 'VIX', value: '28.4', change: '+41%', positive: false, sparkline: [16, 18, 19, 21, 23, 24, 26, 28] },
  { label: 'DXY', value: '104.2', change: '+0.8%', positive: true, sparkline: [102, 102.5, 103, 103.2, 103.5, 103.8, 104, 104.2] },
];

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 20;
  const w = 48;
  const step = w / (data.length - 1);

  const points = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');

  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export default function MacroIndicators() {
  return (
    <section className="space-y-2 pt-3">
      <span className="text-xs font-light text-slate-300">Macro indicators</span>
      <div className="space-y-0.5">
        {INDICATORS.map((ind) => (
          <div key={ind.label} className="flex items-center justify-between py-1.5 px-2 rounded bg-slate-800/20">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-500 truncate">{ind.label}</p>
              <p className="data-mono text-[11px] text-slate-200">{ind.value}</p>
            </div>
            <Sparkline data={ind.sparkline} color={ind.change.startsWith('-') ? '#ef4444' : '#2dd4bf'} />
            <span className={`data-mono text-[9px] ml-2 ${ind.change.startsWith('-') ? 'text-red-500' : 'text-primary'}`}>
              {ind.change}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
