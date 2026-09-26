import "server-only"
import nodemailer from "nodemailer"
import type { Mail } from "./vorlagen"

// Pro Aufruf ein Transport statt eines Modul-Singletons: der Build darf keine
// Umgebungsvariablen brauchen (siehe Vorgänger-Spec D3).
function transport() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })
}

export async function sendeMail(an: string, mail: Mail): Promise<{ messageId: string }> {
  const info = await transport().sendMail({
    from: { name: "immoheart", address: process.env.GMAIL_USER ?? "" },
    to: an,
    subject: mail.betreff,
    text: mail.text,
    html: mail.html,
  })
  return { messageId: info.messageId }
}
