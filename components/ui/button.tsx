import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-[4px] text-sm font-medium ring-offset-white gap-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#37352F] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 transition-colors duration-150",
  {
    variants: {
      variant: {
        default:
          "bg-[#37352F] text-white border border-[#37352F] hover:bg-[#000000]",
        noShadow: "bg-[#37352F] text-white border border-[#37352F]",
        neutral:
          "bg-transparent text-[#37352F] border border-[#E9E9E7] hover:bg-[#F7F7F5]",
        reverse:
          "bg-[#F7F7F5] text-[#37352F] border border-[#E9E9E7] hover:bg-[#EFEFEF]",
        transparent:
          "bg-transparent text-[#37352F] border border-[#E9E9E7] hover:bg-[#F7F7F5]",
        ghost: "bg-transparent text-[#37352F] border-0 hover:bg-[#F7F7F5]",
        outline:
          "bg-white text-[#37352F] border border-[#E9E9E7] hover:bg-[#F7F7F5]",
        destructive:
          "bg-[#FDEAEA] text-[#C2312B] border border-[#C2312B] hover:bg-[#C2312B] hover:text-white",
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
