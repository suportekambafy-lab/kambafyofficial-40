"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

function Grid({
  cellSize = 12,
  strokeWidth = 1,
  patternOffset = [0, 0],
  className,
}: {
  cellSize?: number
  strokeWidth?: number
  patternOffset?: [number, number]
  className?: string
}) {
  const id = React.useId()

  return (
    <svg
      className={cn(
        "pointer-events-none absolute inset-0 text-black/10",
        className,
      )}
      width="100%"
      height="100%"
    >
      <defs>
        <pattern
          id={`grid-${id}`}
          x={patternOffset[0] - 1}
          y={patternOffset[1] - 1}
          width={cellSize}
          height={cellSize}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${cellSize} 0 L 0 0 0 ${cellSize}`}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
          />
        </pattern>
      </defs>
      <rect fill={`url(#grid-${id})`} width="100%" height="100%" />
    </svg>
  )
}

interface AnnouncementBannerProps {
  show: boolean
  onHide: () => void
  icon?: React.ReactNode
  title: React.ReactNode
  action: {
    label: string
    onClick: () => void
  }
  learnMoreUrl?: string
}

export function AnnouncementBanner({
  show,
  onHide,
  icon,
  title,
  action,
  learnMoreUrl,
}: AnnouncementBannerProps) {
  if (!show) return null

  return (
    <div className="relative isolate flex justify-center items-center gap-3 overflow-hidden border-b border-green-600/15 bg-gradient-to-r from-lime-100/80 to-emerald-100/80 py-2.5 px-4">
      <Grid
        cellSize={13}
        patternOffset={[0, -1]}
        className="text-black/30 mix-blend-overlay"
      />

      <div className="flex items-center gap-3">
        <span className="inline-flex items-center rounded-full bg-[#81e76a] px-2 py-0.5 text-xs font-semibold text-white">
          Novo
        </span>
        <p className="text-sm text-gray-900">
          {title}
          {learnMoreUrl && (
            <>
              {" "}
              <a
                href={learnMoreUrl}
                target="_blank"
                className="text-gray-700 underline transition-colors hover:text-black"
              >
                Learn more
              </a>
            </>
          )}
        </p>
      </div>

      <div className="flex items-center sm:-my-1">
        <button
          type="button"
          className="text-sm text-gray-800 underline transition-colors hover:text-green-700"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      </div>

      <button
        type="button"
        className="absolute inset-y-0 right-2.5 p-1 text-sm text-green-700 underline transition-colors hover:text-green-900"
        onClick={onHide}
      >
        <X className="h-[18px] w-[18px]" />
      </button>
    </div>
  )
}
