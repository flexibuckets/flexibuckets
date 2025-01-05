import { cn } from "@/lib/utils"

interface CalloutProps {
  icon?: string
  children?: React.ReactNode
  type?: "default" | "warning" | "danger"
}

export function Callout({
  children,
  icon,
  type = "default",
  ...props
}: CalloutProps) {
  return (
    <div
      className={cn(
        "my-6 flex items-start rounded-md border border-l-4 p-4",
        {
          "border-primary bg-primary/5 text-primary [&>svg]:text-primary":
            type === "default",
          "border-warning bg-warning/5 text-warning [&>svg]:text-warning":
            type === "warning",
          "border-destructive bg-destructive/5 text-destructive [&>svg]:text-destructive":
            type === "danger",
        }
      )}
      {...props}
    >
      {icon && <span className="mr-4 text-2xl">{icon}</span>}
      <div>{children}</div>
    </div>
  )
}

