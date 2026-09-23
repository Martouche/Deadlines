"use client"

import { Plus } from "lucide-react"

import { ClientForm } from "@/components/clients/client-form"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createClientRecord } from "@/lib/actions/clients"

export function NewClientDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="lg" />}>
        <Plus /> Nouveau client
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Nouveau client</DialogTitle>
          <DialogDescription>Tu pourras ensuite créer ses projets et l&apos;inviter sur le portail.</DialogDescription>
        </DialogHeader>
        <ClientForm action={createClientRecord} submitLabel="Créer le client" />
      </DialogContent>
    </Dialog>
  )
}
