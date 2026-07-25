"use client"

import * as React from "react"
import { Play } from "lucide-react"
import {
  VIDEO_META_SUFFIX,
  badalVideos,
  isPlaceholderVideo,
} from "@/lib/badalin/content"

const stripePoster =
  "repeating-linear-gradient(45deg,#122619,#122619 12px,#0e2015 12px,#0e2015 24px)"

/**
 * Click-to-load documentation grid: a card holds a poster until the visitor
 * activates it, so the page never mounts nine YouTube iframes up front.
 */
export function VideoDocGrid() {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null)

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-4">
      {badalVideos.map((video, index) => {
        const isActive = activeIndex === index
        const placeholder = isPlaceholderVideo(video.youtubeId)

        return (
          <div
            key={video.title}
            className="overflow-hidden rounded-xl border"
            style={{
              borderColor: "rgba(201,168,76,0.16)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            {isActive ? (
              <div className="aspect-video bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1`}
                  title={video.title}
                  className="block h-full w-full border-0"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : placeholder ? (
              // No real video id yet — render an inert poster. Never mount an
              // embed for a placeholder id: it resolves to a dead YouTube page.
              <div
                className="relative flex aspect-video items-center justify-center"
                style={{ background: stripePoster }}
              >
                <span
                  className="rounded-full px-3 py-1 text-[11px] font-semibold text-text-muted"
                  style={{ background: "rgba(11,28,18,0.8)" }}
                >
                  Video segera tayang
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Putar video: ${video.title}`}
                className="block w-full cursor-pointer border-0 p-0 text-left"
              >
                <span className="relative block aspect-video">
                  <img
                    src={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span
                      className="flex h-[52px] w-[52px] items-center justify-center rounded-full"
                      style={{
                        background: "rgba(201,168,76,0.92)",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
                      }}
                    >
                      <Play size={22} className="ml-[3px] text-bg" fill="currentColor" />
                    </span>
                  </span>
                  <span
                    className="absolute bottom-2.5 right-2.5 rounded-[5px] px-1.5 py-[3px] text-[11px] font-bold text-text"
                    style={{ background: "rgba(0,0,0,0.7)" }}
                  >
                    {video.duration}
                  </span>
                </span>
              </button>
            )}

            <div className="px-4 pb-4 pt-3">
              <div className="text-sm font-semibold leading-[1.45] text-text">
                {video.title}
              </div>
              <div className="mt-1.5 text-xs text-text-muted">
                {video.meta} · {VIDEO_META_SUFFIX}
                {placeholder ? " · belum tayang" : ""}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
