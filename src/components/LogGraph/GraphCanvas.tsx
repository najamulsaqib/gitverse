import { memo, useLayoutEffect, useRef } from "react";
import { CURVE_R, LINE_W, NODE_R, PANEL_BG, ROW_H, type RowLayout } from "@/components/LogGraph/graph";

interface GraphCanvasProps {
  rows: RowLayout[];
  start: number;
  end: number;
  selectedHash?: string | null;
  /** Parallel to rows — same length as full commit list. */
  hashes: readonly string[];
}

/** Stroke a swimlane connector with rounded corners (VS Code style). */
function drawConnector(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string) {
  const path = new Path2D();
  if (x1 === x2) {
    path.moveTo(x1, y1);
    path.lineTo(x2, y2);
  } else {
    // Bend horizontally at the midpoint, easing each corner with a quadratic curve.
    const midY = (y1 + y2) / 2;
    const dir = x2 > x1 ? 1 : -1;
    const r = Math.min(CURVE_R, Math.abs(x2 - x1) / 2, Math.abs(midY - y1), Math.abs(y2 - midY));
    path.moveTo(x1, y1);
    path.lineTo(x1, midY - r);
    path.quadraticCurveTo(x1, midY, x1 + dir * r, midY);
    path.lineTo(x2 - dir * r, midY);
    path.quadraticCurveTo(x2, midY, x2, midY + r);
    path.lineTo(x2, y2);
  }

  // Draw glow rail (soft, thicker background line)
  ctx.save();
  ctx.lineWidth = LINE_W * 2.5;
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.12;
  ctx.stroke(path);
  ctx.restore();

  // Draw main connector (sharp foreground line)
  ctx.save();
  ctx.lineWidth = LINE_W;
  ctx.strokeStyle = color;
  ctx.stroke(path);
  ctx.restore();
}

function GraphCanvasImpl({ rows, start, end, selectedHash, hashes }: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  let width = 0;
  for (let i = start; i < end; i++) width = Math.max(width, rows[i]?.width ?? 0);
  const height = Math.max(0, end - start) * ROW_H;

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || end <= start || width <= 0 || height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const w = Math.ceil(width * dpr);
    const h = Math.ceil(height * dpr);
    // We set the canvas width/height in device pixels, but style it
    // in CSS pixels. This ensures crisp lines on high-DPI displays.
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const cy = ROW_H / 2;

    for (let i = start; i < end; i++) {
      const row = rows[i];
      if (!row) continue;
      const dy = (i - start) * ROW_H;
      const { node, segments } = row;
      const selected = hashes[i] === selectedHash;

      ctx.save();
      ctx.translate(0, dy);

      for (const s of segments) {
        drawConnector(ctx, s.x1, s.y1, s.x2, s.y2, s.color);
      }

      const nx = node.x;
      const ny = cy;

      if (node.head) {
        // HEAD commit node (glowing halo + filled color + white center dot)
        ctx.save();
        ctx.fillStyle = node.color;
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.arc(nx, ny, NODE_R + 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.arc(nx, ny, NODE_R, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(nx, ny, NODE_R - 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (node.merge) {
        // Merge commit node (double concentric rings)
        ctx.save();
        ctx.fillStyle = PANEL_BG;
        ctx.beginPath();
        ctx.arc(nx, ny, NODE_R + 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = node.color;
        ctx.lineWidth = 1.75;
        ctx.beginPath();
        ctx.arc(nx, ny, NODE_R + 1.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(nx, ny, NODE_R - 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Regular commit node (glowing high-tech ring with a tiny center dot)
        ctx.save();
        ctx.fillStyle = PANEL_BG;
        ctx.beginPath();
        ctx.arc(nx, ny, NODE_R, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = node.color;
        ctx.lineWidth = 1.75;
        ctx.beginPath();
        ctx.arc(nx, ny, NODE_R, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(nx, ny, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (selected) {
        ctx.save();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(nx, ny, NODE_R + 3.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    }
  }, [rows, start, end, selectedHash, hashes, width, height]);

  if (end <= start || width <= 0) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute left-0 pointer-events-none"
      style={{ top: start * ROW_H, width, height }}
      aria-hidden="true"
    />
  );
}

export const GraphCanvas = memo(GraphCanvasImpl);
