import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, error, ...props }: InputPrimitive.Props & { error?: boolean }) {
  return (
    <InputPrimitive
      data-slot="input"
      className={cn(
        "flex h-11 w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground shadow-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
        error && "border-destructive focus-visible:ring-destructive focus-visible:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
