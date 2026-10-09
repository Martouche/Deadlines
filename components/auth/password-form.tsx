"use client"

import Link from "next/link"
import { Loader2 } from "lucide-react"

import { useFormAction } from "@/components/app/use-action"
import { FormMessage } from "@/components/auth/form-message"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updatePassword } from "@/lib/actions/account"

export function PasswordForm() {
  const [state, action, pending] = useFormAction(updatePassword)

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
      <FormMessage tone="error" message={state.error} />
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
