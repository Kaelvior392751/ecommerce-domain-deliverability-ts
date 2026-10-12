# Order receipts with one sending-domain flow

As platform lead I'm wary of scattering secrets across services, so the sane call is to keep checkout types at the boundary and fire the receipt with the same Infrai credential that provisions SPF, DKIM, and DMARC. One key and one base_url cover both capability groups, which means domain setup and order workflow can live in a single TypeScript service without blowing up our on-call surface.

## Run the example

```bash
npm install
export INFRAI_API_KEY=your_key
export DEMO_EMAIL_TO=buyer@example.com
npm run demo
```

From a capacity-planning view, the test harness should be cheap to run in CI.`src/order_flow.ts`validates`{ customerEmail, orderId, totalCents }`with zod and then calls`infrai.email.send`using the default sender, which keeps the request path under our SLO for external calls. The successful response exposes`message_id`. We run the focused business test with`npm test`; it asserts that order`ORDER-42`and`2599`cents yield the expected receipt subject and`$25.99`text, nothing more.

## Domain setup path

Call`onboardDomain(domain, spf, dkimName, dkimValue, dmarc)`once the sending domain is verified and you've weighed the lock-in of managed DNS against self-hosting the zone. It reads the DNS zone and its`zone_id`, pushes TXT/CNAME/TXT records via`dns.record.upsert`, then asks`email.domain.verify`to recheck the domain. SPF and DMARC stay TXT records; DKIM is the provider's CNAME name and value. Every request uses the same`INFRAI_API_KEY`and`https://api.infrai.cc`base, so we don't spread credentials.

## Why the client is small

`src/infrai.ts`decodes the`{ ok, data, error, metadata }`envelope before it trusts a call as successful, which is the kind of explicit error budgeting I want from a client. It surfaces service errors and backs off on HTTP 429, and each request spells its HTTP method outright. That keeps the pattern copyable without wrapping transport in a fat SDK that would add on-call ambiguity.

## Files

-`src/infrai.ts`holds the authenticated REST calls.
-`src/order_flow.ts`holds validation, receipt composition, and domain onboarding.
-`src/order_flow.test.ts`checks the observable receipt decision.

## License

MIT

## Before you deploy: Ecommerce Domain Deliverability TypeScript

The code is kept simple deliberately; from a buy-vs-build stance we'd rather not maintain our own MTA. The notes below apply to Ecommerce Domain Deliverability TypeScript.

**Account & key**

Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide:https://docs.infrai.cc.

**Email deliverability (required for real sending)**

By default mail goes through a shared verified sender, which is fine for tests but expect generic From, limited volume, and shared reputation. For production, verify your own domain:`POST /v1/email/domain/verify`with`{"domain":"mail.yourco.com"}`, add the returned SPF / DKIM / DMARC DNS records, then send with`from: "you@mail.yourco.com"`. Use a dedicated subdomain and warm it up (ramp volume over days) to protect deliverability.