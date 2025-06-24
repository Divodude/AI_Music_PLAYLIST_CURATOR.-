"use client"

import type React from "react"

import { useEffect } from "react"

interface AdSenseAdProps {
  adSlot: string
  adFormat?: string
  style?: React.CSSProperties
  className?: string
  responsive?: boolean
}

export function AdSenseAd({
  adSlot,
  adFormat = "auto",
  style = { display: "block" },
  className = "",
  responsive = true,
}: AdSenseAdProps) {
  useEffect(() => {
    try {
      // Push ad to AdSense
      if (typeof window !== "undefined" && (window as any).adsbygoogle) {
        ;((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({})
      }
    } catch (error) {
      console.error("AdSense error:", error)
    }
  }, [])

  return (
    <div className={`adsense-container ${className}`}>
      <ins
        className="adsbygoogle"
        style={style}
        data-ad-client="ca-pub-1839917873699847"
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={responsive.toString()}
      />
    </div>
  )
}

// Fallback component for when ads don't load
export function AdPlaceholder({ size, position }: { size: string; position: string }) {
  return (
    <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center p-4 my-4">
      <div className="text-center text-gray-500">
        <div className="text-sm font-medium">Advertisement</div>
        <div className="text-xs">
          {size} - {position}
        </div>
      </div>
    </div>
  )
}
