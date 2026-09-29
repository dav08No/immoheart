import type { ButtonHTMLAttributes, ReactNode } from "react"
import { Button as ShadcnButton } from "@/components/shadcn/button"
import { cn } from "@/lib/utils"

type Variante = "primaer" | "sekundaer" | "dezent" | "gefaehrlich"
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; groesse?: "sm" | "md"; icon?: ReactNode }

const SHADCN_VARIANTE = { primaer: "default", sekundaer: "outline", dezent: "ghost", gefaehrlich: "default" } as const

// "gefaehrlich" nicht über shadcns destructive: dessen Dunkel-Variante (60 % Rot,
// weisse Schrift) fällt unter 4.5:1. Volles --crit mit --on-brand hält in beiden Modi > 7:1.
const GEFAEHRLICH = "bg-crit text-on-brand hover:bg-crit/90 focus-visible:ring-crit/40"

export function Button({ variante = "sekundaer", groesse = "sm", icon, type = "button", className, children, ...rest }: Props) {
  return (
    <ShadcnButton
      type={type}
      variant={SHADCN_VARIANTE[variante]}
      size={groesse === "md" ? "default" : "sm"}
      className={cn(variante === "gefaehrlich" && GEFAEHRLICH, className)}
      {...rest}
    >
      {icon}
      {children}
    </ShadcnButton>
  )
}
