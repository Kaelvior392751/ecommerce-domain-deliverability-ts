import assert from "node:assert/strict";
import { receiptMessage } from "./order_flow.js";

const message = receiptMessage({ customerEmail: "buyer@example.com", orderId: "ORDER-42", totalCents: 2599 });
assert.equal(message.subject, "Receipt for order ORDER-42");
assert.equal(message.text, "Thanks for your order. Total: $25.99.");
console.log("receipt decision test passed");
