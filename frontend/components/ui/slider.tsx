"use client"

import { useState } from "react"
import { cn } from "cn"

interface SliderProps {
  value: number | number[]
  onValueChange: (value: number | number[]) => void
  min: number
  max: number
  step?: number
  className?: string
  disabled?: boolean
}

function Slider({ value, onValueChange, min, max, step = 1, className, disabled = false }: SliderProps) {
  const currentValue = Array.isArray(value) ? value[0] : value
  const percentage = ((currentValue - min) / (max - min)) * 100

  return (
    <div className={cn("relative w-full", className)}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={(e) => {
          const newValue = Number(e.target.value)
          onValueChange(Array.isArray(value) ? [newValue] : newValue)
        }}
        disabled={disabled}
        className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer z-10"
      />
      <div className="relative w-full h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="absolute h-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div
        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow cursor-pointer transition-all hover:scale-110"
        style={{ left: `calc(${percentage}% - 8px)` }}
      />
    </div>
  )
}

export { Slider }
