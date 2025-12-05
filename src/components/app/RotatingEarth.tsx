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
  activeLocations?: SessionLocation[] // Sales (purple)
  visitorLocations?: SessionLocation[] // Real-time visitors (blue)
}

// Map countries to approximate coordinates (Portuguese and English names)
const countryCoordinates: Record<string, [number, number]> = {
  // Angola
  'Angola': [17.8739, -11.2027],
  // Portugal
  'Portugal': [-8.2245, 39.3999],
  // Brazil
  'Brasil': [-51.9253, -14.2350],
  'Brazil': [-51.9253, -14.2350],
  // Spain
  'Espanha': [-3.7038, 40.4168],
  'Spain': [-3.7038, 40.4168],
  // Mozambique
  'Moçambique': [35.5296, -18.6657],
  'Mozambique': [35.5296, -18.6657],
  // France
  'França': [2.2137, 46.2276],
  'France': [2.2137, 46.2276],
  // United Kingdom
  'Reino Unido': [-3.4360, 55.3781],
  'United Kingdom': [-3.4360, 55.3781],
  // United States
  'Estados Unidos': [-95.7129, 37.0902],
  'United States': [-95.7129, 37.0902],
  // Italy
  'Itália': [12.5674, 41.8719],
  'Italy': [12.5674, 41.8719],
  // Germany
  'Alemanha': [10.4515, 51.1657],
  'Germany': [10.4515, 51.1657],
  // South Africa
  'África do Sul': [22.9375, -30.5595],
  'South Africa': [22.9375, -30.5595],
  // Netherlands
  'Holanda': [5.2913, 52.1326],
  'Netherlands': [5.2913, 52.1326],
  // Belgium
  'Bélgica': [4.4699, 50.5039],
  'Belgium': [4.4699, 50.5039],
  // Cape Verde
  'Cabo Verde': [-23.6052, 15.1111],
  'Cape Verde': [-23.6052, 15.1111],
  // Canada
  'Canadá': [-106.3468, 56.1304],
  'Canada': [-106.3468, 56.1304],
  // China
  'China': [104.1954, 35.8617],
  // India
  'Índia': [78.9629, 20.5937],
  'India': [78.9629, 20.5937],
  // Australia
  'Austrália': [133.7751, -25.2744],
  'Australia': [133.7751, -25.2744],
  // Argentina
  'Argentina': [-63.6167, -38.4161],
  // Mexico
  'México': [-102.5528, 23.6345],
  'Mexico': [-102.5528, 23.6345],
  // Japan
  'Japão': [138.2529, 36.2048],
  'Japan': [138.2529, 36.2048],
  // Nigeria
  'Nigéria': [8.6753, 9.0820],
  'Nigeria': [8.6753, 9.0820],
  // Default fallbacks
  'Outro': [17.8739, -11.2027],
  'Desconhecido': [17.8739, -11.2027],
  'Unknown': [17.8739, -11.2027]
};

export default function RotatingEarth({ 
  width = 300, 
  height = 300, 
  className = "",
  activeLocations = [],
  visitorLocations = []
}: RotatingEarthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; country: string; count: number; type: 'sale' | 'visitor' } | null>(null)
  const markersRef = useRef<Array<{ x: number; y: number; country: string; count: number; size: number; type: 'sale' | 'visitor' }>>([]);

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

        // Clear markers ref before re-drawing
        markersRef.current = [];

        // Draw sales markers (purple)
        activeLocations.forEach((loc) => {
          const coords = countryCoordinates[loc.country]
          if (coords) {
            const projected = projection(coords)
            if (projected) {
              const size = Math.min(2 + loc.count * 1, 6) * scaleFactor
              
              markersRef.current.push({
                x: projected[0],
                y: projected[1],
                country: loc.country,
                count: loc.count,
                size: size * 2,
                type: 'sale'
              });
              
              // Outer glow - purple
              context.beginPath()
              context.arc(projected[0], projected[1], size * 2, 0, 2 * Math.PI)
              context.fillStyle = "rgba(139, 92, 246, 0.2)"
              context.fill()
              
              // Middle glow - purple
              context.beginPath()
              context.arc(projected[0], projected[1], size * 1.3, 0, 2 * Math.PI)
              context.fillStyle = "rgba(139, 92, 246, 0.4)"
              context.fill()
              
              // Main dot - purple
              context.beginPath()
              context.arc(projected[0], projected[1], size, 0, 2 * Math.PI)
              context.fillStyle = "#8B5CF6"
              context.fill()
              context.strokeStyle = "#C4B5FD"
              context.lineWidth = 1 * scaleFactor
              context.stroke()
            }
          }
        })

        // Draw visitor markers (baby blue) - offset slightly to avoid overlap
        visitorLocations.forEach((loc) => {
          const coords = countryCoordinates[loc.country]
          if (coords) {
            // Offset visitor markers slightly
            const offsetCoords: [number, number] = [coords[0] + 2, coords[1] + 2]
            const projected = projection(offsetCoords)
            if (projected) {
              const size = Math.min(2 + loc.count * 1, 6) * scaleFactor
              
              markersRef.current.push({
                x: projected[0],
                y: projected[1],
                country: loc.country,
                count: loc.count,
                size: size * 2,
                type: 'visitor'
              });
              
              // Outer glow - baby blue
              context.beginPath()
              context.arc(projected[0], projected[1], size * 2, 0, 2 * Math.PI)
              context.fillStyle = "rgba(56, 189, 248, 0.2)"
              context.fill()
              
              // Middle glow - baby blue
              context.beginPath()
              context.arc(projected[0], projected[1], size * 1.3, 0, 2 * Math.PI)
              context.fillStyle = "rgba(56, 189, 248, 0.4)"
              context.fill()
              
              // Main dot - baby blue
              context.beginPath()
              context.arc(projected[0], projected[1], size, 0, 2 * Math.PI)
              context.fillStyle = "#38BDF8"
              context.fill()
              context.strokeStyle = "#BAE6FD"
              context.lineWidth = 1 * scaleFactor
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

    // Click handler for markers
    const handleClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Check if click is on a marker
      for (const marker of markersRef.current) {
        const distance = Math.sqrt(Math.pow(x - marker.x, 2) + Math.pow(y - marker.y, 2));
        if (distance <= marker.size + 5) { // Add some tolerance
          setTooltip({ x: marker.x, y: marker.y, country: marker.country, count: marker.count, type: marker.type });
          return;
        }
      }
      // Click was not on a marker, hide tooltip
      setTooltip(null);
    };
    
    canvas.addEventListener("click", handleClick);

    loadWorldData()

    return () => {
      rotationTimer.stop()
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("touchstart", handleTouchStart)
      canvas.removeEventListener("click", handleClick)
    }
  }, [width, height, activeLocations, visitorLocations, isDarkMode])

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
      {/* Tooltip */}
      {tooltip && (
        <div 
          className="absolute bg-background/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg pointer-events-none z-10"
          style={{ 
            left: Math.min(tooltip.x, width - 120), 
            top: Math.max(tooltip.y - 50, 10),
            transform: 'translateX(-50%)'
          }}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${tooltip.type === 'sale' ? 'bg-violet-500' : 'bg-sky-400'}`} />
            <p className="text-sm font-medium text-foreground">
              {tooltip.country === 'Desconhecido' ? 'Angola' : tooltip.country}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {tooltip.count} {tooltip.type === 'sale' ? (tooltip.count === 1 ? 'venda' : 'vendas') : (tooltip.count === 1 ? 'visitante' : 'visitantes')}
          </p>
        </div>
      )}
    </div>
  )
}
