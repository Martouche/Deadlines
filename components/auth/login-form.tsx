"use client"

import { useActionState } from "react"
import { KeyRound, Loader2, Mail } from "lucide-react"

import { signInWithMagicLink, signInWithPassword, type LoginState } from "@/app/(auth)/login/actions"
import { FormMessage } from "@/components/auth/form-message"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const idle: LoginState = { status: "idle" }

type LoginFormProps = {
  next: string
  initialError?: string
}

export function LoginForm({ next, initialError }: LoginFormProps) {
  const [magicState, magicAction, magicPending] = useActionState(signInWithMagicLink, idle)
  const [passwordState, passwordAction, passwordPending] = useActionState(signInWithPassword, idle)

  return (
    <Tabs defaultValue="magic" className="gap-6">
      <TabsList className="w-full">
        <TabsTrigger value="magic">
          <Mail /> Lien magique
        </TabsTrigger>
        <TabsTrigger value="password">
          <KeyRound /> Mot de passe
        </TabsTrigger>
      </TabsList>

      <FormMessage tone="error" message={initialError} />

      <TabsContent value="magic">
        <form action={magicAction} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />
          <Field id="magic-email" label="E-mail" name="email" type="email" autoComplete="email" />
          <FormMessage
            tone={magicState.status === "sent" ? "success" : "error"}
            message={magicState.message}
          />
          <Button type="submit" size="lg" disabled={magicPending}>
            {magicPending && <Loader2 className="animate-spin" />}
            Recevoir un lien de connexion
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="password">
        <form action={passwordAction} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />
          <Field id="pwd-email" label="E-mail" name="email" type="email" autoComplete="email" />
          <Field id="pwd-password" label="Mot de passe" name="password" type="password" autoComplete="current-password" />
          <FormMessage tone="error" message={passwordState.message} />
          <Button type="submit" size="lg" disabled={passwordPending}>
            {passwordPending && <Loader2 className="animate-spin" />}
            Se connecter
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  )
}

type FieldProps = React.ComponentProps<"input"> & { id: string; label: string }

function Field({ id, label, ...props }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} required className="h-9" {...props} />
    </div>
  )
}
