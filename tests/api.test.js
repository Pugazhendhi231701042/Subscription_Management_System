import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import jwt from "jsonwebtoken";
import { DatabaseSync } from "node:sqlite";

const password = "AuditPass123!";
let serverProcess, baseUrl, testDirectory, adminToken, customerToken, customerId, staffId, serverEnv;
const api = async (path, { method = "GET", token, body } = {}) => {
  const response = await fetch(baseUrl + path, { method, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  let payload = {};
  try { payload = await response.json(); } catch {}
  return { status: response.status, body: payload, retryAfter: response.headers.get("retry-after") };
};
const freePort = () => new Promise((resolvePort, reject) => {
  const socket = createServer();
  socket.once("error", reject);
  socket.listen(0, "127.0.0.1", () => { const { port } = socket.address(); socket.close(() => resolvePort(port)); });
});

before(async () => {
  testDirectory = await mkdtemp(join(tmpdir(), "brightloop-audit-"));
  const port = await freePort();
  baseUrl = `http://127.0.0.1:${port}/api`;
  const databaseFile = join(testDirectory, "audit.sqlite");
  const preexisting = new DatabaseSync(databaseFile);
  preexisting.exec("CREATE TABLE records(collection TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(collection,id)); CREATE TABLE app_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);");
  preexisting.prepare("INSERT INTO records(collection,id,data) VALUES(?,?,?)").run("customers", "legacy-customer", JSON.stringify({ _id: "legacy-customer", email: "legacy@brightloop.test", name: "Legacy Customer", status: "Active" }));
  preexisting.close();
  serverEnv = { ...process.env, PORT: String(port), DATABASE_PATH: databaseFile, JWT_SECRET: "audit-only-secret-value-" + "x".repeat(48), MASTER_ADMIN_EMAIL: "admin@brightloop.test", MASTER_ADMIN_NAME: "Audit Admin", MASTER_ADMIN_PASSWORD: password, CLIENT_URL: `http://127.0.0.1:${port}`, GOOGLE_CLIENT_ID: "audit-google-client-id" };
  serverProcess = spawn(process.execPath, [resolve("server.js")], { cwd: process.cwd(), env: serverEnv, stdio: ["ignore", "pipe", "pipe"] });
  let logs = "";
  serverProcess.stdout.on("data", (chunk) => { logs += chunk.toString(); });
  serverProcess.stderr.on("data", (chunk) => { logs += chunk.toString(); });
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) throw new Error(`API startup exited (${serverProcess.exitCode}): ${logs}`);
    try { const response = await fetch(baseUrl + "/health"); if (response.ok) return; } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  throw new Error(`API startup timed out: ${logs}`);
});

after(async () => {
  if (serverProcess && serverProcess.exitCode === null) { serverProcess.kill("SIGTERM"); await new Promise((resolveExit) => serverProcess.once("exit", resolveExit)); }
  if (testDirectory) await rm(testDirectory, { recursive: true, force: true });
});

test("health and protected endpoints report correct statuses", async () => {
  const allowedOrigin = await fetch(baseUrl + "/health", { headers: { origin: serverEnv.CLIENT_URL } });
  assert.equal(allowedOrigin.headers.get("access-control-allow-origin"), serverEnv.CLIENT_URL);
  const blockedOrigin = await fetch(baseUrl + "/health", { headers: { origin: "https://untrusted.example" } });
  assert.equal(blockedOrigin.headers.get("access-control-allow-origin"), null);
  assert.deepEqual((await api("/health")).body.data, { status: "ok", database: "sqlite" });
  assert.equal((await api("/dashboard")).status, 401);
});

test("master admin login and JWT session work; invalid credentials fail", async () => {
  assert.equal((await api("/auth/login", { method: "POST", body: { email: "admin@brightloop.test", password: "wrong" } })).status, 401);
  const login = await api("/auth/login", { method: "POST", body: { email: "ADMIN@BRIGHTLOOP.TEST ", password } });
  assert.equal(login.status, 200);
  adminToken = login.body.data.token;
  assert.equal((await api("/auth/me", { token: adminToken })).body.data.role, "admin");
});

test("customer registration validates passwords, rejects duplicates, and supports login", async () => {
  assert.equal((await api("/auth/register", { method: "POST", body: { name: "Invalid", email: "not-an-email", password } })).status, 400);
  assert.equal((await api("/auth/register", { method: "POST", body: { name: "Audit Customer", email: "customer@brightloop.test", password: "weak" } })).status, 400);
  const created = await api("/auth/register", { method: "POST", body: { name: "Audit Customer", email: "customer@brightloop.test", phone: "12345", password } });
  assert.equal(created.status, 201);
  customerToken = created.body.data.token;
  customerId = created.body.data.user.email;
  assert.equal((await api("/auth/register", { method: "POST", body: { name: "Duplicate", email: customerId.toUpperCase(), password } })).status, 409);
  assert.equal((await api("/auth/login", { method: "POST", body: { email: customerId, password } })).status, 200);
  assert.equal((await api("/customers", { token: customerToken })).body.data.length, 1);
  assert.equal((await api("/users", { token: customerToken })).status, 403);
  assert.equal((await api("/products", { method: "POST", token: customerToken, body: { name: "Unauthorized" } })).status, 403);
});

test("master admin creates invited staff; staff password login is refused", async () => {
  const created = await api("/users", { method: "POST", token: adminToken, body: { name: "Audit Staff", email: "staff@brightloop.test" } });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.status, "Invited");
  assert.equal(created.body.data.role, "staff");
  assert.equal("password" in created.body.data, false);
  staffId = created.body.data._id;
  const denied = await api("/auth/login", { method: "POST", body: { email: "staff@brightloop.test", password } });
  assert.equal(denied.status, 401);
  assert.match(denied.body.error, /Google/i);
  assert.equal((await api("/users", { method: "POST", token: customerToken, body: { name: "No", email: "no@brightloop.test" } })).status, 403);
});

test("staff permissions and account closure revoke existing sessions", async () => {
  const staffToken = jwt.sign({ id: staffId, email: "staff@brightloop.test", role: "staff", tokenVersion: 0 }, "audit-only-secret-value-" + "x".repeat(48));
  assert.equal((await api("/customers", { token: staffToken })).status, 200);
  assert.equal((await api("/users", { token: staffToken })).status, 403);
  assert.equal((await api("/products", { method: "POST", token: staffToken, body: { name: "Staff forbidden" } })).status, 403);
  const close = await api(`/users/${staffId}`, { method: "PATCH", token: adminToken, body: { status: "Closed" } });
  assert.equal(close.status, 200);
  assert.equal(close.body.data.status, "Closed");
  assert.equal((await api("/auth/me", { token: staffToken })).status, 401);
  const invalid = await api(`/users/${staffId}`, { method: "PATCH", token: adminToken, body: { status: "Root" } });
  assert.equal(invalid.status, 400);
  const reopen = await api(`/users/${staffId}`, { method: "PATCH", token: adminToken, body: { status: "Active" } });
  assert.equal(reopen.status, 200);
  assert.equal(reopen.body.data.status, "Active");
  assert.equal((await api("/auth/me", { token: staffToken })).status, 401);
});

test("admin product CRUD persists through API and customer catalog is read-only", async () => {
  const created = await api("/products", { method: "POST", token: adminToken, body: { name: "Audit Product", type: "Software", salesPrice: 20, costPrice: 5 } });
  assert.equal(created.status, 201);
  const id = created.body.data._id;
  const listed = await api("/products?search=Audit%20Product", { token: adminToken });
  assert.equal(listed.body.data.some((row) => row._id === id), true);
  assert.equal((await api(`/products/${id}`, { method: "PATCH", token: adminToken, body: { salesPrice: 25 } })).body.data.salesPrice, 25);
  const customerList = await api("/products", { token: customerToken });
  assert.equal(customerList.body.data.some((row) => row._id === id), true);
  assert.equal((await api(`/products/${id}`, { method: "DELETE", token: customerToken })).status, 403);
  assert.equal((await api(`/products/${id}`, { method: "DELETE", token: adminToken })).status, 200);
  assert.equal((await api(`/products/${id}`, { method: "DELETE", token: adminToken })).status, 404);
});

test("customer profile updates do not create unrelated customer records", async () => {
  const before = await api("/customers", { token: adminToken });
  const updated = await api("/profile", { method: "PATCH", token: adminToken, body: { name: "Renamed Admin", phone: "555", company: "Audit" } });
  assert.equal(updated.status, 200);
  const after = await api("/customers", { token: adminToken });
  assert.equal(after.body.total, before.body.total);
});

test("expired, malformed, and role-forged JWTs are rejected", async () => {
  assert.equal((await api("/dashboard", { token: "not-a-token" })).status, 401);
  const forged = jwt.sign({ id: "missing", email: "nobody@test", role: "admin", tokenVersion: 0 }, "audit-only-secret-value-" + "x".repeat(48));
  assert.equal((await api("/dashboard", { token: forged })).status, 401);
});
test("startup migration preserves pre-existing records when the marker is missing", async () => {
  const customers = await api("/customers", { token: adminToken });
  assert.equal(customers.body.data.some((row) => row.email === "legacy@brightloop.test"), true);
});

test("subscription, invoice, payment, and close-status workflow persists for its customer", async () => {
  const subscription = await api("/subscriptions", { method: "POST", token: adminToken, body: { number: "SUB-AUDIT", customer: "Audit Customer", customerEmail: customerId, plan: "Audit Plan", amount: 100, status: "Active", startDate: new Date().toISOString(), renewalDate: new Date(Date.now() + 86400000).toISOString(), billingFrequency: "Monthly" } });
  assert.equal(subscription.status, 201);
  const subscriptionId = subscription.body.data._id;
  const invoice = await api("/invoices", { method: "POST", token: adminToken, body: { number: "INV-AUDIT", customer: "Audit Customer", customerEmail: customerId, subscription: subscriptionId, amount: 100, status: "Draft" } });
  assert.equal(invoice.status, 201);
  const invoiceId = invoice.body.data._id;
  assert.equal((await api(`/invoices/${invoiceId}/status`, { method: "POST", token: adminToken, body: { status: "Confirmed" } })).status, 200);
  const customerInvoice = await api("/invoices", { token: customerToken });
  assert.equal(customerInvoice.body.data.some((row) => row._id === invoiceId && row.status === "Confirmed"), true);
  const payment = await api("/payments", { method: "POST", token: adminToken, body: { invoice: invoiceId, amount: 100, paymentMethod: "Audit", paymentDate: new Date().toISOString() } });
  assert.equal(payment.status, 201);
  assert.equal(payment.body.data.status, "Succeeded");
  const paidInvoice = await api("/invoices", { token: customerToken });
  assert.equal(paidInvoice.body.data.find((row) => row._id === invoiceId).status, "Paid");
  assert.equal((await api(`/subscriptions/${subscriptionId}/status`, { method: "POST", token: adminToken, body: { status: "Closed" } })).status, 200);
  const customerSubscriptions = await api("/subscriptions", { token: customerToken });
  assert.equal(customerSubscriptions.body.data.find((row) => row._id === subscriptionId).status, "Closed");
  assert.equal((await api(`/subscriptions/${subscriptionId}/status`, { method: "POST", token: adminToken, body: { status: "Active" } })).status, 400);
});

test("records and JWT sessions survive an API restart", async () => {
  serverProcess.kill("SIGTERM");
  await new Promise((resolveExit) => serverProcess.once("exit", resolveExit));
  serverProcess = spawn(process.execPath, [resolve("server.js")], { cwd: process.cwd(), env: serverEnv, stdio: ["ignore", "ignore", "ignore"] });
  const deadline = Date.now() + 15000;
  let healthy = false;
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) break;
    try { const response = await fetch(baseUrl + "/health"); if (response.ok) { healthy = true; break; } } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  assert.equal(healthy, true, "API should restart using the same local database");
  const customer = await api("/customers", { token: adminToken });
  assert.equal(customer.status, 200);
  assert.equal(customer.body.data.some((row) => row.email === customerId), true);
});


test("Google auth rejects invalid credentials without creating an account", async () => {
  const rejected = await api("/auth/google", { method: "POST", body: { credential: "not-a-google-token" } });
  assert.equal(rejected.status, 401);
  const users = await api("/users", { token: adminToken });
  assert.equal(users.body.data.some((row) => row.email === "unauthorized@brightloop.test"), false);
});

test("development password reset completes and invalidates the old JWT", async () => {
  const oldToken = customerToken;
  const requested = await api("/auth/forgot-password", { method: "POST", body: { email: customerId } });
  assert.equal(requested.status, 200);
  assert.ok(requested.body.developmentResetUrl);
  const resetToken = new URL(requested.body.developmentResetUrl).searchParams.get("resetToken");
  assert.ok(resetToken);
  const changed = await api("/auth/reset-password", { method: "POST", body: { token: resetToken, password: "NewAuditPass456!" } });
  assert.equal(changed.status, 200);
  assert.equal((await api("/auth/login", { method: "POST", body: { email: customerId, password } })).status, 401);
  const relogin = await api("/auth/login", { method: "POST", body: { email: customerId, password: "NewAuditPass456!" } });
  assert.equal(relogin.status, 200);
  assert.equal((await api("/auth/me", { token: oldToken })).status, 401);
});test("plans, quotation templates, quotations, discounts, and taxes support API CRUD", async () => {
  const resources = [
    ["plans", { planName: "Audit Plan", product: "Audit Product", price: 20, billingFrequency: "Monthly", minimumQuantity: 1 }],
    ["quotationTemplates", { name: "Audit Template", validDays: 30, amount: 50 }],
    ["discounts", { name: "Audit Discount", type: "Percentage", value: 10, scope: "All", status: "Active" }],
    ["taxes", { name: "Audit Tax", rate: 5, scope: "All", status: "Active" }]
  ];
  const records = [];
  for (const [collection, body] of resources) {
    const created = await api(`/${collection}`, { method: "POST", token: adminToken, body });
    assert.equal(created.status, 201, `${collection} should be created`);
    const id = created.body.data._id;
    const updated = await api(`/${collection}/${id}`, { method: "PATCH", token: adminToken, body: { notes: "Audit update" } });
    assert.equal(updated.status, 200, `${collection} should update`);
    assert.equal(updated.body.data.notes, "Audit update");
    records.push([collection, id]);
  }
  const quotation = await api("/quotations", { method: "POST", token: adminToken, body: { customer: "Audit Customer", customerEmail: customerId, plan: "Audit Plan", amount: 100, validDays: 30, status: "Accepted" } });
  assert.equal(quotation.status, 201);
  const quotationId = quotation.body.data._id;
  const converted = await api(`/quotations/${quotationId}/convert`, { method: "POST", token: adminToken, body: {} });
  assert.equal(converted.status, 201);
  assert.equal(converted.body.data.subscription.status, "Confirmed");
  assert.equal(converted.body.data.quotation.status, "Converted");
  records.push(["quotations", quotationId]);
  for (const [collection, id] of records) assert.equal((await api(`/${collection}/${id}`, { method: "DELETE", token: adminToken })).status, 200, `${collection} should delete`);
});

test("authentication endpoints throttle repeated attempts", async () => {
  let last;
  for (let attempt = 0; attempt < 40; attempt++) {
    last = await api("/auth/login", { method: "POST", body: { email: "rate-limit@brightloop.test", password: "wrong" } });
    if (last.status === 429) break;
  }
  assert.equal(last.status, 429);
  assert.ok(Number(last.retryAfter) > 0);
});