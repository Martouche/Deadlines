"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"

import { FormMessage } from "@/components/auth/form-message"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updatePassword, type PasswordState } from "@/lib/actions/account"

const idle: PasswordState = { status: "idle" }

export function PasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, idle)

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Nouveau mot de passe</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required className="h-9" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm">Confirmation</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required className="h-9" />
      </div>
      <FormMessage tone="error" message={state.message} />
      <div className="flex gap-2">
        <Button type="submit" size="lg" disabled={pending} className="flex-1">
          {pending && <Loader2 className="animate-spin" />}
          Enregistrer
        </Button>
        <Link href="/" className={buttonVariants({ variant: "ghost", size: "lg" })}>
          Plus tard
        </Link>
      </div>
    </form>
  )
}
