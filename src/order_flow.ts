import { z } from "zod";
import { infrai } from "./infrai.js";

export const checkoutSchema = z.object({ customerEmail: z.string().email(), orderId: z.string().min(1), totalCents: z.number().int().nonnegative() });
export type Checkout = z.infer<typeof checkoutSchema>;

export function receiptMessage(order: Checkout): { subject: string; text: string } {
  return { subject: `Receipt for order ${order.orderId}`, text: `Thanks for your order. Total: $${(order.totalCents / 100).toFixed(2)}.` };
}

export async function onboardDomain(domain: string, spf: string, dkimName: string, dkimValue: string, dmarc: string) {
  const { zone_id } = await infrai.dns.domain.get(domain);
  await infrai.dns.record.upsert({ zone_id, record_type: "TXT", name: domain, content: spf });
  await infrai.dns.record.upsert({ zone_id, record_type: "CNAME", name: dkimName, content: dkimValue });
  await infrai.dns.record.upsert({ zone_id, record_type: "TXT", name: `_dmarc.${domain}`, content: dmarc });
  return infrai.email.domain.verify(domain);
}

export async function sendReceipt(input: unknown) {
  const order = checkoutSchema.parse(input);
  const message = receiptMessage(order);
  return infrai.email.send({ to: order.customerEmail, subject: message.subject, html: `<p>${message.text}</p>` });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await sendReceipt({ customerEmail: process.env.DEMO_EMAIL_TO ?? "buyer@example.com", orderId: "ORDER-42", totalCents: 2599 });
  console.log(`receipt sent: ${result.message_id}`);
}
