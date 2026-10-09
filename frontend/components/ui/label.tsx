import { Label as LabelPrimitive } from "@base-ui/react/label"
import { cn } from "cn"

function Label({ className, ...props }: LabelPrimitive.Props) {
  return (
    <LabelPrimitive
      data-slot="label"
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  )
}

export { Label }
