"use client";

import { STAT_INFO, type Stat, type StatName } from "@/lib/types";

interface RadarChartProps {
  stats: Stat[];
  size?: number;
}

const STAT_ORDER: StatName[] = ["STR", "END", "DEX", "INT", "WIS", "CHA"];
const MAX_DISPLAY_LEVEL = 50; // Visual cap for the radar

export function RadarChart({ stats, size = 280 }: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;
  const rings = 5;

  // Sort stats into display order
  const ordered = STAT_ORDER.map(
    (name) => stats.find((s) => s.stat_name === name)!
  ).filter(Boolean);

  const numStats = ordered.length;
  const angleStep = (2 * Math.PI) / numStats;

  // Get point on the radar for a given stat index and value (0-1)
  function getPoint(index: number, value: number): { x: number; y: number } {
    const angle = angleStep * index - Math.PI / 2; // Start from top
    return {
      x: cx + radius * value * Math.cos(angle),
      y: cy + radius * value * Math.sin(angle),
    };
  }

  // Build the data polygon
  const dataPoints = ordered.map((stat, i) => {
    const value = Math.min(stat.level / MAX_DISPLAY_LEVEL, 1);
    return getPoint(i, Math.max(value, 0.04)); // Min 4% so level 1 is visible
  });

  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  // Ring paths
  const ringPaths = Array.from({ length: rings }, (_, ringIndex) => {
    const ringValue = (ringIndex + 1) / rings;
    const points = Array.from({ length: numStats }, (_, i) => getPoint(i, ringValue));
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  });

  // Spoke lines
  const spokes = Array.from({ length: numStats }, (_, i) => {
    const outer = getPoint(i, 1);
    return { x1: cx, y1: cy, x2: outer.x, y2: outer.y };
  });

  // Label positions
  const labels = ordered.map((stat, i) => {
    const point = getPoint(i, 1.2);
    return { stat, ...point };
  });

  return (
    <div className="flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background rings */}
        {ringPaths.map((path, i) => (
          <path
            key={`ring-${i}`}
            d={path}
            fill="none"
            stroke="#1e1e24"
            strokeWidth={1}
          />
        ))}

        {/* Spokes */}
        {spokes.map((spoke, i) => (
          <line
            key={`spoke-${i}`}
            x1={spoke.x1}
            y1={spoke.y1}
            x2={spoke.x2}
            y2={spoke.y2}
            stroke="#1e1e24"
            strokeWidth={1}
          />
        ))}

        {/* Data fill */}
        <path
          d={dataPath}
          fill="rgba(0, 240, 255, 0.08)"
          stroke="rgba(0, 240, 255, 0.4)"
          strokeWidth={1.5}
        />

        {/* Data points with stat-coloured dots */}
        {dataPoints.map((point, i) => {
          const info = STAT_INFO[ordered[i].stat_name];
          return (
            <circle
              key={`point-${i}`}
              cx={point.x}
              cy={point.y}
              r={3.5}
              fill={info.colour}
              stroke={info.colour}
              strokeWidth={1}
              opacity={0.9}
            />
          );
        })}

        {/* Stat labels */}
        {labels.map(({ stat, x, y }) => {
          const info = STAT_INFO[stat.stat_name];
          return (
            <g key={stat.stat_name}>
              <text
                x={x}
                y={y - 6}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={info.colour}
                fontSize={10}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {stat.stat_name}
              </text>
              <text
                x={x}
                y={y + 7}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#737373"
                fontSize={9}
                fontFamily="monospace"
              >
                Lv.{stat.level}
              </text>
            </g>
          );
        })}

        {/* Centre dot */}
        <circle cx={cx} cy={cy} r={2} fill="#2a2a30" />
      </svg>
    </div>
  );
}
