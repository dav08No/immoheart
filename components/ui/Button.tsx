import type { ButtonHTMLAttributes } from "react"
import { Button as ShadcnButton } from "@/components/shadcn/button"

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "primaer" | "sekundaer" }

export function Button({ variante = "sekundaer", type = "button", ...rest }: Props) {
  return <ShadcnButton type={type} variant={variante === "primaer" ? "default" : "outline"} size="sm" {...rest} />
}
