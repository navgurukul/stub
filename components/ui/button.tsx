import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-[4px] text-sm font-medium ring-offset-background gap-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 transition-colors duration-150",
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background border border-foreground hover:bg-muted",
        noShadow: "bg-foreground text-background border border-foreground",
        neutral:
          "bg-transparent text-foreground border border-border hover:bg-secondary-background",
        reverse:
          "bg-secondary-background text-foreground border border-border hover:bg-background",
        transparent:
          "bg-transparent text-foreground border border-border hover:bg-secondary-background",
        ghost:
          "bg-transparent text-foreground border-0 hover:bg-secondary-background",
        outline:
          "bg-background text-foreground border border-border hover:bg-secondary-background",
        destructive:
          "bg-color-red-bg text-accent border border-accent hover:bg-accent hover:text-background",
      },
      size: {
        default: "h-8 px-3 py-1.5",
        xs: "h-6 px-2 text-xs",
        sm: "h-7 px-2.5 text-xs",
        lg: "h-9 px-4",
        xl: "h-10 px-5",
        icon: "size-7 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
