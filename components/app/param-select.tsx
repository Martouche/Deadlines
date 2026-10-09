"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { NativeSelect } from "@/components/ui/native-select"

type ParamSelectProps = {
  /** Paramètre d'URL piloté par la liste (ex. « client »). */
  param: string
  value: string
  label: string
  allLabel: string
  options: { id: string; label: string }[]
}

/** Liste déroulante qui écrit sa valeur dans l'URL (filtre partageable, bouton retour fonctionnel). */
export function ParamSelect({ param, value, label, allLabel, options }: ParamSelectProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (
    <NativeSelect
      aria-label={label}
      value={value}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams)
        if (e.target.value) params.set(param, e.target.value)
        else params.delete(param)
        const qs = params.toString()
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      }}
      className="w-56"
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </NativeSelect>
  )
}
