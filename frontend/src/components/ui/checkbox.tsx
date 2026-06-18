import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs outline-none transition-shadow",
        "focus-visible:border-[#F59E42] focus-visible:ring-[3px] focus-visible:ring-[#F59E42]/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-[#F59E42] data-[state=checked]:bg-[#F59E42] data-[state=checked]:text-white",
        "dark:data-[state=checked]:border-[#E8872E] dark:data-[state=checked]:bg-[#E8872E]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
