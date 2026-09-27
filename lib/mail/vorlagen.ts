export type Mail = { betreff: string; text: string; html: string }

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function htmlRahmen(absaetze: string[], link: string, knopf: string): string {
  const inhalt = absaetze.map((a) => `<p style="margin:0 0 14px">${a}</p>`).join("")
  return `<div style="font-family:Arial,sans-serif;color:#1F2429;max-width:520px">
${inhalt}<p style="margin:22px 0"><a href="${escapeHtml(link)}" style="background:#065A82;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">${knopf}</a></p>
<p style="margin:0;color:#5A6472;font-size:13px">Freundliche Grüsse<br>immoheart</p></div>`
}

export function einladungsMail(name: string, link: string): Mail {
  return {
    betreff: "Einladung zu immoheart",
    text: `Guten Tag ${name}\n\nSie wurden zu immoheart eingeladen. Über diesen Link legen Sie Ihr Passwort fest:\n${link}\n\nDer Link ist nur kurze Zeit gültig. Ist er abgelaufen, nutzen Sie auf der Login-Seite „Passwort vergessen?“.\n\nFreundliche Grüsse\nimmoheart`,
    html: htmlRahmen(
      [
        `Guten Tag ${escapeHtml(name)}`,
        "Sie wurden zu immoheart eingeladen. Über den folgenden Knopf legen Sie Ihr Passwort fest.",
        "Der Link ist nur kurze Zeit gültig. Ist er abgelaufen, nutzen Sie auf der Login-Seite „Passwort vergessen?“.",
      ],
      link,
      "Passwort festlegen"
    ),
  }
}

export function passwortResetMail(link: string): Mail {
  return {
    betreff: "Passwort für immoheart zurücksetzen",
    text: `Guten Tag\n\nÜber diesen Link setzen Sie ein neues Passwort:\n${link}\n\nHaben Sie das nicht angefordert, können Sie diese Mail ignorieren.\n\nFreundliche Grüsse\nimmoheart`,
    html: htmlRahmen(
      [
        "Guten Tag",
        "Über den folgenden Knopf setzen Sie ein neues Passwort.",
        "Haben Sie das nicht angefordert, können Sie diese Mail ignorieren.",
      ],
      link,
      "Neues Passwort setzen"
    ),
  }
}
