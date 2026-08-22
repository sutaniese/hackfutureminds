import { loraWordmark } from "@/lib/fonts";
import { cn } from "@/lib/cn";

const sizes = {
  sm: "text-[0.9rem] leading-tight",
  md: "text-[1.35rem] leading-none tracking-[-0.01em] md:text-[1.4rem]",
  lg: "text-2xl leading-tight",
} as const;

type Size = keyof typeof sizes;

type Props = {
  className?: string;
  size?: Size;
  /** Set when parent (e.g. a link) already has an accessible name. */
  presentational?: boolean;
};

/**
 * teñ. brand (Image #1): Lora, periwinkle “teñ”, black full stop.
 */
export function TenWordmark({
  className,
  size = "md",
  presentational = false,
}: Props) {
  return (
    <span
      className={cn(
        loraWordmark.className,
        "inline-block select-none font-semibold [font-synthesis-weight:none]",
        sizes[size],
        className,
      )}
      aria-hidden={presentational ? true : undefined}
      aria-label={presentational ? undefined : "teñ"}
    >
      <span className="text-ten-mark" aria-hidden>
        teñ
      </span>
      <span className="text-ten-mark-dot" aria-hidden>
        .
      </span>
    </span>
  );
}
