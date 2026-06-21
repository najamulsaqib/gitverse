// Per-row layout for the history graph, modelled on VS Code's Source Control
// Graph (swimlanes).
//
// Each row is self-contained: it knows the line segments that cross it (top edge
// → bottom edge) and where its node sits, so the list virtualises cleanly and
// stays fast at any history length. Unlike a column-with-holes model, swimlanes
// are a *compact, ordered* list of active branch tips — a lane is created when a
// branch first appears and removed the moment it converges, so columns never
// leave gaps and every segment is drawn between two real lanes (nothing dangles).

import type { Commit } from "@/types";

export const ROW_H = 28;
export const LANE_W = 14;
/** Left inset before the first lane (room for the node radius). */
export const GRAPH_PAD = 9;
/** Gap between the rightmost lane and commit text. */
export const GRAPH_GAP = 6;
export const NODE_R = 4;
export const LINE_W = 1.75;
/** Corner radius for the rounded swimlane bends. */
export const CURVE_R = 5;
/** Side-panel background — nodes ring themselves with it to read over rails. */
export const PANEL_BG = "#13111f";

/** Lane palette, cycled in lane-creation order (VS Code assigns colour per lane, not per column). */
export const LANE_COLORS = ["#7b72e8", "#1dccb2", "#e8a04e", "#e85b8a", "#5b9ef0", "#c678e8", "#8fd14f", "#4fd1d1"];

const cx = (col: number) => GRAPH_PAD + col * LANE_W;

/** One drawn line crossing a row, in row-local coordinates (0 = top edge, ROW_H = bottom edge). */
export interface RowSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

export interface RowNode {
  col: number;
  x: number;
  color: string;
  merge: boolean;
  /** True for the commit HEAD points at. */
  head: boolean;
}

export interface RowLayout {
  node: RowNode;
  segments: RowSegment[];
  /** Gutter width for this row — text starts immediately after. */
  width: number;
}

export interface GraphLayout {
  rows: RowLayout[];
  /** Gutter width shared by every row so commit text aligns. */
  width: number;
}

interface Swimlane {
  /** Hash this lane is heading toward. */
  id: string;
  color: string;
}

/**
 * Walk the commit list (newest first, parents always later thanks to
 * --topo-order) maintaining one swimlane per active branch tip, and emit the
 * line segments for each row.
 */
export function buildGraph(commits: Commit[]): GraphLayout {
  let lanes: Swimlane[] = []; // output swimlanes of the previous row = inputs of this one
  let colorSeq = 0;
  const nextColor = () => LANE_COLORS[colorSeq++ % LANE_COLORS.length];

  const rows: RowLayout[] = [];
  let maxCol = 0;
  const midY = ROW_H / 2;

  for (let i = 0; i < commits.length; i++) {
    const c = commits[i];
    const parents = c.parents || [];
    const inputs = lanes; // top edge

    const outputs: Swimlane[] = [];
    // For each input lane: the output column it continues into, or -1 if it
    // terminates at this commit's node.
    const dest: number[] = new Array(inputs.length).fill(-1);

    let nodeCol = -1;
    let nodeColor = "";
    let nodeOutCol = -1; // column the first parent continues in (-1 = root)
    let firstParentDone = false;

    for (let j = 0; j < inputs.length; j++) {
      const s = inputs[j];
      if (s.id === c.hash) {
        // This lane reaches the node. The first such lane keeps its colour and
        // carries on to the first parent; any duplicates simply converge in.
        if (!firstParentDone) {
          nodeCol = j;
          nodeColor = s.color;
          firstParentDone = true;
          if (parents.length > 0) {
            nodeOutCol = outputs.length;
            outputs.push({ id: parents[0], color: s.color });
          }
        }
      } else {
        dest[j] = outputs.length;
        outputs.push(s);
      }
    }

    // No loaded child reserved a lane → this commit is a fresh tip.
    if (nodeCol === -1) {
      nodeColor = nextColor();
      if (parents.length > 0) {
        nodeOutCol = outputs.length;
        outputs.push({ id: parents[0], color: nodeColor });
        nodeCol = nodeOutCol;
      } else {
        nodeCol = outputs.length; // root with no parents
      }
    }

    // Extra parents (merges) reuse an existing lane heading there, else open one.
    const mergeOut: { col: number; color: string }[] = [];
    for (let pi = 1; pi < parents.length; pi++) {
      const p = parents[pi];
      let col = outputs.findIndex((s) => s.id === p);
      let color: string;
      if (col === -1) {
        color = nextColor();
        col = outputs.length;
        outputs.push({ id: p, color });
      } else {
        color = outputs[col].color;
      }
      mergeOut.push({ col, color });
    }

    // ---- segments for this row ----
    const segments: RowSegment[] = [];
    const nodeX = cx(nodeCol);

    for (let j = 0; j < inputs.length; j++) {
      const x1 = cx(j);
      if (dest[j] === -1) {
        // Terminates into the node (top edge → node centre).
        segments.push({ x1, y1: 0, x2: nodeX, y2: midY, color: inputs[j].color });
      } else {
        // Passes through (top edge → bottom edge).
        segments.push({ x1, y1: 0, x2: cx(dest[j]), y2: ROW_H, color: inputs[j].color });
      }
    }
    if (nodeOutCol !== -1) {
      segments.push({ x1: nodeX, y1: midY, x2: cx(nodeOutCol), y2: ROW_H, color: nodeColor });
    }
    for (const m of mergeOut) {
      segments.push({ x1: nodeX, y1: midY, x2: cx(m.col), y2: ROW_H, color: m.color });
    }

    const rowMaxCol = Math.max(nodeCol, inputs.length - 1, outputs.length - 1, 0);
    rows.push({
      node: {
        col: nodeCol,
        x: nodeX,
        color: nodeColor,
        merge: parents.length > 1,
        head: (c.refs || []).some((r) => r.head),
      },
      segments,
      width: cx(rowMaxCol) + NODE_R + GRAPH_GAP,
    });

    maxCol = Math.max(maxCol, rowMaxCol);
    lanes = outputs;
  }

  return { rows, width: cx(maxCol) + NODE_R + GRAPH_GAP };
}
