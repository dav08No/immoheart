import type { ButtonHTMLAttributes } from "react"

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "primaer" | "sekundaer" }

export function Button({ variante = "sekundaer", className = "", ...rest }: Props) {
  const basis = "rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-60"
  const stil =
    variante === "primaer"
      ? "bg-brand text-on-brand hover:bg-brand-2"
      : "border border-line-2 bg-surface text-ink hover:bg-surface-2"
  return <button className={`${basis} ${stil} ${className}`} {...rest} />
}
