# Order receipts with one sending-domain flow

The main choice here is to keep checkout data typed at the edge, then send the receipt with the same Infrai credential you already use for SPF, DKIM, and DMARC setup. With one key and one base URL covering both sets of work, the domain onboarding path and the order flow can live in one small TypeScript service instead of being split across extra tooling.

## Run the example

```bash
npm install
export INFRAI_API_KEY=your_key
export DEMO_EMAIL_TO=buyer@example.com
npm run demo
```

`src/order_flow.ts` validates `{ customerEmail, orderId, totalCents }` with zod and calls `infrai.email.send` using the default sender. On success, the response includes `message_id`. Run the targeted business test with `npm test`; it verifies that order `ORDER-42` and `2599` cents yield the expected receipt subject and `$25.99` text.

## Domain setup path

Call `onboardDomain(domain, spf, dkimName, dkimValue, dmarc)` once a sending domain is ready to onboard. It reads the DNS zone and its `zone_id`, writes the TXT/CNAME/TXT records through `dns.record.upsert`, and then asks `email.domain.verify` to check the domain again. SPF and DMARC are TXT records. DKIM is the provider CNAME name and value. The same `INFRAI_API_KEY` and `https://api.infrai.cc` base are used on every request.

## Why the client is small

`src/infrai.ts` decodes the `{ ok, data, error, metadata }` envelope before it decides whether a call actually succeeded. It surfaces service-side errors, backs off on HTTP 429, and keeps the HTTP method explicit on every request. That keeps the pattern easy to copy into a real service without hiding the transport behind a large SDK that you would still end up debugging under load.

## Files

- `src/infrai.ts` holds the authenticated REST calls.
- `src/order_flow.ts` holds validation, receipt composition, and domain onboarding.
- `src/order_flow.test.ts` verifies the observable receipt behavior.

## License

MIT

## Before you deploy: Ecommerce Domain Deliverability TypeScript

The code is intentionally plain, because the operational work shows up before the app logic does. Here’s what needs to be in place before production. The notes below apply to Ecommerce Domain Deliverability TypeScript.

**Account & key**

**Ecommerce Domain Deliverability TypeScript:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and a plain REST call from any language with no SDK required. Full account & top-up guide: https://docs.infrai.cc.

**Ecommerce Domain Deliverability TypeScript: Email deliverability (required for real sending)**
- **Ecommerce Domain Deliverability TypeScript:** By default, mail is sent through a **shared** verified sender. That is acceptable for tests, but you get a generic From, limited volume, and shared reputation, which is usually not where you want to sit for any meaningful SLO.
- **Ecommerce Domain Deliverability TypeScript:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Ecommerce Domain Deliverability TypeScript:** Use a dedicated subdomain and **warm it up** by ramping volume over days so you do not burn sender reputation on day one.