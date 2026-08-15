import { cn } from "@/lib/utils";

/**
 * Editorial brand mark: a serif "M" set over three newspaper column rules
 * inside a hairline frame. Used across the landing page, auth, and dashboard.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("shrink-0", className)}
      aria-hidden="true"
      role="img"
    >
      <rect
        x="0.75"
        y="0.75"
        width="38.5"
        height="38.5"
        rx="2"
        fill="var(--background)"
        stroke="var(--foreground)"
        strokeWidth="1.25"
      />
      <line
        x1="8.5"
        y1="11"
        x2="8.5"
        y2="29"
        stroke="var(--foreground)"
        strokeWidth="1"
        opacity="0.3"
      />
      <line
        x1="20"
        y1="11"
        x2="20"
        y2="29"
        stroke="var(--foreground)"
        strokeWidth="1"
        opacity="0.3"
      />
      <line
        x1="31.5"
        y1="11"
        x2="31.5"
        y2="29"
        stroke="var(--foreground)"
        strokeWidth="1"
        opacity="0.3"
      />
      <text
        x="20"
        y="27"
        textAnchor="middle"
        fontFamily="Iowan Old Style, Palatino Linotype, Georgia, serif"
        fontSize="17.5"
        fontWeight="700"
        fill="var(--foreground)"
      >
        M
      </text>
    </svg>
  );
}

export function Wordmark({
  className,
  subtitle = true,
  compact = false,
}: {
  className?: string;
  subtitle?: boolean;
  compact?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark className={compact ? "size-7" : "size-9"} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "masthead text-foreground",
            compact ? "text-[13px]" : "text-[15px]",
          )}
        >
          MUN APEX AI
        </span>
        {subtitle && (
          <span className="mt-1 text-[9.5px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
            Delegate Intelligence
          </span>
        )}
      </span>
    </span>
  );
}
