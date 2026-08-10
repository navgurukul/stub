"use client";

import React, { useState, useEffect, useRef } from "react";
import { TeamCanvasProps } from "@/lib/team-structure-type";
import { cn } from "@/lib/utils";
import { TreeNode } from "./TreeNode";

export function TeamCanvas({
  filteredData,
  expandedKeys,
  onToggle,
  searchQuery,
  matchedEmails,
  focusedEmail,
  onSelectNode,
  pan,
  setPan,
  zoom,
  setZoom,
}: TeamCanvasProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Handle active wheel zooming on the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = 0.05;
      const direction = e.deltaY < 0 ? 1 : -1;
      setZoom((prev) => {
        const nextZoom = prev + direction * zoomFactor;
        return Math.min(Math.max(nextZoom, 0.3), 2.0);
      });
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [setZoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("input") ||
      target.closest("a") ||
      target.closest("select")
    ) {
      return;
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={cn(
        "w-full h-full relative overflow-hidden select-none",
        isDragging ? "cursor-grabbing" : "cursor-grab"
      )}
    >
      {/* Tree Transform Layer */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "top center",
          transition: isDragging ? "none" : "transform 0.1s ease-out",
        }}
        className="absolute top-30 left-1/2 -translate-x-1/2 flex flex-row gap-10 px-12 items-start justify-center"
      >
        {filteredData.map((rootNode) => (
          <TreeNode
            key={rootNode.email}
            node={rootNode}
            expandedKeys={expandedKeys}
            onToggle={onToggle}
            searchQuery={searchQuery}
            matchedEmails={matchedEmails}
            focusedEmail={focusedEmail}
            onSelectNode={onSelectNode}
          />
        ))}
      </div>
    </div>
  );
}
