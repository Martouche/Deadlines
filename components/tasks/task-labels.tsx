import type { Label } from "@/lib/types"

export function LabelChip({ label }: { label: Label }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-zinc-300">
      {/* Couleur dynamique issue de la base : style inline légitime. */}
      <span className="size-1.5 rounded-full" style={{ backgroundColor: label.color }} />
      {label.name}
    </span>
  )
}

export function LabelList({ ids, labels }: { ids: string[]; labels: Map<string, Label> }) {
  if (ids.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {ids.map((id) => {
        const label = labels.get(id)
        return label ? <LabelChip key={id} label={label} /> : null
      })}
    </div>
  )
}
