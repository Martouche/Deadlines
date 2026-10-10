import "server-only"
import { after } from "next/server"
import nodemailer from "nodemailer"

import { getProfile } from "@/lib/auth"
import { env } from "@/lib/env"
import { describeError, logEvent, newRef } from "@/lib/logger"
import { createClient } from "@/lib/supabase/server"

type Notification = {
  /** Identifiant de l'événement, pour les logs (ex. « comment », « review »). */
  event: string
  projectId: string
  subject: string
  heading: string
  body: string
  /** Chemin dans l'app (ex. /projects/…?task=…). */
  path: string
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}

function renderHtml({ heading, body, path }: Notification) {
  const url = `${env.siteUrl}${path}`
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f6f6f6;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1px solid #e5e5e5;border-radius:12px">
<tr><td style="padding:28px">
<p style="margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#777">Portail client</p>
<h1 style="margin:0 0 12px;font-size:20px">${escapeHtml(heading)}</h1>
<p style="margin:0 0 24px;font-size:14px;line-height:1.6;white-space:pre-line;color:#333">${escapeHtml(body)}</p>
<a href="${escapeHtml(url)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:14px">Ouvrir dans le portail</a>
</td></tr></table>
<p style="font-size:12px;color:#999">Notification automatique de ${escapeHtml(new URL(env.siteUrl).host)}</p>
</td></tr></table></body></html>`
}

/**
 * Destinataires : si l'auteur est l'admin, les clients membres du projet (sauf brouillon) ;
 * si c'est un client, les administrateurs. Jamais l'auteur lui-même.
 */
async function recipients(projectId: string) {
  const actor = await getProfile()
  if (!actor) return []
  const supabase = await createClient()

  if (actor.role === "admin") {
    const { data: project } = await supabase.from("projects").select("status").eq("id", projectId).maybeSingle()
    if (!project || project.status === "draft") return []
    const { data } = await supabase
      .from("project_members")
      .select("profile:profiles(email)")
      .eq("project_id", projectId)
      .returns<{ profile: { email: string } | null }[]>()
    return (data ?? []).flatMap((m) => (m.profile ? [m.profile.email] : []))
  }

  // Les profils admin sont lisibles par les clients (RLS) : pas besoin de clé de service.
  const { data } = await supabase.from("profiles").select("email").eq("role", "admin")
  return (data ?? []).map((p) => p.email as string).filter((email) => email !== actor.email)
}

/**
 * Transport SMTP (boîte OVH : ssl0.ovh.net:465). Identifiants lus dans les variables
 * d'environnement, jamais dans le code. null si la configuration est incomplète.
 */
function smtpTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null
  const port = Number(SMTP_PORT ?? 465)
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465, // 465 : TLS direct ; 587 : STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

/** Programme l'envoi après la réponse : l'action n'attend jamais l'e-mail. */
export async function notify(notification: Notification) {
  const ref = newRef()
  const transport = smtpTransport()
  const from = process.env.NOTIFY_FROM ?? process.env.SMTP_USER
  const context = { event: notification.event, projectId: notification.projectId }

  if (!transport || !from) {
    await logEvent({
      level: "info",
      action: "notify.skipped",
      ref,
      context: { ...context, reason: "SMTP_HOST, SMTP_USER ou SMTP_PASS manquant" },
    })
    return
  }

  const to = await recipients(notification.projectId)
  if (to.length === 0) return

  after(async () => {
    const started = Date.now()
    // Un envoi par destinataire : aucun client ne voit l'adresse des autres.
    const results = await Promise.allSettled(
      to.map((recipient) =>
        transport.sendMail({
          from,
          to: recipient,
          subject: notification.subject,
          html: renderHtml(notification),
          text: `${notification.heading}\n\n${notification.body}\n\n${env.siteUrl}${notification.path}`,
        }),
      ),
    )
    transport.close()
    const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected")
    await logEvent({
      level: failures.length > 0 ? "error" : "info",
      action: "notify.sent",
      ref,
      durationMs: Date.now() - started,
      context: { ...context, recipients: to.length, failed: failures.length },
      error: failures.map((f) => describeError(f.reason)).join("\n") || undefined,
    })
  })
}
