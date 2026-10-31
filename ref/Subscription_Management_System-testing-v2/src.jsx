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

const IconBook = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
    <path d="M6 6h10" />
    <path d="M6 10h10" />
  </svg>
);

const IconFilter = ({ size = 15, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const IconChevronDown = ({ size = 13, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api" });
const fmt = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n) || 0);

const initial = { staff: [], plans: [], quotations: [], payments: [], discounts: [], taxes: [], customers: [], subscriptions: [], invoices: [], products: [], chart: [] };

// Minimized sidebar navigation: 9 clean operational modules
const links = [
  ["Overview", IconDashboard],
  ["Products & Plans", IconPackage],
  ["Quotations", IconFileText],
  ["Subscriptions", IconRepeat],
  ["Invoices & Payments", IconCreditCard],
  ["User Management", IconUsers],
  ["Configuration", IconSettings],
  ["Reports", IconActivity],
  ["User Guide", IconBook]
];

const pageDescriptions = {
  Overview: "Live operational metrics of your active subscriptions, monthly recurring revenue, and cash collections.",
  "Products & Plans": "Catalog of software products, add-on modules, and recurring billing plans.",
  Quotations: "Official proposals sent to clients. When accepted, convert them directly into active subscriptions.",
  Subscriptions: "Active recurring software contracts. Automatically bills customer accounts on their renewal date.",
  "Invoices & Payments": "Recurring bills generated from active subscriptions and verified cash collections ledger.",
  "User Management": "Client accounts with private customer portals and internal staff members.",
  Configuration: "Automated discount tiers, GST tax calculation rules, and test data management.",
  Reports: "Financial revenue reporting, collected cash, and outstanding balances.",
  "User Guide": "Complete step-by-step walkthrough, testing instructions, and role reference for Brightloop."
};

const subtabDescriptions = {
  Products: "Catalog of software products, software editions, and add-on modules.",
  Plans: "Pricing intervals (Monthly, Yearly, Weekly, Daily) and minimum seat limits.",
  Invoices: "Recurring invoices generated from active subscriptions. Shows paid, pending, and overdue balances.",
  Payments: "Payment ledger tracking every rupee received via UPI, Card, Bank Transfer, or Cash.",
  Customers: "Client accounts. Each client gets their own private portal where they only see their own subscriptions and invoices.",
  Staff: "Internal employees. Only the master admin can manage staff accounts.",
  Discounts: "Automated discount rules applied when customers meet seat count or spending thresholds.",
  Taxes: "Automated GST and sales tax calculation rules applied to quotations and billing cycles.",
  "System Reset": "Wipe all transaction records (subscriptions, invoices, quotations, payments) for clean testing."
};

const pageGuides = {
  Quotations: {
    title: "Quotations - Sales Proposals",
    desc: "Proposals sent to clients. Click 'Mark Accepted' then 'Convert to Subscription' to instantly activate their software contract.",
    actionLabel: "View Subscriptions",
    actionTarget: "Subscriptions"
  },
  Subscriptions: {
    title: "Subscriptions - Active Software Contracts",
    desc: "Active subscriptions renew on their Next Invoice Date. Click 'Change Plan' to upgrade/downgrade seats or 'Simulate Monthly Billing Run' on Overview to invoice now.",
    actionLabel: "View Invoices",
    actionTarget: "Invoices & Payments"
  },
  Invoices: {
    title: "Invoices - Recurring Bills",
    desc: "Generated automatically from active subscriptions. Click 'Pay Now' to settle an invoice, or 'Send Invoice' to email it to the client.",
    actionLabel: "View Cash Ledger",
    actionTarget: "Invoices & Payments"
  },
  Payments: {
    title: "Payments - Cash Ledger",
    desc: "All payments collected via UPI, Card, or Bank Transfer. Recorded payments mark invoices as Paid and refresh live MRR/ARR charts.",
    actionLabel: "Back to Overview",
    actionTarget: "Overview"
  },
  Customers: {
    title: "Customers - Client Directory",
    desc: "Client accounts. Each client gets their own private portal where they only see their own subscriptions and invoices.",
    actionLabel: "View Products",
    actionTarget: "Products & Plans"
  },
  Staff: {
    title: "Staff Members - Employee Directory",
    desc: "Internal employees who can create quotations and manage customer subscriptions. Only the Master Admin can manage staff.",
    actionLabel: "View Customers",
    actionTarget: "User Management"
  },
  Products: {
    title: "Products - Software Catalog",
    desc: "Catalog of software modules and add-ons (such as Odoo ERP Sync) offered to customers with base pricing.",
    actionLabel: "View Plans",
    actionTarget: "Products & Plans"
  },
  Plans: {
    title: "Plans - Billing Cadence",
    desc: "Pricing intervals (Monthly, Yearly, Weekly, Daily) and minimum seat limits applied to products.",
    actionLabel: "View Quotations",
    actionTarget: "Quotations"
  },
  Discounts: {
    title: "Discounts - Volume Rules",
    desc: "Automated discount tiers (e.g. 10% off for 10+ seats). Applied automatically to quotation line items.",
    actionLabel: "View Taxes",
    actionTarget: "Configuration"
  },
  Taxes: {
    title: "Taxes - GST & VAT Rules",
    desc: "Automated GST or sales tax rules (e.g. GST 18%). Automatically computed on subtotal after discounts.",
    actionLabel: "Back to Overview",
    actionTarget: "Overview"
  },
  "System Reset": {
    title: "System Reset - Data Wipe Utility",
    desc: "Clear all transactional data (subscriptions, recurring invoices, quotations, and payments) to start fresh tests.",
    actionLabel: "Back to Overview",
    actionTarget: "Overview"
  }
};

function App() {
  const [d, D] = useState(initial);
  const [page, P] = useState("Overview");
  const [subTab, setSubTab] = useState("default");
  const [modal, M] = useState("");
  const [toast, T] = useState("");
  const [q, Q] = useState("");
  const [filter, F] = useState("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const [editing, E] = useState(null);
  const [pageInfo, PageInfo] = useState({});
  const [summary, Summary] = useState(null);
  const [night, N] = useState(() => localStorage.getItem("brightloop_theme") === "night");
  const [showGuide, setShowGuide] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCustomerBanner, setShowCustomerBanner] = useState(true);
  const [payingInvoice, setPayingInvoice] = useState(null);
  const [user, U] = useState(() => {
    try {
      if (!localStorage.getItem("brightloop_token") && !sessionStorage.getItem("brightloop_token")) return null;
      return JSON.parse(localStorage.getItem("brightloop_user") || "null");
    } catch {
      return null;
    }
  });

  React.useEffect(() => {
    if (user?.role === "customer") {
      setShowCustomerBanner(true);
      const timer = setTimeout(() => {
        setShowCustomerBanner(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [user?.email, user?.role]);

  const getSubtabs = (p) => {
    if (p === "Products & Plans") return ["Products", "Plans"];
    if (p === "Invoices & Payments") return ["Invoices", "Payments"];
    if (p === "User Management") return user?.role === "admin" ? ["Customers", "Staff"] : ["Customers"];
    if (p === "Configuration") return ["Discounts", "Taxes", "System Reset"];
    return [];
  };

  const getActiveKey = () => {
    if (page === "Products & Plans") return subTab === "Plans" ? "plans" : "products";
    if (page === "Invoices & Payments") return subTab === "Payments" ? "payments" : "invoices";
    if (page === "User Management") return subTab === "Staff" ? "staff" : "customers";
    if (page === "Configuration") {
      if (subTab === "Taxes") return "taxes";
      if (subTab === "System Reset") return "reset";
      return "discounts";
    }
    if (page === "Quotations") return "quotations";
    if (page === "Subscriptions") return "subscriptions";
    if (page === "Reports") return "subscriptions";
    if (page === "User Guide") return "guide";
    return "subscriptions";
  };

  const k = getActiveKey();

  const changePage = (newPage, targetSub) => {
    P(newPage);
    F("All");
    Q("");
    setFilterOpen(false);
    const available = getSubtabs(newPage);
    if (targetSub && available.includes(targetSub)) {
      setSubTab(targetSub);
    } else {
      setSubTab(available[0] || "default");
    }
  };

  React.useEffect(() => {
    const token = localStorage.getItem("brightloop_token") || sessionStorage.getItem("brightloop_token");
    if (!token) return;
    api.defaults.headers.common.Authorization = "Bearer " + token;
    api.get("/profile").catch((e) => {
      if (e.response?.status === 401) logout();
      else notice(e.response?.data?.error || "Could not verify your session");
    });
    refreshSummary();
    const keys = [
      "customers",
      "subscriptions",
      "invoices",
      "products",
      "payments",
      "plans",
      "quotations",
      ...(user?.role === "admin" ? ["discounts", "taxes", "users"] : [])
    ];
    Promise.all(keys.map((k2) => api.get("/" + k2, { params: { page: 1, limit: 100 } }).catch(() => null))).then((r) => {
      let n = { ...initial }, pages = {};
      const targets = ["customers", "subscriptions", "invoices", "products", "payments", "plans", "quotations", "discounts", "taxes", "staff"];
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
      if (failed) notice(`${failed} workspace section${failed === 1 ? "" : "s"} could not load.`);
    });
  }, [user]);

  React.useEffect(() => {
    if (!user || ["Overview", "Reports", "User Guide"].includes(page) || k === "reset" || k === "guide") return;
    const key = k === "staff" ? "users" : k;
    const timer = setTimeout(() => api.get("/" + key, { params: { page: 1, limit: 100, search: q, status: filter === "All" ? "" : filter } }).then((r) => {
      const target = key === "users" ? "staff" : key;
      D((old) => ({ ...old, [target]: r.data.data }));
      PageInfo((old) => ({ ...old, [target]: r.data }));
    }).catch((e) => notice(e.response?.data?.error || `${page} could not load`)), 250);
    return () => clearTimeout(timer);
  }, [user, page, subTab, q, filter, k]);

  const refreshSummary = async () => {
    try { Summary((await api.get("/dashboard")).data.data); }
    catch (e) { notice(e.response?.data?.error || "Dashboard refresh failed"); }
  };

  const notice = (x) => {
    T(x);
    setTimeout(() => T(""), 2600);
  };

  function logout() {
    localStorage.removeItem("brightloop_token");
    sessionStorage.removeItem("brightloop_token");
    localStorage.removeItem("brightloop_user");
    delete api.defaults.headers.common.Authorization;
    U(null);
    D(initial);
  }

  async function quickSwitchRole(targetRole) {
    const creds = {
      admin: { email: "admin@brightloop.local", password: "Brightloop@2026" },
      staff: { email: "sales@brightloop.com", password: "Brightloop@2026" },
      customer: { email: "contact@acmecorp.com", password: "Brightloop@2026" }
    };
    try {
      const r = await api.post("/auth/login", creds[targetRole]);
      const data = r.data.data;
      localStorage.setItem("brightloop_token", data.token);
      localStorage.setItem("brightloop_user", JSON.stringify(data.user));
      api.defaults.headers.common.Authorization = "Bearer " + data.token;
      U(data.user);
      changePage("Overview");
      notice(`Switched view to ${targetRole.toUpperCase()}: ${data.user.name}`);
    } catch {
      notice("Could not switch role. Start the API server.");
    }
  }

  async function clearAllTransactionData() {
    if (!confirm("Are you sure you want to clear all transaction records (subscriptions, invoices, quotations, payments)? This cannot be undone.")) return;
    try {
      await api.post("/admin/clear-data", {});
      D((old) => ({ ...old, subscriptions: [], invoices: [], quotations: [], payments: [] }));
      refreshSummary();
      notice("All transaction data cleared successfully. System is now fresh for testing.");
    } catch (e) {
      notice(e.response?.data?.error || "Failed to clear transaction data");
    }
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
    const keyMap = {
      "New work item": "workItems",
      "New customer": "customers",
      "New product": "products",
      "New plan": "plans",
      "New quotation": "quotations",
      "New quotation template": "quotationTemplates",
      "New subscription": "subscriptions",
      "New invoice": "invoices",
      "New payment": "payments",
      "New discount": "discounts",
      "New tax": "taxes",
      "New staff": "users"
    };
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
    notice(k2 === "users" ? "Staff account created with password." : k2 === "customers" ? "Customer account & portal created." : "Record created");
  }

  async function convertQuote(item) {
    try {
      const result = (await api.post("/quotations/" + (item._id || item.id) + "/convert")).data.data;
      D((x) => ({ ...x, quotations: x.quotations.map((r) => (r._id || r.id) === (item._id || item.id) ? result.quotation : r), subscriptions: [result.subscription, ...x.subscriptions] }));
      refreshSummary();
      notice("Quotation accepted and converted to live active subscription");
    } catch (e) { notice(e.response?.data?.error || "Accept the quotation before conversion"); }
  }

  function openPlanChange(item) {
    E({ key: "subscriptions", item, action: "changePlan" });
    M("Change subscription plan");
  }

  async function updateStatus(item, status) {
    try {
      const endpoint = k === "staff" ? "/users/" + (item._id || item.id) : k === "quotations" ? "/quotations/" + (item._id || item.id) : k === "invoices" ? "/invoices/" + (item._id || item.id) + "/status" : "/subscriptions/" + (item._id || item.id) + "/status";
      const updated = (await (["staff", "quotations"].includes(k) ? api.patch(endpoint, { status }) : api.post(endpoint, { status }))).data.data;
      D((x) => ({ ...x, [k]: x[k].map((row) => (row._id || row.id) === (item._id || item.id) ? updated : row) }));
      refreshSummary();
      notice("Status updated to " + status);
    } catch (e) { notice(e.response?.data?.error || "Could not update status"); }
  }

  async function payInvoice(item, method = "UPI") {
    try {
      const amt = Number(item.outstandingAmount ?? item.total ?? item.amount ?? 0);
      await api.post("/payments", {
        invoice: item._id || item.id,
        amount: amt,
        paymentMethod: method,
        customer: item.customer || user?.name || "Customer",
        paymentDate: new Date().toISOString()
      });
      notice(`Payment of ${fmt(amt)} recorded successfully via ${method}`);
      setPayingInvoice(null);
      refreshSummary();
      const [i, p] = await Promise.all([
        api.get("/invoices", { params: { page: 1, limit: 100 } }),
        api.get("/payments", { params: { page: 1, limit: 100 } })
      ]);
      D((x) => ({ ...x, invoices: i.data.data, payments: p.data.data }));
    } catch (e) {
      notice(e.response?.data?.error || "Could not process payment");
    }
  }

  let rows = d[k] || [];

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
      notice("Invoice emailed to customer");
    } catch (e) { notice(e.response?.data?.error || "Could not send invoice"); }
  }

  function printInvoice(item) {
    const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[ch] || ch));
    const popup = window.open("", "brightloop-invoice", "width=800,height=900");
    if (!popup) return notice("Allow pop-ups to print this invoice");
    popup.document.write(`<html><head><title>${safe(item.number || "Invoice")}</title><style>body{font:16px 'Poppins',Arial,sans-serif;max-width:760px;margin:48px auto;color:#222}h1{color:#6246d8}table{width:100%;border-collapse:collapse;margin-top:24px}td,th{padding:12px;border-bottom:1px solid #ddd;text-align:left}.total{text-align:right;font-weight:bold;margin-top:28px}</style></head><body><h1>Brightloop</h1><h2>Invoice ${safe(item.number)}</h2><p>Customer: ${safe(item.customer)}</p><p>Invoice date: ${safe(item.invoiceDate || "-")} · Due: ${safe(item.dueDate || "-")}</p><table><tr><th>Description</th><th>Qty</th><th>Unit price</th></tr>${(item.items || []).map((line) => `<tr><td>${safe(line.description || line.product)}</td><td>${safe(line.quantity || 1)}</td><td>${fmt(line.unitPrice)}</td></tr>`).join("")}</table><p class="total">Amount due: ${fmt(item.outstandingAmount ?? item.total ?? item.amount)}</p><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  }

  async function runBilling() {
    try {
      const result = (await api.post("/billing/run")).data.data;
      notice(`${result.created} invoice(s) generated for subscriptions due today`);
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
      notice(k2 === "customers" ? "Customer account deleted and login disabled." : "Record deleted");
    } catch (e) {
      notice(e.response?.data?.error || "Could not delete record");
    }
  }

  let filtered = rows.filter((x) => (filter === "All" || (filter === "Past due" ? ["Past due", "Overdue"].includes(x.status) : x.status === filter)) && JSON.stringify(x).toLowerCase().includes(q.toLowerCase()));
  let chartData = summary?.chart?.length ? summary.chart : Object.values(d.invoices.reduce((acc, x) => {
    let dt = new Date(x.invoiceDate || x.date || Date.now()), key = dt.toLocaleString("en", { month: "short" });
    acc[key] ||= { month: key, revenue: 0 };
    acc[key].revenue += Number(x.paidAmount || 0);
    return acc;
  }, {}));

  let active = d.subscriptions.filter((x) => x.status === "Active");
  let mrr = active.reduce((a, x) => a + Number(x.amount || 0) / (String(x.plan || "").toLowerCase().includes("annual") ? 12 : 1), 0);
  let arr = mrr * 12;
  let collected = d.invoices.reduce((a, x) => a + Number(x.paidAmount || 0), 0);
  let out = d.invoices.reduce((a, x) => a + Number(x.outstandingAmount ?? (x.status === "Paid" ? 0 : x.amount) ?? 0), 0);
  let overdue = d.invoices.filter((x) => x.status === "Overdue").length;

  // Real Dynamic Donut / Pie Chart Logic (Zero Fake Colors)
  const subTotal = d.subscriptions.length;
  const activeCount = d.subscriptions.filter((x) => x.status === "Active").length;
  const confirmedCount = d.subscriptions.filter((x) => ["Confirmed", "Quotation", "Draft"].includes(x.status)).length;
  const dueCount = d.subscriptions.filter((x) => ["Past due", "Overdue"].includes(x.status)).length;
  const closedCount = d.subscriptions.filter((x) => ["Closed", "Canceled", "Paused"].includes(x.status)).length;

  let donutBackground = "#e2e5eb"; // When total is 0, completely neutral empty ring!
  if (subTotal > 0) {
    const p1 = (activeCount / subTotal) * 100;
    const p2 = p1 + (confirmedCount / subTotal) * 100;
    const p3 = p2 + (dueCount / subTotal) * 100;
    donutBackground = `conic-gradient(#7455e8 0% ${p1}%, #38bdf8 ${p1}% ${p2}%, #f59e0b ${p2}% ${p3}%, #94a3b8 ${p3}% 100%)`;
  }

  let metrics = [
    ["Total customers", String(summary?.customers ?? d.customers.length), "Registered client accounts", IconUsers],
    ["Active subscriptions", String(summary?.activeSubscriptions ?? active.length), "Live software contracts", IconRepeat],
    ["Monthly recurring revenue (MRR)", fmt(summary?.mrr ?? mrr), "Predictable monthly revenue", IconCreditCard],
    ["Annual recurring revenue (ARR)", fmt(summary?.arr ?? arr), "Projected annual run-rate", IconCreditCard],
    ["Collected revenue", fmt(summary?.collected ?? collected), "Verified payments received", IconCreditCard],
    ["Outstanding balance", fmt(summary?.outstanding ?? out), "Unpaid invoices awaiting payment", IconActivity],
    ["Overdue invoices", String(summary?.overdue ?? overdue), "Past due bills needing follow-up", IconFileText]
  ];

  if (!user) return <Auth onLogin={(u) => U(u)} />;

  const visibleLinks = links.filter(([n]) => {
    if (user.role === "customer") {
      return ["Overview", "Products & Plans", "Subscriptions", "Invoices & Payments", "User Guide"].includes(n);
    }
    if (user.role === "staff") {
      return ["Overview", "Products & Plans", "Quotations", "Subscriptions", "Invoices & Payments", "User Management", "Reports", "User Guide"].includes(n);
    }
    return true;
  });

  const currentSubtabs = getSubtabs(page);

  const openNewModal = () => {
    if (page === "Products & Plans") M(subTab === "Plans" ? "New plan" : "New product");
    else if (page === "Invoices & Payments") M(subTab === "Payments" ? "New payment" : "New invoice");
    else if (page === "User Management") M(subTab === "Staff" ? "New staff" : "New customer");
    else if (page === "Configuration") {
      if (subTab === "Taxes") M("New tax");
      else if (subTab === "Discounts") M("New discount");
    }
    else if (page === "Quotations") M("New quotation");
    else if (page === "Subscriptions" || page === "Overview") M("New subscription");
  };

  const currentGuide = pageGuides[subTab] || pageGuides[page];

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
            <b>Brightloop Software</b>
          </div>
          <small>Subscription Management</small>
        </div>
        <label>WORKSPACE</label>
        {visibleLinks.map(([n, I]) => (
          <button key={n} className={page === n ? "selected" : ""} onClick={() => changePage(n)}>
            <I size={17} />
            {n}
          </button>
        ))}
        <div className="sidefoot">
          <div className="account account-clickable" onClick={() => setShowProfile(true)} title="Click to view and edit profile">
            <i>{(user.name || user.email || "U").slice(0, 1).toUpperCase()}</i>
            <span>
              <b>{user.name || user.email}</b>
              <small>{user.role === 'admin' ? 'Master Admin' : user.role === 'staff' ? 'Staff Member' : 'Customer Account'}</small>
            </span>
            <button onClick={(e) => { e.stopPropagation(); logout(); }}>Log out</button>
          </div>
        </div>
      </aside>

      <main>
        <header>
          <span>
            Workspace / <b>{page}</b>
            {currentSubtabs.length > 0 && subTab !== "default" && <span> / <b style={{ color: "#7455e8" }}>{subTab}</b></span>}
            <span className="role-pill" style={{ marginLeft: "14px" }}>
              {user.role === "admin" ? "Admin Mode" : user.role === "staff" ? "Staff Mode" : "Customer Portal"}
            </span>
          </span>

          <nav className="mobile-nav">
            <select aria-label="Choose a page" value={page} onChange={(e) => changePage(e.target.value)}>
              {visibleLinks.map(([name]) => <option key={name} value={name}>{name}</option>)}
            </select>
          </nav>

          <div className="headright">
            <button className="guide-btn" onClick={() => setShowGuide(true)} title="Understand how Brightloop works in 2 minutes">
              (?) How it works
            </button>
            <div className="demonav" title="Click to test role view">
              <span style={{ fontSize: "10px", color: "#8b909d", marginRight: "2px" }}>Switch role:</span>
              <button className={user.role === "admin" ? "active" : ""} onClick={() => quickSwitchRole("admin")}>Admin</button>
              <button className={user.role === "staff" ? "active" : ""} onClick={() => quickSwitchRole("staff")}>Staff</button>
              <button className={user.role === "customer" ? "active" : ""} onClick={() => quickSwitchRole("customer")}>Customer</button>
            </div>

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
            <button className="user-avatar-btn" onClick={() => setShowProfile(true)} title="View profile & account details">
              {(user.name || user.email || "U").slice(0, 1).toUpperCase()}
            </button>
            <button className="logouttop" onClick={logout}>Log out</button>
          </div>
        </header>

        <article>
          {user.role === "customer" && showCustomerBanner && (
            <div className="customer-notice">
              <span><b>Customer Self-Service Portal</b>: You are logged in as {user.name} ({user.company || user.email}). Your invoices and subscriptions are strictly private and isolated from other clients.</span>
              <button type="button" className="close-banner-btn" onClick={() => setShowCustomerBanner(false)} title="Dismiss notice">×</button>
            </div>
          )}

          {user.role === "customer" && (
            <div className="customer-hero">
              <div className="customer-hero-info">
                <b>Welcome, {user.name}!</b>
                <p>Customer Account: <b>{user.company || user.name}</b> ({user.email}). View your active software plans, monitor renewals, and settle outstanding invoices securely.</p>
              </div>
              <div className="customer-hero-stats">
                <div className="customer-hero-stat">
                  <small>Active Contract</small>
                  <strong>{d.subscriptions.find((s) => s.status === "Active")?.plan || "Business Software - Monthly"}</strong>
                </div>
                <div className="customer-hero-stat">
                  <small>Outstanding Due</small>
                  <strong>{fmt(out)}</strong>
                </div>
                {d.invoices.some((inv) => ["Draft", "Confirmed", "Sent", "Partial", "Overdue"].includes(inv.status)) && (
                  <button
                    className="primary"
                    style={{ padding: "8px 16px", fontSize: "12px", whiteSpace: "nowrap" }}
                    onClick={() => {
                      const openInv = d.invoices.find((inv) => ["Draft", "Confirmed", "Sent", "Partial", "Overdue"].includes(inv.status));
                      if (openInv) setPayingInvoice(openInv);
                    }}
                  >
                    Pay Invoice ({fmt(out)})
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="title">
            <div>
              <small>{page === "Overview" ? new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date()).toUpperCase() : "BRIGHTLOOP ERP"}</small>
              <h1>{page === "Overview" ? (user.role === "customer" ? "My Customer Portal" : "Good morning, " + (user.name || "there")) : page}</h1>
              <p>{subtabDescriptions[subTab] || pageDescriptions[page] || "Manage your subscription operations."}</p>
            </div>
            {user.role !== "customer" && page !== "User Guide" && page !== "Reports" && subTab !== "System Reset" && (
              <button className="primary" onClick={openNewModal}>
                <IconPlus size={16} />
                {page === "Products & Plans" ? (subTab === "Plans" ? "New plan" : "New product") :
                 page === "Invoices & Payments" ? (subTab === "Payments" ? "Record payment" : "New invoice") :
                 page === "User Management" ? (subTab === "Staff" ? "New staff member" : "New customer") :
                 page === "Configuration" ? (subTab === "Taxes" ? "New tax rule" : "New discount tier") :
                 page === "Quotations" ? "New quotation" : "New subscription"}
              </button>
            )}
          </div>

          {page === "Overview" && user.role !== "customer" && (
            <div className="flow-banner">
              <div className="flow-step" style={{ cursor: "pointer" }} onClick={() => changePage("Products & Plans", "Products")}>
                <span className="flow-num">1</span>
                <div><b>1. Products & Plans</b><small>What Brightloop sells</small></div>
              </div>
              <span className="flow-arrow">-&gt;</span>
              <div className="flow-step" style={{ cursor: "pointer" }} onClick={() => changePage("Quotations")}>
                <span className="flow-num">2</span>
                <div><b>2. Quotation</b><small>Offer sent to lead</small></div>
              </div>
              <span className="flow-arrow">-&gt;</span>
              <div className="flow-step" style={{ cursor: "pointer" }} onClick={() => changePage("Subscriptions")}>
                <span className="flow-num">3</span>
                <div><b>3. Subscription</b><small>Active recurring plan</small></div>
              </div>
              <span className="flow-arrow">-&gt;</span>
              <div className="flow-step" style={{ cursor: "pointer" }} onClick={() => changePage("Invoices & Payments", "Invoices")}>
                <span className="flow-num">4</span>
                <div><b>4. Auto Invoicing</b><small>Monthly bill generated</small></div>
              </div>
              <span className="flow-arrow">-&gt;</span>
              <div className="flow-step" style={{ cursor: "pointer" }} onClick={() => changePage("Invoices & Payments", "Payments")}>
                <span className="flow-num">5</span>
                <div><b>5. Payment</b><small>Reconciled & paid</small></div>
              </div>
            </div>
          )}

          {page === "Overview" && user.role !== "customer" && (
            <div className="demo-flow-strip">
              <span>Interactive 60-Second Demo Flow:</span>
              <div className="demo-flow-buttons">
                <button onClick={() => changePage("Quotations")}>1. View Quotations</button>
                <button onClick={() => {
                  const acceptedQuote = d.quotations.find((q) => q.status === "Accepted");
                  if (acceptedQuote) {
                    convertQuote(acceptedQuote);
                  } else {
                    changePage("Quotations");
                    notice("Look for an Accepted quotation to convert, or click Mark Accepted on a Draft quote");
                  }
                }}>2. Convert Quote to Subscription</button>
                <button onClick={runBilling}>3. Run Monthly Billing Run</button>
                <button onClick={() => changePage("Invoices & Payments", "Invoices")}>4. Settle Invoice & Update Revenue</button>
              </div>
            </div>
          )}

          {page === "User Guide" ? (
            <GuidePanel setPage={changePage} quickSwitchRole={quickSwitchRole} user={user} runBilling={runBilling} convertQuote={convertQuote} quotations={d.quotations} invoices={d.invoices} notice={notice} />
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
                      <IconArrowUpRight size={13} /> {x[2]}
                    </p>
                  </section>
                ))}
              </div>

              <div className="grid">
                <section className="panel">
                  <div className="panelhead">
                    <div>
                      <b>Revenue over time</b>
                      <small>Historical collections from subscriptions</small>
                    </div>
                    <div className="panelactions">
                      {user.role === "admin" && <button onClick={runBilling}>Simulate monthly billing run</button>}
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
                  <small>Live active and lifecycle breakdown</small>
                  <div className="donut" style={{ background: donutBackground }}>
                    <b>{subTotal}</b>
                  </div>
                  {[
                    { label: "Active", count: activeCount, colorClass: "" },
                    { label: "Confirmed / Draft", count: confirmedCount, colorClass: "blue" },
                    { label: "Past due / Overdue", count: dueCount, colorClass: "orange" },
                    { label: "Closed / Paused", count: closedCount, colorClass: "gray" }
                  ].map((item) => {
                    let pct = subTotal ? ((item.count * 100) / subTotal).toFixed(1) : "0.0";
                    return (
                      <div className={"legend " + item.colorClass} key={item.label}>
                        <span className="legend-dot" /> {item.label}
                        <span>{item.count} ({pct}%)</span>
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
                      <small>Latest accounts created and renewed</small>
                    </div>
                    <a onClick={() => changePage("Subscriptions")}>View all subscriptions</a>
                  </div>
                  <Table rows={d.subscriptions} />
                </section>

                <section className="panel">
                  <b>Upcoming renewals</b>
                  <small>Next 30 days of subscription cycles</small>
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
              {currentSubtabs.length > 0 && (
                <div className="subtab-bar">
                  {currentSubtabs.map((tab) => (
                    <button
                      key={tab}
                      className={`subtab-btn ${subTab === tab ? "active" : ""}`}
                      onClick={() => { setSubTab(tab); F("All"); Q(""); setFilterOpen(false); }}
                    >
                      {tab}
                      <span className="subtab-count">
                        {tab === "Products" ? d.products.length :
                         tab === "Plans" ? d.plans.length :
                         tab === "Invoices" ? d.invoices.length :
                         tab === "Payments" ? d.payments.length :
                         tab === "Customers" ? d.customers.length :
                         tab === "Staff" ? d.staff.length :
                         tab === "Discounts" ? d.discounts.length :
                         tab === "Taxes" ? d.taxes.length : "0"}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {currentGuide && (
                <div className="page-guide">
                  <div className="page-guide-content">
                    <b>{currentGuide.title}</b>
                    <p>{currentGuide.desc}</p>
                  </div>
                  {currentGuide.actionTarget && (
                    <div className="page-guide-action">
                      <button onClick={() => changePage(currentGuide.actionTarget)}>{currentGuide.actionLabel}</button>
                    </div>
                  )}
                </div>
              )}

              {page === "User Management" && subTab === "Customers" && (
                <div className="customer-notice">
                  <div>
                    <b>How Customers Are Created & Access Brightloop:</b>
                    <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#5a6275" }}>
                      Adding a customer creates their client record and immediately provisions their private Customer Portal account with login credentials: their email + default password <code>Brightloop@2026</code>. Customers can also self-register on the sign-in screen.
                    </p>
                  </div>
                </div>
              )}

              {page === "User Management" && subTab === "Staff" && (
                <div className="customer-notice">
                  <div>
                    <b>How Staff Accounts Are Created:</b>
                    <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#5a6275" }}>
                      Staff creation is strictly controlled by the Master Admin. Enter the staff member's name, email, department, and define their initial login password. Staff can sign in immediately to prepare quotations, convert sales proposals into subscriptions, and handle recurring invoices.
                    </p>
                  </div>
                </div>
              )}

              {page === "Configuration" && subTab === "System Reset" ? (
                <div className="danger-card">
                  <h4>Clear All Transaction Data</h4>
                  <p>
                    Wipe all active and past subscriptions, recurring invoices, sales quotations, and payment records to test clean starting flows from scratch. Client customer profiles, products, plans, taxes, discounts, and staff accounts will remain safe.
                  </p>
                  <button className="danger-btn" onClick={clearAllTransactionData}>
                    Wipe All Transaction Records
                  </button>
                </div>
              ) : (
                <>
                  <div className="filter-bar">
                    <div className="filter-dropdown-wrap">
                      <button
                        type="button"
                        className={`filter-btn ${filter !== "All" ? "filter-active" : ""}`}
                        onClick={() => setFilterOpen(!filterOpen)}
                      >
                        <IconFilter size={15} />
                        <span>Status: <b>{filter}</b></span>
                        <IconChevronDown size={13} />
                      </button>
                      {filterOpen && (
                        <div className="filter-menu">
                          {(
                            k === "invoices" ? ["All", "Draft", "Confirmed", "Sent", "Partial", "Paid", "Overdue", "Cancelled"] :
                            k === "subscriptions" ? ["All", "Draft", "Quotation", "Confirmed", "Active", "Paused", "Closed"] :
                            k === "quotations" ? ["All", "Draft", "Sent", "Accepted", "Rejected", "Expired", "Converted"] :
                            ["All", "Active", "Past due", "Closed"]
                          ).map((st) => (
                            <button
                              key={st}
                              type="button"
                              className={filter === st ? "selected" : ""}
                              onClick={() => { F(st); setFilterOpen(false); }}
                            >
                              <span>{st}</span>
                              {filter === st && <IconCheck size={12} />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {filter !== "All" && (
                      <div className="filter-chip">
                        Filtered by: <b>{filter}</b>
                        <button type="button" onClick={() => F("All")} title="Reset filter">×</button>
                      </div>
                    )}

                    <button
                      className="export"
                      style={{ marginLeft: "auto" }}
                      onClick={() => {
                        const csv = [Object.keys(filtered[0] || {}).join(","), ...filtered.map((r) => Object.values(r).map((v) => '"' + String(v ?? "").replaceAll('"', '""') + '"').join(","))].join("\n");
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                        a.download = (subTab !== "default" ? subTab.toLowerCase() : page.toLowerCase()) + ".csv";
                        a.click();
                        URL.revokeObjectURL(a.href);
                      }}
                    >
                      Export CSV
                    </button>
                  </div>

                  {filtered.length === 0 ? (
                    <div className="table-empty">
                      <p>No records found for "{filter}".</p>
                      {user.role !== "customer" && <small>Use the button above to add a new record to this section.</small>}
                    </div>
                  ) : (
                    <Table
                      rows={filtered}
                      onDelete={user.role === "customer" ? null : (row) => remove(k, row)}
                      onConvert={k === "quotations" ? (row) => convertQuote(row) : null}
                      onStatusChange={(k === "staff" && user.role === "admin") || k === "subscriptions" || k === "quotations" || (k === "invoices" && user.role !== "customer") ? updateStatus : null}
                      onChangePlan={user.role === "customer" && k === "subscriptions" ? openPlanChange : null}
                      onSend={k === "invoices" && user.role !== "customer" ? sendInvoice : null}
                      onPrint={k === "invoices" ? printInvoice : null}
                      onPay={k === "invoices" ? (row) => setPayingInvoice(row) : null}
                      onEdit={user.role === "customer" ? null : (row) => {
                        E({ key: k, item: row });
                        M(
                          k === "staff" ? "New staff" :
                          k === "customers" ? "New customer" :
                          k === "products" ? "New product" :
                          k === "plans" ? "New plan" :
                          k === "quotations" ? "New quotation" :
                          k === "subscriptions" ? "New subscription" :
                          k === "invoices" ? "New invoice" :
                          k === "payments" ? "New payment" :
                          k === "discounts" ? "New discount" :
                          "New tax"
                        );
                      }}
                    />
                  )}

                  {pageInfo[k]?.page < pageInfo[k]?.totalPages && (
                    <div className="pagination">
                      <span>Showing {rows.length} of {pageInfo[k]?.total} records</span>
                      <button className="secondary" onClick={loadMore}>Load more</button>
                    </div>
                  )}
                </>
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

      {showProfile && (
        <div className="backdrop" onClick={() => setShowProfile(false)}>
          <div className="guide-modal-box" style={{ width: "min(560px, 94vw)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h2 style={{ margin: 0 }}>My Profile & Settings</h2>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6b7282" }}>
                  {user.role === "admin" ? "Master Admin Account" : user.role === "staff" ? "Staff Member Account" : "Customer Portal Account"}
                </p>
              </div>
              <button className="secondary" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => setShowProfile(false)}>Close</button>
            </div>
            <ProfilePanel user={user} notify={notice} onClose={() => setShowProfile(false)} />
          </div>
        </div>
      )}

      {showGuide && (
        <div className="backdrop" onClick={() => setShowGuide(false)}>
          <div className="guide-modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
              <div>
                <h2>How Brightloop Works</h2>
                <p style={{ margin: 0 }}>A complete subscription lifecycle and automated recurring billing system</p>
              </div>
              <button className="secondary" style={{ padding: "4px 8px", fontSize: "12px" }} onClick={() => setShowGuide(false)}>Close</button>
            </div>

            <div className="guide-grid" style={{ marginTop: "16px" }}>
              <div className="guide-card">
                <div className="guide-card-head">
                  <span className="guide-card-num">1</span>
                  <b>Products & Plans</b>
                </div>
                <p>What the company sells (e.g. Business Software) and billing cadence (Monthly ₹1,000, Yearly ₹10,000) with seat quantities.</p>
              </div>

              <div className="guide-card">
                <div className="guide-card-head">
                  <span className="guide-card-num">2</span>
                  <b>Quotations</b>
                </div>
                <p>Official sales proposals sent to clients with GST tax and volume discounts calculated automatically. Client reviews and accepts.</p>
              </div>

              <div className="guide-card">
                <div className="guide-card-head">
                  <span className="guide-card-num">3</span>
                  <b>Active Subscriptions</b>
                </div>
                <p>Accepted quotations convert to recurring contracts. The system tracks start dates, renewal cadences, and next invoice dates.</p>
              </div>

              <div className="guide-card">
                <div className="guide-card-head">
                  <span className="guide-card-num">4</span>
                  <b>Automated Invoicing</b>
                </div>
                <p>On each renewal date (or when you click 'Simulate Monthly Billing Run'), the engine automatically generates recurring invoices.</p>
              </div>

              <div className="guide-card" style={{ gridColumn: "1 / -1" }}>
                <div className="guide-card-head">
                  <span className="guide-card-num">5</span>
                  <b>Payments & Live Revenue Tracking</b>
                </div>
                <p>Clients pay invoices online via Card or UPI. Balances update to 'Paid' and live MRR, ARR, and cash metrics refresh automatically.</p>
              </div>
            </div>

            <div className="guide-roles">
              <b>3 User Roles & Data Privacy:</b>
              <ul>
                <li><b>Admin (Master Owner):</b> Full control over products, plans, taxes, discounts, staff team, and financial reports.</li>
                <li><b>Staff (Sales & Operations):</b> Creates customer proposals, converts quotations, and handles invoices.</li>
                <li><b>Customer (Client Portal):</b> Strictly isolated. Customer A can never see Customer B's subscriptions or invoices.</li>
              </ul>
            </div>

            <div className="guide-modal-actions">
              <button
                className="secondary"
                onClick={() => {
                  setShowGuide(false);
                  quickSwitchRole("customer");
                }}
              >
                Test Customer Portal
              </button>
              <button
                className="primary"
                onClick={() => {
                  setShowGuide(false);
                  changePage("Quotations");
                  notice("Welcome to Quotations! Review Acme Corp's quote or create a new one.");
                }}
              >
                Start Exploring
              </button>
            </div>
          </div>
        </div>
      )}

      {payingInvoice && (
        <div className="backdrop" onClick={() => setPayingInvoice(null)}>
          <div className="guide-modal-box" style={{ width: "min(460px, 94vw)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h2 style={{ margin: 0 }}>Pay Invoice {payingInvoice.number}</h2>
              <button className="secondary" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => setPayingInvoice(null)}>Close</button>
            </div>

            <p style={{ margin: "0 0 16px" }}>
              Customer: <b>{payingInvoice.customer}</b><br />
              Due Amount: <b style={{ fontSize: "16px", color: "#6748d9" }}>{fmt(payingInvoice.outstandingAmount ?? payingInvoice.total ?? payingInvoice.amount)}</b>
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target;
              const method = form.elements.namedItem("method").value;
              payInvoice(payingInvoice, method);
            }}>
              <label style={{ display: "block", marginBottom: "14px", fontSize: "12px", fontWeight: 600 }}>
                Payment Method:
                <select name="method" style={{ width: "100%", marginTop: "6px", height: "36px", borderRadius: "6px", border: "1px solid #d3d7e2", padding: "0 8px", font: "inherit" }}>
                  <option value="UPI">UPI / Google Pay / PhonePe</option>
                  <option value="Card">Credit or Debit Card</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT / RTGS)</option>
                  <option value="Cash">Direct Cash Settlement</option>
                </select>
              </label>

              <div style={{ background: "#f8f9fc", border: "1px solid #eaecf2", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "11px", color: "#6b7282" }}>
                This payment will be verified and recorded in the Brightloop ledger. The invoice will be marked as <b>Paid</b> immediately.
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" className="secondary" onClick={() => setPayingInvoice(null)}>Cancel</button>
                <button type="submit" className="primary">Confirm Payment of {fmt(payingInvoice.outstandingAmount ?? payingInvoice.total ?? payingInvoice.amount)}</button>
              </div>
            </form>
          </div>
        </div>
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

function GuidePanel({ setPage, quickSwitchRole, user, runBilling, convertQuote, quotations, notice }) {
  return (
    <div className="guide-page">
      <section className="guide-section">
        <h3>How to Use Brightloop Subscription Management System</h3>
        <p>
          Brightloop automates recurring billing for software businesses. Instead of manually maintaining customer renewals in spreadsheets, Brightloop handles the complete lifecycle from sales proposal to subscription, automated invoicing, payment collection, and revenue analytics.
        </p>

        <div className="demo-flow-strip" style={{ margin: "16px 0 0" }}>
          <span>Interactive 60-Second Demo: Click each step below to test:</span>
          <div className="demo-flow-buttons">
            <button onClick={() => {
              setPage("Quotations");
              notice("Step 1: Check Acme Corp's quotation. If Draft, click 'Mark Accepted'. If Accepted, click 'Convert to Subscription'.");
            }}>
              1. View Quotations
            </button>
            <button onClick={() => {
              const acceptedQuote = quotations.find((q) => q.status === "Accepted");
              if (acceptedQuote) {
                convertQuote(acceptedQuote);
              } else {
                setPage("Quotations");
                notice("Please click 'Mark Accepted' on a quotation first, then convert it.");
              }
            }}>
              2. Convert Accepted Quote
            </button>
            <button onClick={runBilling}>
              3. Simulate Monthly Billing Run
            </button>
            <button onClick={() => {
              setPage("Invoices & Payments", "Invoices");
              notice("Step 4: Click 'Pay Now' on an open invoice to settle it via UPI or Card.");
            }}>
              4. Pay Recurring Invoice
            </button>
          </div>
        </div>
      </section>

      <section className="guide-section">
        <h3>Role Based Workflows</h3>
        <p>
          Brightloop enforces strict Role-Based Access Control (RBAC) across three distinct user roles:
        </p>
        <div className="guide-role-grid">
          <div className="guide-role-box">
            <b>1. Admin (Master Owner)</b>
            <p>
              Full operational and financial control. Configures products, plans, tax rules, volume discount tiers, and manages the staff team. Only the admin can add staff.
            </p>
            <button onClick={() => quickSwitchRole("admin")}>Switch to Admin View</button>
          </div>

          <div className="guide-role-box">
            <b>2. Staff (Sales & Operations)</b>
            <p>
              Handles daily sales: registers customer accounts, creates and sends quotations, converts accepted quotes into live subscriptions, and follows up on unpaid invoices.
            </p>
            <button onClick={() => quickSwitchRole("staff")}>Switch to Staff View</button>
          </div>

          <div className="guide-role-box">
            <b>3. Customer (Client Portal)</b>
            <p>
              Strictly private self-service portal. Customer A only ever sees their own subscriptions, invoices, and payment receipts. Can pay invoices and upgrade seat plans.
            </p>
            <button onClick={() => quickSwitchRole("customer")}>Switch to Customer Portal</button>
          </div>
        </div>
      </section>

      <section className="guide-section">
        <h3>Step by Step Lifecycle Walkthrough</h3>
        <div className="guide-steps-list">
          <div className="guide-step-row">
            <span className="guide-step-badge">1</span>
            <div className="guide-step-body">
              <b>Products & Pricing Plans</b>
              <p>
                Products are what the company sells (e.g., Business Software). Plans define the recurring billing frequency (Daily, Weekly, Monthly, Yearly) and price per seat.
              </p>
              <button onClick={() => setPage("Products & Plans", "Products")}>Open Products & Plans</button>
            </div>
          </div>

          <div className="guide-step-row">
            <span className="guide-step-badge">2</span>
            <div className="guide-step-body">
              <b>Sales Quotations</b>
              <p>
                Staff creates a proposal for a customer (e.g. 10 seats of Business Software). Applicable taxes (e.g., GST 18%) and volume discounts are calculated automatically. The quote moves: Draft -&gt; Sent -&gt; Accepted.
              </p>
              <button onClick={() => setPage("Quotations")}>Open Quotations</button>
            </div>
          </div>

          <div className="guide-step-row">
            <span className="guide-step-badge">3</span>
            <div className="guide-step-body">
              <b>Active Subscriptions</b>
              <p>
                Once a quotation is accepted, clicking "Convert to Subscription" creates an active recurring contract. The system tracks the start date, renewal cadence, seat count, and next invoice date. Subscriptions can be paused, resumed, or updated with "Change Plan".
              </p>
              <button onClick={() => setPage("Subscriptions")}>Open Subscriptions</button>
            </div>
          </div>

          <div className="guide-step-row">
            <span className="guide-step-badge">4</span>
            <div className="guide-step-body">
              <b>Automated Recurring Invoices</b>
              <p>
                When renewal day arrives, Brightloop automatically generates invoices. In testing, clicking "Simulate monthly billing run" immediately generates recurring invoices for all subscriptions due today.
              </p>
              <button onClick={() => setPage("Invoices & Payments", "Invoices")}>Open Invoices</button>
            </div>
          </div>

          <div className="guide-step-row">
            <span className="guide-step-badge">5</span>
            <div className="guide-step-body">
              <b>Payment Collection & Live Revenue Tracking</b>
              <p>
                Customers pay invoices using UPI, Credit Card, or Bank Transfer via the "Pay Now" button. Once paid, the invoice status changes to "Paid", outstanding balance decreases, and the Overview dashboard immediately updates Monthly Recurring Revenue (MRR) and cash collections.
              </p>
              <button onClick={() => setPage("Overview")}>View Revenue Dashboard</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfilePanel({ user, notify, onClose }) {
  const [v, V] = useState({ name: user?.name || "", phone: "", company: "" });
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
      notify("Profile saved successfully");
      if (onClose) onClose();
    } catch (x) {
      notify(x.response?.data?.error || "Unable to save profile");
    } finally {
      B(false);
    }
  }

  return (
    <div className="profilepanel">
      <p style={{ margin: "0 0 16px", color: "#6b7282", fontSize: "12px" }}>Update your contact information and company details.</p>
      <form onSubmit={save} style={{ display: "grid", gap: "12px" }}>
        <label>Full name<input required value={v.name || ""} onChange={(e) => V({ ...v, name: e.target.value })} /></label>
        <label>Email address<input disabled value={user?.email || ""} style={{ background: "#f5f6f9", color: "#777" }} /></label>
        <label>Phone number<input value={v.phone || ""} placeholder="+91 98765 43210" onChange={(e) => V({ ...v, phone: e.target.value })} /></label>
        <label>Company name<input value={v.company || ""} placeholder="Acme Technologies" onChange={(e) => V({ ...v, company: e.target.value })} /></label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
          {onClose && <button type="button" className="secondary" onClick={onClose}>Cancel</button>}
          <button className="primary" disabled={busy}>{busy ? "Saving..." : "Save changes"}</button>
        </div>
      </form>
    </div>
  );
}

function Auth({ onLogin }) {
  const resetToken = new URLSearchParams(location.search).get("resetToken");
  const [mode, M] = useState(resetToken ? "reset" : "login");
  const [show, S] = useState(false);
  const [busy, B] = useState(false);
  const [error, E] = useState("");
  const [resetUrl, R] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passInput, setPassInput] = useState("");

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
              <b>Choose a Persona to Test (1-Click Login):</b>
              <small style={{ color: "#747988", display: "block", margin: "4px 0 8px" }}>
                Admin (Full control) · Staff (Sales & Operations) · Customer (Acme Corp Portal)
              </small>
              <div style={{ display: "flex", gap: "6px" }}>
                <button type="button" className="secondary" style={{ padding: "5px 9px", fontSize: "11px", flex: 1 }} onClick={() => setDemo("admin@brightloop.local", "Brightloop@2026")}>Admin</button>
                <button type="button" className="secondary" style={{ padding: "5px 9px", fontSize: "11px", flex: 1 }} onClick={() => setDemo("sales@brightloop.com", "Brightloop@2026")}>Staff</button>
                <button type="button" className="secondary" style={{ padding: "5px 9px", fontSize: "11px", flex: 1 }} onClick={() => setDemo("contact@acmecorp.com", "Brightloop@2026")}>Customer</button>
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
                <input name="password" type={show ? "text" : "password"} required minLength={8} placeholder="Enter your password" value={passInput} onChange={(e) => setPassInput(e.target.value)} />
                <button type="button" onClick={() => S(!show)}>{show ? "Hide" : "Show"}</button>
              </div>
            </label>
          )}

          {mode === "reset" && (
            <label>
              New password
              <input name="password" type={show ? "text" : "password"} required minLength={8} placeholder="Choose a strong password" />
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

function Table({ rows, onDelete, onEdit, onConvert, onStatusChange, onSend, onPrint, onChangePlan, onPay }) {
  const nextStatuses = (row) => {
    if (onConvert) {
      if (row.status === "Draft") return ["Sent", "Accepted"];
      if (row.status === "Sent") return ["Accepted", "Declined"];
      return [];
    }
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
            {(onEdit || onDelete || onConvert || onStatusChange || onSend || onPrint || onChangePlan || onPay) && <th>ACTIONS</th>}
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
              {(onEdit || onDelete || onConvert || onStatusChange || onSend || onPrint || onChangePlan || onPay) && (
                <td className="rowactions">
                  {onConvert && x.status === "Accepted" && (
                    <button className="edit-row" style={{ background: "#10b981", color: "#fff", borderColor: "#10b981", fontWeight: 600 }} onClick={() => onConvert(x)} title="Convert quotation to active subscription">
                      Convert to Subscription
                    </button>
                  )}
                  {onChangePlan && ["Active", "Paused"].includes(x.status) && (
                    <button className="edit-row" onClick={() => onChangePlan(x)}>
                      Change Plan
                    </button>
                  )}
                  {onStatusChange && nextStatuses(x).map((status) => (
                    <button key={status} className="edit-row" onClick={() => onStatusChange(x, status)}>
                      {status === "Closed" ? "Cancel" : status === "Paused" ? "Pause" : status === "Active" ? "Activate" : status === "Accepted" ? "Mark Accepted" : status}
                    </button>
                  ))}
                  {onPay && ["Confirmed", "Sent", "Partial", "Overdue", "Draft"].includes(x.status) && (
                    <button className="edit-row" style={{ background: "#7455e8", color: "#fff", borderColor: "#7455e8", fontWeight: 600 }} onClick={() => onPay(x)}>
                      Pay Now
                    </button>
                  )}
                  {onSend && ["Confirmed", "Sent", "Partial", "Overdue"].includes(x.status) && (
                    <button className="edit-row" onClick={() => onSend(x)}>
                      Send Invoice
                    </button>
                  )}
                  {onPrint && (
                    <button className="edit-row" onClick={() => onPrint(x)}>
                      Print / PDF
                    </button>
                  )}
                  {onEdit && (
                    <button className="edit-row" onClick={() => onEdit(x)}>
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button className="delete-row" onClick={() => onDelete(x)}>
                      Delete
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Form({ kind, record, close, submit, customers = [], staff = [], invoices = [], plans = [], products = [] }) {
  const [v, V] = useState(() => ({ status: kind === "New quotation" || kind === "New subscription" ? "Draft" : "Active", ...(record || {}) }));
  const [items, Items] = useState(() => record?.items?.length ? record.items : [{ description: "", product: "", quantity: 1, unitPrice: 0, taxRate: 0 }]);
  const [showAdvancedDiscount, setShowAdvancedDiscount] = useState(false);
  const [variantsList, setVariantsList] = useState(() => {
    if (Array.isArray(record?.variants) && record.variants.length > 0) return record.variants;
    return [{ name: "Odoo ERP Connector", type: "Add-on Module", priceDelta: 560 }];
  });

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
  const isSub = kind === "New subscription";
  const isQuote = kind === "New quotation";
  const isInvoice = kind === "New invoice";

  const set = (key, value) => V((old) => ({ ...old, [key]: value }));
  const text = (label, key, type = "text", required = false, props = {}, helperText) => (
    <label style={{ display: "grid", gap: "5px", margin: "10px 0", fontSize: "11px", fontWeight: 600 }}>
      {label}
      <input type={type} required={required} value={v[key] ?? ""} onChange={(e) => set(key, type === "number" ? Number(e.target.value) : e.target.value)} {...props} style={{ width: "100%", boxSizing: "border-box" }} />
      {helperText && <span className="form-helper">{helperText}</span>}
    </label>
  );

  const choose = (label, key, values, required = false) => (
    <label style={{ display: "grid", gap: "5px", margin: "10px 0", fontSize: "11px", fontWeight: 600 }}>
      {label}
      <select required={required} value={v[key] ?? ""} onChange={(e) => set(key, e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
        <option value="">Select {label.toLowerCase()}</option>
        {values.map((x) => (
          <option key={x.value ?? x} value={x.value ?? x}>{x.label ?? x}</option>
        ))}
      </select>
    </label>
  );

  const patchItem = (index, key, value) => Items((old) => old.map((line, i) => i === index ? { ...line, [key]: value } : line));

  const updateVariant = (index, key, value) => {
    setVariantsList((old) => old.map((item, i) => i === index ? { ...item, [key]: value } : item));
  };

  const removeVariant = (index) => {
    setVariantsList((old) => old.filter((_, i) => i !== index));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const formItems = items.map((line, index) => (isSub || isQuote || isPlanChange) && index === 0 ? { ...line, quantity: Number(v.quantity || line.quantity || 1) } : line);
    const out = { ...v, items: formItems };
    if (isInvoice || isSub || isQuote) {
      out.amount = formItems.filter((line) => line.product || line.description).reduce((sum, line) => sum + Number(line.quantity || 1) * Number(line.unitPrice || 0), 0) || Number(v.amount || 0);
    }
    if (isProduct) {
      out.variants = variantsList.filter((x) => x.name && x.name.trim()).map((x) => ({
        name: x.name.trim(),
        type: x.type || "Add-on Module",
        priceDelta: Number(x.priceDelta || 0)
      }));
    }
    submit(out);
  };

  const salesPrice = Number(v.salesPrice || 0);
  const costPrice = Number(v.costPrice || 0);
  const grossMargin = salesPrice - costPrice;
  const marginPct = salesPrice > 0 ? ((grossMargin / salesPrice) * 100).toFixed(1) : "0.0";

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
            <label>Description<textarea value={v.description || ""} onChange={(e) => set("description", e.target.value)} maxLength={2000} rows={3} /></label>
          </>
        )}

        {isCustomer && (
          <>
            {text("Client Name", "name", "text", true, {}, "Contact person or representative name.")}
            {text("Client Email", "email", "email", true, {}, "Will be used for customer portal sign-in.")}
            {text("Company / Organization", "company", "text", false, {}, "Legal company name.")}
            {text("Phone Number", "phone", "tel", false, { placeholder: "+91 98765 43210" })}
            <div className="customer-notice" style={{ marginTop: "10px" }}>
              <span><b>Auto-Provisioning:</b> A private Customer Portal account will be automatically created with password <code>Brightloop@2026</code>. The customer can log in to view their private subscriptions and settle invoices.</span>
            </div>
          </>
        )}

        {isStaff && (
          <>
            {text("Staff Member Name", "name", "text", true)}
            {text("Staff Email", "email", "email", true, {}, "Internal company email.")}
            {choose("Department / Role", "department", ["Sales Representative", "Operations Manager", "Finance & Billing", "Customer Support"], true)}
            {text("Initial Password", "password", "text", true, { minLength: 8, placeholder: "Brightloop@2026" }, "Staff member can use this password to log in immediately.")}
            <div className="customer-notice" style={{ marginTop: "10px" }}>
              <span><b>Staff Access:</b> Staff can create quotations, convert sales proposals into active subscriptions, and view invoices without access to master configuration.</span>
            </div>
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
            <div className="software-notice">
              <b>Software Licensing Notice:</b> Unlike physical inventory with limited warehouse stock (e.g. 100 boxes), software is intangible with unlimited digital capacity. Inventory is measured by contracted user seats (e.g. 10 seats, 50 seats) specified on each customer's subscription.
            </div>

            {text("Product name", "name", "text", true, { placeholder: "e.g. Brightloop ERP" })}
            {choose("Product type", "type", ["Software", "Service", "Physical", "Other"], true)}
            {text("Sales Price (₹)", "salesPrice", "number", true, { min: 0, step: "0.01" }, "Customer-facing selling price charged per seat or license on quotations and invoices.")}
            {text("Cost Price (₹)", "costPrice", "number", true, { min: 0, step: "0.01" }, "Company's internal direct cost per seat (hosting, compute, API fees) to compute gross profit margin.")}

            <div className="margin-box">
              <div>
                <b>Gross Profit Margin per Seat:</b>
                <div style={{ fontSize: "11px", color: grossMargin >= 0 ? "#15803d" : "#b91c1c" }}>
                  {grossMargin >= 0 ? `+${fmt(grossMargin)} profit per seat` : `-${fmt(Math.abs(grossMargin))} loss per seat`}
                </div>
              </div>
              <span>{marginPct}% Margin</span>
            </div>

            <div className="variant-builder">
              <div className="variant-builder-head">
                <b>Software Editions & Optional Add-ons</b>
                <small style={{ color: "#717786" }}>E.g. Odoo ERP Sync (+₹560), Enterprise SLA</small>
              </div>
              {variantsList.map((variant, idx) => (
                <div className="variant-builder-row" key={idx}>
                  <input
                    placeholder="Variant name (e.g. Odoo Connector)"
                    value={variant.name || ""}
                    onChange={(e) => updateVariant(idx, "name", e.target.value)}
                  />
                  <select value={variant.type || "Add-on Module"} onChange={(e) => updateVariant(idx, "type", e.target.value)}>
                    <option value="Add-on Module">Add-on Module</option>
                    <option value="Edition Tier">Edition Tier</option>
                  </select>
                  <input
                    type="number"
                    placeholder="+₹ Price"
                    value={variant.priceDelta ?? 0}
                    onChange={(e) => updateVariant(idx, "priceDelta", Number(e.target.value))}
                  />
                  <button
                    type="button"
                    onClick={() => removeVariant(idx)}
                    style={{ border: "1px solid #e0e3eb", background: "#fff", borderRadius: "5px", color: "#8a909f", cursor: "pointer" }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="secondary"
                style={{ marginTop: "6px", fontSize: "11px", padding: "4px 10px" }}
                onClick={() => setVariantsList([...variantsList, { name: "", type: "Add-on Module", priceDelta: 0 }])}
              >
                + Add Edition or Add-on Module
              </button>
            </div>

            <label>Product Description & Notes<textarea value={v.notes || ""} onChange={(e) => set("notes", e.target.value)} rows={2} /></label>
          </>
        )}

        {isPlan && (
          <>
            {text("Plan name", "planName", "text", true, { placeholder: "e.g. Business Monthly" })}
            {choose("Product", "product", products.map((x) => ({ value: x.name, label: x.name })), true)}
            {text("Price per seat (₹)", "price", "number", true, { min: 0, step: "0.01" })}
            {choose("Billing frequency", "billingFrequency", ["Daily", "Weekly", "Monthly", "Yearly"], true)}
            {text("Minimum quantity", "minimumQuantity", "number", true, { min: 1 })}
            <label className="terms" style={{ marginTop: "8px" }}><input type="checkbox" checked={v.allowRenewal !== false} onChange={(e) => set("allowRenewal", e.target.checked)} /> Allow recurring automatic renewal</label>
          </>
        )}

        {(isSub || isQuote || isInvoice || isPlanChange) && (
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

        {/* Simplified, Clean Discount Form */}
        {isDiscount && (
          <>
            {text("Discount Name", "name", "text", true, { placeholder: "e.g. Volume 10% Discount" })}
            {choose("Discount Type", "type", ["Percentage", "Fixed"], true)}
            {text(v.type === "Fixed" ? "Discount Value (₹)" : "Discount Value (%)", "value", "number", true, { min: 0, step: "0.01", placeholder: v.type === "Fixed" ? "500" : "10" })}
            {choose("Applies To", "product", [{ value: "", label: "All Products" }, ...products.map((x) => ({ value: x.name, label: x.name }))])}

            <div style={{ margin: "10px 0 4px" }}>
              <button
                type="button"
                className="secondary"
                style={{ fontSize: "11px", padding: "5px 10px" }}
                onClick={() => setShowAdvancedDiscount(!showAdvancedDiscount)}
              >
                {showAdvancedDiscount ? "- Hide Advanced Options" : "+ Advanced Options (Min Seats / Dates)"}
              </button>
            </div>

            {showAdvancedDiscount && (
              <div style={{ marginTop: "8px", padding: "12px", background: "#f8f9fc", borderRadius: "8px", border: "1px solid #eaecf1" }}>
                {text("Minimum Seat Quantity", "minimumQuantity", "number", false, { min: 0 })}
                {text("Minimum Purchase Amount (₹)", "minimumPurchase", "number", false, { min: 0 })}
                {text("Valid From Date", "startDate", "date")}
                {text("Valid Until Date", "endDate", "date")}
              </div>
            )}
          </>
        )}

        {/* Simplified, Clean Tax Form */}
        {isTax && (
          <>
            {text("Tax Name", "name", "text", true, { placeholder: "e.g. GST 18%" })}
            {text("Tax Rate (%)", "rate", "number", true, { min: 0, max: 100, step: "0.01", placeholder: "18" })}
            {choose("Applies To", "product", [{ value: "", label: "All Products" }, ...products.map((x) => ({ value: x.name, label: x.name }))])}
          </>
        )}

        {isPayment && (
          <>
            {choose("Invoice", "invoice", invoices.filter((x) => Number(x.outstandingAmount ?? x.total ?? x.amount ?? 0) > 0).map((x) => ({ value: x._id || x.id, label: `${x.number} - ${x.customer} - ₹${x.outstandingAmount ?? x.amount}` })), true)}
            {text("Amount (₹)", "amount", "number", true, { min: 0.01, step: "0.01" })}
            {choose("Payment method", "paymentMethod", ["UPI", "Card", "Bank transfer", "Cash", "Other"], true)}
            {text("Payment date", "paymentDate", "date", true)}
            <label>Note<textarea value={v.note || ""} onChange={(e) => set("note", e.target.value)} rows={2} /></label>
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
