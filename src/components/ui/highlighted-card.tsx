
import * as React from "react"
import { cn } from "@/lib/utils"

export interface HighlightedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  highlightColor?: "green" | "yellow" | "blue" | "orange" | "purple"
}

const HighlightedCard = React.forwardRef<HTMLDivElement, HighlightedCardProps>(
  ({ className, highlightColor, children, ...props }, ref) => {
    const getHighlightClasses = () => {
      switch (highlightColor) {
        case "green":
          return "border-l-[6px] border-l-border"
        case "yellow":
          return "border-l-[6px] border-l-border"
        case "blue":
          return "border-l-[6px] border-l-border"
        case "orange":
          return "border-l-[6px] border-l-border"
        case "purple":
          return "border-l-[6px] border-l-border"
        default:
          return ""
      }
    }

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border bg-card text-card-foreground shadow-sm",
          getHighlightClasses(),
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
HighlightedCard.displayName = "HighlightedCard"

const HighlightedCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
HighlightedCardHeader.displayName = "HighlightedCardHeader"

const HighlightedCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-muted-foreground",
      className
    )}
    {...props}
  />
))
HighlightedCardTitle.displayName = "HighlightedCardTitle"

const HighlightedCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
HighlightedCardContent.displayName = "HighlightedCardContent"

export { 
  HighlightedCard, 
  HighlightedCardHeader, 
  HighlightedCardTitle, 
  HighlightedCardContent 
}
