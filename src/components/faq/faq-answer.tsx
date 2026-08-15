import ReactMarkdown from "react-markdown"

type FaqAnswerProps = {
  answer: string
}

export function FaqAnswer({ answer }: FaqAnswerProps) {
  return (
    <div className="faq-answer text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
      <ReactMarkdown
        allowedElements={["p", "strong", "em", "ul", "ol", "li", "a", "br", "code"]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
              style={{ color: "var(--color-gold)" }}
            >
              {children}
            </a>
          ),
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 ml-5 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 ml-5 list-decimal space-y-1">{children}</ol>,
          code: ({ children }) => (
            <code
              className="rounded px-1 py-0.5 text-xs"
              style={{ background: "rgba(255,255,255,0.08)", color: "var(--color-text)" }}
            >
              {children}
            </code>
          ),
        }}
      >
        {answer}
      </ReactMarkdown>
    </div>
  )
}
