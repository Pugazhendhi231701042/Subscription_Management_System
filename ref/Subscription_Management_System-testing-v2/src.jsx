import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import axios from "axios";
import "./style.css";

// Clean bespoke SVG icons (zero Lucide dependency, zero sparkle icons)
const IconDashboard = ({ size = 17, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);

const IconUsers = ({ size = 17, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconActivity = ({ size = 17, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const IconPackage = ({ size = 17, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16.5 9.4 7.55 4.24" />
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.29 7 12 12 20.71 7" />
    <line x1="12" y1="22" x2="12" y2="12" />
  </svg>
);

const IconFileText = ({ size = 17, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const IconRepeat = ({ size = 17, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </svg>
);

const IconCreditCard = ({ size = 17, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </svg>
);

const IconSettings = ({ size = 17, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const IconSearch = ({ size = 15, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const IconPlus = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconArrowUpRight = ({ size = 13, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M7 17L17 7" />
    <path d="M7 7h10v10" />
  </svg>
);

const IconSun = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const IconMoon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const IconCheck = ({ size = 14, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api" });
const fmt = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const initial = { staff: [], plans: [], quotations: [], quotationTemplates: [], payments: [], discounts: [], taxes: [], customers: [], subscriptions: [], invoices: [], products: [], workItems: [], chart: [] };

const links = [
  ["Overview", IconDashboard],
  ["Customers", IconUsers],
  ["Staff", IconUsers],
  ["Work", IconActivity],
  ["Products", IconPackage],
  ["Plans", IconPackage],
  ["Quotations", IconFileText],
  ["Quotation templates", IconFileText],
  ["Subscriptions", IconRepeat],
  ["Invoices", IconFileText],
  ["Payments", IconCreditCard],
  ["Discounts", IconActivity],
  ["Taxes", IconActivity],
  ["Reports", IconActivity],
  ["Profile", IconUsers]
];

function App() {
  const [d, D] = useState(initial);
  const [page, P] = useState("Overview");
  const [modal, M] = useState("");
  const [toast, T] = useState("");
  const [q, Q] = useState("");
  const [filter, F] = useState("All");
  const [editing, E] = useState(null);
  const [pageInfo, PageInfo] = useState({});
  const [summary, Summary] = useState(null);
  const [night, N] = useState(() => localStorage.getItem("brightloop_theme") === "night");
  const [user, U] = useState(() => {
    try {
      if (!localStorage.getItem("brightloop_token") && !sessionStorage.getItem("brightloop_token")) return null;
      return JSON.parse(localStorage.getItem("brightloop_user"));
    } catch {
      return null;
    }
  });

  React.useEffect(() => {
    const token = localStorage.getItem("brightloop_token") || sessionStorage.getItem("brightloop_token");
    if (!token) return;
    api.defaults.headers.common.Authorization = "Bearer " + token;
    api.get("/profile").catch((e) => {
      if (e.response?.status === 401) logout();
      else notice(e.response?.data?.error || "Could not verify your session");
    });
    api.get("/dashboard").then((r) => Summary(r.data.data)).catch((e) => notice(e.response?.data?.error || "Dashboard could not load"));
    const keys = [
      "customers",
      "subscriptions",
      "invoices",
      "products",
      "payments",
      "plans",
      "quotations",
      "quotationTemplates",
      ...(user.role === "customer" ? [] : ["workItems"]),
      ...(user.role === "admin" ? ["discounts", "taxes", "users"] : [])
    ];
    Promise.all(keys.map((k2) => api.get("/" + k2, { params: { page: 1, limit: 100 } }).catch(() => null))).then((r) => {
      let n = { ...initial }, pages = {};
      const targets = ["customers", "subscriptions", "invoices", "products", "payments", "plans", "quotations", "quotationTemplates", "workItems", "discounts", "taxes", "staff"];
      targets.forEach((target) => {
        const source = target === "staff" ? "users" : target;
        const i = keys.indexOf(source);
        if (i >= 0 && r[i]?.data?.data) {
          n[target] = r[i].data.data;
          pages[target] = r[i].data;
        }
      });
      const failed = r.filter((result) => !result).length;
      D(n);
      PageInfo(pages);
      if (failed) notice(`${failed} workspace section${failed === 1 ? "" : "s"} could not load. Check your access or connection.`);
    });
  }, [user]);

  React.useEffect(() => {
    if (!user || !pageMap[page] || ["Overview", "Reports", "Profile"].includes(page)) return;
    const key = pageMap[page] === "staff" ? "users" : pageMap[page];
    const timer = setTimeout(() => api.get("/" + key, { params: { page: 1, limit: 100, search: q, status: filter === "All" ? "" : filter } }).then((r) => {
      const target = key === "users" ? "staff" : key;
      D((old) => ({ ...old, [target]: r.data.data }));
      PageInfo((old) => ({ ...old, [target]: r.data }));
    }).catch((e) => notice(e.response?.data?.error || `${page} could not load`)), 250);
    return () => clearTimeout(timer);
  }, [user, page, q, filter]);

  const refreshSummary = async () => {
    try { Summary((await api.get("/dashboard")).data.data); }
    catch (e) { notice(e.response?.data?.error || "Dashboard refresh failed"); }
  };

  const notice = (x) => {
    T(x);
    setTimeout(() => T(""), 2400);
  };

  function logout() {
    localStorage.removeItem("brightloop_token");
    sessionStorage.removeItem("brightloop_token");
    localStorage.removeItem("brightloop_user");
    delete api.defaults.headers.common.Authorization;
    U(null);
    D(initial);
  }

  async function create(v) {
    if (editing?.action === "changePlan") {
      try {
        const updated = (await api.post("/subscriptions/" + (editing.item._id || editing.item.id) + "/change-plan", { plan: v.plan, quantity: v.quantity, items: v.items })).data.data;
        D((x) => ({ ...x, subscriptions: x.subscriptions.map((row) => (row._id || row.id) === (editing.item._id || editing.item.id) ? updated : row) }));
        E(null);
        M("");
        notice("Subscription plan changed");
      } catch (e) { notice(e.response?.data?.error || "Could not change subscription plan"); }
      return;
    }
    if (editing) {
      const ek = editing.key, apiKey = ek === "staff" ? "users" : ek;
      try {
        let updated = (await api.patch("/" + apiKey + "/" + (editing.item._id || editing.item.id), v)).data.data;
        D((x) => ({ ...x, [ek]: x[ek].map((r) => (r._id || r.id) === (editing.item._id || editing.item.id) ? updated : r) }));
        E(null);
        M("");
        refreshSummary();
        notice("Changes saved");
      } catch (e) {
        notice(e.response?.data?.error || "Could not update record");
      }
      return;
    }
    const keyMap = { "New work item": "workItems", "New customer": "customers", "New product": "products", "New plan": "plans", "New quotation": "quotations", "New quotation template": "quotationTemplates", "New subscription": "subscriptions", "New invoice": "invoices", "New payment": "payments", "New discount": "discounts", "New tax": "taxes", "New staff": "users" };
    const k2 = keyMap[modal] || "subscriptions";
    let item = { ...v, number: "BL-" + Date.now().toString().slice(-5), status: "Active" };
    try {
      item = (await api.post("/" + k2, v)).data.data;
    } catch (e) {
      notice(e.response?.data?.error || "Could not save record");
      return;
    }
    D((x) => ({ ...x, [k2 === "users" ? "staff" : k2]: [item, ...x[k2 === "users" ? "staff" : k2]] }));
    M("");
    refreshSummary();
    notice(k2 === "users" ? "Staff invitation created. They can sign in using this email." : k2 === "workItems" ? "Work assigned" : "Record created");
  }

  async function convertQuote(item) {
    try {
      const result = (await api.post("/quotations/" + (item._id || item.id) + "/convert")).data.data;
      D((x) => ({ ...x, quotations: x.quotations.map((r) => (r._id || r.id) === (item._id || item.id) ? result.quotation : r), subscriptions: [result.subscription, ...x.subscriptions] }));
      refreshSummary();
      notice("Quotation converted to subscription");
    } catch (e) { notice(e.response?.data?.error || "Accept the quotation before conversion"); }
  }

  function openPlanChange(item) {
    E({ key: "subscriptions", item, action: "changePlan" });
    M("Change subscription plan");
  }

  async function updateStatus(item, status) {
    try {
      const key = page === "Invoices" ? "invoices" : page === "Staff" ? "staff" : page === "Work" ? "workItems" : "subscriptions";
      const endpoint = key === "staff" ? "/users/" + (item._id || item.id) : key === "workItems" ? "/workItems/" + (item._id || item.id) : key === "invoices" ? "/invoices/" + (item._id || item.id) + "/status" : "/subscriptions/" + (item._id || item.id) + "/status";
      const updated = (await (["staff", "workItems"].includes(key) ? api.patch(endpoint, { status }) : api.post(endpoint, { status }))).data.data;
      D((x) => ({ ...x, [key]: x[key].map((row) => (row._id || row.id) === (item._id || item.id) ? updated : row) }));
      refreshSummary();
      notice("Status updated to " + status);
    } catch (e) { notice(e.response?.data?.error || "Could not update status"); }
  }

  async function loadMore() {
    const key = k === "staff" ? "users" : k, info = pageInfo[k];
    if (!info || info.page >= info.totalPages) return;
    try {
      const result = (await api.get("/" + key, { params: { page: info.page + 1, limit: info.limit || 100, search: q, status: filter === "All" ? "" : filter } })).data;
      D((x) => ({ ...x, [k]: [...x[k], ...result.data] }));
      PageInfo((x) => ({ ...x, [k]: result }));
    } catch (e) { notice(e.response?.data?.error || "Could not load the next page"); }
  }

  async function sendInvoice(item) {
    try {
      await api.post("/invoices/" + (item._id || item.id) + "/send");
      notice("Invoice emailed to the customer");
    } catch (e) { notice(e.response?.data?.error || "Could not send invoice"); }
  }

  function printInvoice(item) {
    const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[ch]));
    const popup = window.open("", "brightloop-invoice", "width=800,height=900");
    if (!popup) return notice("Allow pop-ups to print this invoice");
    popup.document.write(`<html><head><title>${safe(item.number || "Invoice")}</title><style>body{font:16px 'Poppins',Arial,sans-serif;max-width:760px;margin:48px auto;color:#222}h1{color:#6246d8}table{width:100%;border-collapse:collapse;margin-top:24px}td,th{padding:12px;border-bottom:1px solid #ddd;text-align:left}.total{text-align:right;font-weight:bold;margin-top:28px}</style></head><body><h1>Brightloop</h1><h2>Invoice ${safe(item.number)}</h2><p>Customer: ${safe(item.customer)}</p><p>Invoice date: ${safe(item.invoiceDate || "-")} · Due: ${safe(item.dueDate || "-")}</p><table><tr><th>Description</th><th>Qty</th><th>Unit price</th></tr>${(item.items || []).map((line) => `<tr><td>${safe(line.description || line.product)}</td><td>${safe(line.quantity || 1)}</td><td>${fmt(line.unitPrice)}</td></tr>`).join("")}</table><p class="total">Amount due: ${fmt(item.outstandingAmount ?? item.total ?? item.amount)}</p><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  }

  async function runBilling() {
    try {
      const result = (await api.post("/billing/run")).data.data;
      notice(`${result.created} invoice(s) generated`);
      refreshSummary();
      const [i, sub] = await Promise.all([api.get("/invoices", { params: { page: 1, limit: 100 } }), api.get("/subscriptions", { params: { page: 1, limit: 100 } })]);
      D((x) => ({ ...x, invoices: i.data.data, subscriptions: sub.data.data }));
    } catch (e) { notice(e.response?.data?.error || "Could not run billing"); }
  }

  async function remove(k2, item) {
    if (!confirm("Delete this record? This cannot be undone.")) return;
    let apiKey = k2 === "staff" ? "users" : k2;
    try {
      await api.delete("/" + apiKey + "/" + (item._id || item.id));
      D((x) => ({ ...x, [k2]: x[k2].filter((r) => (r._id || r.id) !== (item._id || item.id)) }));
      refreshSummary();
      notice("Record deleted");
    } catch (e) {
      notice(e.response?.data?.error || "Could not delete record");
    }
  }

  let pageMap = { Work: "workItems", Overview: "subscriptions", Reports: "subscriptions", Customers: "customers", Staff: "staff", Products: "products", Plans: "plans", Quotations: "quotations", "Quotation templates": "quotationTemplates", Subscriptions: "subscriptions", Invoices: "invoices", Payments: "payments", Discounts: "discounts", Taxes: "taxes", Profile: "profile" };
  let k = pageMap[page] || "subscriptions";
  let rows = d[k] || d.subscriptions;
  let filtered = rows.filter((x) => (filter === "All" || (filter === "Past due" ? ["Past due", "Overdue"].includes(x.status) : x.status === filter)) && JSON.stringify(x).toLowerCase().includes(q.toLowerCase()));
  let chartData = summary?.chart?.length ? summary.chart : Object.values(d.invoices.reduce((acc, x) => {
    let dt = new Date(x.invoiceDate || x.date || Date.now()), key = dt.toLocaleString("en", { month: "short" });
    acc[key] ??= { month: key, revenue: 0 };
    acc[key].revenue += Number(x.paidAmount || 0);
    return acc;
  }, {}));

  let active = d.subscriptions.filter((x) => x.status === "Active");
  let mrr = active.reduce((a, x) => a + Number(x.amount || 0) / (String(x.plan || "").toLowerCase().includes("annual") ? 12 : 1), 0);
  let arr = mrr * 12;
  let collected = d.invoices.reduce((a, x) => a + Number(x.paidAmount || 0), 0);
  let out = d.invoices.reduce((a, x) => a + Number(x.outstandingAmount ?? (x.status === "Paid" ? 0 : x.amount) ?? 0), 0);
  let overdue = d.invoices.filter((x) => x.status === "Overdue").length;

  // Clean metrics without em dashes or rainbow colors
  let metrics = [
    ["Total customers", String(summary?.customers ?? d.customers.length), "Active accounts", IconUsers],
    ["Active subscriptions", String(summary?.activeSubscriptions ?? active.length), "Live contracts", IconRepeat],
    ["Monthly recurring revenue", fmt(summary?.mrr ?? mrr), "Live MRR", IconCreditCard],
    ["Annual recurring revenue", fmt(summary?.arr ?? arr), "Projected ARR", IconCreditCard],
    ["Collected revenue", fmt(summary?.collected ?? collected), "Verified payments", IconCreditCard],
    ["Outstanding payments", fmt(summary?.outstanding ?? out), "Pending collection", IconActivity],
    ["Overdue invoices", String(summary?.overdue ?? overdue), "Action required", IconFileText]
  ];

  if (!user) return <Auth onLogin={(u) => U(u)} />;

  const visibleLinks = links.filter(([n]) => user.role === "customer" ? ["Overview", "Products", "Plans", "Subscriptions", "Invoices", "Payments", "Profile"].includes(n) : user.role === "staff" ? ["Overview", "Customers", "Work", "Quotation templates", "Quotations", "Subscriptions", "Invoices", "Payments", "Reports", "Profile"].includes(n) : true);

  return (
    <div className={night ? "app night" : "app"}>
      <aside>
        <h2>
          <i><IconActivity size={17} /></i>
          brightloop
        </h2>
        <div className="workspace">
          <div className="workspace-badge">
            <span className="workspace-dot" />
            <b>Brightloop</b>
          </div>
          <small>Workspace</small>
        </div>
        <label>WORKSPACE</label>
        {visibleLinks.map(([n, I]) => (
          <button key={n} className={page === n ? "selected" : ""} onClick={() => { P(n); F("All"); Q(""); }}>
            <I size={17} />
            {n}
          </button>
        ))}
        <div className="sidefoot">
          <button onClick={() => P("Profile")}>
            <IconSettings size={17} />
            Settings / Profile
          </button>
          <div className="account">
            <i>{(user.name || user.email || "U").slice(0, 1).toUpperCase()}</i>
            <span>
              <b>{user.name || user.email}</b>
              <small>{user.role}</small>
            </span>
            <button onClick={logout}>Log out</button>
          </div>
        </div>
      </aside>

      <main>
        <header>
          <span>Workspace / <b>{page}</b></span>
          <nav className="mobile-nav">
            <select aria-label="Choose a page" value={page} onChange={(e) => { P(e.target.value); F("All"); Q(""); }}>
              {visibleLinks.map(([name]) => <option key={name} value={name}>{name}</option>)}
            </select>
          </nav>
          <div className="headright">
            <label>
              <IconSearch size={15} />
              <input placeholder="Search records..." value={q} onChange={(e) => Q(e.target.value)} />
            </label>
            <button
              className="theme-toggle"
              aria-label={night ? "Switch to light mode" : "Switch to night mode"}
              title={night ? "Switch to light mode" : "Switch to night mode"}
              onClick={() => N((v) => {
                const next = !v;
                localStorage.setItem("brightloop_theme", next ? "night" : "light");
                return next;
              })}
            >
              {night ? <IconSun size={17} /> : <IconMoon size={17} />}
            </button>
            <i>{(user.name || "U").slice(0, 1).toUpperCase()}</i>
            <button className="logouttop" onClick={logout}>Log out</button>
          </div>
        </header>

        <article>
          <div className="title">
            <div>
              <small>{page === "Overview" ? new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date()).toUpperCase() : "WORKSPACE"}</small>
              <h1>{page === "Overview" ? "Good morning, " + (user.name || "there") : page}</h1>
              <p>{page === "Overview" ? "Here is an executive snapshot of your recurring revenue and subscriptions today." : "Manage your " + page.toLowerCase() + " and operational records."}</p>
            </div>
            {user.role !== "customer" && (
              <button
                className="primary"
                onClick={() => M(
                  page === "Overview" || page === "Subscriptions" ? "New subscription" :
                  page === "Work" ? "New work item" :
                  page === "Customers" ? "New customer" :
                  page === "Products" ? "New product" :
                  page === "Plans" ? "New plan" :
                  page === "Quotations" ? "New quotation" :
                  page === "Quotation templates" ? "New quotation template" :
                  page === "Payments" ? "New payment" :
                  page === "Discounts" ? "New discount" :
                  page === "Taxes" ? "New tax" :
                  page === "Staff" ? "New staff" :
                  "New invoice"
                )}
              >
                <IconPlus size={16} />
                {page === "Overview" ? "New subscription" : "Create " + page.replace(/s$/, "").toLowerCase()}
              </button>
            )}
          </div>

          {page === "Profile" ? (
            <ProfilePanel user={user} notify={notice} />
          ) : page === "Overview" || page === "Reports" ? (
            <>
              <div className="metrics">
                {metrics.map((x, i) => (
                  <section key={i}>
                    <small>
                      {x[0]}
                      <i>{React.createElement(x[3], { size: 16 })}</i>
                    </small>
                    <strong>{x[1]}</strong>
                    <p>
                      <IconArrowUpRight size={13} /> {x[2]} <span>calculated from records</span>
                    </p>
                  </section>
                ))}
              </div>

              <div className="grid">
                <section className="panel">
                  <div className="panelhead">
                    <div>
                      <b>Revenue over time</b>
                      <small>Recurring revenue performance</small>
                    </div>
                    <div className="panelactions">
                      {user.role === "admin" && <button onClick={runBilling}>Generate due invoices</button>}
                    </div>
                  </div>
                  <div className="chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="f" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="#7556e8" stopOpacity=".2" />
                            <stop offset="1" stopColor="#7556e8" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#edf0f4" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={(v) => "₹" + v / 1e3 + "k"} axisLine={false} tickLine={false} />
                        <Tooltip formatter={fmt} />
                        <Area dataKey="revenue" stroke="#7556e8" strokeWidth={2.5} fill="url(#f)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="panel">
                  <b>Subscription overview</b>
                  <small>Active and lifecycle breakdown</small>
                  <div className="donut">
                    <b>{d.subscriptions.length}</b>
                  </div>
                  {["Active", "Trial", "Past due", "Canceled"].map((label, i) => {
                    let count = d.subscriptions.filter((x) => x.status === label).length;
                    let pct = d.subscriptions.length ? (count * 100 / d.subscriptions.length).toFixed(1) : "0.0";
                    return (
                      <div className={"legend " + ["", "blue", "orange", "gray"][i]} key={label}>
                        <span className="legend-dot" /> {label}
                        <span>{count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </section>
              </div>

              <div className="grid lower">
                <section className="panel">
                  <div className="panelhead">
                    <div>
                      <b>Recent subscriptions</b>
                      <small>Latest customer account activity</small>
                    </div>
                    <a onClick={() => P("Subscriptions")}>View all</a>
                  </div>
                  <Table rows={d.subscriptions} />
                </section>

                <section className="panel">
                  <b>Upcoming renewals</b>
                  <small>Next 30 days</small>
                  {d.subscriptions.slice(0, 4).map((x, i) => (
                    <div className="renew" key={i}>
                      <i>{(x.customer || "C")[0]}</i>
                      <span>
                        <b>{x.customer}</b>
                        <small>{x.plan}</small>
                      </span>
                      <b>{x.renewal || "Active"}</b>
                    </div>
                  ))}
                </section>
              </div>
            </>
          ) : (
            <section className="panel listing">
              <div className="tabs">
                {(
                  page === "Work" ? ["All", "Open", "In progress", "Blocked", "Closed"] :
                  page === "Invoices" ? ["All", "Draft", "Confirmed", "Sent", "Partial", "Paid", "Overdue", "Cancelled"] :
                  page === "Subscriptions" ? ["All", "Draft", "Quotation", "Confirmed", "Active", "Paused", "Closed"] :
                  page === "Quotations" ? ["All", "Draft", "Sent", "Accepted", "Rejected", "Expired", "Converted"] :
                  ["All", "Active", "Past due", "Closed"]
                ).map((x) => (
                  <button key={x} className={filter === x ? "on" : ""} onClick={() => F(x)}>{x}</button>
                ))}
                <button
                  className="export"
                  onClick={() => {
                    const csv = [Object.keys(filtered[0] || {}).join(","), ...filtered.map((r) => Object.values(r).map((v) => '"' + String(v ?? "").replaceAll('"', '""') + '"').join(","))].join("\n");
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                    a.download = page.toLowerCase() + ".csv";
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}
                >
                  Export CSV
                </button>
              </div>

              <Table
                rows={filtered}
                onDelete={user.role === "customer" || (k === "workItems" && user.role !== "admin") ? null : (row) => remove(k, row)}
                onConvert={k === "quotations" ? (row) => convertQuote(row) : null}
                onStatusChange={(k === "workItems" && user.role !== "customer") || (k === "staff" && user.role === "admin") || k === "subscriptions" || (k === "invoices" && user.role !== "customer") ? updateStatus : null}
                onChangePlan={user.role === "customer" && k === "subscriptions" ? openPlanChange : null}
                onSend={k === "invoices" && user.role !== "customer" ? sendInvoice : null}
                onPrint={k === "invoices" ? printInvoice : null}
                onEdit={user.role === "customer" || (k === "workItems" && user.role !== "admin") ? null : (row) => {
                  E({ key: k, item: row });
                  M(
                    k === "staff" ? "New staff" :
                    k === "workItems" ? "New work item" :
                    k === "customers" ? "New customer" :
                    k === "products" ? "New product" :
                    k === "plans" ? "New plan" :
                    k === "quotations" ? "New quotation" :
                    k === "quotationTemplates" ? "New quotation template" :
                    k === "subscriptions" ? "New subscription" :
                    k === "invoices" ? "New invoice" :
                    k === "payments" ? "New payment" :
                    k === "discounts" ? "New discount" :
                    "New tax"
                  );
                }}
              />

              {pageInfo[k]?.page < pageInfo[k]?.totalPages && (
                <div className="pagination">
                  <span>Showing {rows.length} of {pageInfo[k]?.total} records</span>
                  <button className="secondary" onClick={loadMore}>Load more</button>
                </div>
              )}
            </section>
          )}
        </article>
      </main>

      {modal && (
        <Form
          kind={modal}
          record={editing?.item}
          close={() => {
            M("");
            E(null);
          }}
          submit={create}
          customers={d.customers}
          invoices={d.invoices}
          plans={d.plans}
          products={d.products}
          templates={d.quotationTemplates}
          staff={d.staff}
        />
      )}

      {toast && (
        <div className="toast">
          <IconCheck size={14} />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

function ProfilePanel({ user, notify }) {
  const [v, V] = useState({ name: user.name || "", phone: "", company: "" });
  const [busy, B] = useState(false);

  React.useEffect(() => {
    api.get("/profile").then((r) => V((old) => ({ ...old, ...r.data.data.customer || {}, ...r.data.data.user || {} }))).catch((e) => notify(e.response?.data?.error || "Could not load profile details"));
  }, []);

  async function save(e) {
    e.preventDefault();
    B(true);
    try {
      const r = await api.patch("/profile", v);
      localStorage.setItem("brightloop_user", JSON.stringify({ ...user, ...r.data.data }));
      if (r.data.data.token) {
        localStorage.setItem("brightloop_token", r.data.data.token);
        api.defaults.headers.common.Authorization = "Bearer " + r.data.data.token;
      }
      notify("Profile saved");
    } catch (x) {
      notify(x.response?.data?.error || "Unable to save profile");
    } finally {
      B(false);
    }
  }

  return (
    <section className="panel profilepanel">
      <h2>Your profile</h2>
      <p>Update your contact details and company information.</p>
      <form onSubmit={save}>
        <label>Full name<input required value={v.name || ""} onChange={(e) => V({ ...v, name: e.target.value })} /></label>
        <label>Email address<input disabled value={user.email} /></label>
        <label>Phone<input value={v.phone || ""} onChange={(e) => V({ ...v, phone: e.target.value })} /></label>
        <label>Company<input value={v.company || ""} onChange={(e) => V({ ...v, company: e.target.value })} /></label>
        <button className="primary" disabled={busy}>{busy ? "Saving..." : "Save profile"}</button>
      </form>
    </section>
  );
}

function Auth({ onLogin }) {
  const resetToken = new URLSearchParams(location.search).get("resetToken");
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
  const [mode, M] = useState(resetToken ? "reset" : "login");
  const [show, S] = useState(false);
  const [busy, B] = useState(false);
  const [error, E] = useState("");
  const [resetUrl, R] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const googleButton = React.useRef(null);

  function finishLogin(data, persistent = true) {
    localStorage.removeItem("brightloop_token");
    sessionStorage.removeItem("brightloop_token");
    (persistent ? localStorage : sessionStorage).setItem("brightloop_token", data.token);
    localStorage.setItem("brightloop_user", JSON.stringify(data.user));
    api.defaults.headers.common.Authorization = "Bearer " + data.token;
    onLogin(data.user);
  }

  function setDemo(email, pass) {
    setEmailInput(email);
    setPassInput(pass);
    E("");
  }

  async function submit(e) {
    e.preventDefault();
    E("");
    let f = new FormData(e.currentTarget);
    let name = f.get("name");
    let email = String(f.get("email") || emailInput).trim().toLowerCase();
    let password = f.get("password") || passInput;

    if (mode === "forgot") {
      B(true);
      try {
        let r = await api.post("/auth/forgot-password", { email });
        R(r.data.developmentResetUrl || "Check your email for the reset link");
        E("Reset instructions requested. " + (r.data.developmentResetUrl || ""));
      } catch {
        E("Could not request a reset link");
      } finally {
        B(false);
      }
      return;
    }

    if (mode === "reset") {
      B(true);
      try {
        await api.post("/auth/reset-password", { token: resetToken, password });
        M("login");
        history.replaceState({}, "", location.pathname);
        E("Password reset. Sign in with your new password.");
      } catch (x) {
        E(x.response?.data?.error || "Could not reset password");
      } finally {
        B(false);
      }
      return;
    }

    if (mode === "register" && (password !== f.get("confirm") || !f.get("terms"))) {
      E(password !== f.get("confirm") ? "Passwords do not match" : "Please accept the terms");
      return;
    }

    B(true);
    try {
      const r = await api.post("/auth/" + (mode === "login" ? "login" : "register"), { name, email, phone: f.get("phone"), password });
      finishLogin(r.data.data, Boolean(f.get("remember")));
    } catch (x) {
      E(x.response?.data?.error || "Could not connect to the server. Start the API and try again.");
    } finally {
      B(false);
    }
  }

  return (
    <div className="authscreen">
      <div className="authart">
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="authbrand">
          <span className="authbrand-dot" />
          BRIGHTLOOP
        </div>
        <div className="artcopy">
          <small>SMART SUBSCRIPTIONS. SIMPLIFIED BILLING.</small>
          <h1>Everything recurring,<br />all in one loop.</h1>
          <p>One calm place to manage customers, subscriptions, and every invoice in between.</p>
          <div className="artstats">
            <span><b>01</b> Customer first</span>
            <span><b>02</b> Billing made simple</span>
          </div>
        </div>
      </div>

      <div className="authside">
        <form className="authform" onSubmit={submit}>
          <div className="mobilebrand">BRIGHTLOOP</div>
          <div className="authicon"><IconActivity size={20} /></div>
          <h2>{mode === "login" ? "Welcome back" : mode === "register" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Choose a new password"}</h2>
          <p>{mode === "login" ? "Sign in to your Brightloop workspace." : mode === "register" ? "Start managing your subscriptions today." : mode === "forgot" ? "We will send a secure link to your email." : "Your new password must meet the security requirements."}</p>

          {mode === "login" && (
            <div className="demologins">
              <b>Quick Demo Access</b>
              <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                <button type="button" className="secondary" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => setDemo("admin@brightloop.local", "Brightloop@2026")}>Admin</button>
                <button type="button" className="secondary" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => setDemo("sales@brightloop.com", "Brightloop@2026")}>Staff</button>
                <button type="button" className="secondary" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => setDemo("contact@acmecorp.com", "Brightloop@2026")}>Customer</button>
              </div>
            </div>
          )}

          {mode === "register" && (
            <>
              <label>Full name<input name="name" required placeholder="Your name" /></label>
              <label>Phone number<input name="phone" type="tel" required placeholder="+91 98765 43210" /></label>
            </>
          )}

          {mode !== "reset" && (
            <label>
              Email address
              <input name="email" type="email" required placeholder="you@company.com" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} />
            </label>
          )}

          {(mode === "login" || mode === "register") && (
            <label>
              Password
              <div className="passfield">
                <input name="password" type={show ? "text" : "password"} required minLength="8" placeholder="Enter your password" value={passInput} onChange={(e) => setPassInput(e.target.value)} />
                <button type="button" onClick={() => S(!show)}>{show ? "Hide" : "Show"}</button>
              </div>
            </label>
          )}

          {mode === "reset" && (
            <label>
              New password
              <input name="password" type={show ? "text" : "password"} required minLength="8" placeholder="Choose a strong password" />
            </label>
          )}

          {mode === "forgot" && <p>A secure reset link will be sent if the email is registered.</p>}

          {mode === "register" && (
            <>
              <label>Confirm password<input name="confirm" type={show ? "text" : "password"} required placeholder="Re-enter your password" /></label>
              <label className="terms"><input name="terms" type="checkbox" required /> I agree to the terms and privacy policy</label>
            </>
          )}

          {mode === "login" && (
            <div className="authoptions">
              <label><input type="checkbox" name="remember" /> Remember me</label>
              <button type="button" onClick={() => { M("forgot"); E(""); }}>Forgot password?</button>
            </div>
          )}

          {error && <div className="autherror">{error}</div>}
          {resetUrl && <a className="resetlink" href={resetUrl}>Open password reset link</a>}

          {(mode === "login" || mode === "register" || mode === "reset") && (
            <button className="authsubmit" disabled={busy}>{busy ? "Please wait..." : mode === "login" ? "Sign in" : mode === "register" ? "Create account" : "Reset password"}</button>
          )}

          {mode === "forgot" && (
            <button className="authsubmit" disabled={busy}>{busy ? "Please wait..." : "Send reset link"}</button>
          )}

          <div className="authswitch">
            {mode === "login" ? "New to Brightloop?" : mode === "register" ? "Already have an account?" : "Return to sign in"}{" "}
            <button type="button" onClick={() => { M(mode === "login" ? "register" : "login"); E(""); R(""); }}>
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Table({ rows, onDelete, onEdit, onConvert, onStatusChange, onSend, onPrint, onChangePlan }) {
  const nextStatuses = (row) => {
    if (onPrint) {
      if (row.status === "Draft") return ["Confirmed", "Cancelled"];
      if (["Confirmed", "Partial", "Overdue"].includes(row.status)) return ["Sent", "Cancelled"];
      if (row.status === "Sent") return ["Cancelled"];
      return [];
    }
    if (onStatusChange && row.title) return row.status === "Open" ? ["In progress", "Blocked", "Closed"] : row.status === "In progress" ? ["Blocked", "Closed", "Open"] : row.status === "Blocked" ? ["In progress", "Closed", "Open"] : row.status === "Closed" ? ["Open"] : [];
    if (onEdit && row.role === "staff") return row.status === "Closed" ? ["Active"] : row.status === "Active" ? ["Closed"] : ["Active", "Closed"];
    if (row.status === "Draft") return ["Quotation", "Confirmed"];
    if (row.status === "Quotation") return ["Confirmed", "Draft"];
    if (row.status === "Confirmed") return ["Active", "Closed"];
    if (row.status === "Active") return ["Paused", "Closed"];
    if (row.status === "Paused") return ["Active", "Closed"];
    if (row.status === "Sent" || row.status === "Partial" || row.status === "Overdue") return ["Cancelled"];
    if (row.status === "Invoice draft") return ["Confirmed", "Cancelled"];
    return [];
  };

  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th>RECORD</th>
            <th>{rows.some((r) => r.assigneeEmail) ? "ASSIGNED TO" : "CUSTOMER / EMAIL"}</th>
            <th>{rows.some((r) => r.title) ? "WORK DETAILS" : "PLAN / DETAILS"}</th>
            <th>AMOUNT</th>
            <th>STATUS</th>
            {(onEdit || onDelete || onConvert || onStatusChange || onSend || onPrint || onChangePlan) && <th>ACTIONS</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x._id || x.id || x.number || x.name}>
              <td>
                <b>{x.number || x.title || x.name || x.planName}</b>
                {x.dueDate && <small className="table-sub">Due {new Date(x.dueDate).toLocaleDateString()}</small>}
              </td>
              <td>{x.assigneeName || x.assigneeEmail || x.customer || x.email || x.company || "-"}</td>
              <td>{x.description || x.plan || x.type || x.billingFrequency || (x.rate ? `${x.rate}% tax` : "-")}</td>
              <td>{x.title ? "-" : fmt(x.total ?? x.amount ?? x.price ?? x.salesPrice)}</td>
              <td>
                <span className={"badge " + (["Paid", "Active", "Accepted", "Succeeded"].includes(x.status) ? "" : ["Past due", "Overdue", "Cancelled", "Closed", "Blocked"].includes(x.status) ? "due" : "paid")}>
                  {x.status}
                </span>
                {x.completedAt && <small className="table-sub">Completed {new Date(x.completedAt).toLocaleString()}</small>}
              </td>
              {(onEdit || onDelete || onConvert || onStatusChange || onSend || onPrint || onChangePlan) && (
                <td className="rowactions">
                  {onConvert && x.status === "Accepted" && <button className="edit-row" onClick={() => onConvert(x)}>Convert</button>}
                  {onChangePlan && ["Active", "Paused"].includes(x.status) && <button className="edit-row" onClick={() => onChangePlan(x)}>Change plan</button>}
                  {onStatusChange && nextStatuses(x).map((status) => (
                    <button key={status} className="edit-row" onClick={() => onStatusChange(x, status)}>
                      {status === "Closed" ? "Cancel" : status === "Paused" ? "Pause" : status === "Active" ? "Resume" : status}
                    </button>
                  ))}
                  {onSend && ["Confirmed", "Sent", "Partial", "Overdue"].includes(x.status) && <button className="edit-row" onClick={() => onSend(x)}>Send</button>}
                  {onPrint && <button className="edit-row" onClick={() => onPrint(x)}>Print</button>}
                  {onEdit && <button className="edit-row" onClick={() => onEdit(x)}>Edit</button>}
                  {onDelete && <button className="delete-row" onClick={() => onDelete(x)}>Delete</button>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Form({ kind, record, close, submit, customers = [], staff = [], invoices = [], plans = [], products = [], templates = [] }) {
  const [v, V] = useState(() => ({ status: kind === "New quotation" || kind === "New subscription" ? "Draft" : "Active", ...(record || {}) }));
  const [items, Items] = useState(() => record?.items?.length ? record.items : [{ description: "", product: "", quantity: 1, unitPrice: 0, taxRate: 0 }]);
  const customerNeeded = ["New subscription", "New invoice", "New quotation"].includes(kind);
  const isWorkItem = kind === "New work item";
  const isPayment = kind === "New payment";
  const isPlanChange = kind === "Change subscription plan";
  const isCustomer = kind === "New customer";
  const isProduct = kind === "New product";
  const isPlan = kind === "New plan";
  const isStaff = kind === "New staff";
  const isDiscount = kind === "New discount";
  const isTax = kind === "New tax";
  const isTemplate = kind === "New quotation template";
  const isSub = kind === "New subscription";
  const isQuote = kind === "New quotation";
  const isInvoice = kind === "New invoice";

  const set = (key, value) => V((old) => ({ ...old, [key]: value }));
  const text = (label, key, type = "text", required = false, props = {}) => (
    <label>
      {label}
      <input type={type} required={required} value={v[key] ?? ""} onChange={(e) => set(key, type === "number" ? Number(e.target.value) : e.target.value)} {...props} />
    </label>
  );

  const choose = (label, key, values, required = false) => (
    <label>
      {label}
      <select required={required} value={v[key] ?? ""} onChange={(e) => set(key, e.target.value)}>
        <option value="">Select {label.toLowerCase()}</option>
        {values.map((x) => (
          <option key={x.value ?? x} value={x.value ?? x}>{x.label ?? x}</option>
        ))}
      </select>
    </label>
  );

  const patchItem = (index, key, value) => Items((old) => old.map((line, i) => i === index ? { ...line, [key]: value } : line));
  const choosePlan = (value) => {
    const p = plans.find((x) => (x.planName || x.name) === value);
    V((old) => ({ ...old, plan: value, amount: p?.price ?? old.amount, billingFrequency: p?.billingFrequency || old.billingFrequency, minimumQuantity: p?.minimumQuantity || 1 }));
  };

  const chooseTemplate = (value) => {
    const t = templates.find((x) => (x.name || x.templateName) === value);
    if (!t) return;
    V((old) => ({ ...old, template: value, plan: t.plan || old.plan, amount: t.amount ?? old.amount, validDays: t.validDays || 30, validUntil: new Date(Date.now() + Number(t.validDays || 30) * 86400000).toISOString().slice(0, 10) }));
    if (t.items?.length) Items(t.items);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const formItems = items.map((line, index) => (isSub || isQuote || isPlanChange) && index === 0 ? { ...line, quantity: Number(v.quantity || line.quantity || 1) } : line);
    const out = { ...v, items: formItems };
    if (isInvoice || isSub || isQuote) {
      out.amount = formItems.filter((line) => line.product || line.description).reduce((sum, line) => sum + Number(line.quantity || 1) * Number(line.unitPrice || 0), 0) || Number(v.amount || 0);
    }
    if (isProduct && typeof v.variantsText === "string") {
      out.variants = v.variantsText.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
        const [name, delta] = line.split("|");
        return { name: name.trim(), priceDelta: Number(delta || 0) };
      });
    }
    submit(out);
  };

  const variantsText = v.variantsText ?? (Array.isArray(v.variants) ? v.variants.map((x) => `${x.name}|${x.priceDelta || 0}`).join("\n") : "");

  return (
    <div className="backdrop" onClick={(e) => e.target === e.currentTarget && close()}>
      <form onSubmit={onSubmit}>
        <button type="button" className="close" onClick={close}>×</button>
        <h2>{record ? "Edit record" : kind}</h2>
        <p>{record ? "Update the saved details below." : "Enter the details to continue the subscription workflow."}</p>

        {isPlanChange && (
          <>
            <label>
              New plan
              <select required value={v.plan || ""} onChange={(e) => {
                const next = plans.find((x) => (x.planName || x.name) === e.target.value);
                set("plan", e.target.value);
                if (next) Items([{ product: next.product, description: next.planName || next.name, quantity: Number(v.quantity || 1), unitPrice: Number(next.price || 0) }]);
              }}>
                <option value="">Select plan</option>
                {plans.filter((x) => x.status === "Active").map((x) => (
                  <option key={x._id || x.planName} value={x.planName || x.name}>{x.planName || x.name} · ₹{x.price} / {x.billingFrequency || "month"}</option>
                ))}
              </select>
            </label>
            <label>
              Seat quantity
              <input type="number" required min="1" value={v.quantity ?? 1} onChange={(e) => {
                const quantity = Number(e.target.value);
                set("quantity", quantity);
                patchItem(0, "quantity", quantity);
              }} />
            </label>
          </>
        )}

        {isWorkItem && (
          <>
            {text("Work title", "title", "text", true, { maxLength: 160 })}
            {choose("Assign to staff", "assigneeEmail", staff.filter((x) => x.status !== "Closed").map((x) => ({ value: x.email, label: `${x.name || x.email} (${x.status})` })), true)}
            {text("Due date", "dueDate", "date")}
            <label>Description<textarea value={v.description || ""} onChange={(e) => set("description", e.target.value)} maxLength="2000" rows="3" /></label>
          </>
        )}

        {(isCustomer || isStaff) && (
          <>
            {text("Full name", "name", "text", true)}
            {text("Email", "email", "email", true)}
            {isCustomer && text("Company", "company")}
            {isStaff && <small className="formhint">Staff can sign in with this email after the account is created.</small>}
          </>
        )}

        {customerNeeded && (
          <>
            <label>
              Customer
              <select required value={v.customerEmail || v.customer || ""} onChange={(e) => {
                const selected = customers.find((x) => (x.email || x.name) === e.target.value);
                V((old) => ({ ...old, customer: selected?.name || "", customerEmail: selected?.email || "" }));
              }}>
                <option value="">Select customer</option>
                {customers.map((x) => (
                  <option key={x._id || x.email || x.name} value={x.email || x.name}>{x.name} ({x.email || ""})</option>
                ))}
              </select>
            </label>

            {isQuote && templates.length > 0 && (
              <label>
                Start from quotation template
                <select value={v.template || ""} onChange={(e) => chooseTemplate(e.target.value)}>
                  <option value="">No template</option>
                  {templates.map((x) => (
                    <option key={x._id || x.name} value={x.name}>{x.name} ({x.validDays || 30} days)</option>
                  ))}
                </select>
              </label>
            )}

            {(isSub || isQuote) && (plans.length ? choose("Plan", "plan", plans.map((x) => ({ value: x.planName || x.name, label: `${x.planName || x.name} · ₹${x.price} / ${x.billingFrequency || "month"}` })), true) : text("Plan", "plan", "text", true))}

            {isSub && (
              <>
                {text("Start date", "startDate", "date", true)}
                {text("Expiry date", "expiryDate", "date")}
                {text("Payment terms (days)", "paymentTerms", "number", false, { min: 0 })}
                {choose("Billing frequency", "billingFrequency", ["Daily", "Weekly", "Monthly", "Yearly"])}
                {text("Minimum quantity", "quantity", "number", true, { min: 1 })}
              </>
            )}

            {isQuote && (
              <>
                {text("Valid for (days)", "validDays", "number", true, { min: 1 })}
                {text("Valid until", "validUntil", "date")}
                {text("Requested start date", "startDate", "date")}
                {text("Subscription expiry date", "expiryDate", "date")}
                {text("Payment terms (days)", "paymentTerms", "number", false, { min: 0 })}
                {text("Seat quantity", "quantity", "number", false, { min: 1 })}
                {choose("Quotation status", "status", ["Draft", "Quotation", "Sent", "Accepted", "Rejected", "Expired"], true)}
              </>
            )}

            {(isSub || isQuote) && text("Amount (₹)", "amount", "number", true, { min: 0, step: "0.01" })}
            {isInvoice && (
              <>
                {text("Invoice date", "invoiceDate", "date", true)}
                {text("Due date", "dueDate", "date", true)}
                {text("Amount before tax (₹)", "amount", "number", true, { min: 0, step: "0.01" })}
              </>
            )}
          </>
        )}

        {isProduct && (
          <>
            {text("Product name", "name", "text", true)}
            {choose("Product type", "type", ["Software", "Service", "Physical", "Other"], true)}
            {text("Sales price (₹)", "salesPrice", "number", true, { min: 0, step: "0.01" })}
            {text("Cost price (₹)", "costPrice", "number", true, { min: 0, step: "0.01" })}
            <label>Notes<textarea value={v.notes || ""} onChange={(e) => set("notes", e.target.value)} rows="3" /></label>
            <label>Variants (one per line: name | price adjustment)<textarea value={variantsText} onChange={(e) => set("variantsText", e.target.value)} rows="3" placeholder="Odoo Connected | 560" /></label>
          </>
        )}

        {isPlan && (
          <>
            {text("Plan name", "planName", "text", true)}
            {choose("Product", "product", products.map((x) => ({ value: x.name, label: x.name })), true)}
            {text("Price (₹)", "price", "number", true, { min: 0, step: "0.01" })}
            {choose("Billing frequency", "billingFrequency", ["Daily", "Weekly", "Monthly", "Yearly"], true)}
            {text("Minimum quantity", "minimumQuantity", "number", true, { min: 1 })}
            {text("Available from", "availableFrom", "date")}
            {text("Available until", "availableUntil", "date")}
            {choose("Plan status", "status", ["Active", "Closed", "Paused"], true)}
            <label className="terms"><input type="checkbox" checked={!!v.autoClose} onChange={(e) => set("autoClose", e.target.checked)} /> Close automatically at end date</label>
            <label className="terms"><input type="checkbox" checked={!!v.allowRenewal} onChange={(e) => set("allowRenewal", e.target.checked)} /> Allow renewal</label>
          </>
        )}

        {isTemplate && (
          <>
            {text("Template name", "name", "text", true)}
            {choose("Default plan", "plan", plans.map((x) => ({ value: x.planName || x.name, label: x.planName || x.name })))}
            {text("Valid for (days)", "validDays", "number", true, { min: 1 })}
            {text("Default amount (₹)", "amount", "number", false, { min: 0, step: "0.01" })}
          </>
        )}

        {(isSub || isQuote || isInvoice || isTemplate || isPlanChange) && (
          <fieldset className="lineitems">
            <legend>Product lines</legend>
            {items.map((line, index) => (
              <div className="lineitem" key={index}>
                <select
                  aria-label="Product and variant"
                  value={line.product ? `${line.product}${line.variant ? `::${line.variant}` : ""}` : ""}
                  onChange={(e) => {
                    const [productName, variantName] = e.target.value.split("::");
                    const p = products.find((x) => x.name === productName);
                    const variant = p?.variants?.find((x) => x.name === variantName);
                    patchItem(index, "product", productName);
                    patchItem(index, "variant", variantName || "");
                    if (p) {
                      patchItem(index, "description", variant ? `${p.name} - ${variant.name}` : p.name);
                      patchItem(index, "unitPrice", Number(p.salesPrice || 0) + Number(variant?.priceDelta || 0));
                    }
                  }}
                >
                  <option value="">Choose product or variant</option>
                  {products.flatMap((x) => [
                    <option key={x._id || x.name} value={x.name}>{x.name}</option>,
                    ...(x.variants || []).map((variant) => (
                      <option key={`${x.name}-${variant.name}`} value={`${x.name}::${variant.name}`}>
                        {x.name} - {variant.name} (+₹{variant.priceDelta || 0})
                      </option>
                    ))
                  ])}
                </select>
                <input aria-label="Description" placeholder="Line description" value={line.description || ""} onChange={(e) => patchItem(index, "description", e.target.value)} />
                <input aria-label="Quantity" type="number" min="1" value={line.quantity || 1} onChange={(e) => patchItem(index, "quantity", Number(e.target.value))} />
                <input aria-label="Unit price" type="number" min="0" step="0.01" value={line.unitPrice ?? 0} onChange={(e) => patchItem(index, "unitPrice", Number(e.target.value))} />
                <button type="button" onClick={() => Items((old) => old.filter((_, i) => i !== index))} aria-label="Remove line">×</button>
              </div>
            ))}
            <button type="button" className="secondary" onClick={() => Items((old) => [...old, { description: "", product: "", quantity: 1, unitPrice: 0, taxRate: 0 }])}>+ Add line</button>
          </fieldset>
        )}

        {isDiscount && (
          <>
            {text("Discount name", "name", "text", true)}
            {choose("Discount type", "type", ["Percentage", "Fixed"], true)}
            {text("Discount value", "value", "number", true, { min: 0, step: "0.01" })}
            {text("Minimum purchase (₹)", "minimumPurchase", "number", false, { min: 0 })}
            {text("Minimum quantity", "minimumQuantity", "number", false, { min: 0 })}
            {text("Starts on", "startDate", "date")}
            {text("Ends on", "endDate", "date")}
            {text("Usage limit", "usageLimit", "number", false, { min: 1 })}
            {choose("Applies to", "scope", ["Subscription", "Product", "All"], true)}
            {choose("Product", "product", [{ value: "", label: "All products" }, ...products.map((x) => ({ value: x.name, label: x.name }))])}
          </>
        )}

        {isTax && (
          <>
            {text("Tax name", "name", "text", true)}
            {text("Tax rate (%)", "rate", "number", true, { min: 0, max: 100, step: "0.01" })}
            {text("Starts on", "startDate", "date")}
            {text("Ends on", "endDate", "date")}
            {choose("Applies to", "scope", ["Subscription", "Product", "All"], true)}
            {v.scope === "Product" && choose("Product", "product", products.map((x) => ({ value: x.name, label: x.name })), true)}
          </>
        )}

        {isPayment && (
          <>
            {choose("Invoice", "invoice", invoices.filter((x) => Number(x.outstandingAmount ?? x.total ?? x.amount ?? 0) > 0).map((x) => ({ value: x._id || x.id, label: `${x.number} - ${x.customer} - ₹${x.outstandingAmount ?? x.amount}` })), true)}
            {text("Amount (₹)", "amount", "number", true, { min: 0.01, step: "0.01" })}
            {choose("Payment method", "paymentMethod", ["UPI", "Card", "Bank transfer", "Cash", "Other"], true)}
            {text("Payment date", "paymentDate", "date", true)}
            <label>Note<textarea value={v.note || ""} onChange={(e) => set("note", e.target.value)} rows="2" /></label>
          </>
        )}

        <footer>
          <button type="button" onClick={close}>Cancel</button>
          <button className="primary">{record ? "Save changes" : "Create"}</button>
        </footer>
      </form>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
