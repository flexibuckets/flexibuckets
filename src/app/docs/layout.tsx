import { DocsSidebar } from "@/components/mdx/DocsSidebar"
import Navbar from "@/components/navigation/Navbar"

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <DocsSidebar />
        <div className="flex-1 overflow-y-auto">
          <div className="container max-w-3xl py-6 px-4 md:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

