"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label="Copy message"
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  )
}

export function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-2">
      <ReactMarkdown
        components={{
          a: ({ ...props }) => <a {...props} className="text-primary underline" target="_blank" rel="noreferrer" />,
          p: ({ children }) => <p className="text-sm leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 text-sm">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 text-sm">{children}</ol>,
          li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          h1: ({ children }) => <h1 className="text-lg font-bold">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold">{children}</h3>,
          table: ({ children }) => <table className="w-full border-collapse text-sm">{children}</table>,
          th: ({ children }) => <th className="border px-2 py-1 text-left font-medium">{children}</th>,
          td: ({ children }) => <td className="border px-2 py-1">{children}</td>,
          code: ({ children, className, ...props }) => {
            const isBlock = Boolean(className)
            if (isBlock) {
              return (
                <div className="relative">
                  <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                </div>
              )
            }
            return (
              <code className="rounded bg-muted px-1 py-0.5 text-xs" {...props}>
                {children}
              </code>
            )
          },
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
