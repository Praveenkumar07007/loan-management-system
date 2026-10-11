interface GridPatternProps {
  variant?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center"
}

export function GridPattern({ variant = "bottom-right" }: GridPatternProps) {
  const maskConfig = {
    "top-left": `
      repeating-linear-gradient(
        to right,
        black 0px,
        black 3px,
        transparent 3px,
        transparent 8px
      ),
      repeating-linear-gradient(
        to bottom,
        black 0px,
        black 3px,
        transparent 3px,
        transparent 8px
      ),
      radial-gradient(ellipse 80% 80% at 0% 0%, #000 50%, transparent 90%)
    `,
    "top-right": `
      repeating-linear-gradient(
        to right,
        black 0px,
        black 3px,
        transparent 3px,
        transparent 8px
      ),
      repeating-linear-gradient(
        to bottom,
        black 0px,
        black 3px,
        transparent 3px,
        transparent 8px
      ),
      radial-gradient(ellipse 80% 80% at 100% 0%, #000 50%, transparent 90%)
    `,
    "bottom-left": `
      repeating-linear-gradient(
        to right,
        black 0px,
        black 3px,
        transparent 3px,
        transparent 8px
      ),
      repeating-linear-gradient(
        to bottom,
        black 0px,
        black 3px,
        transparent 3px,
        transparent 8px
      ),
      radial-gradient(ellipse 80% 80% at 0% 100%, #000 50%, transparent 90%)
    `,
    "bottom-right": `
      repeating-linear-gradient(
        to right,
        black 0px,
        black 3px,
        transparent 3px,
        transparent 8px
      ),
      repeating-linear-gradient(
        to bottom,
        black 0px,
        black 3px,
        transparent 3px,
        transparent 8px
      ),
      radial-gradient(ellipse 80% 80% at 100% 100%, #000 50%, transparent 90%)
    `,
    "center": `
      repeating-linear-gradient(
        to right,
        black 0px,
        black 3px,
        transparent 3px,
        transparent 8px
      ),
      repeating-linear-gradient(
        to bottom,
        black 0px,
        black 3px,
        transparent 3px,
        transparent 8px
      ),
      radial-gradient(ellipse 60% 60% at 50% 50%, #000 30%, transparent 70%)
    `,
  }

  return (
    <div
      className="absolute inset-0 z-0"
      style={{
        backgroundImage: `
          linear-gradient(to right, var(--border) 1px, transparent 1px),
          linear-gradient(to bottom, var(--border) 1px, transparent 1px)
        `,
        backgroundSize: "20px 20px",
        backgroundPosition: "0 0, 0 0",
        maskImage: maskConfig[variant],
        WebkitMaskImage: maskConfig[variant],
        maskComposite: "intersect",
        WebkitMaskComposite: "source-in",
      }}
    />
  )
}
