import { useProfilesStore } from "@/store/profiles";
import { useReposStore } from "@/store/repos";

const LANE_COLORS = ["#7b72e8", "#1dccb2", "#e0a94e", "#c4c0ff"];

const ROW = 42;
const LANE = 16;
const PAD = 16;
const R = 4.5;

export function HistoryPane() {
  const accounts = useProfilesStore((s) => s.accounts);
  const repoId = useReposStore((s) => s.repoId);
  const commits = useReposStore((s) => s.historyByRepo[repoId]) ?? [];
  const selected = useReposStore((s) => s.selCommit);
  const onSelect = useReposStore((s) => s.selectCommit);

  const laneColor = (l: number) => LANE_COLORS[l % LANE_COLORS.length];
  const maxLane = commits.reduce((m, c) => Math.max(m, c.lane || 0), 0);
  const graphW = PAD + maxLane * LANE + PAD;
  const nodeX = (l: number) => PAD + (l || 0) * LANE;
  const nodeY = (i: number) => i * ROW + ROW / 2;

  const idx: Record<string, { row: number; lane: number }> = {};
  commits.forEach((c, i) => {
    idx[c.hash] = { row: i, lane: c.lane || 0 };
  });

  const edges: { d: string; color: string }[] = [];
  commits.forEach((c, i) => {
    (c.parents || []).forEach((p) => {
      const par = idx[p];
      if (!par) return;
      const x1 = nodeX(c.lane || 0);
      const y1 = nodeY(i);
      const x2 = nodeX(par.lane);
      const y2 = nodeY(par.row);
      const color = laneColor(Math.max(c.lane || 0, par.lane));
      let d: string;
      if (x1 === x2) d = `M${x1} ${y1} L${x2} ${y2}`;
      else {
        const my = y1 + ROW * 0.62;
        d = `M${x1} ${y1} C ${x1} ${my}, ${x2} ${y2 - ROW * 0.62}, ${x2} ${y2}`;
      }
      edges.push({ d, color });
    });
  });

  const totalH = commits.length * ROW;

  return (
    <div className="flex-1 overflow-auto py-2 px-1.5">
      <div className="relative" style={{ height: totalH, paddingLeft: graphW }}>
        <svg
          className="absolute top-0 left-0 pointer-events-none overflow-visible"
          width={graphW}
          height={totalH}
          style={{ width: graphW, height: totalH }}
        >
          {edges.map((e, i) => (
            <path key={i} d={e.d} stroke={e.color} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.85} />
          ))}
          {commits.map((c, i) => {
            const x = nodeX(c.lane || 0);
            const y = nodeY(i);
            const col = laneColor(c.lane || 0);
            const merge = (c.parents || []).length > 1;
            return (
              <g key={c.hash}>
                <circle cx={x} cy={y} r={R + 3} fill={col} opacity={0.18} />
                <circle cx={x} cy={y} r={R} fill={merge ? "var(--color-bg)" : col} stroke={col} strokeWidth={merge ? 2.5 : 0} />
                {merge && <circle cx={x} cy={y} r={1.6} fill={col} />}
              </g>
            );
          })}
        </svg>
        {commits.map((c) => {
          const a = accounts.find((x) => x.id === c.by) || accounts[0];
          const tip = `${c.subject}\n\n${a.name} <${a.email}>\n${c.when} · ${c.hash}${c.flag ? `\n⚠ committed as ${a.label}, not this repo's owner` : ""
            }`;
          const rc = laneColor(c.lane || 0);
          const isSel = selected === c.hash;
          return (
            <div
              key={c.hash}
              className={`group relative flex items-center gap-2 pr-2.5 pl-0.5 rounded-[7px] cursor-pointer transition-colors duration-100 hover:bg-surface-2 ${isSel ? "bg-indigo/[0.14]" : ""
                }`}
              style={{ height: ROW }}
              onClick={() => onSelect(c.hash)}
              title={tip}
            >
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                {(c.refs || []).map((r) => (
                  <span
                    key={r.name}
                    className="inline-flex items-center gap-1 font-mono text-[9.5px] font-semibold rounded-full py-px pr-1.5 pl-1.25 whitespace-nowrap flex-none leading-normal"
                    style={{
                      color: rc,
                      background: `color-mix(in srgb, ${rc} 15%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${rc} 42%, transparent)`,
                    }}
                  >
                    {r.head && (
                      <span
                        className="text-[7.5px] font-bold rounded-[9px] px-1 py-px tracking-[0.04em]"
                        style={{ background: rc, color: "#0b0a16" }}
                      >
                        HEAD
                      </span>
                    )}
                    {r.name}
                  </span>
                ))}
                <span
                  className={`flex-1 min-w-0 text-[12.5px] whitespace-nowrap overflow-hidden text-ellipsis text-text-2 group-hover:text-text ${isSel ? "text-text font-medium" : ""
                    }`}
                >
                  {c.subject}
                </span>
              </div>
              <div
                className={`flex-none w-4.5 h-4.5 rounded-md grid place-items-center text-[#0b0a16] font-bold text-[8px] ${c.flag ? "shadow-[0_0_0_1.5px_var(--color-bg),0_0_0_3px_var(--color-amber)]" : ""
                  }`}
                style={{ background: `linear-gradient(150deg, ${a.color}, ${a.color}bb)` }}
              >
                {a.initials}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
