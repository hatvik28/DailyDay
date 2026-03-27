"use client";

import * as React from "react";
import { cn, clamp } from "@/lib/utils";

type ProgressProps = Omit<React.ComponentProps<"div">, "children"> & {
  value?: number;
  indicatorClassName?: string;
  trackClassName?: string;
};

function Progress({
  className,
  value = 0,
  indicatorClassName,
  trackClassName,
  ...props
}: ProgressProps) {
  const safe = clamp(value, 0, 100);

  return (
    <div
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted",
        trackClassName,
        className
      )}
      {...props}
    >
      <div
        className={cn("h-full bg-primary transition-[width] duration-200 ease-out", indicatorClassName)}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}

export { Progress };
