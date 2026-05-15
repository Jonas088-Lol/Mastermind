"use client"

import { useState, useRef } from "react"

interface Props {
  itemId: string
  config: {
    instruction?: string
    items: Array<{ id: string; label: string; emoji?: string }>
    zones: Array<{ id: string; label: string; maxItems?: number }>
  }
  value: Record<string, string[]>
  onChange: (v: Record<string, string[]>) => void
  feedback?: { isCorrect: boolean | null; correctMapping?: Record<string, string[]> }
  readOnly?: boolean
}

function getAllPlacedIds(value: Record<string, string[]>): Set<string> {
  const placed = new Set<string>()
  for (const ids of Object.values(value)) {
    for (const id of ids) placed.add(id)
  }
  return placed
}

export function DragDropWidget({ itemId, config, value, onChange, feedback, readOnly }: Props) {
  const [draggedItem, setDraggedItem] = useState<{ id: string; fromZone: string | null } | null>(null)
  const [dragOverZone, setDragOverZone] = useState<string | null>(null)

  const touchItemRef = useRef<{ id: string; fromZone: string | null } | null>(null)
  const touchCloneRef = useRef<HTMLElement | null>(null)
  const touchTargetZoneRef = useRef<string | null>(null)

  const placedIds = getAllPlacedIds(value)
  const bankItems = config.items.filter(item => !placedIds.has(item.id))

  function moveItem(itemId: string, fromZone: string | null, toZone: string | null) {
    const next = { ...value }
    if (fromZone) {
      next[fromZone] = (next[fromZone] || []).filter(id => id !== itemId)
    }
    if (toZone) {
      const zone = config.zones.find(z => z.id === toZone)
      const current = next[toZone] || []
      if (zone?.maxItems && current.length >= zone.maxItems) return
      next[toZone] = [...current, itemId]
    }
    onChange(next)
  }

  function handleDragStart(e: React.DragEvent, id: string, fromZone: string | null) {
    if (readOnly) return
    e.dataTransfer.effectAllowed = "move"
    setDraggedItem({ id, fromZone })
  }

  function handleDragOver(e: React.DragEvent, zoneId: string | null) {
    if (readOnly) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverZone(zoneId)
  }

  function handleDrop(e: React.DragEvent, toZone: string | null) {
    if (readOnly || !draggedItem) return
    e.preventDefault()
    moveItem(draggedItem.id, draggedItem.fromZone, toZone)
    setDraggedItem(null)
    setDragOverZone(null)
  }

  function handleDragEnd() {
    setDraggedItem(null)
    setDragOverZone(null)
  }

  function handleTouchStart(e: React.TouchEvent, id: string, fromZone: string | null) {
    if (readOnly) return
    const touch = e.touches[0]
    touchItemRef.current = { id, fromZone }
    touchTargetZoneRef.current = null

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
    if (!touchItemRef.current || !touchCloneRef.current) return
    e.preventDefault()
    const touch = e.touches[0]
    const clone = touchCloneRef.current
    const rect = clone.getBoundingClientRect()
    clone.style.left = `${touch.clientX - rect.width / 2}px`
    clone.style.top = `${touch.clientY - rect.height / 2}px`

    const zoneEls = document.querySelectorAll("[data-zone-id]")
    let found: string | null = null
    zoneEls.forEach(el => {
      const r = el.getBoundingClientRect()
      if (touch.clientX >= r.left && touch.clientX <= r.right && touch.clientY >= r.top && touch.clientY <= r.bottom) {
        found = (el as HTMLElement).dataset.zoneId || null
      }
    })

    const bankEls = document.querySelectorAll("[data-bank='true']")
    let overBank = false
    bankEls.forEach(el => {
      const r = el.getBoundingClientRect()
      if (touch.clientX >= r.left && touch.clientX <= r.right && touch.clientY >= r.top && touch.clientY <= r.bottom) {
        overBank = true
      }
    })

    touchTargetZoneRef.current = overBank ? null : found
    setDragOverZone(overBank ? "bank" : found)
  }

  function handleTouchEnd() {
    if (!touchItemRef.current) return
    if (touchCloneRef.current) {
      document.body.removeChild(touchCloneRef.current)
      touchCloneRef.current = null
    }
    const { id, fromZone } = touchItemRef.current
    const toZone = touchTargetZoneRef.current
    if (toZone !== undefined) {
      moveItem(id, fromZone, toZone)
    }
    touchItemRef.current = null
    touchTargetZoneRef.current = null
    setDragOverZone(null)
  }

  function getZoneFeedback(zoneId: string): "correct" | "incorrect" | null {
    if (!feedback || feedback.isCorrect === null || !feedback.correctMapping) return null
    const correct = feedback.correctMapping[zoneId] || []
    const actual = value[zoneId] || []
    const isMatch =
      correct.length === actual.length &&
      correct.every(id => actual.includes(id))
    return isMatch ? "correct" : "incorrect"
  }

  return (
    <div className="flex flex-col gap-4">
      {config.instruction && (
        <p className="text-sm text-muted-fg">{config.instruction}</p>
      )}

      <div
        data-bank="true"
        onDragOver={e => handleDragOver(e, null)}
        onDrop={e => handleDrop(e, null)}
        onDragLeave={() => setDragOverZone(null)}
        className={[
          "min-h-[56px] rounded-lg border-2 border-dashed p-3 flex flex-wrap gap-2 transition-colors",
          dragOverZone === "bank" || dragOverZone === null && draggedItem
            ? "border-brand bg-brand/10"
            : "border-border bg-surface"
        ].join(" ")}
      >
        {bankItems.length === 0 && (
          <span className="text-xs text-muted-fg self-center">Items hierher ziehen</span>
        )}
        {bankItems.map(item => (
          <DragItem
            key={item.id}
            item={item}
            fromZone={null}
            dragging={draggedItem?.id === item.id}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            readOnly={readOnly}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {config.zones.map(zone => {
          const zoneItems = (value[zone.id] || [])
            .map(id => config.items.find(i => i.id === id))
            .filter(Boolean) as typeof config.items
          const fb = getZoneFeedback(zone.id)
          const isOver = dragOverZone === zone.id

          return (
            <div
              key={zone.id}
              data-zone-id={zone.id}
              onDragOver={e => handleDragOver(e, zone.id)}
              onDrop={e => handleDrop(e, zone.id)}
              onDragLeave={() => setDragOverZone(null)}
              className={[
                "relative rounded-lg border-2 p-3 min-h-[80px] transition-colors",
                isOver ? "border-brand bg-brand/10" : "border-border bg-surface",
                fb === "correct" ? "border-success bg-success/10" : "",
                fb === "incorrect" ? "border-danger bg-danger/10" : ""
              ].join(" ")}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-fg uppercase tracking-wide">
                  {zone.label}
                </span>
                {zone.maxItems && (
                  <span className="text-xs text-muted-fg">
                    {zoneItems.length}/{zone.maxItems}
                  </span>
                )}
                {fb === "correct" && (
                  <span className="text-success font-bold text-sm">✓</span>
                )}
                {fb === "incorrect" && (
                  <span className="text-danger font-bold text-sm">✗</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {zoneItems.map(item => (
                  <DragItem
                    key={item.id}
                    item={item}
                    fromZone={zone.id}
                    dragging={draggedItem?.id === item.id}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface DragItemProps {
  item: { id: string; label: string; emoji?: string }
  fromZone: string | null
  dragging: boolean
  onDragStart: (e: React.DragEvent, id: string, fromZone: string | null) => void
  onDragEnd: () => void
  onTouchStart: (e: React.TouchEvent, id: string, fromZone: string | null) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: () => void
  readOnly?: boolean
}

function DragItem({ item, fromZone, dragging, onDragStart, onDragEnd, onTouchStart, onTouchMove, onTouchEnd, readOnly }: DragItemProps) {
  return (
    <div
      draggable={!readOnly}
      onDragStart={e => onDragStart(e, item.id, fromZone)}
      onDragEnd={onDragEnd}
      onTouchStart={e => onTouchStart(e, item.id, fromZone)}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={[
        "flex items-center gap-1.5 rounded-md border border-border bg-bg px-3 py-2 text-sm font-medium text-fg select-none min-h-[44px]",
        readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        dragging ? "opacity-40" : "opacity-100",
        !readOnly ? "hover:border-brand hover:bg-brand/5 transition-colors" : ""
      ].join(" ")}
    >
      {item.emoji && <span>{item.emoji}</span>}
      <span>{item.label}</span>
    </div>
  )
}
