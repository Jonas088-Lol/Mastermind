/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client"

import { useState, useRef } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"

interface Props {
  itemId: string
  config: {
    instruction?: string
    items: Array<{ id: string; label: string; emoji?: string }>
  }
  value: string[]
  onChange: (v: string[]) => void
  feedback?: { isCorrect: boolean | null; correctOrder?: string[] }
  readOnly?: boolean
}

export function SortingWidget({ itemId, config, value, onChange, feedback, readOnly }: Props) {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const touchItemIdxRef = useRef<number | null>(null)
  const touchCloneRef = useRef<HTMLElement | null>(null)
  const touchOverIdxRef = useRef<number | null>(null)

  const orderedItems = value
    .map(id => config.items.find(i => i.id === id))
    .filter(Boolean) as typeof config.items

  function moveItem(from: number, to: number) {
    if (from === to) return
    const next = [...value]
    const [removed] = next.splice(from, 1)
    next.splice(to, 0, removed)
    onChange(next)
  }

  function moveUp(idx: number) {
    if (idx === 0) return
    moveItem(idx, idx - 1)
  }

  function moveDown(idx: number) {
    if (idx === orderedItems.length - 1) return
    moveItem(idx, idx + 1)
  }

  function handleDragStart(e: React.DragEvent, idx: number) {
    if (readOnly) return
    e.dataTransfer.effectAllowed = "move"
    setDraggedIdx(idx)
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    if (readOnly || draggedIdx === null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverIdx(idx)
  }

  function handleDrop(e: React.DragEvent, idx: number) {
    if (readOnly || draggedIdx === null) return
    e.preventDefault()
    moveItem(draggedIdx, idx)
    setDraggedIdx(null)
    setDragOverIdx(null)
  }

  function handleDragEnd() {
    setDraggedIdx(null)
    setDragOverIdx(null)
  }

  function handleTouchStart(e: React.TouchEvent, idx: number) {
    if (readOnly) return
    touchItemIdxRef.current = idx
    touchOverIdxRef.current = null

    const el = e.currentTarget as HTMLElement
    const rect = el.getBoundingClientRect()
    const clone = el.cloneNode(true) as HTMLElement
    clone.style.position = "fixed"
    clone.style.left = `${rect.left}px`
    clone.style.top = `${rect.top}px`
    clone.style.width = `${rect.width}px`
    clone.style.opacity = "0.8"
    clone.style.pointerEvents = "none"
    clone.style.zIndex = "9999"
    document.body.appendChild(clone)
    touchCloneRef.current = clone
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchItemIdxRef.current === null || !touchCloneRef.current) return
    e.preventDefault()
    const touch = e.touches[0]
    const clone = touchCloneRef.current
    const rect = clone.getBoundingClientRect()
    clone.style.left = `${touch.clientX - rect.width / 2}px`
    clone.style.top = `${touch.clientY - rect.height / 2}px`

    const rowEls = document.querySelectorAll(`[data-sort-row="${itemId}"]`)
    let found: number | null = null
    rowEls.forEach((el, i) => {
      const r = el.getBoundingClientRect()
      if (touch.clientY >= r.top && touch.clientY <= r.bottom) {
        found = i
      }
    })
    touchOverIdxRef.current = found
    setDragOverIdx(found)
  }

  function handleTouchEnd() {
    if (touchCloneRef.current) {
      document.body.removeChild(touchCloneRef.current)
      touchCloneRef.current = null
    }
    if (touchItemIdxRef.current !== null && touchOverIdxRef.current !== null) {
      moveItem(touchItemIdxRef.current, touchOverIdxRef.current)
    }
    touchItemIdxRef.current = null
    touchOverIdxRef.current = null
    setDragOverIdx(null)
  }

  function getPositionFeedback(idx: number): "correct" | "incorrect" | null {
    if (!feedback || feedback.isCorrect === null || !feedback.correctOrder) return null
    return value[idx] === feedback.correctOrder[idx] ? "correct" : "incorrect"
  }

  return (
    <div className="flex flex-col gap-3">
      {config.instruction && (
        <p className="text-sm text-muted-fg">{config.instruction}</p>
      )}

      <div className="flex flex-col gap-2">
        {orderedItems.map((item, idx) => {
          const fb = getPositionFeedback(idx)
          const isDragging = draggedIdx === idx
          const isOver = dragOverIdx === idx && draggedIdx !== idx

          return (
            <div
              key={item.id}
              data-sort-row={itemId}
              draggable={!readOnly}
              onDragStart={e => handleDragStart(e, idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={e => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              onTouchStart={e => handleTouchStart(e, idx)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={[
                "flex items-center gap-2 rounded-lg border-2 bg-surface px-3 py-2 min-h-[44px] transition-all select-none",
                isDragging ? "opacity-40" : "opacity-100",
                isOver ? "border-brand bg-brand/10 translate-y-[-2px]" : "border-border",
                fb === "correct" ? "border-success bg-success/10" : "",
                fb === "incorrect" ? "border-danger bg-danger/10" : "",
                !readOnly ? "cursor-grab active:cursor-grabbing" : "cursor-default"
              ].join(" ")}
            >
              <span className="w-6 h-6 rounded-full bg-bg border border-border flex items-center justify-center text-xs font-bold text-muted-fg shrink-0">
                {idx + 1}
              </span>

              {item.emoji && <span className="shrink-0">{item.emoji}</span>}

              <span className="flex-1 text-sm font-medium text-fg">{item.label}</span>

              {fb === "correct" && (
                <span className="text-success font-bold text-sm shrink-0">✓</span>
              )}
              {fb === "incorrect" && feedback?.correctOrder && (
                <span className="text-danger text-xs shrink-0">
                  → #{feedback.correctOrder.indexOf(item.id) + 1}
                </span>
              )}

              {!readOnly && (
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="w-7 h-7 flex items-center justify-center rounded text-muted-fg hover:text-fg hover:bg-bg transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                    aria-label="Nach oben"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(idx)}
                    disabled={idx === orderedItems.length - 1}
                    className="w-7 h-7 flex items-center justify-center rounded text-muted-fg hover:text-fg hover:bg-bg transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                    aria-label="Nach unten"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {feedback?.isCorrect === false && feedback.correctOrder && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2">
          <p className="text-xs font-medium text-danger mb-1">Richtige Reihenfolge:</p>
          <ol className="flex flex-col gap-1">
            {feedback.correctOrder.map((id, idx) => {
              const item = config.items.find(i => i.id === id)
              if (!item) return null
              return (
                <li key={id} className="text-xs text-fg flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-success/20 text-success flex items-center justify-center font-bold text-[10px] shrink-0">
                    {idx + 1}
                  </span>
                  {item.emoji && <span>{item.emoji}</span>}
                  <span>{item.label}</span>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}
