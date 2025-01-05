"use client"

import React from "react"
import { CopyButton } from "@/components/mdx/copy-button"
import { cn } from "@/lib/utils"
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface CodeBlockProps extends React.HTMLAttributes<HTMLPreElement> {
  value: string
  language?: string
}

export function CodeBlock({
  value,
  language,
  className,
  ...props
}: CodeBlockProps) {
  return (
    <div className="relative w-full">
      <div className="absolute right-2 top-2 z-10">
        <CopyButton value={value} />
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark as any}
        customStyle={{
          margin: 0,
          padding: '1rem',
          borderRadius: '0.5rem',
        }}
        PreTag="div"
        {...props}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  )
}

