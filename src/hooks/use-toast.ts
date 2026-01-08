import { toast as sonnerToast } from "sonner"
import * as React from "react"

type ToasterToast = {
  id?: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  variant?: 'default' | 'destructive'
}

type Toast = Omit<ToasterToast, "id">

// Wrapper function that converts old toast API to sonner
function toast({ title, description, variant, ...props }: Toast) {
  const message = title || description || ""
  const messageStr = typeof message === 'string' ? message : String(message)
  const descriptionStr = description && title ? (typeof description === 'string' ? description : String(description)) : undefined
  
  if (variant === 'destructive') {
    return sonnerToast.error(messageStr, { description: descriptionStr })
  }
  
  return sonnerToast.success(messageStr, { description: descriptionStr })
}

function useToast() {
  // Memoize to ensure consistent hook count across renders
  const toastFn = React.useCallback(toast, [])
  const dismissFn = React.useCallback((toastId?: string) => sonnerToast.dismiss(toastId), [])
  
  return React.useMemo(() => ({
    toast: toastFn,
    toasts: [] as ToasterToast[],
    dismiss: dismissFn,
  }), [toastFn, dismissFn])
}

export { useToast, toast }
