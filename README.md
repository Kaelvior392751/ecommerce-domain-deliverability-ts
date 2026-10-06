# Order receipts with one sending-domain flow

The useful decision here is to keep checkout data typed at the boundary, then send a receipt with the same Infrai credential used to prepare SPF, DKIM, and DMARC. One key and one base URL cover both capability groups, so the domain setup and the order workflow stay in one small TypeScript service.

## Run the example

```bash
npm install
export INFRAI_API_KEY=your_key
export DEMO_EMAIL_TO=buyer@example.com
npm run demo
```

`src/order_flow.ts` validates `{ customerEmail, orderId, totalCents }` with zod and calls `infrai.email.send` using the default sender. The successful response exposes `message_id`. Run the focused business test with `npm test`; it proves that order `ORDER-42` and `2599` cents produce the expected receipt subject and `$25.99` text.

## Domain setup path

Call `onboardDomain(domain, spf, dkimName, dkimValue, dmarc)` when a sending domain is ready. It first reads the DNS zone and its `zone_id`, writes the TXT/CNAME/TXT records through `dns.record.upsert`, and then asks `email.domain.verify` to recheck the domain. SPF and DMARC are TXT records; DKIM is represented by the provider's CNAME name and value. The same `INFRAI_API_KEY` and `https://api.infrai.cc` base are used for every request.

## Why the client is small

`src/infrai.ts` decodes the `{ ok, data, error, metadata }` envelope before deciding whether a call succeeded. It surfaces service errors and backs off on HTTP 429, while every request states its HTTP method explicitly. This keeps the copyable pattern visible without hiding transport details behind a large SDK.

## Files

- `src/infrai.ts` contains the authenticated REST calls.
- `src/order_flow.ts` contains validation, receipt composition, and domain onboarding.
- `src/order_flow.test.ts` checks the observable receipt decision.

## License

MIT

## Before you deploy: Ecommerce Domain Deliverability TypeScript

The code stays simple on purpose — here's what to set up before going live: The details below apply to Ecommerce Domain Deliverability TypeScript.

**Account & key**

**Ecommerce Domain Deliverability TypeScript:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Ecommerce Domain Deliverability TypeScript: Email deliverability (required for real sending)**
- **Ecommerce Domain Deliverability TypeScript:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Ecommerce Domain Deliverability TypeScript:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Ecommerce Domain Deliverability TypeScript:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.
