import { z } from "zod"

export const entwurfSchema = z.object({
  an: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  // Zeilenumbrüche im Betreff würden sonst als zusätzliche Mail-Header gelesen.
  betreff: z.string().trim().min(1).max(200).regex(/^[^\r\n]*$/),
  body: z.string().min(1).max(20000),
})

export type EntwurfEingabe = z.infer<typeof entwurfSchema>
