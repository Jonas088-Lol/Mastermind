/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client"

import { useState } from "react"

interface Props {
  itemId: string
  config: {
    instruction?: string
    leftItems: Array<{ id: string; label: string }>
    rightItems: Array<{ id: string; label: string }>
  }
  value: Record<string, string>
  onChange: (v: Record<string, string>) => void
  feedback?: { isCorrect: boolean | null; correctMapping?: Record<string, string> }
  readOnly?: boolean
}

const PAIR_COLORS = [
  "bg-[#6366f1] text-white",
  "bg-[#f59e0b] text-white",
  "bg-[#10b981] text-white",
  "bg-[#ef4444] text-white",
  "bg-[#8b5cf6] text-white",
  "bg-[#0ea5e9] text-white",
  "bg-[#f97316] text-white",
  "bg-[#14b8a6] text-white",
]

function getPairIndex(leftId: string, value: Record<string, string>): number {
  const keys = Object.keys(value).filter(k => value[k])
  return keys.indexOf(leftId)
}

export function MatchingWidget({ itemId, config, value, onChange, feedback, readOnly }: Props) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)

  const connectedRight = new Set(Object.values(value))

  function handleLeftClick(leftId: string) {
    if (readOnly) return
    if (selectedLeft === leftId) {
      setSelectedLeft(null)
      return
    }
    if (value[leftId]) {
      const next = { ...value }
      delete next[leftId]
      onChange(next)
      setSelectedLeft(leftId)
      return
    }
    setSelectedLeft(leftId)
  }

  function handleRightClick(rightId: string) {
    if (readOnly) return

    const existingLeft = Object.keys(value).find(k => value[k] === rightId)

    if (existingLeft && selectedLeft === null) {
      const next = { ...value }
      delete next[existingLeft]
      onChange(next)
      return
    }

    if (existingLeft && selectedLeft !== null) {
      const next = { ...value }
      delete next[existingLeft]
      if (value[selectedLeft]) delete next[selectedLeft]
      next[selectedLeft] = rightId
      setSelectedLeft(null)
      onChange(next)
      return
    }

    if (selectedLeft !== null) {
      const next = { ...value }
      if (next[selectedLeft]) delete next[selectedLeft]
      next[selectedLeft] = rightId
      setSelectedLeft(null)
      onChange(next)
      return
    }
  }

  function getPairFeedback(leftId: string): "correct" | "incorrect" | null {
    if (!feedback || feedback.isCorrect === null || !feedback.correctMapping) return null
    const mapped = value[leftId]
    const expected = feedback.correctMapping[leftId]
    if (!mapped) return null
    return mapped === expected ? "correct" : "incorrect"
  }

  const pairedLeftIds = Object.keys(value).filter(k => value[k])

  return (
    <div className="flex flex-col gap-4">
      {config.instruction && (
        <p className="text-sm text-muted-fg">{config.instruction}</p>
      )}

      {selectedLeft && (
        <p className="text-xs text-brand font-medium text-center animate-pulse">
          Jetzt ein Element rechts auswählen...
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          {config.leftItems.map(item => {
            const isConnected = !!value[item.id]
            const isSelected = selectedLeft === item.id
            const pairIdx = isConnected ? getPairIndex(item.id, value) : -1
            const colorClass = pairIdx >= 0 ? PAIR_COLORS[pairIdx % PAIR_COLORS.length] : null
            const fb = getPairFeedback(item.id)

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleLeftClick(item.id)}
                disabled={readOnly}
                className={[
                  "min-h-[44px] rounded-lg border-2 px-3 py-2 text-sm font-medium text-left transition-all w-full",
                  isSelected
                    ? "border-brand bg-brand/10 text-fg ring-2 ring-brand ring-offset-1"
                    : isConnected && colorClass
                    ? `border-transparent ${colorClass}`
                    : "border-border bg-surface text-fg",
                  fb === "correct" ? "border-success bg-success/10 text-fg" : "",
                  fb === "incorrect" ? "border-danger bg-danger/10 text-fg" : "",
                  !readOnly ? "hover:border-brand cursor-pointer" : "cursor-default"
                ].join(" ")}
              >
                <span className="flex items-center justify-between gap-2">
                  <span>{item.label}</span>
                  {fb === "correct" && <span className="text-success font-bold">✓</span>}
                  {fb === "incorrect" && <span className="text-danger font-bold">✗</span>}
                  {!fb && isConnected && (
                    <span className="w-2 h-2 rounded-full bg-current opacity-60 shrink-0" />
                  )}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-2">
          {config.rightItems.map(item => {
            const matchingLeft = Object.keys(value).find(k => value[k] === item.id)
            const isConnected = !!matchingLeft
            const isHighlighted = selectedLeft !== null && !isConnected
            const pairIdx = matchingLeft ? getPairIndex(matchingLeft, value) : -1
            const colorClass = pairIdx >= 0 ? PAIR_COLORS[pairIdx % PAIR_COLORS.length] : null
            const fb = matchingLeft ? getPairFeedback(matchingLeft) : null

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleRightClick(item.id)}
                disabled={readOnly}
                className={[
                  "min-h-[44px] rounded-lg border-2 px-3 py-2 text-sm font-medium text-left transition-all w-full",
                  isConnected && colorClass
                    ? `border-transparent ${colorClass}`
                    : isHighlighted
                    ? "border-brand/40 bg-brand/5 text-fg"
                    : "border-border bg-surface text-fg",
                  fb === "correct" ? "border-success bg-success/10 text-fg" : "",
                  fb === "incorrect" ? "border-danger bg-danger/10 text-fg" : "",
                  !readOnly ? "hover:border-brand cursor-pointer" : "cursor-default"
                ].join(" ")}
              >
                <span className="flex items-center justify-between gap-2">
                  <span>{item.label}</span>
                  {fb === "correct" && <span className="text-success font-bold">✓</span>}
                  {fb === "incorrect" && <span className="text-danger font-bold">✗</span>}
                  {!fb && isConnected && (
                    <span className="w-2 h-2 rounded-full bg-current opacity-60 shrink-0" />
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {pairedLeftIds.length > 0 && !feedback && (
        <p className="text-xs text-muted-fg text-center">
          Verbundene Paare tippen, um die Verbindung aufzuheben
        </p>
      )}
    </div>
  )
}
