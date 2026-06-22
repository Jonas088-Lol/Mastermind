"use client";

import { useRef, useEffect } from "react";
import type { DisplayNode } from "@/lib/tree-generator";

interface MinimapProps {
  nodes:   DisplayNode[];
  viewX:   number;
  viewY:   number;
  scale:   number;
  width:   number;   // canvas container width
  height:  number;
  onPan:   (wx: number, wy: number) => void;
}

const MM_W = 160;
const MM_H = 100;
const PAD  = 16;

export function Minimap({ nodes, viewX, viewY, scale, width, height, onPan }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs) - 100;
    const maxX = Math.max(...xs) + 100;
    const minY = Math.min(...ys) - 100;
    const maxY = Math.max(...ys) + 100;
    const worldW = maxX - minX || 1;
    const worldH = maxY - minY || 1;

    const toMM = (wx: number, wy: number) => ({
      x: ((wx - minX) / worldW) * MM_W,
      y: ((wy - minY) / worldH) * MM_H,
    });

    ctx.clearRect(0, 0, MM_W, MM_H);

    // Background
    ctx.fillStyle = "rgba(10, 14, 20, 0.92)";
    ctx.roundRect(0, 0, MM_W, MM_H, 8);
    ctx.fill();

    // Edges (simple lines)
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth   = 0.5;
    for (const node of nodes) {
      const pTo = toMM(node.x, node.y);
      for (const prereqId of node.prerequisites) {
        const from = nodes.find((n) => n.id === prereqId);
        if (!from) continue;
        const pFrom = toMM(from.x, from.y);
        ctx.beginPath();
        ctx.moveTo(pFrom.x, pFrom.y);
        ctx.lineTo(pTo.x, pTo.y);
        ctx.stroke();
      }
    }

    // Nodes
    for (const node of nodes) {
      if (node.status === "HIDDEN") continue;
      const { x, y } = toMM(node.x, node.y);
      const r = node.isHub ? 5 : node.type === "fusion" ? 3.5 : 2.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle =
        node.status === "MASTERED" ? node.color :
        node.status === "IN_PROGRESS" ? `${node.color}99` :
        "rgba(255,255,255,0.2)";
      ctx.fill();
    }

    // Viewport rectangle
    const vpLeft   = (-viewX / scale - minX) / worldW * MM_W;
    const vpTop    = (-viewY / scale - minY) / worldH * MM_H;
    const vpWidth  = (width  / scale) / worldW * MM_W;
    const vpHeight = (height / scale) / worldH * MM_H;
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth   = 1;
    ctx.strokeRect(vpLeft, vpTop, vpWidth, vpHeight);
  }, [nodes, viewX, viewY, scale, width, height]);

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx   = e.clientX - rect.left;
    const my   = e.clientY - rect.top;

    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs) - 100;
    const maxX = Math.max(...xs) + 100;
    const minY = Math.min(...ys) - 100;
    const maxY = Math.max(...ys) + 100;

    const wx = minX + (mx / MM_W) * (maxX - minX);
    const wy = minY + (my / MM_H) * (maxY - minY);
    onPan(wx, wy);
  }

  return (
    <div
      style={{ position: "absolute", bottom: PAD, left: PAD, zIndex: 25 }}
      className="rounded-xl overflow-hidden border border-white/10 shadow-xl"
    >
      <canvas
        ref={canvasRef}
        width={MM_W}
        height={MM_H}
        onClick={handleClick}
        style={{ display: "block", cursor: "crosshair" }}
      />
      <div className="absolute top-1 left-1.5 text-[9px] font-bold text-white/30 uppercase tracking-widest pointer-events-none">
        Karte
      </div>
    </div>
  );
}
