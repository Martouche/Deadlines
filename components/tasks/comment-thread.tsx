"use client"

import { useRef, useTransition } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Loader2, Send, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { addComment, deleteComment } from "@/lib/actions/comments"
import { displayName, formatRelative } from "@/lib/format"
import type { Comment } from "@/lib/types"

type CommentThreadProps = {
  taskId: string
  comments: Comment[]
  currentUserId: string
  isAdmin: boolean
}

export function CommentThread({ taskId, comments, currentUserId, isAdmin }: CommentThreadProps) {
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const submit = (formData: FormData) =>
    startTransition(async () => {
      const result = await addComment(taskId, String(formData.get("body") ?? ""))
      if (result.error) toast.error(result.error)
      else formRef.current?.reset()
    })

  const remove = (id: string) =>
    startTransition(async () => {
      const result = await deleteComment(id)
      if (result.error) toast.error(result.error)
    })

  return (
    <section>
      <h3 className="mb-3 text-sm font-medium">Discussion</h3>
      <ul className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {comments.map((c) => (
            <motion.li
              key={c.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="group rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5"
            >
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium">{displayName(c.author)}</span>
                {c.author?.role === "admin" && (
                  <span className="rounded-full border border-white/10 px-1.5 text-[10px] text-muted-foreground">Prestataire</span>
                )}
                <span className="text-muted-foreground">{formatRelative(c.created_at)}</span>
                {(c.author_id === currentUserId || isAdmin) && (
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    aria-label="Supprimer le commentaire"
                    className="ml-auto text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-sm whitespace-pre-wrap text-zinc-300">{c.body}</p>
            </motion.li>
          ))}
        </AnimatePresence>
        {comments.length === 0 && <li className="text-sm text-muted-foreground">Aucun message pour l&apos;instant.</li>}
      </ul>

      <form ref={formRef} action={submit} className="mt-4 flex flex-col gap-2">
        <Textarea
          name="body"
          required
          rows={3}
          placeholder="Écrire un message… (Ctrl + Entrée pour envoyer)"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) e.currentTarget.form?.requestSubmit()
          }}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Send />}
            Envoyer
          </Button>
        </div>
      </form>
    </section>
  )
}
