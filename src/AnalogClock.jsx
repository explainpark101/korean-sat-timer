/**
 * Analog exam clock.
 * Hand angles must not double-count minutes: either use fractional hours * 30 only,
 * or integer hours * 30 + minutes * 0.5 — never both.
 */
export default function AnalogClock({ currentSec, isDark, large = false }) {
  const totalSec = Math.max(0, Number(currentSec) || 0);

  const seconds = Math.floor(totalSec % 60);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const hours = Math.floor(totalSec / 3600) % 12;

  // Classic clock angles (no double-counting on the hour hand)
  const secAngle = seconds * 6;
  const minAngle = minutes * 6 + seconds * 0.1;
  const hourAngle = hours * 30 + minutes * 0.5;

  const rim = isDark ? '#424245' : '#e0e0e0';
  const face = isDark ? '#1d1d1f' : '#ffffff';
  const hourStroke = isDark ? '#f5f5f7' : '#1d1d1f';
  const tickMinor = isDark ? '#6e6e73' : '#cccccc';
  const minuteStroke = isDark ? '#a1a1a6' : '#333333';
  const label = isDark ? '#86868b' : '#7a7a7a';
  const accent = isDark ? '#2997ff' : '#0066cc';
  const pivotDot = isDark ? '#1d1d1f' : '#ffffff';

  return (
    <div
      className={`relative mx-auto aspect-square w-full p-2 ${
        large
          ? 'max-w-[min(92vw,calc(100vh-6rem))]'
          : 'my-2 max-w-[340px] sm:max-w-[380px]'
      }`}
    >
      <svg
        viewBox="0 0 300 300"
        className="h-full w-full"
        style={{
          filter: isDark
            ? 'drop-shadow(3px 5px 30px rgba(0, 0, 0, 0.55))'
            : 'drop-shadow(3px 5px 30px rgba(0, 0, 0, 0.22))',
        }}
      >
        <circle cx="150" cy="150" r="146" fill={rim} />
        <circle cx="150" cy="150" r="138" fill={face} />

        {Array.from({ length: 60 }).map((_, i) => {
          const isHour = i % 5 === 0;
          const angle = i * 6;
          const rad = (angle - 90) * (Math.PI / 180);
          const rInner = isHour ? 116 : 124;
          const rOuter = 132;
          const x1 = 150 + rInner * Math.cos(rad);
          const y1 = 150 + rInner * Math.sin(rad);
          const x2 = 150 + rOuter * Math.cos(rad);
          const y2 = 150 + rOuter * Math.sin(rad);

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isHour ? hourStroke : tickMinor}
              strokeWidth={isHour ? 2.5 : 1}
              strokeLinecap="round"
            />
          );
        })}

        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => {
          const angle = num * 30;
          const rad = (angle - 90) * (Math.PI / 180);
          const r = 100;
          const x = 150 + r * Math.cos(rad);
          const y = 150 + r * Math.sin(rad);

          return (
            <text
              key={num}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={hourStroke}
              style={{
                fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif',
                fontSize: '18px',
                fontWeight: 600,
                letterSpacing: '-0.28px',
                userSelect: 'none',
              }}
            >
              {num}
            </text>
          );
        })}

        <text
          x="150"
          y="105"
          textAnchor="middle"
          fill={label}
          style={{
            fontFamily: 'SF Pro Text, system-ui, -apple-system, sans-serif',
            fontSize: '10px',
            fontWeight: 400,
            letterSpacing: '-0.08px',
            userSelect: 'none',
          }}
        >
          수능 실전 타이머
        </text>

        <line
          x1="150"
          y1="150"
          x2={150 + 58 * Math.cos((hourAngle - 90) * (Math.PI / 180))}
          y2={150 + 58 * Math.sin((hourAngle - 90) * (Math.PI / 180))}
          stroke={hourStroke}
          strokeWidth="6"
          strokeLinecap="round"
        />

        <line
          x1="150"
          y1="150"
          x2={150 + 88 * Math.cos((minAngle - 90) * (Math.PI / 180))}
          y2={150 + 88 * Math.sin((minAngle - 90) * (Math.PI / 180))}
          stroke={minuteStroke}
          strokeWidth="4"
          strokeLinecap="round"
        />

        <line
          x1="150"
          y1="150"
          x2={150 + 112 * Math.cos((secAngle - 90) * (Math.PI / 180))}
          y2={150 + 112 * Math.sin((secAngle - 90) * (Math.PI / 180))}
          stroke={accent}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="150"
          y1="150"
          x2={150 - 24 * Math.cos((secAngle - 90) * (Math.PI / 180))}
          y2={150 - 24 * Math.sin((secAngle - 90) * (Math.PI / 180))}
          stroke={accent}
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        <circle cx="150" cy="150" r="6" fill={accent} />
        <circle cx="150" cy="150" r="2.5" fill={pivotDot} />
      </svg>
    </div>
  );
}
