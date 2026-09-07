import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "studio-button group/button shrink-0 whitespace-nowrap select-none disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "primary",
        outline: "",
        secondary: "",
        ghost: "border-transparent",
        destructive: "primary",
        link: "border-transparent underline underline-offset-4",
      },
      size: {
        default: "",
        xs: "px-2",
        sm: "px-3",
        lg: "min-h-11 px-5",
        icon: "icon size-10",
        "icon-xs": "icon size-10",
        "icon-sm": "icon size-10",
        "icon-lg": "icon size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
