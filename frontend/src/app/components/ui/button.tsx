import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/95 hover:shadow-md hover:-translate-y-0.5",
        destructive:
          "bg-destructive text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-black",
        outline:
          "border bg-background border-input shadow-sm text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-black dark:border-input dark:hover:bg-black",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/90 hover:shadow-md hover:-translate-y-0.5",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-black",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-lg px-6 has-[>svg]:px-4",
        icon: "size-9 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

import { Haptics, ImpactStyle } from '@capacitor/haptics';

function Button({
  className,
  variant,
  size,
  asChild = false,
  onClick,
  disabled,
  isLoading,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    isLoading?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  const [internalIsLoading, setInternalIsLoading] = React.useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading || internalIsLoading) {
        e.preventDefault();
        return;
    }
    
    // Light haptic feedback for instant interaction
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      // Ignore if not on a device that supports it
    }

    if (onClick) {
      const result = onClick(e);
      if (result instanceof Promise) {
        setInternalIsLoading(true);
        try {
          await result;
        } finally {
          if (mountedRef.current) setInternalIsLoading(false);
        }
      }
    }
  };

  const mountedRef = React.useRef(true);
  React.useEffect(() => {
      return () => { mountedRef.current = false; };
  }, []);

  const showLoading = isLoading || internalIsLoading;
  
  const content = (
      <>
        {showLoading && !asChild && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </>
  );

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }), showLoading && "opacity-70 pointer-events-none")}
      onClick={handleClick as any}
      disabled={disabled || showLoading}
      {...props}
    >
      {asChild ? children : content}
    </Comp>
  );
}

export { Button, buttonVariants };
