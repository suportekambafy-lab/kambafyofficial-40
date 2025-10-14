"use client"

import { useState, useEffect } from "react"
import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSellerTheme } from "@/hooks/useSellerTheme"

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { isDark, setTheme } = useSellerTheme()

  const handleToggle = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <div
      className={cn(
        "flex w-16 h-8 p-1 rounded-full cursor-pointer transition-all duration-300",
        isDark 
          ? "bg-background border border-border" 
          : "bg-card border border-border",
        className
      )}
      onClick={handleToggle}
      role="button"
      tabIndex={0}
    >
      <div className="flex justify-between items-center w-full">
      <div
        className={cn(
          "flex justify-center items-center w-6 h-6 rounded-full transition-transform duration-300",
          isDark 
            ? "transform translate-x-0 bg-amber-500" 
            : "transform translate-x-8 bg-amber-500"
        )}
      >
        {isDark ? (
          <Moon 
            className="w-4 h-4 text-background" 
            strokeWidth={1.5}
          />
        ) : (
          <Sun 
            className="w-4 h-4 text-background" 
            strokeWidth={1.5}
          />
        )}
      </div>
      <div
        className={cn(
          "flex justify-center items-center w-6 h-6 rounded-full transition-transform duration-300",
          isDark 
            ? "bg-transparent" 
            : "transform -translate-x-8"
        )}
      >
        {isDark ? (
          <Sun 
            className="w-4 h-4 text-muted-foreground" 
            strokeWidth={1.5}
          />
        ) : (
          <Moon 
            className="w-4 h-4 text-muted-foreground" 
            strokeWidth={1.5}
          />
        )}
      </div>
      </div>
    </div>
  )
}