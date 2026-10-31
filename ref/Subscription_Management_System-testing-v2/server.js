import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { models, initializeDatabase } from "./database.js";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import cron from "node-cron";
dotenv.config();
const app = express();
const clientOrigin = String(process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
app.use(cors({ origin: (origin, callback) => callback(null, !origin || origin === clientOrigin) }));
app.use(express.json());
const authRequestWindows = new Map();
let nextRateLimitSweep = 0;
const authRateLimit = (maxRequests, windowMs) => (req, res, next) => {
  const now = Date.now(), key = `${req.originalUrl.split("?")[0]}:${req.ip || "unknown"}`;
  let window = authRequestWindows.get(key);
  if (!window || now >= window.expiresAt) { window = { count: 0, expiresAt: now + windowMs }; authRequestWindows.set(key, window); }
  if (window.count >= maxRequests) {
    res.set("Retry-After", String(Math.max(1, Math.ceil((window.expiresAt - now) / 1000))));
    return res.status(429).json({ error: "Too many authentication attempts. Please wait and try again." });
  }
  window.count++;
  if (now >= nextRateLimitSweep && authRequestWindows.size > 1000) {
    for (const [entryKey, entry] of authRequestWindows) if (now >= entry.expiresAt) authRequestWindows.delete(entryKey);
    nextRateLimitSweep = now + windowMs;
  }
  return next();
};
for (const endpoint of ["login", "register", "google", "forgot-password", "reset-password"]) app.use(`/api/auth/${endpoint}`, authRateLimit(30, 15 * 60 * 1000));
const names = ["customers", "subscriptions", "invoices", "products", "payments", "plans", "quotations", "quotationTemplates", "taxes", "discounts", "users", "workItems"];
const memory = Object.fromEntries(names.map((x) => [x, []]));
const secret = process.env.JWT_SECRET || "";
if (secret.length < 32 || secret.startsWith("replace-")) throw new Error("Set JWT_SECRET to a random value of at least 32 characters in .env before starting Brightloop.");
const configuredMasterPassword = process.env.MASTER_ADMIN_PASSWORD || "";
if (configuredMasterPassword && (configuredMasterPassword.length <= 8 || !/[A-Z]/.test(configuredMasterPassword) || !/[a-z]/.test(configuredMasterPassword) || !/[!@#$%^&*(),.?":{}|<>]/.test(configuredMasterPassword))) throw new Error("MASTER_ADMIN_PASSWORD must be over 8 characters and include uppercase, lowercase, and a special character.");
const masterPassword = configuredMasterPassword || crypto.randomBytes(24).toString("hex") + "Aa!";
const masterAdmin = { _id: randomUUID(), email: String(process.env.MASTER_ADMIN_EMAIL || "admin@brightloop.local").toLowerCase().trim(), name: process.env.MASTER_ADMIN_NAME || "Master Admin", role: "admin", isMasterAdmin: true, password: await bcrypt.hash(masterPassword, 12) };
const connected = true;
const databaseReady = (async () => {
  const result = await initializeDatabase(names, memory, masterAdmin, Boolean(configuredMasterPassword));
  if (result.createdAdmin) console.log("Master admin initialized from MASTER_ADMIN_EMAIL and MASTER_ADMIN_PASSWORD.");
  return result;
})();
async function customerScope(user) {
  const owner = connected ? await models.customers.findOne({ email: user.email }).select("name").lean() : memory.customers.find((x) => x.email === user.email);
  if (!owner) return { name: user.name, uniqueName: false, filter: { customerEmail: user.email }, matches: (x) => x.customerEmail === user.email };
  const nameCount = connected ? await models.customers.countDocuments({ name: owner.name }) : memory.customers.filter((x) => x.name === owner.name).length;
  const uniqueName = nameCount === 1;
  return { name: owner.name, uniqueName, filter: uniqueName ? { $or: [{ customerEmail: user.email }, { customerEmail: { $exists: false }, customer: owner.name }] } : { customerEmail: user.email }, matches: (x) => x.customerEmail === user.email || uniqueName && !x.customerEmail && x.customer === owner.name };
}
const auth = async (req, res, next) => {
  try {
    const claims = jwt.verify((req.headers.authorization || "").replace(/^Bearer\s+/i, ""), secret);
    const account = await models.users.findById(claims.id).lean();
    if (!account || account.email !== claims.email || account.role !== claims.role || Number(account.tokenVersion || 0) !== Number(claims.tokenVersion || 0) || account.role === "staff" && account.status === "Closed") return res.status(401).json({ error: "Session expired or staff access is closed. Please sign in again." });
    req.user = { id: account._id, email: account.email, name: account.name, role: account.role, tokenVersion: Number(account.tokenVersion || 0) };
    return next();
  } catch {
    return res.status(401).json({ error: "Authentication required" });
  }
};const admin = (req, res, next) => req.user?.role === "admin" ? next() : res.status(403).json({ error: "Admin only" });
let googleSigningKeys = [];
let googleKeysExpireAt = 0;
async function googleSigningKey(kid) {
  if (Date.now() >= googleKeysExpireAt || !googleSigningKeys.some((key) => key.kid === kid)) {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
    if (!response.ok) throw new Error("Could not retrieve Google signing keys");
    const body = await response.json();
    googleSigningKeys = body.keys || [];
    const maxAge = Number(response.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1] || 300);
    googleKeysExpireAt = Date.now() + maxAge * 1000;
  }
  const jwk = googleSigningKeys.find((key) => key.kid === kid && key.alg === "RS256");
  if (!jwk) throw new Error("Google signing key was not recognized");
  return crypto.createPublicKey({ key: jwk, format: "jwk" });
}
async function verifyGoogleCredential(credential, clientId) {
  const decoded = jwt.decode(credential, { complete: true });
  if (!decoded?.header?.kid || decoded.header.alg !== "RS256") throw new Error("Google credential is invalid");
  const key = await googleSigningKey(decoded.header.kid);
  return jwt.verify(credential, key, { algorithms: ["RS256"], audience: clientId, issuer: ["accounts.google.com", "https://accounts.google.com"] });
}
app.get("/api/auth/me", auth, (q, s) => s.json({ data: q.user }));
app.get("/api/profile", auth, async (q, s) => {
  try {
    const u = connected ? await models.users.findById(q.user.id).select("-password").lean() : memory.users.find((x) => String(x._id) === String(q.user.id));
    const customer = connected ? await models.customers.findOne({ email: q.user.email }).lean() : memory.customers.find((x) => x.email === q.user.email);
    if (u) delete u.password;
    s.json({ data: { user: u ? { email: u.email, name: u.name, role: u.role } : q.user, customer: customer || null } });
  } catch (e) {
    s.status(500).json({ error: e.message });
  }
});
app.patch("/api/profile", auth, async (q, s) => {
  const allowed = { name: String(q.body.name || "").trim(), phone: String(q.body.phone || "").trim(), company: String(q.body.company || "").trim() };
  if (!allowed.name) return s.status(400).json({ error: "Name is required" });
  try {
    if (connected) {
      await models.users.findByIdAndUpdate(q.user.id, { $set: allowed });
      if (q.user.role === "customer") {
        await models.customers.updateOne({ email: q.user.email }, { $set: allowed }, { upsert: true });
        if (q.user.name !== allowed.name) {
          for (const k of ["subscriptions", "invoices", "quotations", "payments"]) await models[k].updateMany({ customer: q.user.name }, { $set: { customer: allowed.name } });
        }
      }
    } else {
      let u = memory.users.find((x) => String(x._id) === String(q.user.id));
      if (u) Object.assign(u, allowed);
      if (q.user.role === "customer") {
        let c = memory.customers.find((x) => x.email === q.user.email);
        if (c) Object.assign(c, allowed);
        if (q.user.name !== allowed.name) {
          for (const k of ["subscriptions", "invoices", "quotations", "payments"]) for (const x of memory[k]) if (x.customer === q.user.name) x.customer = allowed.name;
        }
      }
    }
    s.json({ data: { ...q.user, ...allowed, token: jwt.sign({ id: q.user.id, email: q.user.email, name: allowed.name, role: q.user.role, tokenVersion: q.user.tokenVersion || 0 }, secret, { expiresIn: "12h" }) } });
  } catch (e) {
    s.status(400).json({ error: e.message });
  }
});
app.get("/api/health", (q, s) => s.json({ data: { status: "ok", database: "sqlite" } }));
app.post("/api/auth/google", async (q, s) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const credential = String(q.body.credential || "");
  if (!clientId) return s.status(503).json({ error: "Google sign-in is not configured. Add GOOGLE_CLIENT_ID to .env." });
  if (!credential) return s.status(400).json({ error: "Google credential is required" });
  try {
    const claims = await verifyGoogleCredential(credential, clientId);
    const email = String(claims.email || "").trim().toLowerCase();
    if (!claims.sub || !/^\S+@\S+\.\S+$/.test(email) || !(claims.email_verified === true || claims.email_verified === "true")) return s.status(401).json({ error: "Google did not provide a verified email address" });
    let account = await models.users.findOne({ googleSub: claims.sub }).lean();
    if (!account) {
      account = await models.users.findOne({ email }).lean();
      if (account) {
        const googleControlsEmail = email.endsWith("@gmail.com") || Boolean(claims.hd);
        if (account.isMasterAdmin || !["customer", "staff"].includes(account.role)) return s.status(409).json({ error: "This email is not eligible for Google sign-in." });
        if (account.role === "staff" && account.status === "Closed") return s.status(403).json({ error: "This staff account is closed. Contact the master admin." });
        if (!googleControlsEmail) return s.status(409).json({ error: "This existing account cannot be linked automatically. Sign in with your Brightloop email and password." });
        await models.users.findByIdAndUpdate(account._id, { $set: { googleSub: claims.sub, picture: claims.picture || "" } });
        account = { ...account, googleSub: claims.sub, picture: claims.picture || "" };
      } else {
        account = await models.users.create({ email, name: String(claims.name || email.split("@")[0]).slice(0, 120), role: "customer", tokenVersion: 0, googleSub: claims.sub, picture: claims.picture || "", password: await bcrypt.hash(crypto.randomBytes(48).toString("hex"), 12) });
        await models.customers.updateOne({ email }, { $setOnInsert: { email, name: account.name, status: "Active" } }, { upsert: true });
      }
    }
    if (!["customer", "staff"].includes(account.role) || account.isMasterAdmin) return s.status(403).json({ error: "This account cannot sign in with Google." });
    if (account.role === "staff" && account.status === "Closed") return s.status(403).json({ error: "This staff account is closed. Contact the master admin." });
    if (account.role === "staff" && account.status !== "Active") { await models.users.findByIdAndUpdate(account._id, { $set: { status: "Active", lastLoginAt: new Date() } }); account.status = "Active"; }
    const token = jwt.sign({ id: account._id, email: account.email, name: account.name, role: account.role, tokenVersion: account.tokenVersion || 0 }, secret, { expiresIn: "12h" });
    return s.json({ data: { token, user: { email: account.email, name: account.name, role: account.role } } });
  } catch (error) {
    return s.status(401).json({ error: "Could not verify Google sign-in. Please try again." });
  }
});
app.post("/api/auth/register", async (q, s) => {
  try {
    let { email, password, name, phone } = q.body, role = "customer";
    email = String(email || "").toLowerCase().trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return s.status(400).json({ error: "Enter a valid email address" });
    if (!name || !password || password.length <= 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) return s.status(400).json({ error: "Password must be over 8 characters and include uppercase, lowercase, and a special character" });
    if (connected ? await models.users.exists({ email }) : memory.users.some((u2) => u2.email === email)) return s.status(409).json({ error: "Email already registered" });
    const u = { email, name, phone, role, tokenVersion: 0, password: await bcrypt.hash(password, 12) };
    let doc = connected ? await models.users.create(u) : (memory.users.push({ _id: Date.now(), ...u }), u);
    if (connected) await models.customers.updateOne({ email }, { $setOnInsert: { email, name, phone, status: "Active" } }, { upsert: true });
    else if (!memory.customers.some((c) => c.email === email)) memory.customers.unshift({ _id: Date.now() + 1, email, name, phone, status: "Active" });
    s.status(201).json({ data: { token: jwt.sign({ id: doc._id, email, name, role, tokenVersion: doc.tokenVersion || 0 }, secret, { expiresIn: "12h" }), user: { email, name, role } } });
  } catch (e) {
    s.status(400).json({ error: e.message });
  }
});
app.post("/api/auth/login", async (q, s) => {
  const email = String(q.body.email || "").trim().toLowerCase(), password = String(q.body.password || "");
  let u = connected ? await models.users.findOne({ email }).select("+password") : memory.users.find((x) => String(x.email || "").trim().toLowerCase() === email);
  if (!u) return s.status(401).json({ error: "Invalid email or password" });
  if (u.role === "staff" && (u.status === "Invited" || !u.password)) {
    return s.status(401).json({ error: "Staff accounts must sign in with Google using their invited email." });
  }
  if (u.role === "staff" && u.status === "Closed") {
    return s.status(401).json({ error: "This staff account is closed. Contact the master admin." });
  }
  if (u.role === "customer") {
    const custRecord = connected ? await models.customers.findOne({ email }).lean() : memory.customers.find((c) => c.email === email);
    if (!custRecord) {
      if (connected) await models.users.deleteMany({ email, role: "customer" });
      else memory.users = memory.users.filter((x) => !(x.email === email && x.role === "customer"));
      return s.status(401).json({ error: "Customer account no longer exists. Please contact support or register again." });
    }
  }
  if (!await bcrypt.compare(password, u.password)) return s.status(401).json({ error: "Invalid email or password" });
  s.json({ data: { token: jwt.sign({ id: u._id, email: u.email, name: u.name, role: u.role, tokenVersion: u.tokenVersion || 0 }, secret, { expiresIn: "12h" }), user: { email: u.email, name: u.name, role: u.role } } });
});
app.post("/api/auth/forgot-password", async (q, s) => {
  if (process.env.NODE_ENV === "production" && !process.env.SMTP_HOST) return s.status(503).json({ error: "Password reset email is not configured. Contact the administrator." });
  const email = String(q.body.email || "").toLowerCase().trim();
  const u = connected ? await models.users.findOne({ email }) : memory.users.find((x) => x.email.toLowerCase() === email);
  if (!u) return s.json({ message: "If the account exists, reset instructions have been sent" });
  const token = crypto.randomBytes(32).toString("hex");
  u.resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
  u.resetTokenExpires = Date.now() + 36e5;
  if (connected) await u.save();
  const url = (process.env.CLIENT_URL || "http://localhost:5173") + "/?resetToken=" + token;
  if (process.env.SMTP_HOST) {
    const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: +(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === "true", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } });
    await transporter.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to: email, subject: "Reset your Brightloop password", text: "Reset your password within one hour: " + url });
  }
  s.json({ message: "If the account exists, reset instructions have been sent", ...process.env.NODE_ENV !== "production" && !process.env.SMTP_HOST ? { developmentResetUrl: url } : {} });
});
app.post("/api/auth/reset-password", async (q, s) => {
  const { token, password } = q.body;
  if (!token || !password || password.length <= 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) return s.status(400).json({ error: "Enter a valid reset token and a strong password" });
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const u = connected ? await models.users.findOne({ resetTokenHash: hash, resetTokenExpires: { $gt: Date.now() } }) : memory.users.find((x) => x.resetTokenHash === hash && x.resetTokenExpires > Date.now());
  if (!u) return s.status(400).json({ error: "Reset link is invalid or expired" });
  u.password = await bcrypt.hash(password, 12);
  u.tokenVersion = Number(u.tokenVersion || 0) + 1;
  u.resetTokenHash = void 0;
  u.resetTokenExpires = void 0;
  if (connected) await u.save();
  s.json({ message: "Password reset complete" });
});
for (const k of names) {
  app.get("/api/" + k, auth, async (q, s) => {
    if (["discounts", "taxes", "users"].includes(k) && q.user.role !== "admin") return s.status(403).json({ error: "Admin access required" });
    if (k === "workItems" && q.user.role === "customer") return s.status(403).json({ error: "Work items are available to staff only" });

    try {
      let filter = {}, scope = null;
      if (k === "users") filter.role = "staff";
      if (k === "workItems" && q.user.role === "staff") filter.assigneeEmail = q.user.email;
      if (q.user.role === "customer") {
        if (k === "customers") filter.email = q.user.email;
        else if (["products", "plans"].includes(k)) filter.status = "Active";
        else { scope = await customerScope(q.user); filter = scope.filter; }
      }
      const customerCatalog = q.user.role === "customer" && ["products", "plans"].includes(k);
      const page = Math.max(1, Number.parseInt(q.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, Number.parseInt(q.query.limit, 10) || 25));
      if (q.query.status && !customerCatalog) filter.status = q.query.status;
      const search = String(q.query.search || "").trim();
      let found, total;
      if (connected) {
        if (search) {
          const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const searchOr = ["name", "email", "customer", "plan", "number", "status"].map((field) => ({ [field]: { $regex: safe, $options: "i" } }));
          if (filter.$or) filter.$and = [{ $or: filter.$or }, { $or: searchOr }], delete filter.$or;
          else filter.$or = searchOr;
        }
        total = await models[k].countDocuments(filter);
        found = await models[k].find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean();
      } else {
        const all = memory[k].filter((x) => (q.user.role !== "customer" || k === "customers" ? !filter.email || x.email === filter.email : customerCatalog ? x.status === "Active" : scope?.matches(x)) && (!filter.status || customerCatalog || x.status === filter.status) && (!search || JSON.stringify(x).toLowerCase().includes(search.toLowerCase())));
        total = all.length;
        found = all.slice((page - 1) * limit, page * limit);
      }
      s.json({ data: k === "users" ? found.map((x) => {
        let y = x.toObject ? x.toObject() : { ...x };
        delete y.password;
        return y;
      }) : found, page, limit, total, totalPages: Math.ceil(total / limit) });
    } catch (e) {
      s.status(500).json({ error: e.message });
    }
  });
  app.post("/api/" + k, auth, async (q, s) => {
    if (q.user.role === "customer") return s.status(403).json({ error: "Customer writes are limited to profile settings" });
    if (k === "workItems" && q.user.role !== "admin") return s.status(403).json({ error: "Only the master admin can assign work" });
    if (["discounts", "taxes", "users", "products", "plans"].includes(k) && q.user.role !== "admin") return s.status(403).json({ error: "Admin access required" });
    if (k === "payments") {
      const inv = connected ? await models.invoices.findById(q.body.invoice) : memory.invoices.find((x) => String(x._id) === String(q.body.invoice));
      if (!inv) return s.status(404).json({ error: "Invoice not found" });
      const amount = Number(q.body.amount), balance = Number(inv.outstandingAmount ?? inv.total ?? inv.amount);
      if (!(amount > 0) || amount > balance) return s.status(400).json({ error: "Payment must be positive and cannot exceed the outstanding balance" });
      inv.total = Number(inv.total ?? inv.amount);
      inv.paidAmount = Number(inv.paidAmount || 0) + amount;
      inv.outstandingAmount = inv.total - inv.paidAmount;
      inv.status = inv.outstandingAmount === 0 ? "Paid" : "Partial";
      if (connected) await inv.save();
      const payment = connected ? await models.payments.create({ ...q.body, customerEmail: inv.customerEmail, amount, status: "Succeeded" }) : { _id: Date.now(), createdAt: /* @__PURE__ */ new Date(), ...q.body, customerEmail: inv.customerEmail, amount, status: "Succeeded" };
      if (!connected) memory.payments.unshift(payment);
      return s.status(201).json({ data: payment });
    }
    try {
      let item = { ...q.body };
      if (k === "workItems") {
        const title = String(item.title || "").trim();
        const assigneeEmail = String(item.assigneeEmail || "").trim().toLowerCase();
        if (!title || title.length > 160) return s.status(400).json({ error: "Enter a work title (up to 160 characters)" });
        if (!assigneeEmail) return s.status(400).json({ error: "Choose a staff member" });
        const staff = await models.users.findOne({ email: assigneeEmail, role: "staff" }).lean();
        if (!staff || staff.status === "Closed") return s.status(400).json({ error: "Choose an active or invited staff account" });
        item = { title, description: String(item.description || "").trim().slice(0, 2000), assigneeEmail, assigneeName: staff.name || assigneeEmail, dueDate: item.dueDate || "", status: "Open", createdBy: q.user.email, completedAt: null };
      }
      if (["subscriptions", "quotations", "invoices"].includes(k) && item.customer) {
        const customerRecord = connected ? await models.customers.findOne(item.customerEmail ? { email: item.customerEmail } : { name: item.customer }).lean() : memory.customers.find((x) => x.email === item.customerEmail || x.name === item.customer);
        if (customerRecord) { item.customerEmail = customerRecord.email; item.customerId = String(customerRecord._id); }
      }
      const dateFields = { subscriptions: ["startDate", "expiryDate", "renewalDate"], quotations: ["startDate", "expiryDate", "validUntil"], quotationTemplates: [], invoices: ["invoiceDate", "dueDate"], payments: ["paymentDate"], plans: ["availableFrom", "availableUntil"], discounts: ["startDate", "endDate"], taxes: ["startDate", "endDate"] };
      for (const field of dateFields[k] || []) if (item[field]) item[field] = new Date(item[field]);
      item.status = item.status || (k === "subscriptions" || k === "quotations" || k === "invoices" ? "Draft" : "Active");
      if (item.amount !== void 0) {
        item.amount = Number(item.amount);
        if (!Number.isFinite(item.amount) || item.amount < 0) return s.status(400).json({ error: "Amount must be a valid non-negative number" });
      }
      if (k === "users") {
        item.email = String(item.email || "").toLowerCase().trim();
        if (!/^\S+@\S+\.\S+$/.test(item.email) || await models.users.exists({ email: item.email })) return s.status(409).json({ error: "A valid, unused email address is required" });
        if (item.password && String(item.password).length >= 8) {
          item.password = await bcrypt.hash(item.password, 12);
          item.status = item.status || "Active";
        } else {
          item.password = await bcrypt.hash(crypto.randomBytes(48).toString("hex"), 12);
          item.status = "Invited";
        }
        item.role = "staff";
        item.isMasterAdmin = false;
      }
      if (k === "customers") {
        item.email = String(item.email || "").toLowerCase().trim();
        const existingUser = connected ? await models.users.findOne({ email: item.email }) : memory.users.find((u) => u.email === item.email);
        if (!existingUser) {
          const custPassword = item.password ? await bcrypt.hash(item.password, 12) : await bcrypt.hash("Brightloop@2026", 12);
          const uDoc = { email: item.email, name: item.name || item.company || "Customer", phone: item.phone, company: item.company || item.name, role: "customer", password: custPassword, tokenVersion: 0 };
          if (connected) await models.users.create(uDoc);
          else memory.users.push({ _id: Date.now() + 2, ...uDoc });
        }
      }
      if (k === "quotations" && item.validDays && !item.validUntil) item.validUntil = new Date(Date.now() + Number(item.validDays) * 864e5);
      if (k === "invoices" && item.customer) {
        const customerRecord = connected ? await models.customers.findOne(item.customerEmail ? { email: item.customerEmail } : { name: item.customer }).lean() : memory.customers.find((x) => x.email === item.customerEmail || x.name === item.customer);
        if (customerRecord) item.customerDetails = { name: customerRecord.name, email: customerRecord.email, company: customerRecord.company, phone: customerRecord.phone };
      }
      if (k === "subscriptions" && item.plan) {
        const plan = connected ? await models.plans.findOne({ $or: [{ planName: item.plan }, { name: item.plan }] }).lean() : memory.plans.find((x) => (x.planName || x.name) === item.plan);
        if (plan) {
          const now = new Date(), quantity = Number(item.quantity || plan.minimumQuantity || 1);
          if (plan.status && plan.status !== "Active") return s.status(400).json({ error: "This plan is not available" });
          if (plan.availableFrom && new Date(plan.availableFrom) > now || plan.availableUntil && new Date(plan.availableUntil) < now) return s.status(400).json({ error: "This plan is outside its availability dates" });
          if (quantity < Number(plan.minimumQuantity || 1)) return s.status(400).json({ error: `Minimum quantity for this plan is ${plan.minimumQuantity}` });
          item.quantity = quantity; item.billingFrequency = plan.billingFrequency; item.autoClose = !!plan.autoClose; item.allowRenewal = !!plan.allowRenewal;
          item.renewalDate = item.startDate ? new Date(item.startDate) : new Date();
          const validLines = (item.items || []).filter((line) => line.product || line.description);
          item.items = validLines.length ? validLines : [{ product: plan.product, description: plan.planName || plan.name, quantity, unitPrice: Number(plan.price || 0) }];
          item.amount = item.items.reduce((sum, line) => sum + Number(line.quantity || 1) * Number(line.unitPrice || 0), 0);
        }
      }
      let appliedDiscount = null;
      if (k === "invoices" && item.amount !== void 0) {
        const today = new Date();
        const activeTaxes = (connected ? await models.taxes.find({ status: "Active" }).lean() : memory.taxes.filter((t) => t.status === "Active")).filter((t) => (!t.startDate || new Date(t.startDate) <= today) && (!t.endDate || new Date(t.endDate) >= today) && (!t.product || item.items?.some((line) => line.product === t.product)));
        const rate = activeTaxes.reduce((a, t) => a + Number(t.rate ?? t.percentage ?? 0), 0);
        const subtotal = Array.isArray(item.items) && item.items.some((line) => line.product || line.description) ? item.items.reduce((sum, line) => sum + Number(line.quantity || 1) * Number(line.unitPrice || 0), 0) : Number(item.amount);
        if (!(subtotal > 0)) return s.status(400).json({ error: "Invoice amount must be greater than zero" });
        const activeDiscounts = connected ? await models.discounts.find({ status: "Active" }).sort({ createdAt: 1 }).lean() : memory.discounts.filter((d2) => d2.status === "Active");
        const quantity = (item.items || []).reduce((sum, line) => sum + Number(line.quantity || 1), 0);
        let d = activeDiscounts.find((x) => (!x.startDate || new Date(x.startDate) <= today) && (!x.endDate || new Date(x.endDate) >= today) && (!x.usageLimit || Number(x.usageCount || 0) < Number(x.usageLimit)) && subtotal >= Number(x.minimumPurchase || 0) && quantity >= Number(x.minimumQuantity || 0) && (!x.product || item.items?.some((line) => line.product === x.product || line.description === x.product)) && (!x.scope || x.scope === "All" || x.scope === "Subscription" && !!item.subscription || x.scope === "Product" && !!x.product));
        let discountAmount = 0;
        if (d) {
          discountAmount = d.type === "Percentage" ? subtotal * Math.min(100, Number(d.value || 0)) / 100 : Number(d.value || 0);
          discountAmount = Math.min(subtotal, discountAmount);
          appliedDiscount = d;
          item.discountSnapshot = { name: d.name, type: d.type, value: d.value, amount: +discountAmount.toFixed(2) };
        }
        item.subtotal = subtotal;
        item.taxRate = rate;
        item.taxSnapshot = activeTaxes.map((t) => ({ name: t.name, rate: Number(t.rate ?? t.percentage ?? 0) }));
        item.tax = +((subtotal - discountAmount) * rate / 100).toFixed(2);
        item.discount = +discountAmount.toFixed(2);
        item.total = +(subtotal - discountAmount + item.tax).toFixed(2);
        item.outstandingAmount = item.total;
        item.paidAmount = 0;
      }
      if (item.amount !== void 0) {
        item.subtotal = +item.amount;
        item.tax = +(item.tax || 0);
        item.total = item.total ?? item.subtotal + item.tax - (+item.discount || 0);
        item.paidAmount = 0;
        item.outstandingAmount = item.total;
      }
      if (["subscriptions", "invoices", "quotations"].includes(k)) item.number = item.number || k.slice(0, 3).toUpperCase() + "-" + Date.now();
      let doc = connected ? await models[k].create(item) : { _id: Date.now(), createdAt: /* @__PURE__ */ new Date(), ...item };
      if (!connected) memory[k].unshift(doc);
      if (appliedDiscount) {
        if (connected) await models.discounts.updateOne({ _id: appliedDiscount._id }, { $inc: { usageCount: 1 } });
        else appliedDiscount.usageCount = Number(appliedDiscount.usageCount || 0) + 1;
      }
      if (k === "users") {
        let safe = doc.toObject ? doc.toObject() : { ...doc };
        delete safe.password;
        return s.status(201).json({ data: safe });
      }
      s.status(201).json({ data: doc });
    } catch (e) {
      s.status(400).json({ error: e.message });
    }
  });
  app.patch("/api/" + k + "/:id", auth, async (q, s) => {
    if (k === "workItems") {
      try {
        const current = await models.workItems.findById(q.params.id).lean();
        if (!current) return s.status(404).json({ error: "Work item not found" });
        if (q.user.role !== "admin" && (q.user.role !== "staff" || current.assigneeEmail !== q.user.email)) return s.status(403).json({ error: "You can only update work assigned to you" });
        const allowedStatuses = ["Open", "In progress", "Blocked", "Closed"];
        if (q.body.status === undefined) return s.status(400).json({ error: "Choose a work status" });
        if (!allowedStatuses.includes(q.body.status)) return s.status(400).json({ error: "Invalid work status" });
        const changes = q.user.role === "admin" ? Object.fromEntries(Object.entries(q.body).filter(([key]) => ["title", "description", "assigneeEmail", "dueDate", "status"].includes(key))) : { status: q.body.status };
        if (changes.assigneeEmail) {
          changes.assigneeEmail = String(changes.assigneeEmail).trim().toLowerCase();
          const staff = await models.users.findOne({ email: changes.assigneeEmail, role: "staff" }).lean();
          if (!staff || staff.status === "Closed") return s.status(400).json({ error: "Choose an active or invited staff account" });
          changes.assigneeName = staff.name || staff.email;
        }
        if (changes.title !== undefined) { changes.title = String(changes.title).trim(); if (!changes.title || changes.title.length > 160) return s.status(400).json({ error: "Enter a work title (up to 160 characters)" }); }
        if (changes.description !== undefined) changes.description = String(changes.description).trim().slice(0, 2000);
        if (changes.status === "Closed") changes.completedAt = current.completedAt || new Date().toISOString();
        else if (changes.status) changes.completedAt = null;
        const updated = await models.workItems.findByIdAndUpdate(q.params.id, changes, { new: true });
        return s.json({ data: updated });
      } catch (e) { return s.status(400).json({ error: e.message }); }
    }
    if (k === "users") {
      if (q.user.role !== "admin") return s.status(403).json({ error: "Admin access required" });
      const current = await models.users.findById(q.params.id).lean();
      if (!current) return s.status(404).json({ error: "Staff account not found" });
      if (current.isMasterAdmin || current.role === "admin") return s.status(403).json({ error: "The master admin account cannot be edited here" });
      q.body = { ...q.body, role: "staff", isMasterAdmin: false };
      if (q.body.status && q.body.status !== current.status) q.body.tokenVersion = Number(current.tokenVersion || 0) + 1;
      if (q.body.email) q.body.email = String(q.body.email).trim().toLowerCase();
      if (q.body.email && await models.users.exists({ email: q.body.email })) { const duplicate = await models.users.findOne({ email: q.body.email }).lean(); if (String(duplicate?._id) !== String(q.params.id)) return s.status(409).json({ error: "Email already in use" }); }
      if (q.body.email) q.body.email = String(q.body.email).trim().toLowerCase();
      if (q.body.email && q.body.email !== current.email) { q.body.googleSub = null; q.body.status = "Invited"; q.body.tokenVersion = Number(current.tokenVersion || 0) + 1; }
      if (q.body.status && !["Active", "Closed", "Invited"].includes(q.body.status)) return s.status(400).json({ error: "Invalid staff account status" });
      if (q.body.password) {
        if (q.body.password.length <= 8 || !/[A-Z]/.test(q.body.password) || !/[a-z]/.test(q.body.password) || !/[!@#$%^&*(),.?":{}|<>]/.test(q.body.password)) return s.status(400).json({ error: "Password does not meet requirements" });
        q.body.password = await bcrypt.hash(q.body.password, 12);
        q.body.tokenVersion = Number(current.tokenVersion || 0) + 1;
        q.body.googleSub = null;
      }
    }
    if (q.user.role === "customer") return s.status(403).json({ error: "Profile update is not available through this endpoint" });
    if (q.user.role !== "admin" && ["products", "plans", "discounts", "taxes", "users"].includes(k)) return s.status(403).json({ error: "Forbidden" });
    try {
      let x = connected ? await models[k].findByIdAndUpdate(q.params.id, q.body, { new: true, runValidators: true }) : memory[k].find((x2) => String(x2._id) === q.params.id);
      if (!x) return s.status(404).json({ error: "Not found" });
      if (!connected) Object.assign(x, q.body);
      if (k === "users") { const safe = x.toObject ? x.toObject() : { ...x }; delete safe.password; return s.json({ data: safe }); }
      s.json({ data: x });
    } catch (e) {
      s.status(400).json({ error: e.message });
    }
  });
}
for (const k of names) {
  app.delete("/api/" + k + "/:id", auth, async (q, s) => {
    if (k === "workItems" && q.user.role !== "admin") return s.status(403).json({ error: "Only the master admin can remove work items" });
    if (k === "users") { const target = await models.users.findById(q.params.id).lean(); if (target?.isMasterAdmin || target?.role === "admin") return s.status(403).json({ error: "The master admin account cannot be deleted" }); }
    if (q.user.role === "customer") return s.status(403).json({ error: "Forbidden" });
    if (q.user.role === "staff" && ["users", "products", "plans", "discounts", "taxes"].includes(k)) return s.status(403).json({ error: "Admin access required" });
    try {
      let removed;
      if (connected) removed = await models[k].findByIdAndDelete(q.params.id);
      else {
        const ix = memory[k].findIndex((x) => String(x._id) === q.params.id);
        if (ix >= 0) removed = memory[k].splice(ix, 1)[0];
      }
      if (!removed) return s.status(404).json({ error: "Record not found" });
      if (k === "customers" && removed && removed.email) {
        if (connected) await models.users.deleteMany({ email: removed.email, role: "customer" });
        else memory.users = memory.users.filter((u) => !(u.email === removed.email && u.role === "customer"));
      }
      if (k === "users" && removed && removed.role === "customer") {
        if (connected) await models.customers.deleteMany({ email: removed.email });
        else memory.customers = memory.customers.filter((c) => c.email !== removed.email);
      }
      s.json({ data: { deleted: true } });
    } catch (e) {
      s.status(400).json({ error: e.message });
    }
  });
}
app.post("/api/payments", auth, async (q, s) => {
  try {
    let inv = connected ? await models.invoices.findById(q.body.invoice) : memory.invoices.find((x) => String(x._id) === q.body.invoice);
    if (!inv) return s.status(404).json({ error: "Invoice not found" });
    if (q.user.role === "customer") {
      const scope = await customerScope(q.user);
      if (!scope.matches(inv)) return s.status(403).json({ error: "You can only pay your own invoices" });
    }
    let amount = +q.body.amount;
    if (amount <= 0 || amount > +(inv.outstandingAmount ?? inv.total)) return s.status(400).json({ error: "Amount exceeds balance" });
    inv.paidAmount = (inv.paidAmount || 0) + amount;
    inv.outstandingAmount = inv.total - inv.paidAmount;
    inv.status = inv.outstandingAmount === 0 ? "Paid" : "Partial";
    if (connected) await inv.save();
    let p = connected ? await models.payments.create({ ...q.body, amount, status: "Succeeded" }) : { _id: Date.now(), ...q.body, amount, status: "Succeeded" };
    if (!connected) memory.payments.unshift(p);
    s.status(201).json({ data: p });
  } catch (e) {
    s.status(400).json({ error: e.message });
  }
});
app.post("/api/subscriptions/:id/change-plan", auth, async (q, s) => {
  try {
    const sub = connected ? await models.subscriptions.findById(q.params.id) : memory.subscriptions.find((x) => String(x._id) === q.params.id);
    if (!sub) return s.status(404).json({ error: "Subscription not found" });
    const scope = q.user.role === "customer" ? await customerScope(q.user) : null;
    if (q.user.role === "customer" && (!scope.matches(sub) || !["Active", "Paused"].includes(sub.status))) return s.status(403).json({ error: "You can only change the plan on your own active subscription" });
    const planName = String(q.body.plan || "");
    const plan = connected ? await models.plans.findOne({ planName, status: "Active" }).lean() : memory.plans.find((x) => (x.planName || x.name) === planName && x.status === "Active");
    if (!plan) return s.status(404).json({ error: "Active plan not found" });
    const quantity = Number(q.body.quantity || sub.quantity || 1), now = new Date();
    if (plan.availableFrom && new Date(plan.availableFrom) > now || plan.availableUntil && new Date(plan.availableUntil) < now) return s.status(400).json({ error: "This plan is outside its availability dates" });
    if (quantity < Number(plan.minimumQuantity || 1)) return s.status(400).json({ error: `This plan requires at least ${plan.minimumQuantity} seat(s)` });
    sub.plan = plan.planName || plan.name; sub.quantity = quantity; sub.billingFrequency = plan.billingFrequency; sub.autoClose = !!plan.autoClose; sub.allowRenewal = !!plan.allowRenewal;
    const requestedItems = (q.body.items || []).filter((line) => line.product || line.description);
    sub.items = requestedItems.length ? requestedItems : [{ product: plan.product, description: sub.plan, quantity, unitPrice: Number(plan.price || 0) }];
    sub.amount = sub.items.reduce((sum, line) => sum + Number(line.quantity || 1) * Number(line.unitPrice || 0), 0);
    if (connected) await sub.save();
    s.json({ data: sub });
  } catch (e) { s.status(400).json({ error: e.message }); }
});
app.post("/api/subscriptions/:id/status", auth, async (q, s) => {
  let x = connected ? await models.subscriptions.findById(q.params.id) : memory.subscriptions.find((x2) => String(x2._id) === q.params.id), steps = { Draft: ["Quotation", "Confirmed"], Quotation: ["Confirmed", "Draft"], Confirmed: ["Active", "Closed"], Active: ["Paused", "Closed"], Paused: ["Active", "Closed"], Closed: [] };
  if (!x) return s.status(404).json({ error: "Not found" });
  if (q.user.role === "customer") { const scope = await customerScope(q.user); if (!scope.matches(x) || !["Paused", "Closed", "Active"].includes(q.body.status) || !["Active", "Paused"].includes(x.status)) return s.status(403).json({ error: "You can only pause, resume, or cancel your own subscription" }); }
  if (!steps[x.status]?.includes(q.body.status)) return s.status(400).json({ error: "Invalid status transition" });
  x.status = q.body.status;
  if (connected) await x.save();
  s.json({ data: x });
});
app.post("/api/quotations/:id/convert", auth, async (q, s) => {
  if (q.user.role === "customer") return s.status(403).json({ error: "Forbidden" });
  try {
    const quote = connected ? await models.quotations.findById(q.params.id) : memory.quotations.find((x) => String(x._id) === q.params.id);
    if (!quote) return s.status(404).json({ error: "Quotation not found" });
    if (quote.status !== "Accepted") return s.status(400).json({ error: "Only accepted quotations can be converted" });
    const sub = { number: "SUB-" + randomUUID().slice(-8).toUpperCase(), customer: quote.customer, customerEmail: quote.customerEmail, plan: quote.plan, amount: quote.total ?? quote.amount, status: "Confirmed", startDate: quote.startDate ? new Date(quote.startDate) : new Date(), expiryDate: quote.expiryDate || null, paymentTerms: Number(quote.paymentTerms || 14), quantity: Number(quote.quantity || 1), billingFrequency: quote.billingFrequency, items: quote.items || [] };
    const created = connected ? await models.subscriptions.create(sub) : { _id: Date.now(), ...sub };
    if (!connected) memory.subscriptions.unshift(created);
    quote.status = "Converted";
    if (connected) await quote.save();
    s.status(201).json({ data: { subscription: created, quotation: quote } });
  } catch (e) {
    s.status(400).json({ error: e.message });
  }
});
app.get("/api/dashboard", auth, async (q, s) => {
  try {
    const scope = q.user.role === "customer" ? await customerScope(q.user) : null;
    const invoicesAll = await models.invoices.find({}).lean(), subscriptionsAll = await models.subscriptions.find({}).lean(), customers = await models.customers.countDocuments(scope ? { email: q.user.email } : {});
    const invoices = invoicesAll.filter((x) => !scope || scope.matches(x)), subscriptions = subscriptionsAll.filter((x) => !scope || scope.matches(x));
    const active = subscriptions.filter((x) => x.status === "Active"), mrr = active.reduce((sum, x) => sum + Number(x.amount ?? x.price ?? 0) / (/annual|yearly/i.test(x.billingFrequency || x.plan || "") ? 12 : 1), 0), chartMap = {};
    for (const invoice of invoices) { const date = invoice.invoiceDate ? new Date(invoice.invoiceDate) : new Date(invoice.createdAt || Date.now()), key = date.toLocaleString("en", { month: "short", year: "numeric" }); chartMap[key] ||= { month: key, revenue: 0 }; chartMap[key].revenue += Number(invoice.paidAmount || 0); }
    return s.json({ data: { customers, activeSubscriptions: active.length, mrr, arr: mrr * 12, collected: invoices.reduce((a, x) => a + Number(x.paidAmount || 0), 0), outstanding: invoices.reduce((a, x) => a + Number(x.outstandingAmount ?? x.total ?? x.amount ?? 0), 0), overdue: invoices.filter((x) => x.status === "Overdue").length, chart: Object.values(chartMap) } });
  } catch (e) { s.status(500).json({ error: e.message }); }
});
app.post("/api/admin/clear-data", auth, admin, async (q, s) => {
  try {
    for (const coll of ["subscriptions", "invoices", "quotations", "payments"]) {
      if (connected) await models[coll].deleteMany({});
      else memory[coll] = [];
    }
    if (q.body.wipeCustomers) {
      if (connected) {
        await models.customers.deleteMany({});
        await models.users.deleteMany({ role: "customer" });
      } else {
        memory.customers = [];
        memory.users = memory.users.filter((x) => x.role !== "customer");
      }
    }
    s.json({ data: { cleared: true, message: "Transactional records have been cleared." } });
  } catch (e) {
    s.status(500).json({ error: e.message });
  }
});
app.post("/api/invoices/:id/status", auth, async (q, s) => {
  if (q.user.role === "customer") return s.status(403).json({ error: "Forbidden" });
  const invoice = connected ? await models.invoices.findById(q.params.id) : memory.invoices.find((x) => String(x._id) === q.params.id);
  if (!invoice) return s.status(404).json({ error: "Invoice not found" });
  const allowed = { Draft: ["Confirmed", "Cancelled"], Confirmed: ["Sent", "Cancelled"], Sent: ["Cancelled"], Partial: ["Sent", "Cancelled"], Overdue: ["Sent", "Cancelled"] };
  if (!allowed[invoice.status]?.includes(q.body.status)) return s.status(400).json({ error: "Invalid invoice status transition" });
  invoice.status = q.body.status;
  if (connected) await invoice.save();
  s.json({ data: invoice });
});
app.post("/api/invoices/:id/send", auth, async (q, s) => {
  if (q.user.role === "customer") return s.status(403).json({ error: "Forbidden" });
  if (!process.env.SMTP_HOST) return s.status(503).json({ error: "Email delivery is not configured. Add SMTP settings to .env." });
  try {
    const invoice = connected ? await models.invoices.findById(q.params.id).lean() : memory.invoices.find((x) => String(x._id) === q.params.id);
    if (!invoice) return s.status(404).json({ error: "Invoice not found" });
    if (!["Confirmed", "Sent", "Partial", "Overdue"].includes(invoice.status)) return s.status(400).json({ error: "Confirm the invoice before sending it" });
    const customer = invoice.customerEmail ? connected ? await models.customers.findOne({ email: invoice.customerEmail }).lean() : memory.customers.find((x) => x.email === invoice.customerEmail) : connected ? await models.customers.findOne({ name: invoice.customer }).lean() : memory.customers.find((x) => x.name === invoice.customer);
    if (!customer?.email) return s.status(400).json({ error: "Customer email address is missing" });
    const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: +(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === "true", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } });
    await transporter.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to: customer.email, subject: `Brightloop invoice ${invoice.number}`, text: `Invoice ${invoice.number}\nAmount due: ${invoice.outstandingAmount ?? invoice.total ?? invoice.amount}\nDue date: ${invoice.dueDate || "See your Brightloop account"}` });
    if (connected) await models.invoices.findByIdAndUpdate(q.params.id, { status: "Sent", sentAt: new Date() });
    else { const record = memory.invoices.find((x) => String(x._id) === q.params.id); record.status = "Sent"; record.sentAt = new Date(); }
    s.json({ data: { sent: true, email: customer.email } });
  } catch (e) { s.status(502).json({ error: "Invoice email could not be delivered: " + e.message }); }
});
async function runDueBilling() {
  const now = new Date();
  if (connected) await models.invoices.updateMany({ status: { $in: ["Sent", "Partial"] }, dueDate: { $lt: now }, outstandingAmount: { $gt: 0 } }, { $set: { status: "Overdue" } });
  else for (const invoice of memory.invoices) if (["Sent", "Partial"].includes(invoice.status) && invoice.dueDate && new Date(invoice.dueDate) < now && Number(invoice.outstandingAmount ?? invoice.total ?? invoice.amount) > 0) invoice.status = "Overdue";
  const due = connected ? await models.subscriptions.find({ status: "Active", renewalDate: { $lte: now } }) : memory.subscriptions.filter((x) => x.status === "Active" && new Date(x.renewalDate || x.startDate || 0) <= now);
  let createdCount = 0;
  for (const sub of due) {
    const period = new Date(sub.renewalDate || sub.startDate || now);
    if (sub.expiryDate && new Date(sub.expiryDate) < now) {
      if (sub.autoClose || !sub.allowRenewal) { sub.status = "Closed"; if (connected) await sub.save(); }
      continue;
    }
    const subscriptionId = String(sub._id);
    const duplicate = connected ? await models.invoices.exists({ subscription: subscriptionId, periodStart: period }) : memory.invoices.some((x) => String(x.subscription) === subscriptionId && new Date(x.periodStart).getTime() === period.getTime());
    if (duplicate) continue;
    const items = Array.isArray(sub.items) && sub.items.length ? sub.items : [{ product: sub.product, description: sub.plan || "Subscription", quantity: Number(sub.quantity || 1), unitPrice: Number(sub.amount || sub.price || 0) }];
    const subtotal = items.reduce((sum, line) => sum + Number(line.quantity || 1) * Number(line.unitPrice || 0), 0);
    const rules = connected ? await models.taxes.find({ status: "Active" }).lean() : memory.taxes.filter((x) => x.status === "Active");
    const activeTaxes = rules.filter((x) => (!x.startDate || new Date(x.startDate) <= now) && (!x.endDate || new Date(x.endDate) >= now) && (!x.product || items.some((line) => line.product === x.product)));
    const taxRate = activeTaxes.reduce((sum, x) => sum + Number(x.rate ?? x.percentage ?? 0), 0);
    const discounts = connected ? await models.discounts.find({ status: "Active" }).sort({ createdAt: 1 }).lean() : memory.discounts.filter((x) => x.status === "Active");
    const quantity = items.reduce((sum, line) => sum + Number(line.quantity || 1), 0);
    const discountRule = discounts.find((x) => (!x.startDate || new Date(x.startDate) <= now) && (!x.endDate || new Date(x.endDate) >= now) && (!x.usageLimit || Number(x.usageCount || 0) < Number(x.usageLimit)) && subtotal >= Number(x.minimumPurchase || 0) && quantity >= Number(x.minimumQuantity || 0) && (!x.product || items.some((line) => line.product === x.product || line.description === x.product)) && (!x.scope || x.scope === "All" || x.scope === "Subscription"));
    const discount = discountRule ? Math.min(subtotal, discountRule.type === "Percentage" ? subtotal * Math.min(100, Number(discountRule.value || 0)) / 100 : Number(discountRule.value || 0)) : 0;
    const tax = +((subtotal - discount) * taxRate / 100).toFixed(2), total = +(subtotal - discount + tax).toFixed(2);
    const invoice = { number: "INV-" + randomUUID().slice(-10).toUpperCase(), customer: String(sub.customer), customerEmail: sub.customerEmail, subscription: subscriptionId, periodStart: period, invoiceDate: now, dueDate: new Date(now.getTime() + Number(sub.paymentTerms || 14) * 864e5), items, subtotal, taxRate, taxSnapshot: activeTaxes.map((x) => ({ name: x.name, rate: Number(x.rate ?? x.percentage ?? 0) })), discountSnapshot: discountRule ? { name: discountRule.name, type: discountRule.type, value: discountRule.value, amount: +discount.toFixed(2) } : null, discount: +discount.toFixed(2), total, amount: total, paidAmount: 0, outstandingAmount: total, status: "Confirmed" };
    if (connected) await models.invoices.create(invoice); else memory.invoices.unshift({ _id: Date.now() + createdCount, createdAt: now, ...invoice });
    if (discountRule) { if (connected) await models.discounts.updateOne({ _id: discountRule._id }, { $inc: { usageCount: 1 } }); else discountRule.usageCount = Number(discountRule.usageCount || 0) + 1; }
    const next = new Date(period), frequency = String(sub.billingFrequency || "Monthly").toLowerCase();
    if (frequency === "daily") next.setDate(next.getDate() + 1); else if (frequency === "weekly") next.setDate(next.getDate() + 7); else if (frequency === "yearly" || frequency === "annual") next.setFullYear(next.getFullYear() + 1); else next.setMonth(next.getMonth() + 1);
    sub.renewalDate = next;
    if (connected) await sub.save();
    createdCount++;
  }
  return createdCount;
}
app.post("/api/billing/run", auth, async (q, s) => {
  if (q.user.role !== "admin") return s.status(403).json({ error: "Admin access required" });
  try { s.json({ data: { created: await runDueBilling() } }); } catch (e) { s.status(500).json({ error: e.message }); }
});
cron.schedule("0 2 * * *", async () => {
  try { await runDueBilling(); } catch (e) { console.error("Recurring billing failed:", e.message); }
});
databaseReady.then(() => app.listen(process.env.PORT || 4e3, () => console.log("Brightloop API ready"))).catch((error) => { console.error("Could not initialize local SQLite database:", error); process.exit(1); });
