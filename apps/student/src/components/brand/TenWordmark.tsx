import { loraWordmark } from "@/lib/fonts";
import { cn } from "@/lib/cn";

const sizes = {
  sm: "text-[1rem] leading-tight",
  md: "text-[1.5rem] leading-none tracking-[-0.02em] md:text-[1.6rem]",
  lg: "text-3xl leading-tight tracking-[-0.02em]",
} as const;

type Size = keyof typeof sizes;

type Props = {
  className?: string;
  size?: Size;
  presentational?: boolean;
};

export function TenWordmark({
  className,
  size = "md",
  presentational = false,
}: Props) {
  return (
    <span
      className={cn(
        loraWordmark.className,
        "inline-block select-none font-bold [font-synthesis-weight:none]",
        sizes[size],
        className,
      )}
      aria-hidden={presentational ? true : undefined}
      aria-label={presentational ? undefined : "teñ"}
    >
      <span className="pw-gradient-text" aria-hidden>
        teñ
      </span>
      <span className="text-ten-mark-dot" aria-hidden>
        .
      </span>
    </span>
  );
}
