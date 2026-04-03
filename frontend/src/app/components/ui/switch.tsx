import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    className={`
      relative inline-flex h-6 w-11 cursor-pointer items-center
      rounded-full transition-colors
      data-[state=checked]:bg-[#0A84FF]
      data-[state=unchecked]:bg-gray-300
      ${className ?? ""}
    `}
    {...props}
  >
    <SwitchPrimitives.Thumb
      className="
        block h-5 w-5 rounded-full bg-white shadow-md
        transition-transform duration-200
        translate-x-0 data-[state=checked]:translate-x-5
      "
    />
  </SwitchPrimitives.Root>
));

Switch.displayName = "Switch";
