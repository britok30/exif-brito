import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "w-full min-w-0 rounded-none border border-foreground bg-background px-2.5 py-2 text-base text-foreground outline-none disabled:opacity-40 md:text-xs min-h-10",
        className
      )}
      {...props}
    />
  )
}

export { Input }
