import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

interface SessionLocation {
  country: string;
  count: number;
}

interface RotatingEarthProps {
  width?: number
  height?: number
  className?: string
  activeLocations?: SessionLocation[]
}

// Map countries to approximate coordinates
const countryCoordinates: Record<string, [number, number]> = {
  'Angola': [17.8739, -11.2027],
  'Moçambique': [35.5296, -18.6657],
  'Portugal': [-8.2245, 39.3999],
  'Brasil': [-51.9253, -14.2350],
  'Espanha': [-3.7492, 40.4637],
  'França': [2.2137, 46.2276],
  'Reino Unido': [-3.4360, 55.3781],
  'Estados Unidos': [-95.7129, 37.0902],
  'Itália': [12.5674, 41.8719],
  'Alemanha': [10.4515, 51.1657],
  'Outro': [0, 0],
  'Desconhecido': [0, 0]
};

export default function RotatingEarth({ 
  width = 300, 
  height = 300, 
  className = "",
  activeLocations = []
}: RotatingEarthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }
    
    checkDarkMode()
    
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const context = canvas.getContext("2d")
    if (!context) return

    // Theme colors
    const colors = isDarkMode ? {
      ocean: "#1a1a2e",
      oceanStroke: "#2d2d44",
      land: "#87CEEB",
      landStroke: "#5DADE2",
      dots: "#5DADE2",
      graticule: "#5DADE2",
      markerStroke: "#1a1a2e"
    } : {
      ocean: "#ffffff",
      oceanStroke: "#e0e0e0",
      land: "#87CEEB",
      landStroke: "#5DADE2",
      dots: "#5DADE2",
      graticule: "#87CEEB",
      markerStroke: "#ffffff"
    }

    const containerWidth = width
    const containerHeight = height
    const radius = Math.min(containerWidth, containerHeight) / 2.2

    const dpr = window.devicePixelRatio || 1
    canvas.width = containerWidth * dpr
    canvas.height = containerHeight * dpr
    canvas.style.width = `${containerWidth}px`
    canvas.style.height = `${containerHeight}px`
    context.scale(dpr, dpr)

    const projection = d3
      .geoOrthographic()
      .scale(radius)
      .translate([containerWidth / 2, containerHeight / 2])
      .clipAngle(90)

    const path = d3.geoPath().projection(projection).context(context)

    const pointInPolygon = (point: [number, number], polygon: number[][]): boolean => {
      const [x, y] = point
      let inside = false

      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i]
        const [xj, yj] = polygon[j]

        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          inside = !inside
        }
      }

      return inside
    }

    const pointInFeature = (point: [number, number], feature: any): boolean => {
      const geometry = feature.geometry

      if (geometry.type === "Polygon") {
        const coordinates = geometry.coordinates
        if (!pointInPolygon(point, coordinates[0])) {
          return false
        }
        for (let i = 1; i < coordinates.length; i++) {
          if (pointInPolygon(point, coordinates[i])) {
            return false
          }
        }
        return true
      } else if (geometry.type === "MultiPolygon") {
        for (const polygon of geometry.coordinates) {
          if (pointInPolygon(point, polygon[0])) {
            let inHole = false
            for (let i = 1; i < polygon.length; i++) {
              if (pointInPolygon(point, polygon[i])) {
                inHole = true
                break
              }
            }
            if (!inHole) {
              return true
            }
          }
        }
        return false
      }

      return false
    }

    const generateDotsInPolygon = (feature: any, dotSpacing = 20) => {
      const dots: [number, number][] = []
      const bounds = d3.geoBounds(feature)
      const [[minLng, minLat], [maxLng, maxLat]] = bounds

      const stepSize = dotSpacing * 0.1

      for (let lng = minLng; lng <= maxLng; lng += stepSize) {
        for (let lat = minLat; lat <= maxLat; lat += stepSize) {
          const point: [number, number] = [lng, lat]
          if (pointInFeature(point, feature)) {
            dots.push(point)
          }
        }
      }

      return dots
    }

    interface DotData {
      lng: number
      lat: number
    }

    const allDots: DotData[] = []
    let landFeatures: any

    const render = () => {
      context.clearRect(0, 0, containerWidth, containerHeight)

      const currentScale = projection.scale()
      const scaleFactor = currentScale / radius

      // Draw ocean
      context.beginPath()
      context.arc(containerWidth / 2, containerHeight / 2, currentScale, 0, 2 * Math.PI)
      context.fillStyle = colors.ocean
      context.fill()
      context.strokeStyle = colors.oceanStroke
      context.lineWidth = 2 * scaleFactor
      context.stroke()

      if (landFeatures) {
        // Draw graticule
        const graticule = d3.geoGraticule()
        context.beginPath()
        path(graticule())
        context.strokeStyle = colors.graticule
        context.lineWidth = 0.5 * scaleFactor
        context.globalAlpha = 0.3
        context.stroke()
        context.globalAlpha = 1

        // Draw land outlines
        context.beginPath()
        landFeatures.features.forEach((feature: any) => {
          path(feature)
        })
        context.fillStyle = colors.land
        context.fill()
        context.strokeStyle = colors.landStroke
        context.lineWidth = 1 * scaleFactor
        context.stroke()

        // Draw halftone dots
        allDots.forEach((dot) => {
          const projected = projection([dot.lng, dot.lat])
          if (
            projected &&
            projected[0] >= 0 &&
            projected[0] <= containerWidth &&
            projected[1] >= 0 &&
            projected[1] <= containerHeight
          ) {
            context.beginPath()
            context.arc(projected[0], projected[1], 1 * scaleFactor, 0, 2 * Math.PI)
            context.fillStyle = colors.dots
            context.globalAlpha = 0.4
            context.fill()
            context.globalAlpha = 1
          }
        })

        // Draw active session markers
        activeLocations.forEach((loc) => {
          const coords = countryCoordinates[loc.country]
          if (coords) {
            const projected = projection(coords)
            if (projected) {
              const size = Math.min(6 + loc.count * 3, 16) * scaleFactor
              
              // Glow effect
              context.beginPath()
              context.arc(projected[0], projected[1], size * 1.5, 0, 2 * Math.PI)
              context.fillStyle = "rgba(34, 197, 94, 0.3)"
              context.fill()
              
              // Main dot
              context.beginPath()
              context.arc(projected[0], projected[1], size, 0, 2 * Math.PI)
              context.fillStyle = "#22C55E"
              context.fill()
              context.strokeStyle = colors.markerStroke
              context.lineWidth = 2 * scaleFactor
              context.stroke()
            }
          }
        })
      }
    }

    const loadWorldData = async () => {
      try {
        setIsLoading(true)

        const response = await fetch(
          "https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json",
        )
        if (!response.ok) throw new Error("Failed to load land data")

        landFeatures = await response.json()

        landFeatures.features.forEach((feature: any) => {
          const dots = generateDotsInPolygon(feature, 20)
          dots.forEach(([lng, lat]) => {
            allDots.push({ lng, lat })
          })
        })

        render()
        setIsLoading(false)
      } catch (err) {
        console.error("Error loading world data:", err)
        setError("Failed to load map data")
        setIsLoading(false)
      }
    }

    const rotation: [number, number, number] = [0, -10, 0]
    let autoRotate = true
    const rotationSpeed = 0.3

    const rotate = () => {
      if (autoRotate) {
        rotation[0] += rotationSpeed
        projection.rotate(rotation)
        render()
      }
    }

    const rotationTimer = d3.timer(rotate)

    const handleMouseDown = (event: MouseEvent) => {
      autoRotate = false
      const startX = event.clientX
      const startY = event.clientY
      const startRotation: [number, number, number] = [...rotation]

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const sensitivity = 0.5
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY

        rotation[0] = startRotation[0] + dx * sensitivity
        rotation[1] = startRotation[1] - dy * sensitivity
        rotation[1] = Math.max(-90, Math.min(90, rotation[1]))

        projection.rotate(rotation)
        render()
      }

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)

        setTimeout(() => {
          autoRotate = true
        }, 2000)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return
      autoRotate = false
      const touch = event.touches[0]
      const startX = touch.clientX
      const startY = touch.clientY
      const startRotation: [number, number, number] = [...rotation]

      const handleTouchMove = (moveEvent: TouchEvent) => {
        if (moveEvent.touches.length !== 1) return
        const moveTouch = moveEvent.touches[0]
        const sensitivity = 0.5
        const dx = moveTouch.clientX - startX
        const dy = moveTouch.clientY - startY

        rotation[0] = startRotation[0] + dx * sensitivity
        rotation[1] = startRotation[1] - dy * sensitivity
        rotation[1] = Math.max(-90, Math.min(90, rotation[1]))

        projection.rotate(rotation)
        render()
      }

      const handleTouchEnd = () => {
        document.removeEventListener("touchmove", handleTouchMove)
        document.removeEventListener("touchend", handleTouchEnd)

        setTimeout(() => {
          autoRotate = true
        }, 2000)
      }

      document.addEventListener("touchmove", handleTouchMove)
      document.addEventListener("touchend", handleTouchEnd)
    }

    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("touchstart", handleTouchStart)

    loadWorldData()

    return () => {
      rotationTimer.stop()
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("touchstart", handleTouchStart)
    }
  }, [width, height, activeLocations, isDarkMode])

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-background rounded-full p-4 ${className}`}>
        <p className="text-muted-foreground text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin dark:border-sky-800 dark:border-t-sky-400" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="rounded-full cursor-grab active:cursor-grabbing"
        style={{ 
          maxWidth: "100%", 
          height: "auto"
        }}
      />
    </div>
  )
}
