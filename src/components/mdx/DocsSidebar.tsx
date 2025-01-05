'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { allDocs } from 'contentlayer/generated'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface Section {
  name: string
  docs: typeof allDocs
}

function organizeDocsBySection(docs: typeof allDocs) {
  const sections: Record<string, Section> = {}

  // Sort docs by order
  const sortedDocs = [...docs].sort((a, b) => {
    // Default order to 999 if not specified
    const orderA = a.order ?? 999
    const orderB = b.order ?? 999
    return orderA - orderB
  })

  // Group docs by section
  sortedDocs.forEach((doc) => {
    if (!doc.published) return

    const sectionName = doc.section || 'Docs'
    if (!sections[sectionName]) {
      sections[sectionName] = {
        name: sectionName,
        docs: [],
      }
    }
    sections[sectionName].docs.push(doc)
  })

  // Sort sections alphabetically
  return Object.values(sections).sort((a, b) => a.name.localeCompare(b.name))
}

export function DocsSidebar() {
  const pathname = usePathname()
  const sections = organizeDocsBySection(allDocs)

  return (
    <div className="hidden lg:block w-72 shrink-0 border-r border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <ScrollArea className="h-[calc(100vh-3.5rem)] py-6 pl-8 pr-6">
        <div className="flex flex-col gap-4">
          {sections.map((section) => (
            <div key={section.name} className="flex flex-col gap-2">
              <h4 className="text-sm font-medium text-foreground/70">
                {section.name}
              </h4>
              <div className="flex flex-col gap-1">
                {section.docs.map((doc) => (
                  <Link
                    key={doc.slug}
                    href={doc.slug}
                    className={cn(
                      "flex items-center rounded-md px-3 py-2 text-sm transition-colors",
                      pathname === doc.slug
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    {doc.title}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}