import React from 'react';
import { ArrowDownAZ, ArrowUpAZ, Flag, Trash2 } from 'lucide-react';

const formatLapDelta = (totalSec) => {
  const sign = totalSec < 0 ? '-' : '';
  const abs = Math.abs(totalSec);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = Math.floor(abs % 60);
  if (h > 0) {
    return `${sign}${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function LapPanel({
  period,
  subjectName,
  subjectStartSec,
  laps,
  sortAsc,
  justAddedLapId,
  onToggleSort,
  onRecordLap,
  onClearLaps,
  formatTimeSeconds,
}) {
  const chronological = laps.map((lap, index) => {
    const prevSec = index === 0 ? subjectStartSec : laps[index - 1].examSec;
    return {
      id: lap.id,
      n: index + 1,
      examSec: lap.examSec,
      deltaSec: lap.examSec - prevSec,
    };
  });
  const rows = sortAsc ? chronological : [...chronological].reverse();

  return (
    <div className="mt-10 w-full max-w-xl">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold leading-[1.29] tracking-[-0.224px] text-primary">
            Lap Record
          </p>
          <h3 className="mt-1 font-display text-[21px] font-semibold leading-[1.19] tracking-[0.231px] text-ink">
            랩 기록
          </h3>
          <p className="mt-1 text-[14px] font-normal leading-[1.43] tracking-[-0.224px] text-ink-muted-48">
            {period} · {subjectName} · 교시별 저장
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onRecordLap}
            className="flex h-9 items-center gap-1.5 rounded-sm bg-primary px-3.5 text-[14px] font-normal leading-[1.29] tracking-[-0.224px] text-on-primary active:scale-95"
            title="현재 시험 시각으로 랩 기록"
          >
            <Flag className="h-3.5 w-3.5" />
            랩
          </button>
          <button
            type="button"
            onClick={onClearLaps}
            disabled={laps.length === 0}
            className="flex h-9 items-center gap-1.5 rounded-sm border border-hairline bg-canvas px-3 text-[14px] font-normal leading-[1.29] tracking-[-0.224px] text-ink-muted-80 enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            title="이 교시 랩 전체 삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
            삭제
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-hairline bg-canvas-parchment">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-hairline text-[12px] font-normal leading-none tracking-[-0.12px] text-ink-muted-48">
              <th className="px-4 py-3 font-normal">
                <button
                  type="button"
                  onClick={onToggleSort}
                  className="inline-flex items-center gap-1.5 text-ink-muted-80 active:scale-95"
                  aria-label={
                    sortAsc
                      ? '랩 번호를 내림차순으로 정렬'
                      : '랩 번호를 오름차순으로 정렬'
                  }
                  title={sortAsc ? '내림차순으로 정렬' : '오름차순으로 정렬'}
                >
                  <span>랩</span>
                  {sortAsc ? (
                    <ArrowUpAZ className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <ArrowDownAZ className="h-3.5 w-3.5 text-primary" />
                  )}
                </button>
              </th>
              <th className="px-3 py-3 font-normal">시험 시각</th>
              <th className="px-4 py-3 text-right font-normal">구간 경과</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-8 text-center text-[14px] font-normal leading-[1.43] tracking-[-0.224px] text-ink-muted-48"
                >
                  랩 버튼을 눌러 구간을 기록하세요.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-divider-soft last:border-b-0${
                    row.id === justAddedLapId ? ' lap-row--enter' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-[14px] font-semibold leading-[1.43] tracking-[-0.224px] text-ink">
                    {row.n}
                  </td>
                  <td className="px-3 py-3 font-mono text-[14px] font-normal leading-[1.43] tracking-[-0.224px] text-ink-muted-80">
                    {formatTimeSeconds(row.examSec)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[14px] font-normal leading-[1.43] tracking-[-0.224px] text-primary">
                    {formatLapDelta(row.deltaSec)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
