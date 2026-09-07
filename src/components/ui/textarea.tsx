import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full min-w-0 rounded-none border border-foreground bg-background px-2.5 py-2 text-base text-foreground outline-none disabled:opacity-40 md:text-xs min-h-24",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
