import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:border border-gray-200 active:translate-y-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm border border-border hover:-translate-y-0.5 hover:shadow-md border border-border active:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm border border-border hover:-translate-y-0.5 hover:shadow-md border border-border",
        outline:
          "bg-background text-foreground shadow-sm border border-border hover:-translate-y-0.5 hover:shadow-md border border-border",
        secondary:
          "bg-background text-foreground shadow-sm border border-border hover:-translate-y-0.5 hover:shadow-md border border-border",
        ghost:
          "text-foreground hover:bg-background hover:border border-gray-200 rounded-xl",
        link: "text-primary underline-offset-4 hover:underline shadow-none",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-4 rounded-xl",
        lg: "h-12 px-8 rounded-2xl",
        icon: "h-11 w-11 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
