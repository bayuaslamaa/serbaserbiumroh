'use client'

import React, { useState, useEffect } from 'react'
import { FileText, Download, ExternalLink, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PdfViewerProps {
  title: string
  description: string
  pdfUrl: string
}

export function PdfViewer({ title, description, pdfUrl }: PdfViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div className="flex-grow flex flex-col space-y-4">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-lg border bg-[var(--color-surface)] border-[var(--color-border)] shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded bg-amber-500/10 text-[var(--color-gold)]">
              <FileText className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[var(--color-gold)]" style={{ fontFamily: 'var(--font-heading)' }}>
              {title}
            </h2>
          </div>
          <p className="text-sm text-[var(--color-text-muted)] pl-9">
            {description}
          </p>
        </div>

        <div className="flex items-center gap-2 pl-9 md:pl-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5"
            onClick={() => window.open(pdfUrl, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
            <span>Buka Layar Penuh</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex items-center gap-1.5"
            asChild
          >
            <a href={pdfUrl} download>
              <Download className="h-4 w-4" />
              <span>Unduh PDF</span>
            </a>
          </Button>
        </div>
      </div>

      {/* Mobile Tip Banner */}
      {isMobile && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-lg border bg-amber-500/5 border-amber-500/20 text-xs text-[var(--color-text-muted)]">
          <Info className="h-4 w-4 text-[var(--color-gold)] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-[var(--color-gold)]">Membaca di HP?</span> Ketuk{' '}
            <span className="font-medium text-[var(--color-text)]">"Buka Layar Penuh"</span> untuk membaca dengan fitur zoom, pencarian, dan halaman penuh bawaan ponsel Anda secara optimal.
          </div>
        </div>
      )}

      {/* Viewer Container */}
      <div className="relative border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)] overflow-hidden h-[60vh] md:h-[78vh] min-h-[450px] shadow-lg">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-bg)] text-[var(--color-text-muted)] space-y-3 z-10">
            <div className="h-8 w-8 border-2 border-[var(--color-gold)] border-t-transparent animate-spin rounded-full"></div>
            <span className="text-sm">Memuat dokumen PDF...</span>
          </div>
        )}
        <iframe
          src={`${pdfUrl}#toolbar=1`}
          className="w-full h-full border-none"
          title={title}
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  )
}
