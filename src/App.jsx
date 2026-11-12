import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  ArrowUpRight,
  ArrowRight,
  BarChart3,
  BadgeCheck,
  Boxes,
  CalendarDays,
  ClipboardList,
  ContactRound,
  FileText,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Lightbulb,
  LockKeyhole,
  LogOut,
  MessageSquareText,
  MoreHorizontal,
  Package,
  PackagePlus,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Save,
  Search,
  Share2,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  UserRound,
  UserPlus,
  Pencil,
  Trash2,
  Users,
  Wallet,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { apiRequest } from "./api.js";

const initialToast = { id: 0, type: "", message: "" };
const moneyFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 3,
});

function ShopPrintHeader({ shop, className = "" }) {
  const memoHeading = shop?.memo_heading?.trim();
  const shopName = memoHeading || shop?.shop_name || "মিতালী রেডিও ইলেকট্রিক";
  const shopLabel = memoHeading || !shop?.id
    ? shopName
    : new RegExp(`\\(\\s*Shop-${shop.id}\\s*\\)\\s*$`, "i").test(shopName)
      ? shopName
      : `${shopName} (Shop-${shop.id})`;
  return (
    <div className={`print-shop-heading ${className}`.trim()}>
      <strong>{shopLabel}</strong>
      {shop?.address ? <span>{shop.address}</span> : null}
      {shop?.contact_number ? <span>{shop.contact_number}</span> : null}
    </div>
  );
}

function formatMoney(value) {
  const amount = Number(value);
  return moneyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

function promptDeletionReason(recordLabel, showToast) {
  const input = window.prompt(`“${recordLabel}” মুছে ফেলার কারণ লিখুন (আবশ্যক):`);
  if (input === null) return null;
  const reason = input.trim();
  const length = Array.from(reason).length;
  if (length === 0 || length > 500) {
    showToast("error", "মুছে ফেলার কারণ লিখুন (সর্বোচ্চ ৫০০ অক্ষর)।");
    return null;
  }
  return reason;
}

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast.message) return undefined;
    const timer = window.setTimeout(onDismiss, 4200);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast.message) return null;

  return (
    <div
      className={`toast toast-${toast.type}`}
      role={toast.type === "error" ? "alert" : "status"}
    >
      <span className="toast-icon">
        {toast.type === "error" ? "!" : toast.type === "info" ? <Info size={19} /> : <BadgeCheck size={19} />}
      </span>
      <span>{toast.message}</span>
      <button
        className="toast-close"
        type="button"
        aria-label="বার্তা বন্ধ করুন"
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  );
}

function BrandMark({ small = false }) {
  return (
    <div className={`brand-mark ${small ? "brand-mark-small" : ""}`}>
      <span className="brand-mark-red" />
      <Zap aria-hidden="true" size={small ? 21 : 27} fill="currentColor" />
    </div>
  );
}

function LoginPage({ onLogin, busy, showToast }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!username.trim() || !password) {
      showToast("error", "ব্যবহারকারীর নাম ও পাসওয়ার্ড লিখুন।");
      return;
    }

    await onLogin(username.trim(), password, remember);
  }

  return (
    <main className="page-shell">
      <section className="login-layout">
        <aside className="brand-panel">
          <div className="brand-panel-pattern" aria-hidden="true" />
          <div className="brand-panel-content">
            <div className="brand-topline">
              <BrandMark />
              <span className="brand-topline-copy">আপনার বিশ্বস্ত ইলেকট্রিক পার্টনার</span>
            </div>

            <div className="brand-copy">
              <p className="eyebrow">বিসমিল্লাহির রাহমানির রাহিম</p>
              <p className="brand-kicker">মেসার্স</p>
              <h1>
                মিতালী
                <span>রেডিও ইলেকট্রিক</span>
              </h1>
              <div className="brand-underline" />
              <p className="brand-description">
                সব ধরনের বৈদ্যুতিক পণ্য, দেশি-বিদেশি বৈদ্যুতিক সরঞ্জামাদি
                পাইকারি ও খুচরা বিক্রেতা।
              </p>
            </div>

            <div className="shop-illustration" aria-hidden="true">
              <div className="illustration-glow" />
              <div className="bulb-halo">
                <Lightbulb size={78} strokeWidth={1.35} />
              </div>
              <div className="electric-orbit orbit-one" />
              <div className="electric-orbit orbit-two" />
              <div className="illustration-spark spark-one">✦</div>
              <div className="illustration-spark spark-two">✦</div>
              <div className="illustration-chip">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="brand-footer">
              <span className="wholesale-badge">
                <Store size={15} />
                পাইকারি বিক্রয়ের বিশ্বস্ত প্রতিষ্ঠান
              </span>
              <p>
                <span className="green-dot" />
                দোকানের হিসাব এখন এক জায়গায়
              </p>
            </div>
          </div>
          <div className="panel-swoosh panel-swoosh-green" />
          <div className="panel-swoosh panel-swoosh-red" />
        </aside>

        <section className="form-panel" aria-labelledby="login-title">
          <div className="mobile-brand">
            <BrandMark small />
            <span>মিতালী রেডিও ইলেকট্রিক</span>
          </div>

          <div className="login-card">
            <div className="login-heading">
              <span className="login-icon">
                <LockKeyhole size={23} />
              </span>
              <p className="login-overline">স্বাগতম</p>
              <h2 id="login-title">আপনার অ্যাকাউন্টে লগইন করুন</h2>
              <p className="login-hint">দোকানের সফটওয়্যার ব্যবহার করতে তথ্য দিন</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <label className="field-label" htmlFor="username">
                ব্যবহারকারীর নাম
              </label>
              <div className="input-wrap">
                <UserRound className="input-icon" size={19} aria-hidden="true" />
                <input
                  autoComplete="username"
                  id="username"
                  name="username"
                  placeholder="আপনার ইউজারনেম লিখুন"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  disabled={busy}
                />
              </div>

              <div className="password-label-row">
                <label className="field-label" htmlFor="password">
                  পাসওয়ার্ড
                </label>
              </div>
              <div className="input-wrap">
                <KeyRound className="input-icon" size={19} aria-hidden="true" />
                <input
                  autoComplete="current-password"
                  id="password"
                  name="password"
                  placeholder="আপনার পাসওয়ার্ড লিখুন"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={busy}
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>

              <label className="remember-row">
                <input
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  type="checkbox"
                />
                <span className="custom-checkbox" />
                <span>এই সেশনে লগইন মনে রাখুন</span>
              </label>

              <button className="submit-button" disabled={busy} type="submit">
                {busy ? (
                  <>
                    <span className="button-spinner" />
                    যাচাই করা হচ্ছে...
                  </>
                ) : (
                  <>
                    লগইন করুন
                    <ArrowRight size={19} />
                  </>
                )}
              </button>
            </form>

            <div className="secure-note">
              <ShieldCheck size={16} />
              <span>আপনার তথ্য সুরক্ষিত ও গোপন রাখা হয়</span>
            </div>
          </div>

          <div className="form-bottom">
            <span>মেসার্স মিতালী রেডিও ইলেকট্রিক</span>
            <span className="bottom-divider">•</span>
            <span>ফেনী, বাংলাদেশ</span>
            <a
              className="system-credit"
              href="https://a2technologiesbd.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              System By A2 Technologies
            </a>
          </div>
        </section>
      </section>

      <footer className="page-footer">
        <span>© {new Date().getFullYear()} মিতালী রেডিও ইলেকট্রিক</span>
        <span>সততা • গুণগত মান • বিশ্বস্ততা</span>
        <a
          className="system-credit"
          href="https://a2technologiesbd.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          System By A2 Technologies
        </a>
      </footer>
    </main>
  );
}

const DASHBOARD_TABS = [
  { id: "overview", label: "ওভারভিউ", icon: LayoutDashboard },
  {
    id: "setup",
    label: "সেটআপ",
    icon: Settings,
    description: "দোকানের পণ্য, গ্রাহক, সরবরাহকারী ও ব্যাংক হিসাব",
    modules: [
      { key: "user-management", title: "ইউজার ও পারমিশন", detail: "কর্মচারীর অ্যাকাউন্ট ও প্রবেশাধিকার", icon: ShieldCheck },
      { key: "shop-management", title: "দোকান পরিচালনা", detail: "দোকান, মেমো ও যোগাযোগের তথ্য", icon: Store },
      { key: "warehouse-management", title: "গুদাম সেটআপ", detail: "কেন্দ্রীয় গুদাম ও যোগাযোগের তথ্য", icon: Boxes },
      { key: "product-setup", title: "পণ্য সেটআপ", detail: "পণ্যের নাম, দাম ও স্টক", icon: PackagePlus },
      { key: "customer-setup", title: "কাস্টমার সেটআপ", detail: "গ্রাহকের তথ্য ও বাকি হিসাব", icon: Users },
      { key: "supplier-setup", title: "সাপ্লায়ার সেটআপ", detail: "সরবরাহকারী, বাকি ও ব্যাংক তথ্য", icon: Truck },
      { key: "bank-setup", title: "ব্যাংক সেটআপ", detail: "ব্যাংক হিসাব ও প্রারম্ভিক ব্যালেন্স", icon: Landmark },
    ],
  },
  {
    id: "purchase",
    label: "ক্রয় ও স্টক",
    icon: Package,
    description: "পণ্য ক্রয়, মজুত এবং সরবরাহকারীর লেনদেন",
    modules: [
      { key: "purchase-create", title: "নতুন ক্রয়", detail: "সাপ্লায়ারের ক্রয় এন্ট্রি", icon: Receipt },
      { key: "warehouse-transfer", title: "গুদাম থেকে দোকানে স্টক", detail: "গুদামের পণ্য দোকানের স্টকে স্থানান্তর করুন", icon: Truck },
      { key: "supplier-return", title: "সাপ্লায়ার রিটার্ন", detail: "ক্রয়ের পণ্য ফেরত দিয়ে দোকান স্টক কমান", icon: RotateCcw },
      { key: "stock-damage", title: "ড্যামেজ স্টক", detail: "নষ্ট পণ্য এন্ট্রি করে স্টক সমন্বয়", icon: Package },
      { title: "কম স্টকের পণ্য", detail: "পুনরায় অর্ডার করার তালিকা", icon: Package },
      { key: "supplier-payment", title: "সাপ্লায়ার পেমেন্ট", detail: "নগদ বা ব্যাংকে পাওনা পরিশোধ", icon: Wallet },
    ],
  },
  {
    id: "sales",
    label: "বিক্রয়",
    icon: ShoppingCart,
    description: "বিক্রয়, রিটার্ন এবং কাস্টমার পেমেন্ট",
    modules: [
      { key: "sales-create", title: "নতুন বিক্রয়", detail: "কাস্টমার বিল তৈরি করুন", icon: ShoppingCart },
      { key: "quotation-create", title: "কোটেশন", detail: "কাস্টমার বা কোম্পানির জন্য পণ্যের মূল্য প্রস্তাব তৈরি ও প্রিন্ট করুন", icon: FileText },
      { key: "sales-return", title: "কাস্টমার রিটার্ন", detail: "আগের বিলের পণ্য ফেরত ও বকেয়া সমন্বয়", icon: RotateCcw },
      { key: "customer-payment", title: "বাকি আদায়", detail: "কাস্টমারের কাছ থেকে নগদ বা ব্যাংকে পেমেন্ট গ্রহণ", icon: Wallet },
    ],
  },
  {
    id: "warranty",
    label: "ওয়ারেন্টি",
    icon: Wrench,
    description: "ওয়ারেন্টি ক্লেইম ও সার্ভিসের অবস্থা",
    modules: [
      { title: "নতুন ক্লেইম", detail: "পণ্যের সার্ভিস অনুরোধ নথিভুক্ত করুন", icon: PackagePlus },
      { title: "ক্লেইম তালিকা", detail: "চলমান ও সম্পন্ন ক্লেইম দেখুন", icon: ClipboardList },
      { title: "ওয়ারেন্টি স্টক", detail: "সার্ভিসে থাকা পণ্যের হিসাব", icon: Boxes },
    ],
  },
  {
    id: "reports",
    label: "রিপোর্ট",
    icon: BarChart3,
    description: "দোকানের বিক্রয়, লাভ ও হিসাবের সারাংশ",
    modules: [
      { key: "sales-report", title: "বিক্রয় রিপোর্ট", detail: "বিল খুঁজুন, হিসাব দেখুন ও মেমো পুনরায় প্রিন্ট করুন", icon: BarChart3 },
      { key: "purchase-report", title: "ক্রয় / চালান রিপোর্ট", detail: "তারিখ, সাপ্লায়ার ও চালান অনুযায়ী ক্রয় দেখুন", icon: Receipt },
      { title: "লাভ-ক্ষতি", detail: "ব্যবসার আয়-ব্যয়ের সারাংশ", icon: Activity },
      { key: "customer-ledger", title: "কাস্টমার লেজার", detail: "কাস্টমারের বাকি ও তারিখভিত্তিক লেনদেন দেখুন ও প্রিন্ট করুন", icon: ContactRound },
      { key: "supplier-ledger", title: "সাপ্লায়ার লেজার", detail: "সাপ্লায়ারের ক্রয়, রিটার্ন, পেমেন্ট ও বকেয়া দেখুন ও প্রিন্ট করুন", icon: Truck },
      { key: "stock-report", title: "স্টক রিপোর্ট", detail: "তারিখভিত্তিক মজুত, ক্রয়, বিক্রয় ও সমন্বয়", icon: FileText },
      { key: "warehouse-stock", title: "গুদাম স্টক রিপোর্ট", detail: "গুদামভিত্তিক মজুত দেখুন ও প্রিন্ট করুন", icon: Boxes },
    ],
  },
];

const DASHBOARD_METRICS = [
  { key: "today_sales", label: "আজকের বিক্রয়", icon: ShoppingCart, color: "green", note: "আজকের নিট বিক্রয়" },
  { key: "today_purchases", label: "আজকের ক্রয়", icon: Receipt, color: "blue", note: "দোকান ও গুদামের ক্রয়" },
  { key: "total_products", label: "মোট পণ্য", icon: Boxes, color: "amber", note: "পণ্য ক্যাটালগ" },
  { key: "warranty_claims", label: "ওয়ারেন্টি ক্লেইম", icon: Wrench, color: "rose", note: "ওয়ারেন্টি মডিউল চালু নয়" },
  { key: "sms_balance", label: "SMS ব্যালেন্স", icon: MessageSquareText, color: "blue", note: "SMS gateway ব্যালেন্স" },
];

const ELECTRICAL_UNITS = [
  { value: "pcs", label: "পিস (Pcs)" },
  { value: "box", label: "বক্স (Box)" },
  { value: "set", label: "সেট (Set)" },
  { value: "meter", label: "মিটার (Meter)" },
  { value: "roll", label: "রোল (Roll)" },
  { value: "coil", label: "কয়েল (Coil)" },
  { value: "pair", label: "জোড়া (Pair)" },
  { value: "pack", label: "প্যাকেট (Pack)" },
  { value: "dozen", label: "ডজন (Dozen)" },
  { value: "bundle", label: "বান্ডিল (Bundle)" },
  { value: "carton", label: "কার্টন (Carton)" },
];

const ELECTRICAL_CATEGORIES = [
  "লাইট ও বাল্ব",
  "ফ্যান",
  "সুইচ ও সকেট",
  "তার ও কেবল",
  "MCB ও সার্কিট ব্রেকার",
  "ডিস্ট্রিবিউশন বোর্ড ও বক্স",
  "প্লাগ, হোল্ডার ও কানেক্টর",
  "LED প্যানেল ও ডাউনলাইট",
  "টিউব লাইট ও অ্যাক্সেসরিজ",
  "LED ড্রাইভার ও পাওয়ার সাপ্লাই",
  "মাল্টিপ্লাগ ও এক্সটেনশন বোর্ড",
  "ইনসুলেশন টেপ ও কেবল টাই",
  "কনডুইট পাইপ ও ফিটিংস",
  "ব্যাটারি ও চার্জার",
  "IPS, UPS ও ইনভার্টার",
  "সোলার প্যানেল ও অ্যাক্সেসরিজ",
  "ভোল্টেজ স্ট্যাবিলাইজার",
  "মোটর ও পানির পাম্প",
  "ইলেকট্রিক আয়রন ও হিটার",
  "ডোরবেল ও কলিং বেল",
  "ইলেকট্রিক টুলস",
  "রেডিও ও অডিও পণ্য",
  "গৃহস্থালি বৈদ্যুতিক পণ্য",
  "অন্যান্য",
];

const ELECTRICAL_BRANDS = [
  "এবিবি",
  "বিজলী",
  "বিআরবি",
  "এনার্জিপ্যাক",
  "হ্যাভেলস",
  "কে.ডি.কে.",
  "লুমিনাস",
  "মিয়াকো",
  "ন্যাশনাল",
  "অপল",
  "প্যানাসনিক",
  "ফিলিপস",
  "পলিক্যাব",
  "রহিমআফরোজ",
  "আরআর ক্যাবল",
  "স্নাইডার ইলেকট্রিক",
  "সিমেন্স",
  "সিঙ্গার",
  "সুপার স্টার",
  "ভিশন",
  "ওয়ালটন",
];

const ELECTRICAL_BRAND_TRANSLATIONS = {
  abb: "এবিবি",
  bizli: "বিজলী",
  brb: "বিআরবি",
  energypac: "এনার্জিপ্যাক",
  havells: "হ্যাভেলস",
  kdk: "কে.ডি.কে.",
  luminous: "লুমিনাস",
  miyako: "মিয়াকো",
  national: "ন্যাশনাল",
  opple: "অপল",
  panasonic: "প্যানাসনিক",
  philips: "ফিলিপস",
  polycab: "পলিক্যাব",
  rahimafrooz: "রহিমআফরোজ",
  "rr kabel": "আরআর ক্যাবল",
  "schneider electric": "স্নাইডার ইলেকট্রিক",
  siemens: "সিমেন্স",
  singer: "সিঙ্গার",
  "super star": "সুপার স্টার",
  vision: "ভিশন",
  walton: "ওয়ালটন",
};

function ProductSetupForm({ token, shopId, onClose, onDataChanged, showToast, canEdit, canDelete }) {
  const [values, setValues] = useState({
    product_name: "",
    product_code: "",
    category: "",
    brand: "",
    unit: "",
    purchase_price: "",
    sale_price: "",
    current_stock: "",
    min_stock: "",
    tracks_serial_number: false,
  });
  const [customCategory, setCustomCategory] = useState("");
  const [savedBrands, setSavedBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(10);

  async function loadProducts() {
    setLoadingProducts(true);
    try {
      const response = await apiRequest("/products/list.php", { token, shopId });
      setProducts(response.data.products);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest("/products/brands.php", { token, shopId }),
      apiRequest("/products/list.php", { token, shopId }),
    ])
      .then(([brandResponse, productResponse]) => {
        if (!active) return;
        setSavedBrands(brandResponse.data.brands);
        setProducts(productResponse.data.products);
      })
      .catch((error) => {
        if (active) showToast("error", error.message);
      })
      .finally(() => {
        if (active) setLoadingProducts(false);
      });
    return () => {
      active = false;
    };
  }, [token, shopId, showToast]);

  function startCreate() {
    setValues({
      product_name: "",
      product_code: "",
      category: "",
      brand: "",
      unit: "",
      purchase_price: "",
      sale_price: "",
      current_stock: "",
      min_stock: "",
      tracks_serial_number: false,
    });
    setCustomCategory("");
    setEditingProduct(null);
    setShowEditor(true);
  }

  function startEdit(product) {
    const categoryIsListed = ELECTRICAL_CATEGORIES.includes(product.category);
    setValues({
      product_name: product.product_name || "",
      product_code: product.product_code || "",
      category: product.category ? (categoryIsListed ? product.category : "__custom__") : "",
      brand: product.brand || "",
      unit: product.unit || "",
      purchase_price: product.purchase_price || "",
      sale_price: product.sale_price || "",
      current_stock: product.current_stock || "0",
      min_stock: product.min_stock || "0",
      tracks_serial_number: Boolean(product.tracks_serial_number),
    });
    setCustomCategory(categoryIsListed ? "" : product.category || "");
    setEditingProduct(product);
    setShowEditor(true);
  }

  async function deleteProduct(product) {
    if (!window.confirm(`“${product.product_name}” পণ্যটি মুছে ফেলবেন?`)) return;
    const reason = promptDeletionReason(`${product.product_name} পণ্য`, showToast);
    if (!reason) return;
    try {
      const response = await apiRequest("/products/delete.php", {
        method: "POST",
        token,
        shopId,
        body: JSON.stringify({ id: product.id, reason }),
      });
      showToast("success", response.message);
      onDataChanged();
      await loadProducts();
    } catch (error) {
      showToast("error", error.message);
    }
  }

  function updateField(event) {
    const { name, value, checked, type } = event.target;
    setValues((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!values.product_name.trim()) {
      showToast("error", "পণ্যের নাম লিখুন।");
      document.getElementById("product-name")?.focus();
      return;
    }

    setSaving(true);
    try {
      const response = await apiRequest(editingProduct ? "/products/update.php" : "/products/create.php", {
        method: "POST",
        token,
        shopId,
        body: JSON.stringify({
          ...values,
          ...(editingProduct ? { id: editingProduct.id } : {}),
          category: values.category === "__custom__" ? customCategory.trim() : values.category,
          product_name: values.product_name.trim(),
        }),
      });
      showToast("success", response.message);
      onDataChanged();
      await loadProducts();
      setShowEditor(false);
      setEditingProduct(null);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setSaving(false);
    }
  }

  function textField(name, label, placeholder, options = {}) {
    const { type = "text", step, min, suggestions, disabled = false } = options;
    const required = name === "product_name";
    const hasValue = Boolean(values[name].trim());
    return (
      <label className="product-form-field" htmlFor={`product-${name}`} key={name}>
        <span className="product-field-label">
          {label}
          {required ? (
            <span className="required-badge">আবশ্যক</span>
          ) : (
            <span className="optional-label">ঐচ্ছিক</span>
          )}
        </span>
        <input
          aria-required={required}
          autoComplete="off"
          className={[
            "product-field-control",
            required ? "product-required-field" : "",
            required && hasValue ? "has-value" : "",
          ].filter(Boolean).join(" ")}
          id={`product-${name}`}
          list={suggestions ? `product-${name}-suggestions` : undefined}
          min={min}
          name={name}
          onChange={updateField}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          step={step}
          type={type}
          value={values[name]}
        />
        {suggestions ? (
          <datalist id={`product-${name}-suggestions`}>
            {suggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        ) : null}
      </label>
    );
  }

  function unitField() {
    return (
      <label className="product-form-field" htmlFor="product-unit">
        <span className="product-field-label">
          ইউনিট
          <span className="optional-label">ঐচ্ছিক</span>
        </span>
        <SearchableSelect
          className="product-field-control product-select-control"
          id="product-unit"
          name="unit"
          onChange={updateField}
          options={[
            { value: "", label: "ইউনিট নির্বাচন করুন" },
            ...ELECTRICAL_UNITS.map(({ value, label }) => ({ value, label })),
          ]}
          placeholder="ইউনিট লিখে খুঁজুন"
          required={false}
          value={values.unit}
        />
      </label>
    );
  }

  function categoryField() {
    const isCustomCategory = values.category === "__custom__";
    return (
      <>
        <label className="product-form-field" htmlFor="product-category">
          <span className="product-field-label">
            ক্যাটাগরি
            <span className="optional-label">ঐচ্ছিক</span>
          </span>
          <SearchableSelect
            className="product-field-control product-select-control"
            id="product-category"
            name="category"
            onChange={updateField}
            options={[
              { value: "", label: "ক্যাটাগরি নির্বাচন করুন" },
              ...ELECTRICAL_CATEGORIES.map((category) => ({ value: category, label: category })),
              { value: "__custom__", label: "তালিকায় নেই — নিজে লিখুন" },
            ]}
            placeholder="ক্যাটাগরি লিখে খুঁজুন"
            value={values.category}
          />
        </label>
        {isCustomCategory && (
          <label className="product-form-field" htmlFor="product-custom-category">
            <span className="product-field-label">
              নতুন ক্যাটাগরির নাম
              <span className="optional-label">ঐচ্ছিক</span>
            </span>
            <input
              autoComplete="off"
              className="product-field-control"
              id="product-custom-category"
              maxLength={100}
              onChange={(event) => setCustomCategory(event.target.value)}
              placeholder="ক্যাটাগরির নাম লিখুন"
              value={customCategory}
            />
          </label>
        )}
      </>
    );
  }

  const normalizedProductSearch = productSearch.trim().toLocaleLowerCase();
  const filteredProducts = products.filter((product) => (
    [
      product.product_name,
      product.product_code,
      product.category,
      product.brand,
      product.unit,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase().includes(normalizedProductSearch))
  ));
  const productPageCount = Math.max(1, Math.ceil(filteredProducts.length / productPageSize));
  const currentProductPage = Math.min(productPage, productPageCount);
  const visibleProducts = filteredProducts.slice(
    (currentProductPage - 1) * productPageSize,
    currentProductPage * productPageSize,
  );

  return (
    <div className="product-modal-backdrop">
      <section
        aria-labelledby="product-form-title"
        aria-modal="true"
        className="product-modal product-setup-modal"
        role="dialog"
      >
        <header className="product-modal-header">
          <span className="product-modal-icon"><PackagePlus size={22} /></span>
          <div>
            <h2 id="product-form-title">{editingProduct ? "পণ্য সম্পাদনা" : "নতুন পণ্য সেটআপ"}</h2>
            <p>পণ্যের তথ্য দিন; শুধু পণ্যের নাম আবশ্যক।</p>
          </div>
          <button
            aria-label="ফর্ম বন্ধ করুন"
            className="product-modal-close"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </header>

        {showEditor ? (
        <form className="product-form" onSubmit={handleSubmit}>
          <div className="product-form-grid">
            {textField("product_name", "পণ্যের নাম", "যেমন: LED বাল্ব")}
            {textField("product_code", "পণ্য কোড / বারকোড", "বারকোড বা নিজস্ব কোড")}
            {categoryField()}
            {textField("brand", "ব্র্যান্ড", "ব্র্যান্ড লিখুন বা তালিকা থেকে বাছুন", {
              suggestions: [...new Set([
                ...ELECTRICAL_BRANDS,
                ...savedBrands.map((brand) => (
                  ELECTRICAL_BRAND_TRANSLATIONS[brand.trim().toLocaleLowerCase()] || brand
                )),
              ])],
            })}
            {unitField()}
            {textField("purchase_price", "ক্রয়মূল্য (৳)", "0.00", { type: "number", min: "0", step: "0.01" })}
            {textField("sale_price", "বিক্রয়মূল্য (৳)", "0.00", { type: "number", min: "0", step: "0.01" })}
            {textField("current_stock", "বর্তমান স্টক", "0", {
              type: "number",
              min: "0",
              step: "0.001",
              disabled: Boolean(editingProduct?.has_transactions || editingProduct?.has_warehouse_stock),
            })}
            {textField("min_stock", "ন্যূনতম স্টক সীমা", "0", { type: "number", min: "0", step: "0.001" })}
          </div>
          {editingProduct?.has_transactions || editingProduct?.has_warehouse_stock ? (
            <p className="user-management-note">লেনদেন বা গুদাম স্টক আছে—স্টক পরিবর্তন ক্রয়/বিক্রয়/ট্রান্সফার মডিউল থেকে করতে হবে।</p>
          ) : null}

          <label className="serial-option">
            <input
              checked={values.tracks_serial_number}
              name="tracks_serial_number"
              onChange={updateField}
              type="checkbox"
            />
            <span className="serial-checkbox" />
            <span>
              <strong>সিরিয়াল নম্বর রাখতে হবে</strong>
              <small>এই পণ্যের প্রতিটি ইউনিটের আলাদা সিরিয়াল নম্বর ট্র্যাক করুন।</small>
            </span>
          </label>

          <footer className="product-form-actions">
            <span><span className="required-mark">*</span> আবশ্যক তথ্য</span>
            <div>
              <button
                className="product-cancel-button"
                disabled={saving}
                onClick={() => setShowEditor(false)}
                type="button"
              >
                বাতিল
              </button>
              <button className="product-save-button" disabled={saving} type="submit">
                {saving ? <span className="button-spinner" /> : <Save size={17} />}
                {saving ? "সংরক্ষণ হচ্ছে..." : editingProduct ? "পরিবর্তন সংরক্ষণ" : "পণ্য সংরক্ষণ"}
              </button>
            </div>
          </footer>
        </form>
        ) : (
          <div className="user-list-content">
            <div className="product-list-toolbar">
              <label className="product-list-search" htmlFor="product-list-search">
                <span>পণ্য খুঁজুন</span>
                <input
                  autoComplete="off"
                  className="product-field-control"
                  id="product-list-search"
                  onChange={(event) => {
                    setProductSearch(event.target.value);
                    setProductPage(1);
                  }}
                  placeholder="নাম, কোড, ক্যাটাগরি বা ব্র্যান্ড"
                  type="search"
                  value={productSearch}
                />
              </label>
              <span className="product-list-count">
                {filteredProducts.length} / {products.length}টি পণ্য
              </span>
              <button className="product-save-button" onClick={startCreate} type="button">
                <Plus size={17} /> নতুন পণ্য
              </button>
            </div>
            {loadingProducts ? (
              <div className="user-list-empty"><span className="button-spinner" /> পণ্যের তালিকা লোড হচ্ছে...</div>
            ) : products.length === 0 ? (
              <div className="user-list-empty">এখনো কোনো পণ্য যোগ করা হয়নি।</div>
            ) : filteredProducts.length === 0 ? (
              <div className="user-list-empty">এই অনুসন্ধানে কোনো পণ্য পাওয়া যায়নি।</div>
            ) : (
              <div className="user-table-wrap product-setup-table-wrap">
                <table className="user-management-table product-setup-table">
                  <thead>
                    <tr>
                      <th scope="col">পণ্য / কোড</th>
                      <th scope="col">ক্যাটাগরি</th>
                      <th scope="col">ব্র্যান্ড</th>
                      <th scope="col">স্টক</th>
                      <th scope="col">ক্রয়মূল্য</th>
                      <th scope="col">বিক্রয়মূল্য</th>
                      <th scope="col">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleProducts.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <strong>{product.product_name}</strong>
                          <span className="user-table-secondary">{product.product_code || `#${product.id}`}</span>
                        </td>
                        <td>{product.category || "—"}</td>
                        <td>{product.brand || "—"}</td>
                        <td>{numberFormatter.format(Number(product.current_stock) || 0)} {product.unit || ""}</td>
                        <td>৳ {product.purchase_price === null || product.purchase_price === undefined || product.purchase_price === "" ? "—" : formatMoney(product.purchase_price)}</td>
                        <td>৳ {product.sale_price === null || product.sale_price === undefined || product.sale_price === "" ? "—" : formatMoney(product.sale_price)}</td>
                        <td>
                          <div className="user-list-actions">
                            {canEdit ? (
                              <button aria-label={`${product.product_name} এডিট করুন`} className="user-action-button product-action-edit" onClick={() => startEdit(product)} title="এডিট" type="button">
                                <Pencil size={16} />
                              </button>
                            ) : null}
                            {canDelete ? (
                              <button
                                aria-disabled={!product.can_delete}
                                aria-label={product.can_delete ? `${product.product_name} পণ্য মুছুন` : `${product.product_name} পণ্য মুছতে পারবেন না`}
                                className={`user-action-button user-action-delete product-action-trash${product.can_delete ? "" : " product-action-disabled"}`}
                                onClick={() => {
                                  if (product.can_delete) {
                                    deleteProduct(product);
                                  } else {
                                    showToast("error", product.has_transactions
                                      ? "এই পণ্যে লেনদেন আছে, তাই মুছে ফেলা যাবে না।"
                                      : "এই পণ্যে স্টক আছে, তাই মুছে ফেলা যাবে না।");
                                  }
                                }}
                                title={product.can_delete ? "পণ্য মুছুন" : product.has_transactions ? "লেনদেন আছে" : "স্টক আছে"}
                                type="button"
                              >
                                <Trash2 size={16} />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!loadingProducts && filteredProducts.length > 0 ? (
              <div className="product-list-pagination">
                <span>
                  {numberFormatter.format((currentProductPage - 1) * productPageSize + 1)}
                  {"–"}
                  {numberFormatter.format(Math.min(currentProductPage * productPageSize, filteredProducts.length))}
                  {" / "}
                  {numberFormatter.format(filteredProducts.length)}টি
                </span>
                <div>
                  <span className="product-list-page-size">
                    প্রতি পাতায়
                    {[10, 25, 50].map((size) => (
                      <button
                        aria-pressed={productPageSize === size}
                        className={productPageSize === size ? "product-list-page-size-active" : ""}
                        key={size}
                        onClick={() => {
                          setProductPageSize(size);
                          setProductPage(1);
                        }}
                        type="button"
                      >
                        {numberFormatter.format(size)}
                      </button>
                    ))}
                  </span>
                  <button disabled={currentProductPage <= 1} onClick={() => setProductPage(currentProductPage - 1)} type="button">আগের</button>
                  <strong>{numberFormatter.format(currentProductPage)} / {numberFormatter.format(productPageCount)}</strong>
                  <button disabled={currentProductPage >= productPageCount} onClick={() => setProductPage(currentProductPage + 1)} type="button">পরের</button>
                </div>
              </div>
            ) : null}
            {canDelete && products.some((product) => !product.can_delete) ? (
              <p className="user-management-note">লেনদেন বা স্টক থাকা পণ্য মুছতে পারবেন না; তবে অনুমতি থাকলে এডিট করা যাবে।</p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

const CUSTOMER_LEVELS = ["সাধারণ", "নিয়মিত", "প্রিমিয়াম", "বিশেষ"];

function CustomerSetupForm({
  token,
  shopId,
  onClose,
  onDataChanged,
  onCustomerCreated,
  showToast,
  canEdit,
  canDelete,
  initialShowEditor = false,
}) {
  const [values, setValues] = useState({
    customer_name: "",
    mobile_number: "",
    address: "",
    area: "",
    opening_balance: "",
    credit_limit: "",
    customer_level: "সাধারণ",
  });
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [showEditor, setShowEditor] = useState(initialShowEditor);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerPage, setCustomerPage] = useState(1);
  const [customerPageSize, setCustomerPageSize] = useState(10);

  async function loadCustomers() {
    setLoadingCustomers(true);
    try {
      const response = await apiRequest("/customers/list.php", { token, shopId });
      setCustomers(response.data.customers);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setLoadingCustomers(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, [token, shopId]);

  function startCreate() {
    setValues({
      customer_name: "",
      mobile_number: "",
      address: "",
      area: "",
      opening_balance: "",
      credit_limit: "",
      customer_level: "সাধারণ",
    });
    setEditingCustomer(null);
    setShowEditor(true);
  }

  function startEdit(customer) {
    setValues({
      customer_name: customer.customer_name || "",
      mobile_number: customer.mobile_number || "",
      address: customer.address || "",
      area: customer.area || "",
      opening_balance: customer.opening_balance || "",
      credit_limit: customer.credit_limit || "",
      customer_level: customer.customer_level || "সাধারণ",
    });
    setEditingCustomer(customer);
    setShowEditor(true);
  }

  async function deleteCustomer(customer) {
    if (!window.confirm(`“${customer.customer_name}” কাস্টমারটি মুছে ফেলবেন?`)) return;
    const reason = promptDeletionReason(`${customer.customer_name} কাস্টমার`, showToast);
    if (!reason) return;
    try {
      const response = await apiRequest("/customers/delete.php", {
        method: "POST",
        token,
        shopId,
        body: JSON.stringify({ id: customer.id, reason }),
      });
      showToast("success", response.message);
      await loadCustomers();
      onDataChanged();
    } catch (error) {
      showToast("error", error.message);
    }
  }

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!values.customer_name.trim()) {
      showToast("error", "কাস্টমারের নাম লিখুন।");
      document.getElementById("customer-name")?.focus();
      return;
    }
    const mobileNumber = values.mobile_number.trim();
    if (
      mobileNumber &&
      (!/^[0-9+().\-\s]+$/.test(mobileNumber) ||
        (mobileNumber.match(/[0-9]/g) || []).length < 7 ||
        (mobileNumber.match(/[0-9]/g) || []).length > 15)
    ) {
      showToast("error", "SMS পাঠানোর জন্য মোবাইল নম্বর ইংরেজি সংখ্যায় (৭–১৫ ডিজিট) লিখুন।");
      document.getElementById("customer-mobile-number")?.focus();
      return;
    }

    setSaving(true);
    try {
      const response = await apiRequest(editingCustomer ? "/customers/update.php" : "/customers/create.php", {
        method: "POST",
        token,
        shopId,
        body: JSON.stringify({
          ...values,
          ...(editingCustomer ? { id: editingCustomer.id } : {}),
          customer_name: values.customer_name.trim(),
        }),
      });
      showToast("success", response.message);
      await loadCustomers();
      onDataChanged();
      if (!editingCustomer && response.data?.customer) {
        await onCustomerCreated?.(response.data.customer);
      }
      setShowEditor(false);
      setEditingCustomer(null);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setSaving(false);
    }
  }

  function field(name, label, placeholder, options = {}) {
    const { type = "text", min, step, multiline = false } = options;
    const required = name === "customer_name";
    const hasValue = Boolean(values[name].trim());
    const controlClass = [
      "product-field-control",
      required ? "product-required-field" : "",
      required && hasValue ? "has-value" : "",
    ].filter(Boolean).join(" ");
    const controlProps = {
      "aria-required": required,
      className: controlClass,
      id: `customer-${name.replaceAll("_", "-")}`,
      name,
      onChange: updateField,
      placeholder,
      required,
      value: values[name],
    };

    return (
      <label className="product-form-field" htmlFor={controlProps.id} key={name}>
        <span className="product-field-label">
          {label}
          {required ? (
            <span className="required-badge">আবশ্যক</span>
          ) : (
            <span className="optional-label">ঐচ্ছিক</span>
          )}
        </span>
        {multiline ? (
          <textarea {...controlProps} className={`${controlClass} customer-address-control`} rows={2} />
        ) : (
          <input
            {...controlProps}
            autoComplete={name === "mobile_number" ? "tel" : "off"}
            inputMode={type === "number" ? "decimal" : name === "mobile_number" ? "tel" : undefined}
            min={min}
            step={step}
            type={type}
          />
        )}
        {name === "mobile_number" ? (
          <span className="customer-mobile-hint">SMS পাঠানোর জন্য ইংরেজি সংখ্যায় লিখুন।</span>
        ) : null}
      </label>
    );
  }

  const normalizedCustomerSearch = customerSearch.trim().toLocaleLowerCase();
  const filteredCustomers = customers.filter((customer) => (
    [
      customer.customer_name,
      customer.mobile_number,
      customer.area,
      customer.address,
      customer.customer_level,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase().includes(normalizedCustomerSearch))
  ));
  const customerPageCount = Math.max(1, Math.ceil(filteredCustomers.length / customerPageSize));
  const currentCustomerPage = Math.min(customerPage, customerPageCount);
  const visibleCustomers = filteredCustomers.slice(
    (currentCustomerPage - 1) * customerPageSize,
    currentCustomerPage * customerPageSize,
  );

  return (
    <div className="product-modal-backdrop">
      <section
        aria-labelledby="customer-form-title"
        aria-modal="true"
        className="product-modal customer-setup-modal"
        role="dialog"
      >
        <header className="product-modal-header">
          <span className="product-modal-icon"><Users size={22} /></span>
          <div>
            <h2 id="customer-form-title">{editingCustomer ? "কাস্টমার সম্পাদনা" : "নতুন কাস্টমার সেটআপ"}</h2>
            <p>সব তথ্য বাংলায়; শুধু কাস্টমারের নাম আবশ্যক।</p>
          </div>
          <button
            aria-label="ফর্ম বন্ধ করুন"
            className="product-modal-close"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </header>

        {showEditor ? (
        <form className="product-form" onSubmit={handleSubmit}>
          <div className="product-form-grid">
            {field("customer_name", "কাস্টমারের নাম", "যেমন: আব্দুল করিম")}
            {field("mobile_number", "মোবাইল নম্বর", "যেমন: 01712345678")}
            {field("area", "এলাকা", "যেমন: ফেনী সদর")}
            {field("opening_balance", "পূর্বের বাকি (৳)", "0.00", {
              type: "number",
              step: "0.01",
            })}
            {field("credit_limit", "বাকি সীমা (৳)", "0.00", {
              type: "number",
              min: "0",
              step: "0.01",
            })}
            <label className="product-form-field" htmlFor="customer-customer-level">
              <span className="product-field-label">
                কাস্টমার লেভেল
                <span className="optional-label">ঐচ্ছিক</span>
              </span>
              <SearchableSelect
                className="product-field-control product-select-control"
                id="customer-customer-level"
                name="customer_level"
                onChange={updateField}
                options={CUSTOMER_LEVELS.map((level) => ({ value: level, label: level }))}
                placeholder="কাস্টমার লেভেল লিখে খুঁজুন"
                value={values.customer_level}
              />
            </label>
            {field("address", "ঠিকানা", "বাড়ি, সড়ক বা প্রতিষ্ঠানের ঠিকানা", {
              multiline: true,
            })}
          </div>

          <footer className="product-form-actions">
            <span><span className="required-mark">*</span> আবশ্যক তথ্য</span>
            <div>
              <button
                className="product-cancel-button"
                disabled={saving}
                onClick={() => setShowEditor(false)}
                type="button"
              >
                বাতিল
              </button>
              <button className="product-save-button" disabled={saving} type="submit">
                {saving ? <span className="button-spinner" /> : <Save size={17} />}
                {saving ? "সংরক্ষণ হচ্ছে..." : editingCustomer ? "পরিবর্তন সংরক্ষণ" : "কাস্টমার সংরক্ষণ"}
              </button>
            </div>
          </footer>
        </form>
        ) : (
          <div className="user-list-content">
            <div className="product-list-toolbar">
              <label className="product-list-search" htmlFor="customer-list-search">
                <span>কাস্টমার খুঁজুন</span>
                <input
                  autoComplete="off"
                  className="product-field-control"
                  id="customer-list-search"
                  onChange={(event) => {
                    setCustomerSearch(event.target.value);
                    setCustomerPage(1);
                  }}
                  placeholder="নাম, মোবাইল, এলাকা বা ঠিকানা"
                  type="search"
                  value={customerSearch}
                />
              </label>
              <span className="product-list-count">
                {numberFormatter.format(filteredCustomers.length)} / {numberFormatter.format(customers.length)} জন
              </span>
              <button className="product-save-button" onClick={startCreate} type="button">
                <Plus size={17} /> নতুন কাস্টমার
              </button>
            </div>
            {loadingCustomers ? (
              <div className="user-list-empty"><span className="button-spinner" /> কাস্টমারের তালিকা লোড হচ্ছে...</div>
            ) : customers.length === 0 ? (
              <div className="user-list-empty">এখনো কোনো কাস্টমার যোগ করা হয়নি।</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="user-list-empty">এই অনুসন্ধানে কোনো কাস্টমার পাওয়া যায়নি।</div>
            ) : (
              <div className="user-table-wrap customer-setup-table-wrap">
                <table className="user-management-table customer-setup-table">
                  <thead>
                    <tr>
                      <th scope="col">কাস্টমারের নাম</th>
                      <th scope="col">মোবাইল</th>
                      <th scope="col">এলাকা / লেভেল</th>
                      <th scope="col">পূর্বের বাকি</th>
                      <th scope="col">বাকি সীমা</th>
                      <th scope="col">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCustomers.map((customer) => (
                      <tr key={customer.id}>
                        <td>
                          <strong>{customer.customer_name}</strong>
                          <span className="user-table-secondary">{customer.address || "ঠিকানা দেওয়া হয়নি"}</span>
                        </td>
                        <td>{customer.mobile_number || "—"}</td>
                        <td>{[customer.area, customer.customer_level].filter(Boolean).join(" · ") || "—"}</td>
                        <td>৳ {formatMoney(customer.opening_balance)}</td>
                        <td>৳ {customer.credit_limit === null || customer.credit_limit === undefined || customer.credit_limit === "" ? "—" : formatMoney(customer.credit_limit)}</td>
                        <td>
                          <div className="user-list-actions">
                            {canEdit ? (
                              <button aria-label={`${customer.customer_name} এডিট করুন`} className="user-action-button product-action-edit" onClick={() => startEdit(customer)} title="এডিট" type="button">
                                <Pencil size={16} />
                              </button>
                            ) : null}
                            {canDelete ? (
                              <button
                                aria-disabled={!customer.can_delete}
                                aria-label={customer.can_delete
                                  ? `${customer.customer_name} মুছুন`
                                  : `${customer.customer_name} কাস্টমার মুছতে পারবেন না`}
                                className={`user-action-button user-action-delete product-action-trash${customer.can_delete ? "" : " product-action-disabled"}`}
                                onClick={() => {
                                  if (customer.can_delete) {
                                    deleteCustomer(customer);
                                  } else {
                                    showToast("error", customer.has_transactions
                                      ? "এই কাস্টমারের লেনদেন আছে, তাই মুছে ফেলা যাবে না।"
                                      : "এই কাস্টমারের বকেয়া আছে, তাই মুছে ফেলা যাবে না।");
                                  }
                                }}
                                title={customer.can_delete ? "কাস্টমার মুছুন" : customer.has_transactions ? "লেনদেন আছে" : "বকেয়া আছে"}
                                type="button"
                              >
                                <Trash2 size={16} />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!loadingCustomers && filteredCustomers.length > 0 ? (
              <div className="product-list-pagination">
                <span>
                  {numberFormatter.format((currentCustomerPage - 1) * customerPageSize + 1)}
                  {"–"}
                  {numberFormatter.format(Math.min(currentCustomerPage * customerPageSize, filteredCustomers.length))}
                  {" / "}
                  {numberFormatter.format(filteredCustomers.length)} জন
                </span>
                <div>
                  <span className="product-list-page-size">
                    প্রতি পাতায়
                    {[10, 25, 50].map((size) => (
                      <button
                        aria-pressed={customerPageSize === size}
                        className={customerPageSize === size ? "product-list-page-size-active" : ""}
                        key={size}
                        onClick={() => {
                          setCustomerPageSize(size);
                          setCustomerPage(1);
                        }}
                        type="button"
                      >
                        {numberFormatter.format(size)}
                      </button>
                    ))}
                  </span>
                  <button disabled={currentCustomerPage <= 1} onClick={() => setCustomerPage(currentCustomerPage - 1)} type="button">আগের</button>
                  <strong>{numberFormatter.format(currentCustomerPage)} / {numberFormatter.format(customerPageCount)}</strong>
                  <button disabled={currentCustomerPage >= customerPageCount} onClick={() => setCustomerPage(currentCustomerPage + 1)} type="button">পরের</button>
                </div>
              </div>
            ) : null}
            {canDelete && customers.some((customer) => !customer.can_delete) ? (
              <p className="user-management-note">বিক্রয় লেনদেন বা বকেয়া থাকা কাস্টমার মুছতে পারবেন না।</p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function SupplierSetupForm({
  token,
  shopId,
  onClose,
  onDataChanged,
  onSupplierCreated,
  showToast,
  canEdit,
  canDelete,
  initialShowEditor = false,
}) {
  const [values, setValues] = useState({
    supplier_name: "",
    mobile_number: "",
    address: "",
    previous_balance: "",
    contact_person: "",
    contact_mobile: "",
    bank_details: "",
  });
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [showEditor, setShowEditor] = useState(initialShowEditor);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [saving, setSaving] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierPage, setSupplierPage] = useState(1);
  const [supplierPageSize, setSupplierPageSize] = useState(10);

  async function loadSuppliers() {
    setLoadingSuppliers(true);
    try {
      const response = await apiRequest("/suppliers/list.php", { token, shopId });
      setSuppliers(response.data.suppliers);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setLoadingSuppliers(false);
    }
  }

  useEffect(() => {
    loadSuppliers();
  }, [token, shopId]);

  function startCreate() {
    setValues({
      supplier_name: "",
      mobile_number: "",
      address: "",
      previous_balance: "",
      contact_person: "",
      contact_mobile: "",
      bank_details: "",
    });
    setEditingSupplier(null);
    setShowEditor(true);
  }

  function startEdit(supplier) {
    setValues({
      supplier_name: supplier.supplier_name || "",
      mobile_number: supplier.mobile_number || "",
      address: supplier.address || "",
      previous_balance: supplier.previous_balance || "",
      contact_person: supplier.contact_person || "",
      contact_mobile: supplier.contact_mobile || "",
      bank_details: supplier.bank_details || "",
    });
    setEditingSupplier(supplier);
    setShowEditor(true);
  }

  async function deleteSupplier(supplier) {
    if (!window.confirm(`“${supplier.supplier_name}” সাপ্লায়ারটি মুছে ফেলবেন?`)) return;
    const reason = promptDeletionReason(`${supplier.supplier_name} সাপ্লায়ার`, showToast);
    if (!reason) return;
    try {
      const response = await apiRequest("/suppliers/delete.php", {
        method: "POST",
        token,
        shopId,
        body: JSON.stringify({ id: supplier.id, reason }),
      });
      showToast("success", response.message);
      await loadSuppliers();
      onDataChanged();
    } catch (error) {
      showToast("error", error.message);
    }
  }

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!values.supplier_name.trim()) {
      showToast("error", "সাপ্লায়ারের নাম লিখুন।");
      document.getElementById("supplier-supplier-name")?.focus();
      return;
    }

    setSaving(true);
    try {
      const response = await apiRequest(editingSupplier ? "/suppliers/update.php" : "/suppliers/create.php", {
        method: "POST",
        token,
        shopId,
        body: JSON.stringify({
          ...values,
          ...(editingSupplier ? { id: editingSupplier.id } : {}),
          supplier_name: values.supplier_name.trim(),
        }),
      });
      showToast("success", response.message);
      await loadSuppliers();
      onDataChanged();
      if (!editingSupplier && response.data?.supplier) {
        onSupplierCreated?.(response.data.supplier);
      }
      setShowEditor(false);
      setEditingSupplier(null);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setSaving(false);
    }
  }

  function field(name, label, placeholder, options = {}) {
    const { type = "text", min, step, maxLength, inputMode, multiline = false } = options;
    const required = name === "supplier_name";
    const hasValue = Boolean(values[name].trim());
    const controlClass = [
      "product-field-control",
      required ? "product-required-field" : "",
      required && hasValue ? "has-value" : "",
    ].filter(Boolean).join(" ");
    const id = `supplier-${name.replaceAll("_", "-")}`;

    return (
      <label className="product-form-field" htmlFor={id} key={name}>
        <span className="product-field-label">
          {label}
          {required ? (
            <span className="required-badge">আবশ্যক</span>
          ) : (
            <span className="optional-label">ঐচ্ছিক</span>
          )}
        </span>
        {multiline ? (
          <textarea
            aria-required={required}
            className={`${controlClass} supplier-bank-details-control`}
            id={id}
            maxLength={maxLength}
            name={name}
            onChange={updateField}
            placeholder={placeholder}
            required={required}
            rows={6}
            value={values[name]}
          />
        ) : (
          <input
            aria-required={required}
            autoComplete={name.includes("mobile") ? "tel" : "off"}
            className={controlClass}
            id={id}
            inputMode={inputMode}
            maxLength={maxLength}
            min={min}
            name={name}
            onChange={updateField}
            placeholder={placeholder}
            required={required}
            step={step}
            type={type}
            value={values[name]}
          />
        )}
      </label>
    );
  }

  const normalizedSupplierSearch = supplierSearch.trim().toLocaleLowerCase();
  const filteredSuppliers = suppliers.filter((supplier) => (
    [
      supplier.supplier_name,
      supplier.mobile_number,
      supplier.address,
      supplier.contact_person,
      supplier.contact_mobile,
      supplier.bank_details,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase().includes(normalizedSupplierSearch))
  ));
  const supplierPageCount = Math.max(1, Math.ceil(filteredSuppliers.length / supplierPageSize));
  const currentSupplierPage = Math.min(supplierPage, supplierPageCount);
  const visibleSuppliers = filteredSuppliers.slice(
    (currentSupplierPage - 1) * supplierPageSize,
    currentSupplierPage * supplierPageSize,
  );

  return (
    <div className="product-modal-backdrop">
      <section
        aria-labelledby="supplier-form-title"
        aria-modal="true"
        className="product-modal supplier-setup-modal"
        role="dialog"
      >
        <header className="product-modal-header">
          <span className="product-modal-icon"><Truck size={22} /></span>
          <div>
            <h2 id="supplier-form-title">{editingSupplier ? "সাপ্লায়ার সম্পাদনা" : "নতুন সাপ্লায়ার সেটআপ"}</h2>
            <p>সাপ্লায়ারের যোগাযোগ, আগের ব্যালেন্স ও অনলাইন পেমেন্টের ব্যাংক তথ্য দিন।</p>
          </div>
          <button
            aria-label="ফর্ম বন্ধ করুন"
            className="product-modal-close"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </header>

        {showEditor ? (
        <form className="product-form" onSubmit={handleSubmit}>
          <div className="product-form-grid">
            {field("supplier_name", "সাপ্লায়ারের নাম", "প্রতিষ্ঠান বা ব্যক্তির নাম", { maxLength: 180 })}
            {field("mobile_number", "মোবাইল নম্বর", "যেমন: ০১৭১২৩৪৫৬৭৮", { maxLength: 20, inputMode: "tel" })}
            {field("previous_balance", "পূর্বের ব্যালেন্স (৳)", "0.00", {
              type: "number",
              step: "0.01",
              inputMode: "decimal",
            })}
            {field("contact_person", "যোগাযোগ ব্যক্তির নাম", "যার সঙ্গে যোগাযোগ করবেন", { maxLength: 120 })}
            {field("contact_mobile", "যোগাযোগ ব্যক্তির মোবাইল", "যেমন: ০১৮১২৩৪৫৬৭৮", { maxLength: 20, inputMode: "tel" })}
            {field("address", "ঠিকানা", "সাপ্লায়ারের ঠিকানা", { maxLength: 255 })}
          </div>

          <h3 className="supplier-form-section-title">ব্যাংক তথ্য — RTGS / NPSB / অনলাইন পেমেন্ট</h3>
          {field(
            "bank_details",
            "এক বা একাধিক ব্যাংক হিসাবের তথ্য",
            "প্রতি ব্যাংক হিসাব আলাদা লাইনে লিখুন। যেমন:\nব্যাংক: সোনালী ব্যাংক | হিসাবের নাম: মেসার্স ABC | হিসাব নম্বর: 123456 | শাখা: ফেনী | রাউটিং: 123456789 | পদ্ধতি: RTGS\nব্যাংক: ডাচ্-বাংলা ব্যাংক | হিসাবের নাম: মেসার্স ABC | হিসাব নম্বর: 987654 | পদ্ধতি: NPSB",
            { multiline: true, maxLength: 4000 },
          )}

          <footer className="product-form-actions">
            <span><span className="required-mark">*</span> সাপ্লায়ারের নাম আবশ্যক</span>
            <div>
              <button
                className="product-cancel-button"
                disabled={saving}
                onClick={() => setShowEditor(false)}
                type="button"
              >
                বাতিল
              </button>
              <button className="product-save-button" disabled={saving} type="submit">
                {saving ? <span className="button-spinner" /> : <Save size={17} />}
                {saving ? "সংরক্ষণ হচ্ছে..." : editingSupplier ? "পরিবর্তন সংরক্ষণ" : "সাপ্লায়ার সংরক্ষণ"}
              </button>
            </div>
          </footer>
        </form>
        ) : (
          <div className="user-list-content">
            <div className="product-list-toolbar">
              <label className="product-list-search" htmlFor="supplier-list-search">
                <span>সাপ্লায়ার খুঁজুন</span>
                <input
                  autoComplete="off"
                  className="product-field-control"
                  id="supplier-list-search"
                  onChange={(event) => {
                    setSupplierSearch(event.target.value);
                    setSupplierPage(1);
                  }}
                  placeholder="নাম, মোবাইল, যোগাযোগ বা ঠিকানা"
                  type="search"
                  value={supplierSearch}
                />
              </label>
              <span className="product-list-count">
                {numberFormatter.format(filteredSuppliers.length)} / {numberFormatter.format(suppliers.length)} জন
              </span>
              <button className="product-save-button" onClick={startCreate} type="button">
                <Plus size={17} /> নতুন সাপ্লায়ার
              </button>
            </div>
            {loadingSuppliers ? (
              <div className="user-list-empty"><span className="button-spinner" /> সাপ্লায়ারের তালিকা লোড হচ্ছে...</div>
            ) : suppliers.length === 0 ? (
              <div className="user-list-empty">এখনো কোনো সাপ্লায়ার যোগ করা হয়নি।</div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="user-list-empty">এই অনুসন্ধানে কোনো সাপ্লায়ার পাওয়া যায়নি।</div>
            ) : (
              <div className="user-table-wrap supplier-setup-table-wrap">
                <table className="user-management-table supplier-setup-table">
                  <thead>
                    <tr>
                      <th scope="col">সাপ্লায়ারের নাম</th>
                      <th scope="col">মোবাইল / যোগাযোগ</th>
                      <th scope="col">পূর্বের ব্যালেন্স</th>
                      <th scope="col">ব্যাংক তথ্য</th>
                      <th scope="col">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSuppliers.map((supplier) => (
                      <tr key={supplier.id}>
                        <td>
                          <strong>{supplier.supplier_name}</strong>
                          <span className="user-table-secondary">{supplier.address || "ঠিকানা দেওয়া হয়নি"}</span>
                        </td>
                        <td>
                          {supplier.mobile_number || "—"}
                          {supplier.contact_person || supplier.contact_mobile ? (
                            <span className="user-table-secondary">
                              {[supplier.contact_person, supplier.contact_mobile].filter(Boolean).join(" · ")}
                            </span>
                          ) : null}
                        </td>
                        <td>৳ {formatMoney(supplier.previous_balance)}</td>
                        <td>{supplier.bank_details ? "সংরক্ষিত" : "—"}</td>
                        <td>
                          <div className="user-list-actions">
                            {canEdit ? (
                              <button aria-label={`${supplier.supplier_name} এডিট করুন`} className="user-action-button product-action-edit" onClick={() => startEdit(supplier)} title="এডিট" type="button">
                                <Pencil size={16} />
                              </button>
                            ) : null}
                            {canDelete ? (
                              <button
                                aria-disabled={!supplier.can_delete}
                                aria-label={supplier.can_delete
                                  ? `${supplier.supplier_name} মুছুন`
                                  : `${supplier.supplier_name} সাপ্লায়ার মুছতে পারবেন না`}
                                className={`user-action-button user-action-delete product-action-trash${supplier.can_delete ? "" : " product-action-disabled"}`}
                                onClick={() => {
                                  if (supplier.can_delete) {
                                    deleteSupplier(supplier);
                                  } else {
                                    showToast("error", supplier.has_transactions
                                      ? "এই সাপ্লায়ারের লেনদেন আছে, তাই মুছে ফেলা যাবে না।"
                                      : "এই সাপ্লায়ারের বকেয়া আছে, তাই মুছে ফেলা যাবে না।");
                                  }
                                }}
                                title={supplier.can_delete ? "সাপ্লায়ার মুছুন" : supplier.has_transactions ? "লেনদেন আছে" : "বকেয়া আছে"}
                                type="button"
                              >
                                <Trash2 size={16} />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!loadingSuppliers && filteredSuppliers.length > 0 ? (
              <div className="product-list-pagination">
                <span>
                  {numberFormatter.format((currentSupplierPage - 1) * supplierPageSize + 1)}
                  {"–"}
                  {numberFormatter.format(Math.min(currentSupplierPage * supplierPageSize, filteredSuppliers.length))}
                  {" / "}
                  {numberFormatter.format(filteredSuppliers.length)} জন
                </span>
                <div>
                  <span className="product-list-page-size">
                    প্রতি পাতায়
                    {[10, 25, 50].map((size) => (
                      <button
                        aria-pressed={supplierPageSize === size}
                        className={supplierPageSize === size ? "product-list-page-size-active" : ""}
                        key={size}
                        onClick={() => {
                          setSupplierPageSize(size);
                          setSupplierPage(1);
                        }}
                        type="button"
                      >
                        {numberFormatter.format(size)}
                      </button>
                    ))}
                  </span>
                  <button disabled={currentSupplierPage <= 1} onClick={() => setSupplierPage(currentSupplierPage - 1)} type="button">আগের</button>
                  <strong>{numberFormatter.format(currentSupplierPage)} / {numberFormatter.format(supplierPageCount)}</strong>
                  <button disabled={currentSupplierPage >= supplierPageCount} onClick={() => setSupplierPage(currentSupplierPage + 1)} type="button">পরের</button>
                </div>
              </div>
            ) : null}
            {canDelete && suppliers.some((supplier) => !supplier.can_delete) ? (
              <p className="user-management-note">ক্রয়/পেমেন্ট লেনদেন বা বকেয়া থাকা সাপ্লায়ার মুছতে পারবেন না।</p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function BankSetupForm({ token, shopId, onClose, onDataChanged, showToast, canEdit, canDelete }) {
  const emptyValues = {
    bank_name: "",
    account_name: "",
    account_number: "",
    branch_name: "",
    routing_number: "",
    mobile_number: "",
    opening_balance: "0",
    note: "",
  };
  const [values, setValues] = useState(emptyValues);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function loadAccounts() {
    setLoading(true);
    try {
      const response = await apiRequest("/banks/list.php", { token, shopId });
      setAccounts(response.data.accounts);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, [token, shopId]);

  function startCreate() {
    setValues(emptyValues);
    setEditingAccount(null);
    setShowEditor(true);
  }

  function startEdit(account) {
    setValues({
      bank_name: account.bank_name || "",
      account_name: account.account_name || "",
      account_number: account.account_number || "",
      branch_name: account.branch_name || "",
      routing_number: account.routing_number || "",
      mobile_number: account.mobile_number || "",
      opening_balance: String(account.opening_balance ?? 0),
      note: account.note || "",
    });
    setEditingAccount(account);
    setShowEditor(true);
  }

  async function deleteAccount(account) {
    if (!account.can_delete) {
      showToast("error", account.has_transactions
        ? "লেনদেনে ব্যবহৃত ব্যাংক হিসাব মুছে ফেলা যাবে না।"
        : "প্রারম্ভিক ব্যালেন্স থাকা ব্যাংক হিসাব মুছে ফেলা যাবে না।");
      return;
    }
    if (!window.confirm(`“${account.bank_name} · ${account.account_name}” হিসাবটি মুছে ফেলবেন?`)) return;
    const reason = promptDeletionReason(`${account.bank_name} · ${account.account_name} ব্যাংক হিসাব`, showToast);
    if (!reason) return;
    try {
      const response = await apiRequest("/banks/delete.php", {
        method: "POST",
        token,
        shopId,
        body: JSON.stringify({ id: account.id, reason }),
      });
      showToast("success", response.message);
      await loadAccounts();
      onDataChanged();
    } catch (error) {
      showToast("error", error.message);
    }
  }

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await apiRequest(editingAccount ? "/banks/update.php" : "/banks/create.php", {
        method: "POST",
        token,
        shopId,
        body: JSON.stringify({
          ...values,
          ...(editingAccount ? { id: editingAccount.id } : {}),
        }),
      });
      showToast("success", response.message);
      await loadAccounts();
      onDataChanged();
      setShowEditor(false);
      setEditingAccount(null);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setSaving(false);
    }
  }

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredAccounts = accounts.filter((account) => (
    [
      account.bank_name,
      account.account_name,
      account.account_number,
      account.branch_name,
      account.routing_number,
      account.mobile_number,
      account.note,
    ].filter(Boolean).some((value) => String(value).toLocaleLowerCase().includes(normalizedSearch))
  ));
  const pageCount = Math.max(1, Math.ceil(filteredAccounts.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleAccounts = filteredAccounts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function field(name, label, options = {}) {
    const { type = "text", maxLength, step, min, placeholder = "" } = options;
    const required = name === "bank_name" || name === "account_name";
    return (
      <label className="product-form-field" htmlFor={`bank-${name.replaceAll("_", "-")}`} key={name}>
        <span className="product-field-label">{label}{required ? <span className="required-badge">আবশ্যক</span> : <span className="optional-label">ঐচ্ছিক</span>}</span>
        <input
          autoComplete="off"
          className="product-field-control"
          id={`bank-${name.replaceAll("_", "-")}`}
          maxLength={maxLength}
          min={min}
          name={name}
          onChange={updateField}
          placeholder={placeholder}
          required={required}
          step={step}
          type={type}
          value={values[name]}
        />
      </label>
    );
  }

  return (
    <div className="product-modal-backdrop">
      <section aria-labelledby="bank-setup-title" aria-modal="true" className="product-modal supplier-setup-modal" role="dialog">
        <header className="product-modal-header">
          <span className="product-modal-icon"><Landmark size={22} /></span>
          <div>
            <h2 id="bank-setup-title">{showEditor ? (editingAccount ? "ব্যাংক হিসাব সম্পাদনা" : "নতুন ব্যাংক হিসাব") : "ব্যাংক সেটআপ"}</h2>
            <p>ব্যাংক, অ্যাকাউন্টের তথ্য ও প্রারম্ভিক ব্যালেন্স পরিচালনা করুন।</p>
          </div>
          <button aria-label="ব্যাংক সেটআপ বন্ধ করুন" className="product-modal-close" disabled={saving} onClick={onClose} type="button"><X size={20} /></button>
        </header>
        {showEditor ? (
          <form className="product-form" onSubmit={handleSubmit}>
            <div className="product-form-grid">
              {field("bank_name", "ব্যাংকের নাম", { maxLength: 180, placeholder: "যেমন: সোনালী ব্যাংক" })}
              {field("account_name", "হিসাবের নাম", { maxLength: 180, placeholder: "হিসাবের মালিকের নাম" })}
              {field("account_number", "হিসাব নম্বর", { maxLength: 100 })}
              {field("branch_name", "শাখার নাম", { maxLength: 120 })}
              {field("routing_number", "রাউটিং নম্বর", { maxLength: 30 })}
              {field("mobile_number", "মোবাইল নম্বর", { maxLength: 20, placeholder: "ব্যাংক হিসাবের যোগাযোগ নম্বর" })}
              {field("opening_balance", "প্রারম্ভিক ব্যালেন্স (৳)", { type: "number", min: "0", step: "0.01" })}
              {field("note", "নোট", { maxLength: 255 })}
            </div>
            <footer className="product-form-actions">
              <span><span className="required-mark">*</span> ব্যাংক ও হিসাবের নাম আবশ্যক</span>
              <div>
                <button className="product-cancel-button" disabled={saving} onClick={() => setShowEditor(false)} type="button">বাতিল</button>
                <button className="product-save-button" disabled={saving} type="submit">
                  {saving ? <span className="button-spinner" /> : <Save size={17} />}
                  {saving ? "সংরক্ষণ হচ্ছে..." : editingAccount ? "পরিবর্তন সংরক্ষণ" : "ব্যাংক হিসাব সংরক্ষণ"}
                </button>
              </div>
            </footer>
          </form>
        ) : (
          <div className="user-list-content">
            <div className="product-list-toolbar">
              <label className="product-list-search" htmlFor="bank-account-search">
                <span>ব্যাংক হিসাব খুঁজুন</span>
                <input autoComplete="off" className="product-field-control" id="bank-account-search" onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }} placeholder="ব্যাংক, হিসাব নম্বর, শাখা বা মোবাইল" type="search" value={search} />
              </label>
              <span className="product-list-count">{numberFormatter.format(filteredAccounts.length)} / {numberFormatter.format(accounts.length)}টি হিসাব</span>
              <button className="product-save-button" onClick={startCreate} type="button"><Plus size={17} /> নতুন ব্যাংক হিসাব</button>
            </div>
            {loading ? (
              <div className="user-list-empty"><span className="button-spinner" /> ব্যাংক হিসাব লোড হচ্ছে...</div>
            ) : accounts.length === 0 ? (
              <div className="user-list-empty">এখনো কোনো ব্যাংক হিসাব যোগ করা হয়নি।</div>
            ) : filteredAccounts.length === 0 ? (
              <div className="user-list-empty">এই অনুসন্ধানে কোনো ব্যাংক হিসাব পাওয়া যায়নি।</div>
            ) : (
              <div className="user-table-wrap supplier-setup-table-wrap">
                <table className="user-management-table supplier-setup-table">
                  <thead><tr><th scope="col">ব্যাংক / হিসাব</th><th scope="col">হিসাব নম্বর / শাখা</th><th scope="col">যোগাযোগ</th><th scope="col">প্রারম্ভিক ব্যালেন্স</th><th scope="col">নোট</th><th scope="col">অ্যাকশন</th></tr></thead>
                  <tbody>
                    {visibleAccounts.map((account) => (
                      <tr key={account.id}>
                        <td><strong>{account.bank_name}</strong><span className="user-table-secondary">{account.account_name}</span></td>
                        <td>{account.account_number || "—"}<span className="user-table-secondary">{[account.branch_name, account.routing_number ? `রাউটিং ${account.routing_number}` : ""].filter(Boolean).join(" · ") || "—"}</span></td>
                        <td>{account.mobile_number || "—"}</td>
                        <td>৳ {formatMoney(account.opening_balance)}</td>
                        <td>{account.note || "—"}</td>
                        <td><div className="user-list-actions">
                          {canEdit ? <button aria-label={`${account.bank_name} হিসাব সম্পাদনা করুন`} className="user-action-button product-action-edit" onClick={() => startEdit(account)} title="এডিট" type="button"><Pencil size={16} /></button> : null}
                          {canDelete ? (
                            <button
                              aria-disabled={!account.can_delete}
                              aria-label={account.can_delete ? `${account.bank_name} হিসাব মুছুন` : `${account.bank_name} হিসাব মুছতে পারবেন না`}
                              className={`user-action-button user-action-delete product-action-trash${account.can_delete ? "" : " product-action-disabled"}`}
                              onClick={() => deleteAccount(account)}
                              title={account.can_delete ? "হিসাব মুছুন" : "প্রারম্ভিক ব্যালেন্স আছে"}
                              type="button"
                            ><Trash2 size={16} /></button>
                          ) : null}
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!loading && filteredAccounts.length > 0 ? (
              <div className="product-list-pagination">
                <span>{numberFormatter.format((currentPage - 1) * pageSize + 1)}–{numberFormatter.format(Math.min(currentPage * pageSize, filteredAccounts.length))} / {numberFormatter.format(filteredAccounts.length)}টি</span>
                <div>
                  <span className="product-list-page-size">প্রতি পাতায়{[10, 25, 50].map((size) => (
                    <button aria-pressed={pageSize === size} className={pageSize === size ? "product-list-page-size-active" : ""} key={size} onClick={() => {
                      setPageSize(size);
                      setPage(1);
                    }} type="button">{numberFormatter.format(size)}</button>
                  ))}</span>
                  <button disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} type="button">আগের</button>
                  <strong>{numberFormatter.format(currentPage)} / {numberFormatter.format(pageCount)}</strong>
                  <button disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)} type="button">পরের</button>
                </div>
              </div>
            ) : null}
            {canDelete && accounts.some((account) => !account.can_delete) ? (
              <p className="user-management-note">প্রারম্ভিক ব্যালেন্স থাকা ব্যাংক হিসাব মুছে ফেলা যাবে না।</p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function PurchaseForm({
  token,
  shopId,
  onClose,
  onSaved,
  onDataChanged = () => {},
  showToast,
  canCreateSupplier = false,
  initialPurchase = null,
}) {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showQuickSupplierForm, setShowQuickSupplierForm] = useState(false);
  const [values, setValues] = useState(() => ({
    supplier_id: initialPurchase ? String(initialPurchase.supplier_id) : "",
    bill_number: initialPurchase?.bill_number || "",
    purchase_date: initialPurchase?.purchase_date || new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10),
    destination_type: initialPurchase?.destination_type || "shop",
    warehouse_id: initialPurchase?.warehouse_id ? String(initialPurchase.warehouse_id) : "",
    notes: initialPurchase?.notes || "",
  }));
  const [items, setItems] = useState(() => initialPurchase?.items?.length
    ? initialPurchase.items.map((item, index) => ({
      rowId: index + 1,
      product_id: String(item.product_id),
      product_search: "",
      quantity: String(item.quantity),
      unit_price: String(item.unit_price),
    }))
    : [{ rowId: 1, product_id: "", product_search: "", quantity: "1", unit_price: "" }]);
  const [nextRowId, setNextRowId] = useState((initialPurchase?.items?.length || 1) + 1);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest("/suppliers/list.php", { token, shopId }),
      apiRequest("/products/list.php", { token, shopId }),
      apiRequest("/warehouses/list.php", { token }),
    ])
      .then(([supplierResponse, productResponse, warehouseResponse]) => {
        if (!active) return;
        setSuppliers(supplierResponse.data.suppliers);
        setProducts(productResponse.data.products);
        setWarehouses(warehouseResponse.data.warehouses);
      })
      .catch((error) => {
        if (active) showToast("error", error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, shopId, showToast]);

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  function handleQuickSupplierCreated(supplier) {
    setSuppliers((current) => [...current.filter((entry) => entry.id !== supplier.id), supplier]);
    updateField({ target: { name: "supplier_id", value: String(supplier.id) } });
    setShowQuickSupplierForm(false);
  }

  function updateItem(rowId, fieldName, value) {
    setItems((current) => current.map((item) => {
      if (item.rowId !== rowId) return item;
      if (fieldName === "product_id") {
        const product = products.find((entry) => String(entry.id) === String(value));
        return {
          ...item,
          product_id: product ? String(product.id) : "",
          product_search: product
            ? `${product.product_name}${product.product_code ? ` · ${product.product_code}` : ` · #${product.id}`}`
            : "",
          unit_price: product?.purchase_price || "",
        };
      }
      return { ...item, [fieldName]: value };
    }));
  }

  function addItem() {
    if (items.length >= 100) {
      showToast("error", "একটি চালানে সর্বোচ্চ ১০০টি পণ্য যোগ করা যাবে।");
      return;
    }
    setItems((current) => [
      ...current,
      { rowId: nextRowId, product_id: "", product_search: "", quantity: "1", unit_price: "" },
    ]);
    setNextRowId((current) => current + 1);
  }

  function removeItem(rowId) {
    setItems((current) => current.length > 1
      ? current.filter((item) => item.rowId !== rowId)
      : current.map((item) => (
        item.rowId === rowId
          ? { ...item, product_id: "", product_search: "", quantity: "1", unit_price: "" }
          : item
      )));
  }

  const totalAmount = items.reduce((sum, item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unit_price);
    return sum + (Number.isFinite(quantity) && Number.isFinite(unitPrice)
      ? quantity * unitPrice
      : 0);
  }, 0);
  const formattedTotal = formatMoney(totalAmount);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!values.supplier_id) {
      showToast("error", "সাপ্লায়ার নির্বাচন করুন।");
      return;
    }
    if (values.destination_type === "warehouse" && !values.warehouse_id) {
      showToast("error", "গুদাম নির্বাচন করুন।");
      return;
    }
    if (items.some((item) => !item.product_id || !item.quantity || item.unit_price === "")) {
      showToast("error", "প্রতিটি পণ্যের সারিতে পণ্য, পরিমাণ ও ক্রয়মূল্য পূরণ করুন।");
      return;
    }

    setSaving(true);
    try {
      const response = await apiRequest(initialPurchase ? "/purchases/update.php" : "/purchases/create.php", {
        method: "POST",
        token,
        shopId,
        body: JSON.stringify({
          ...(initialPurchase ? { purchase_id: initialPurchase.id } : {}),
          ...values,
          items: items.map(({ product_id, quantity, unit_price }) => ({
            product_id,
            quantity,
            unit_price,
          })),
        }),
      });
      showToast("success", response.message);
      onSaved();
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <div className="product-modal-backdrop">
      <section
        aria-labelledby="purchase-form-title"
        aria-modal="true"
        className="product-modal purchase-modal"
        role="dialog"
      >
        <header className="product-modal-header">
          <span className="product-modal-icon"><Receipt size={22} /></span>
          <div>
            <h2 id="purchase-form-title">{initialPurchase ? "ক্রয় / চালান সম্পাদনা" : "নতুন ক্রয় / চালান"}</h2>
            <p>সাপ্লায়ার ও পণ্যের গন্তব্য বেছে চালানের পণ্য কার্টে যোগ করুন।</p>
          </div>
          <button
            aria-label="ক্রয় ফর্ম বন্ধ করুন"
            className="product-modal-close"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </header>

        {loading ? (
          <div className="user-list-empty"><span className="button-spinner" /> ক্রয়ের তথ্য লোড হচ্ছে...</div>
        ) : products.length === 0 ? (
          <div className="user-list-empty purchase-empty-state">
            এই দোকানে পণ্য নেই। আগে পণ্য সেটআপ থেকে পণ্য যোগ করুন।
          </div>
        ) : (
          <form className="product-form" onSubmit={handleSubmit}>
            <div className="product-form-grid">
              <div className="product-form-field">
                <div className="sales-customer-field-heading">
                  <label className="product-field-label" htmlFor="purchase-supplier">সাপ্লায়ার</label>
                  {canCreateSupplier ? (
                    <button
                      aria-label="নতুন সাপ্লায়ার যোগ করুন"
                      className="user-action-button customer-quick-add"
                      onClick={() => setShowQuickSupplierForm(true)}
                      title="নতুন সাপ্লায়ার যোগ করুন"
                      type="button"
                    >
                      <Plus size={16} />
                    </button>
                  ) : null}
                </div>
                <SearchableSelect
                  className="product-field-control product-select-control"
                  id="purchase-supplier"
                  name="supplier_id"
                  onChange={updateField}
                  options={[
                    { value: "", label: "সাপ্লায়ার নির্বাচন করুন" },
                    ...suppliers.map((supplier) => ({
                      value: supplier.id,
                      label: `${supplier.supplier_name}${supplier.mobile_number ? ` · ${supplier.mobile_number}` : ""}`,
                    })),
                  ]}
                  placeholder="নাম বা মোবাইল দিয়ে খুঁজুন"
                  required
                  value={values.supplier_id}
                />
                {suppliers.length === 0 ? <small>চালান চালিয়ে যেতে নতুন সাপ্লায়ার যোগ করুন।</small> : null}
              </div>
              <label className="product-form-field" htmlFor="purchase-bill-number">
                <span className="product-field-label">সাপ্লায়ারের চালান নম্বর <span className="optional-label">ঐচ্ছিক</span></span>
                <input
                  className="product-field-control"
                  id="purchase-bill-number"
                  maxLength={80}
                  name="bill_number"
                  onChange={updateField}
                  value={values.bill_number}
                />
              </label>
              <label className="product-form-field" htmlFor="purchase-date">
                <span className="product-field-label">ক্রয়ের তারিখ</span>
                <input
                  className="product-field-control"
                  id="purchase-date"
                  name="purchase_date"
                  onChange={updateField}
                  required
                  type="date"
                  value={values.purchase_date}
                />
              </label>
              <label className="product-form-field" htmlFor="purchase-destination">
                <span className="product-field-label">পণ্য কোথায় জমা হবে?</span>
                <SearchableSelect
                  className="product-field-control product-select-control"
                  id="purchase-destination"
                  name="destination_type"
                  onChange={(event) => {
                    updateField(event);
                    if (event.target.value === "shop") {
                      setValues((current) => ({ ...current, warehouse_id: "" }));
                    }
                  }}
                  options={[
                    { value: "shop", label: "নির্বাচিত দোকানের স্টক" },
                    { value: "warehouse", label: "গুদামের স্টক" },
                  ]}
                  placeholder="গন্তব্য লিখে খুঁজুন"
                  value={values.destination_type}
                />
              </label>
              {values.destination_type === "warehouse" ? (
                <label className="product-form-field" htmlFor="purchase-warehouse">
                  <span className="product-field-label">গুদাম নির্বাচন করুন</span>
                  <SearchableSelect
                    className="product-field-control product-select-control"
                    id="purchase-warehouse"
                    name="warehouse_id"
                    onChange={updateField}
                    options={[
                      { value: "", label: "গুদাম নির্বাচন করুন" },
                      ...warehouses.map((warehouse) => ({
                        value: warehouse.id,
                        label: warehouse.warehouse_name,
                      })),
                    ]}
                    placeholder="গুদামের নাম লিখে খুঁজুন"
                    required
                    value={values.warehouse_id}
                  />
                </label>
              ) : null}
            </div>
            {values.destination_type === "warehouse" && warehouses.length === 0 ? (
              <p className="user-management-note">
                এখনো কোনো গুদাম নেই। আগে সেটআপ → গুদাম সেটআপ থেকে গুদাম যোগ করুন।
              </p>
            ) : null}

            <div className="purchase-cart-heading">
              <div>
                <h3>চালানের পণ্য</h3>
                <span>পণ্য নির্বাচন করুন, পরিমাণ ও ক্রয়মূল্য লিখুন</span>
              </div>
              <button className="purchase-add-row" onClick={addItem} type="button">
                <Plus size={17} /> পণ্য যোগ করুন
              </button>
            </div>
            <div className="purchase-cart">
              <table className="purchase-cart-table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">পণ্য</th>
                    <th scope="col">পরিমাণ</th>
                    <th scope="col">একক ক্রয়মূল্য (৳)</th>
                    <th scope="col">মোট (৳)</th>
                    <th scope="col"><span className="sr-only">অ্যাকশন</span></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const lineTotal = Number(item.quantity || 0) * Number(item.unit_price || 0);
                    const selectedProduct = products.find((entry) => entry.id === Number(item.product_id));
                    const selectedUnit = ELECTRICAL_UNITS.find((unit) => unit.value === selectedProduct?.unit);
                    return (
                      <tr key={item.rowId}>
                        <td className="purchase-cart-index">{index + 1}</td>
                        <td>
                          <div className="purchase-cart-product">
                            <SearchableSelect
                              className="product-field-control product-select-control"
                              id={`purchase-product-${item.rowId}`}
                              name={`purchase_product_${item.rowId}`}
                              onChange={(event) => updateItem(item.rowId, "product_id", event.target.value)}
                              portalOptions
                              placeholder="নাম বা কোড লিখে খুঁজুন"
                              ariaLabel={`${index + 1} নম্বর সারির পণ্য নির্বাচন`}
                              options={products.map((entry) => ({
                                value: entry.id,
                                label: `${entry.product_name}${entry.product_code ? ` · ${entry.product_code}` : ` · #${entry.id}`}`,
                              }))}
                              required
                              value={item.product_id}
                            />
                          </div>
                        </td>
                        <td>
                          <label className="purchase-cart-number" htmlFor={`purchase-qty-${item.rowId}`}>
                            <span className="purchase-input-group">
                              <input
                                className="product-field-control"
                                id={`purchase-qty-${item.rowId}`}
                                min="0.001"
                                onChange={(event) => updateItem(item.rowId, "quantity", event.target.value)}
                                required
                                step="0.001"
                                type="number"
                                value={item.quantity}
                              />
                              <span className="purchase-input-group-text">
                                {selectedUnit?.label || selectedProduct?.unit || "ইউনিট"}
                              </span>
                            </span>
                          </label>
                        </td>
                        <td>
                          <label className="purchase-cart-number" htmlFor={`purchase-price-${item.rowId}`}>
                            <input
                              className="product-field-control"
                              id={`purchase-price-${item.rowId}`}
                              min="0"
                              onChange={(event) => updateItem(item.rowId, "unit_price", event.target.value)}
                              required
                              step="0.01"
                              type="number"
                              value={item.unit_price}
                            />
                          </label>
                        </td>
                        <td>
                          <input
                            aria-label={`${index + 1} নম্বর সারির মোট মূল্য`}
                            className="product-field-control purchase-line-total-input"
                            readOnly
                            type="text"
                            value={formatMoney(lineTotal)}
                          />
                        </td>
                        <td>
                          <button
                            aria-label={`${index + 1} নম্বর পণ্য সারি সরান`}
                            className="purchase-remove-row"
                            onClick={() => removeItem(item.rowId)}
                            type="button"
                          >
                            <Trash2 size={17} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <label className="product-form-field purchase-notes-field" htmlFor="purchase-notes">
              <span className="product-field-label">নোট <span className="optional-label">ঐচ্ছিক</span></span>
              <textarea
                className="product-field-control customer-address-control"
                id="purchase-notes"
                maxLength={500}
                name="notes"
                onChange={updateField}
                rows={2}
                value={values.notes}
              />
            </label>
            <footer className="product-form-actions purchase-form-actions">
              <strong>চালানের মোট: ৳ {formattedTotal}</strong>
              <div>
                <button className="product-cancel-button" disabled={saving} onClick={onClose} type="button">
                  বাতিল
                </button>
                <button className="product-save-button" disabled={saving} type="submit">
                  {saving ? <span className="button-spinner" /> : <Save size={17} />}
                  {saving ? "সংরক্ষণ হচ্ছে..." : initialPurchase ? "পরিবর্তন সংরক্ষণ" : "ক্রয় বিল সংরক্ষণ"}
                </button>
              </div>
            </footer>
          </form>
        )}
      </section>
    </div>
    {showQuickSupplierForm && typeof document !== "undefined" ? createPortal(
      <SupplierSetupForm
        canDelete={false}
        canEdit={false}
        initialShowEditor
        onClose={() => setShowQuickSupplierForm(false)}
        onDataChanged={onDataChanged}
        onSupplierCreated={handleQuickSupplierCreated}
        showToast={showToast}
        shopId={shopId}
        token={token}
      />,
      document.body,
    ) : null}
    </>
  );
}

function SalesReceiptHeader({ receipt, shop }) {
  const isCustomerReturn = receipt.document_type === "customer_return";
  const [year, month, day] = String(receipt.sale_date || "").split("-");
  const formattedDate = year && month && day ? `${day}-${month}-${year}` : receipt.sale_date;
  const [hours, minutes] = String(receipt.sale_time || "").split(":").map(Number);
  const formattedTime = Number.isInteger(hours) && Number.isInteger(minutes)
    ? `${String(hours % 12 || 12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`
    : receipt.sale_time;
  return (
    <div className="sales-receipt-heading">
      <ShopPrintHeader shop={shop} />
      <span className="sales-receipt-title">{isCustomerReturn ? "কাস্টমার রিটার্ন রসিদ" : "বিক্রয় রসিদ"}</span>
      <div className="sales-receipt-meta">
        <span><strong>বিল নম্বর</strong><b>{receipt.invoice_number}</b></span>
        <span><strong>তারিখ ও সময়</strong><b>{formattedDate}{formattedTime ? ` · ${formattedTime}` : ""}</b></span>
        {!isCustomerReturn ? <span><strong>বিক্রয়ের স্থান</strong><b>{receipt.sale_source === "warehouse" ? receipt.warehouse_name : "দোকান"}</b></span> : null}
        <span><strong>অপারেটর</strong><b>{receipt.operator_name || "—"}</b></span>
        <span className="sales-receipt-customer-info">
          <strong>কাস্টমার:</strong>
          <b>{[
            receipt.customer_name,
            receipt.customer_id ? receipt.customer_mobile_number : "",
            receipt.customer_id ? receipt.customer_address : "",
          ].filter(Boolean).join(", ")}</b>
        </span>
      </div>
    </div>
  );
}

function SalesReceiptFooter() {
  return (
    <footer className="sales-receipt-footer">
      <blockquote>“আপনার আস্থাই আমাদের এগিয়ে চলার প্রেরণা”</blockquote>
      <div className="sales-receipt-signatures">
        <div><span /><strong>কর্তৃপক্ষের স্বাক্ষর</strong></div>
        <div><span /><strong>ক্রেতার স্বাক্ষর</strong></div>
      </div>
      <div className="sales-receipt-thanks">
        <strong>ধন্যবাদ — আবার আসবেন</strong>
        <span>এই মেমোটি কম্পিউটার দ্বারা তৈরি।</span>
      </div>
    </footer>
  );
}

function QuotationMemo({ quotation, shop, onClose }) {
  const formatDate = (date) => {
    const [year, month, day] = String(date || "").split("-");
    return year && month && day ? `${day}-${month}-${year}` : date;
  };

  useEffect(() => {
    document.body.classList.add("printing-sales-memo");
    return () => document.body.classList.remove("printing-sales-memo");
  }, []);

  return createPortal((
    <div className="product-modal-backdrop sales-print-backdrop">
      <section aria-label={`কোটেশন ${quotation.quotation_number}`} aria-modal="true" className="product-modal sales-modal" role="dialog">
        <header className="product-modal-header no-print">
          <span className="product-modal-icon"><FileText size={22} /></span>
          <div><h2>কোটেশন</h2><p>{quotation.quotation_number}</p></div>
          <button aria-label="কোটেশন বন্ধ করুন" className="product-modal-close" onClick={onClose} type="button"><X size={20} /></button>
        </header>
        <div className="sales-receipt quotation-print">
          <div className="sales-receipt-heading">
            <ShopPrintHeader shop={shop} />
            <span className="sales-receipt-title">মূল্য প্রস্তাব / কোটেশন</span>
            <div className="sales-receipt-meta">
              <span><strong>কোটেশন নম্বর</strong><b>{quotation.quotation_number}</b></span>
              <span><strong>ইস্যুর তারিখ</strong><b>{formatDate(quotation.issue_date)}</b></span>
              <span><strong>মেয়াদ</strong><b>{formatDate(quotation.valid_until)}</b></span>
              <span className="sales-receipt-customer-info">
                <strong>প্রাপক:</strong>
                <b>{[quotation.customer_name, quotation.mobile_number, quotation.address].filter(Boolean).join(", ")}</b>
              </span>
            </div>
          </div>
          <p className="quotation-greeting">
            <strong>সম্মানিত মহোদয়/মহোদয়া,</strong>
            আপনার প্রতিষ্ঠানের চাহিদা অনুযায়ী নিম্নোক্ত পণ্যসমূহের মূল্য প্রস্তাব সদয় বিবেচনার জন্য পেশ করা হলো।
          </p>
          <div className="sales-receipt-lines">
            <table className="sales-receipt-table">
              <thead><tr><th>পণ্যের নাম</th><th>পরিমাণ</th><th>একক</th><th>দর</th><th>মোট মূল্য</th></tr></thead>
              <tbody>{quotation.items.map((item, index) => (
                <tr key={`quotation-${item.id || index}`}>
                  <td>{item.product_name}{item.product_code ? <small>{item.product_code}</small> : null}</td>
                  <td>{numberFormatter.format(item.quantity)}</td>
                  <td>{item.unit || "—"}</td>
                  <td>৳ {formatMoney(item.unit_price)}</td>
                  <td>৳ {formatMoney(item.line_total)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <dl className="sales-receipt-summary">
            <div><dt>পণ্যের মূল্য</dt><dd>৳ {formatMoney(quotation.subtotal)}</dd></div>
            <div><dt>ভ্যাট (+)</dt><dd>৳ {formatMoney(quotation.vat_amount)}</dd></div>
            <div><dt>ছাড় (−)</dt><dd>৳ {formatMoney(quotation.discount_amount)}</dd></div>
            <div className="sales-receipt-net"><dt>সর্বমোট প্রস্তাবিত মূল্য</dt><dd>৳ {formatMoney(quotation.total_amount)}</dd></div>
          </dl>
          {quotation.terms ? <div className="quotation-terms"><strong>শর্তাবলি</strong><p>{quotation.terms}</p></div> : null}
          <div className="sales-receipt-footer">
            <blockquote>আমাদের প্রস্তাবটি বিবেচনা করার জন্য ধন্যবাদ।</blockquote>
            <div className="sales-receipt-signatures">
              <div><span /><strong>কর্তৃপক্ষের স্বাক্ষর</strong></div>
              <div><span /><strong>ক্রেতার স্বাক্ষর / সিল</strong></div>
            </div>
            <div className="sales-receipt-thanks">
              <strong>কোটেশনের মেয়াদ</strong>
              <span>{formatDate(quotation.valid_until)} পর্যন্ত প্রযোজ্য।</span>
            </div>
          </div>
          <div className="sales-receipt-actions no-print">
            <button className="user-action-button sales-receipt-print-button" onClick={() => window.print()} type="button"><Printer size={17} /> প্রিন্ট কোটেশন</button>
            <button className="product-save-button" onClick={onClose} type="button">বন্ধ</button>
          </div>
        </div>
      </section>
    </div>
  ), document.body);
}

function QuotationPanel({ token, shopId, shop, onClose, onChanged, showToast }) {
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const defaultValidity = new Date(`${today}T00:00:00`);
  defaultValidity.setDate(defaultValidity.getDate() + 30);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("create");
  const [preview, setPreview] = useState(null);
  const [conversionQuote, setConversionQuote] = useState(null);
  const [loadingQuoteId, setLoadingQuoteId] = useState(null);
  const [values, setValues] = useState({
    customer_id: "",
    customer_name: "",
    mobile_number: "",
    address: "",
    issue_date: today,
    valid_until: defaultValidity.toISOString().slice(0, 10),
    vat_amount: "0",
    discount_amount: "0",
    terms: "",
  });
  const [items, setItems] = useState([
    { rowId: 1, product_id: "", quantity: "1", unit_price: "" },
  ]);
  const [nextRowId, setNextRowId] = useState(2);

  async function loadQuotations(searchText = search) {
    const query = new URLSearchParams();
    if (searchText.trim()) query.set("search", searchText.trim());
    try {
      const response = await apiRequest(`/quotations/list.php?${query.toString()}`, { token, shopId });
      setQuotations(response.data.quotations);
    } catch (error) {
      showToast("error", error.message);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest("/customers/list.php", { token, shopId }),
      apiRequest("/products/list.php", { token, shopId }),
      apiRequest("/quotations/list.php", { token, shopId }),
    ])
      .then(([customerResponse, productResponse, quotationResponse]) => {
        if (!active) return;
        setCustomers(customerResponse.data.customers);
        setProducts(productResponse.data.products);
        setQuotations(quotationResponse.data.quotations);
      })
      .catch((error) => {
        if (active) showToast("error", error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, shopId, showToast]);

  function updateField(event) {
    const { name, value } = event.target;
    if (name === "customer_id") {
      const customer = customers.find((entry) => String(entry.id) === value);
      setValues((current) => ({
        ...current,
        customer_id: value,
        customer_name: customer?.customer_name || (value ? current.customer_name : ""),
        mobile_number: customer?.mobile_number || (value ? current.mobile_number : ""),
        address: customer?.address || (value ? current.address : ""),
      }));
      return;
    }
    if (name === "customer_name" && values.customer_id) {
      setValues((current) => ({ ...current, customer_id: "", customer_name: value }));
      return;
    }
    setValues((current) => ({ ...current, [name]: value }));
  }

  function updateQuotationItem(rowId, field, value) {
    setItems((current) => current.map((item) => {
      if (item.rowId !== rowId) return item;
      if (field === "product_id") {
        const product = products.find((entry) => String(entry.id) === String(value));
        return {
          ...item,
          product_id: product ? String(product.id) : "",
          unit_price: product?.sale_price || "",
        };
      }
      return { ...item, [field]: value };
    }));
  }

  function addQuotationItem() {
    if (items.length >= 100) {
      showToast("error", "একটি কোটেশনে সর্বোচ্চ ১০০টি পণ্য যোগ করা যাবে।");
      return;
    }
    setItems((current) => [...current, {
      rowId: nextRowId,
      product_id: "",
      quantity: "1",
      unit_price: "",
    }]);
    setNextRowId((current) => current + 1);
  }

  function resetForm() {
    setValues({
      customer_id: "",
      customer_name: "",
      mobile_number: "",
      address: "",
      issue_date: today,
      valid_until: defaultValidity.toISOString().slice(0, 10),
      vat_amount: "0",
      discount_amount: "0",
      terms: "",
    });
    setItems([{ rowId: nextRowId, product_id: "", quantity: "1", unit_price: "" }]);
    setNextRowId((current) => current + 1);
  }

  const subtotal = items.reduce((total, item) => (
    total + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
  ), 0);
  const totalAmount = subtotal + (Number(values.vat_amount) || 0) - (Number(values.discount_amount) || 0);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!values.customer_name.trim()) {
      showToast("error", "কাস্টমার বা কোম্পানির নাম লিখুন।");
      return;
    }
    if (!items.length || items.some((item) => !item.product_id || !item.quantity || item.unit_price === "")) {
      showToast("error", "প্রতিটি পণ্যের সারিতে পণ্য, পরিমাণ ও দর পূরণ করুন।");
      return;
    }
    if (values.valid_until < values.issue_date) {
      showToast("error", "কোটেশনের মেয়াদ ইস্যুর তারিখের আগে হতে পারবে না।");
      return;
    }
    if (Number(values.discount_amount) > subtotal + Number(values.vat_amount)) {
      showToast("error", "ছাড় পণ্যমূল্য ও ভ্যাটের যোগফলের চেয়ে বেশি হতে পারবে না।");
      return;
    }
    setSaving(true);
    try {
      const response = await apiRequest("/quotations/create.php", {
        method: "POST",
        token,
        shopId,
        body: JSON.stringify({
          ...values,
          customer_name: values.customer_name.trim(),
          mobile_number: values.mobile_number.trim(),
          address: values.address.trim(),
          items: items.map(({ product_id, quantity, unit_price }) => ({ product_id, quantity, unit_price })),
        }),
      });
      showToast("success", response.message);
      await loadQuotations("");
      setSearch("");
      setView("list");
      resetForm();
      onChanged();
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setSaving(false);
    }
  }

  async function openQuotation(quotation, purpose) {
    setLoadingQuoteId(quotation.id);
    try {
      const response = await apiRequest(`/quotations/receipt.php?id=${encodeURIComponent(quotation.id)}`, { token, shopId });
      const fullQuotation = response.data.quotation;
      if (purpose === "convert") {
        if (fullQuotation.status !== "open") {
          showToast("error", "শুধু মেয়াদ থাকা খোলা কোটেশন বিক্রয়ে রূপান্তর করা যাবে।");
          return;
        }
        if (fullQuotation.items.some((item) => !item.product_id)) {
          showToast("error", "কোটেশনের কোনো পণ্য আর সক্রিয় নেই; বিক্রয়ে রূপান্তর করা যাবে না।");
          return;
        }
        setConversionQuote(fullQuotation);
      } else {
        setPreview({ quotation: fullQuotation, shop: response.data.shop });
      }
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setLoadingQuoteId(null);
    }
  }

  const statusLabels = {
    open: "খোলা",
    expired: "মেয়াদ শেষ",
    converted: "বিক্রয়ে রূপান্তরিত",
    cancelled: "বাতিল",
  };

  return (
    <>
      <div className="product-modal-backdrop stock-report-backdrop">
        <section aria-labelledby="quotation-panel-title" aria-modal="true" className="product-modal stock-report-modal quotation-panel" role="dialog">
          <header className="product-modal-header no-print">
            <span className="product-modal-icon"><FileText size={22} /></span>
            <div><h2 id="quotation-panel-title">কোটেশন</h2><p>কাস্টমার বা কোম্পানিকে মূল্য প্রস্তাব তৈরি, প্রিন্ট ও বিক্রয়ে রূপান্তর করুন।</p></div>
            <button aria-label="কোটেশন বন্ধ করুন" className="product-modal-close" onClick={onClose} type="button"><X size={20} /></button>
          </header>
          <div className="quotation-tabs no-print">
            <button className={view === "create" ? "active" : ""} onClick={() => setView("create")} type="button"><Plus size={16} /> নতুন কোটেশন</button>
            <button className={view === "list" ? "active" : ""} onClick={() => setView("list")} type="button"><FileText size={16} /> কোটেশনের তালিকা</button>
          </div>
          {view === "create" ? (
            <form className="product-form quotation-form" onSubmit={handleSubmit}>
              <div className="product-form-grid quotation-client-grid">
                <label className="product-form-field">
                  <span className="product-field-label">সেটআপ কাস্টমার <span className="optional-label">ঐচ্ছিক</span></span>
                  <SearchableSelect
                    id="quotation-customer"
                    name="customer_id"
                    onChange={updateField}
                    options={[
                      { value: "", label: "ওয়াক-ইন / নতুন কোম্পানি" },
                      ...customers.map((customer) => ({
                        value: customer.id,
                        label: `${customer.customer_name}${customer.mobile_number ? ` · ${customer.mobile_number}` : ""}`,
                      })),
                    ]}
                    placeholder="কাস্টমার খুঁজে নির্বাচন করুন"
                    value={values.customer_id}
                  />
                </label>
                <label className="product-form-field" htmlFor="quotation-customer-name">
                  <span className="product-field-label">কাস্টমার / কোম্পানির নাম</span>
                  <input className="product-field-control" id="quotation-customer-name" maxLength={180} name="customer_name" onChange={updateField} required value={values.customer_name} />
                </label>
                <label className="product-form-field" htmlFor="quotation-mobile">
                  <span className="product-field-label">মোবাইল নম্বর <span className="optional-label">ঐচ্ছিক</span></span>
                  <input className="product-field-control" id="quotation-mobile" maxLength={20} name="mobile_number" onChange={updateField} value={values.mobile_number} />
                </label>
                <label className="product-form-field" htmlFor="quotation-address">
                  <span className="product-field-label">ঠিকানা <span className="optional-label">ঐচ্ছিক</span></span>
                  <input className="product-field-control" id="quotation-address" maxLength={255} name="address" onChange={updateField} value={values.address} />
                </label>
                <label className="product-form-field" htmlFor="quotation-issue-date">
                  <span className="product-field-label">ইস্যুর তারিখ</span>
                  <input className="product-field-control" id="quotation-issue-date" name="issue_date" onChange={updateField} required type="date" value={values.issue_date} />
                </label>
                <label className="product-form-field" htmlFor="quotation-valid-until">
                  <span className="product-field-label">মেয়াদ শেষ</span>
                  <input className="product-field-control" id="quotation-valid-until" min={values.issue_date} name="valid_until" onChange={updateField} required type="date" value={values.valid_until} />
                </label>
              </div>
              <div className="purchase-cart-heading">
                <div><h3>প্রস্তাবিত পণ্য</h3><span>কোটেশন তৈরি করলে স্টক পরিবর্তন হবে না</span></div>
                <button className="purchase-add-row" onClick={addQuotationItem} type="button"><Plus size={17} /> পণ্য যোগ করুন</button>
              </div>
              <div className="sales-cart-table-wrap">
                <table className="sales-cart-table quotation-cart-table">
                  <thead><tr><th scope="col">ক্রম</th><th scope="col">পণ্য</th><th scope="col">পরিমাণ</th><th scope="col">একক দর (৳)</th><th scope="col">মোট (৳)</th><th scope="col"><span className="sr-only">অ্যাকশন</span></th></tr></thead>
                  <tbody>{items.map((item, index) => {
                    const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
                    const product = products.find((entry) => entry.id === Number(item.product_id));
                    const selectedUnit = ELECTRICAL_UNITS.find((unit) => unit.value === product?.unit);
                    return (
                      <tr key={item.rowId}>
                        <td className="sales-cart-index">{index + 1}</td>
                        <td><div className="sales-cart-cell-control"><SearchableSelect
                          ariaLabel={`${index + 1} নম্বর সারির পণ্য নির্বাচন`}
                          className="product-field-control product-select-control"
                          id={`quotation-product-${item.rowId}`}
                          name={`quotation-product-${item.rowId}`}
                          onChange={(event) => updateQuotationItem(item.rowId, "product_id", event.target.value)}
                          options={products.map((entry) => ({
                            value: entry.id,
                            label: `${entry.product_name}${entry.product_code ? ` · ${entry.product_code}` : ""}`,
                          }))}
                          portalOptions
                          placeholder="নাম/বারকোড"
                          required
                          value={item.product_id}
                        /></div></td>
                        <td><label className="sales-cart-cell-control" htmlFor={`quotation-qty-${item.rowId}`}><span className="purchase-input-group">
                          <input aria-label={`${index + 1} নম্বর সারির পরিমাণ`} className="product-field-control" id={`quotation-qty-${item.rowId}`} min="0.001" onChange={(event) => updateQuotationItem(item.rowId, "quantity", event.target.value)} required step="0.001" type="number" value={item.quantity} />
                          <span className="purchase-input-group-text">{selectedUnit?.label || product?.unit || "ইউনিট"}</span>
                        </span></label></td>
                        <td><label className="sales-cart-cell-control" htmlFor={`quotation-price-${item.rowId}`}><input aria-label={`${index + 1} নম্বর সারির দর`} className="product-field-control" id={`quotation-price-${item.rowId}`} min="0" onChange={(event) => updateQuotationItem(item.rowId, "unit_price", event.target.value)} required step="0.01" type="number" value={item.unit_price} /></label></td>
                        <td><input aria-label={`${index + 1} নম্বর সারির মোট মূল্য`} className="product-field-control purchase-line-total-input" readOnly type="text" value={formatMoney(lineTotal)} /></td>
                        <td><button aria-label={`${index + 1} নম্বর পণ্য সরান`} className="purchase-remove-row" disabled={items.length <= 1} onClick={() => setItems((current) => current.filter((entry) => entry.rowId !== item.rowId))} type="button"><Trash2 size={16} /></button></td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
              <div className="quotation-bottom-grid">
                <label className="product-form-field" htmlFor="quotation-terms">
                  <span className="product-field-label">শর্তাবলি / নোট <span className="optional-label">ঐচ্ছিক</span></span>
                  <textarea className="product-field-control customer-address-control" id="quotation-terms" maxLength={2000} name="terms" onChange={updateField} rows={3} value={values.terms} />
                </label>
                <div className="quotation-calculation">
                  <label><span>পণ্যের মূল্য</span><strong>৳ {formatMoney(subtotal)}</strong></label>
                  <label><span>ভ্যাট</span><input className="product-field-control" min="0" name="vat_amount" onChange={updateField} step="0.01" type="number" value={values.vat_amount} /></label>
                  <label><span>ছাড়</span><input className="product-field-control" min="0" name="discount_amount" onChange={updateField} step="0.01" type="number" value={values.discount_amount} /></label>
                  <label className="quotation-total"><span>মোট</span><strong>৳ {formatMoney(Math.max(0, totalAmount))}</strong></label>
                </div>
              </div>
              <footer className="product-form-actions">
                <span>কোটেশন স্টক বা বকেয়া পরিবর্তন করে না।</span>
                <div><button className="product-cancel-button" disabled={saving} onClick={resetForm} type="button">ফর্ম পরিষ্কার</button>
                  <button className="product-save-button" disabled={saving || products.length === 0} type="submit">{saving ? <span className="button-spinner" /> : <Save size={17} />}{saving ? "সংরক্ষণ হচ্ছে..." : "কোটেশন সংরক্ষণ"}</button></div>
              </footer>
            </form>
          ) : (
            <div className="quotation-list-content">
              <form className="quotation-search no-print" onSubmit={(event) => { event.preventDefault(); loadQuotations(); }}>
                <input className="product-field-control" maxLength={120} onChange={(event) => setSearch(event.target.value)} placeholder="কোটেশন নম্বর, কাস্টমার বা মোবাইল খুঁজুন" value={search} />
                <button className="user-action-button" type="submit"><Search size={16} /> খুঁজুন</button>
              </form>
              {loading ? <div className="user-list-empty"><span className="button-spinner" /> কোটেশন লোড হচ্ছে...</div> : quotations.length ? (
                <div className="stock-report-table-wrap quotation-list-table-wrap">
                  <table className="stock-report-table quotation-list-table">
                    <thead><tr><th>কোটেশন</th><th>কাস্টমার / কোম্পানি</th><th>তারিখ</th><th>মেয়াদ</th><th>মোট</th><th>অবস্থা</th><th className="no-print">কাজ</th></tr></thead>
                    <tbody>{quotations.map((quotation) => (
                      <tr key={quotation.id}>
                        <td><strong>{quotation.quotation_number}</strong></td>
                        <td>{quotation.customer_name}<small>{quotation.mobile_number || ""}</small></td>
                        <td>{quotation.issue_date}</td>
                        <td>{quotation.valid_until}</td>
                        <td>৳ {formatMoney(quotation.total_amount)}</td>
                        <td><span className={`quotation-status quotation-status-${quotation.status}`}>{statusLabels[quotation.status] || quotation.status}</span>
                          {quotation.invoice_number ? <small>{quotation.invoice_number}</small> : null}</td>
                        <td className="no-print">
                          <div className="quotation-row-actions">
                            <button className="user-action-button" disabled={loadingQuoteId !== null} onClick={() => openQuotation(quotation, "print")} type="button"><Printer size={14} /> মেমো</button>
                            {quotation.status === "open" ? <button className="product-save-button quotation-convert-button" disabled={loadingQuoteId !== null} onClick={() => openQuotation(quotation, "convert")} type="button"><ShoppingCart size={14} /> বিক্রয়</button> : null}
                          </div>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <div className="user-list-empty">কোনো কোটেশন পাওয়া যায়নি।</div>}
            </div>
          )}
        </section>
      </div>
      {preview ? <QuotationMemo quotation={preview.quotation} shop={preview.shop || shop} onClose={() => setPreview(null)} /> : null}
      {conversionQuote ? (
        <SalesForm
          initialQuote={conversionQuote}
          onClose={() => setConversionQuote(null)}
          onQuoteConverted={() => {
            loadQuotations();
            onChanged();
          }}
          showToast={showToast}
          shop={shop}
          shopId={shopId}
          token={token}
        />
      ) : null}
    </>
  );
}

function SalesForm({
  token,
  shopId,
  shop,
  onClose,
  onSaved = () => {},
  onQuoteConverted = () => {},
  showToast,
  canCreateCustomer = false,
  initialSale = null,
  initialQuote = null,
}) {
  const [customers, setCustomers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [saleSource, setSaleSource] = useState("shop");
  const [warehouseId, setWarehouseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [showQuickCustomerForm, setShowQuickCustomerForm] = useState(false);
  const [values, setValues] = useState({
    customer_id: "",
    customer_search: "",
    customer_name: "",
    sale_date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10),
    vat_amount: "0",
    discount_amount: "0",
    special_discount_amount: "0",
    payment_method: "cash",
    payment_received: "",
    notes: "",
  });
  const [items, setItems] = useState([
    { rowId: 1, product_id: "", product_search: "", quantity: "1", unit_price: "" },
  ]);
  const [nextRowId, setNextRowId] = useState(2);
  const [showReturns, setShowReturns] = useState(false);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [returnableItems, setReturnableItems] = useState([]);
  const [walkInSuggestions, setWalkInSuggestions] = useState([]);
  const [selectedReturnInvoice, setSelectedReturnInvoice] = useState("");
  const [returnQuantities, setReturnQuantities] = useState({});

  useEffect(() => {
    if (!initialSale && !initialQuote) return;
    if (initialSale) {
      setSaleSource(initialSale.sale_source);
      setWarehouseId(initialSale.warehouse_id ? String(initialSale.warehouse_id) : "");
    } else {
      setSaleSource("shop");
      setWarehouseId("");
    }
    const source = initialSale || initialQuote;
    const customerId = source.customer_id ? Number(source.customer_id) : null;
    setValues({
      customer_id: customerId ? String(customerId) : "",
      customer_search: customerId
        ? customerOptionLabel(customers.find((customer) => customer.id === customerId) || {
          customer_name: source.customer_name,
          id: customerId,
          mobile_number: source.mobile_number,
        })
        : "",
      customer_name: customerId ? "" : source.customer_name,
      sale_date: initialSale?.sale_date || new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10),
      vat_amount: String(source.vat_amount || 0),
      discount_amount: String(source.discount_amount || 0),
      special_discount_amount: String(initialSale?.special_discount_amount || 0),
      payment_method: initialSale?.payment_method || (customerId ? "credit" : "cash"),
      payment_received: initialSale ? String(initialSale.payment_received) : "",
      notes: initialSale?.notes || (initialQuote ? `কোটেশন ${initialQuote.quotation_number} থেকে` : ""),
    });
    const saleItems = source.items.map((item, index) => ({
      rowId: index + 1,
      product_id: String(item.product_id),
      product_search: `${item.product_name}${item.product_code ? ` · ${item.product_code}` : ""}`,
      quantity: String(item.quantity),
      unit_price: String(item.unit_price),
    }));
    setItems(saleItems);
    setNextRowId(saleItems.length + 1);
  }, [initialSale, initialQuote, customers]);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest("/customers/list.php", { token, shopId }),
      apiRequest("/warehouses/list.php", { token, shopId }),
    ])
      .then(([customerResponse, warehouseResponse]) => {
        if (!active) return;
        setCustomers(customerResponse.data.customers);
        setWarehouses(warehouseResponse.data.warehouses);
      })
      .catch((error) => {
        if (active) showToast("error", error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, shopId, showToast]);

  useEffect(() => {
    if (saleSource === "warehouse" && !warehouseId) {
      const sourceItems = initialSale?.items || initialQuote?.items || [];
      setProducts(sourceItems.map((item) => ({
        id: Number(item.product_id),
        product_name: item.product_name,
        product_code: item.product_code,
        unit: item.unit,
        available_stock: initialSale ? Number(item.quantity) : 0,
      })));
      setLoadingProducts(false);
      return undefined;
    }
    let active = true;
    const query = new URLSearchParams({ stock_source: saleSource });
    if (saleSource === "warehouse") query.set("warehouse_id", warehouseId);
    setLoadingProducts(true);
    apiRequest(`/products/list.php?${query.toString()}`, { token, shopId })
      .then((response) => {
        if (!active) return;
        const byId = new Map(response.data.products.map((product) => [product.id, product]));
        const sourceItems = initialSale?.items || initialQuote?.items || [];
        sourceItems.forEach((item) => {
          const productId = Number(item.product_id);
          if (productId && !byId.has(productId)) {
            byId.set(productId, {
              id: productId,
              product_name: item.product_name,
              product_code: item.product_code,
              unit: item.unit,
              available_stock: initialSale ? Number(item.quantity) : 0,
            });
          }
        });
        setProducts([...byId.values()]);
      })
      .catch((error) => {
        if (active) showToast("error", error.message);
      })
      .finally(() => {
        if (active) setLoadingProducts(false);
      });
    return () => {
      active = false;
    };
  }, [token, shopId, showToast, saleSource, warehouseId, initialSale, initialQuote]);

  useEffect(() => {
    const search = values.customer_name.trim();
    if (values.customer_id || search.length < 1) {
      setWalkInSuggestions([]);
      return undefined;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const response = await apiRequest(
          `/sales/walkin-customers.php?search=${encodeURIComponent(search)}`,
          { token, shopId },
        );
        if (active) setWalkInSuggestions(response.data.names);
      } catch (error) {
        if (active) showToast("error", error.message);
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [token, shopId, showToast, values.customer_id, values.customer_name]);

  const selectedCustomer = customers.find(
    (customer) => customer.id === Number(values.customer_id),
  );
  const previousDue = Number(selectedCustomer?.current_balance || 0)
    - (initialSale ? Number(initialSale.net_amount) - Number(initialSale.previous_due_amount) : 0);

  function customerOptionLabel(customer) {
    return `${customer.customer_name}${customer.mobile_number
      ? ` · ${customer.mobile_number}`
      : ` · #${customer.id}`}`;
  }

  function handleQuickCustomerCreated(customer) {
    setCustomers((current) => [...current.filter((entry) => entry.id !== customer.id), customer]);
    updateField({ target: { name: "customer_id", value: String(customer.id) } });
    setShowQuickCustomerForm(false);
  }

  function updateField(event) {
    const { name, value } = event.target;
    if (name === "customer_search") {
      const normalizedValue = value.trim().toLocaleLowerCase();
      const customer = customers.find((entry) => (
        customerOptionLabel(entry).toLocaleLowerCase() === normalizedValue
        || entry.customer_name.trim().toLocaleLowerCase() === normalizedValue
        || (entry.mobile_number && entry.mobile_number.trim().toLocaleLowerCase() === normalizedValue)
      ));
      setValues((current) => ({
        ...current,
        customer_search: customer ? customerOptionLabel(customer) : value,
        customer_id: customer ? String(customer.id) : "",
        payment_method: customer ? "credit" : "cash",
        payment_received: "",
      }));
      setReturnableItems([]);
      setSelectedReturnInvoice("");
      setReturnQuantities({});
      setShowReturns(false);
      return;
    }
    if (name === "customer_id") {
      setValues((current) => ({
        ...current,
        customer_id: value,
        customer_search: "",
        customer_name: value ? "" : current.customer_name,
        payment_method: value ? "credit" : "cash",
        payment_received: "",
      }));
      setReturnableItems([]);
      setSelectedReturnInvoice("");
      setReturnQuantities({});
      setShowReturns(false);
      return;
    }
    setValues((current) => ({ ...current, [name]: value }));
  }

  function updateItem(rowId, fieldName, value) {
    setItems((current) => current.map((item) => {
      if (item.rowId !== rowId) return item;
      if (fieldName === "product_id" || fieldName === "product_search") {
        const product = products.find((entry) => {
          if (fieldName === "product_id") return String(entry.id) === String(value);
          const label = `${entry.product_name}${entry.product_code ? ` · ${entry.product_code}` : ` · #${entry.id}`}`;
          return label === value
            || (entry.product_code && entry.product_code.toLocaleLowerCase() === value.trim().toLocaleLowerCase());
        });
        return {
          ...item,
          product_id: product ? String(product.id) : "",
          product_search: product
            ? `${product.product_name}${product.product_code ? ` · ${product.product_code}` : ` · #${product.id}`}`
            : "",
          unit_price: product?.sale_price || "",
        };
      }
      return { ...item, [fieldName]: value };
    }));
  }

  function addItem() {
    if (items.length >= 100) {
      showToast("error", "একটি বিলে সর্বোচ্চ ১০০টি পণ্য যোগ করা যাবে।");
      return;
    }
    setItems((current) => [
      ...current,
      { rowId: nextRowId, product_id: "", product_search: "", quantity: "1", unit_price: "" },
    ]);
    setNextRowId((current) => current + 1);
  }

  function removeItem(rowId) {
    setItems((current) => {
      if (current.length > 1) {
        return current.filter((item) => item.rowId !== rowId);
      }
      return current.map((item) => (
        item.rowId === rowId
          ? { ...item, product_id: "", product_search: "", quantity: "1", unit_price: "" }
          : item
      ));
    });
  }

  function changeSaleSource(event) {
    const source = event.target.value;
    setSaleSource(source);
    setWarehouseId("");
    setProducts([]);
    if (!initialQuote) {
      setItems((current) => current.map((item) => ({
        ...item,
        product_id: "",
        product_search: "",
        unit_price: "",
      })));
    }
  }

  async function loadReturnableItems() {
    if (showReturns) {
      setShowReturns(false);
      setReturnQuantities({});
      return;
    }
    if (!values.customer_id && !values.customer_name.trim()) {
      showToast("info", "ওয়াক-ইন কাস্টমারের আগের বিল খুঁজতে আগে তার নাম লিখুন।");
      return;
    }
    setLoadingReturns(true);
    try {
      const query = new URLSearchParams();
      if (values.customer_id) query.set("customer_id", values.customer_id);
      else if (values.customer_name.trim()) query.set("customer_name", values.customer_name.trim());
      if (initialSale) query.set("exclude_sale_id", String(initialSale.id));
      const queryString = query.toString();
      const suffix = queryString ? `?${queryString}` : "";
      const response = await apiRequest(`/sales/returnable.php${suffix}`, {
        token,
        shopId,
      });
      setReturnableItems(response.data.items);
      setSelectedReturnInvoice("");
      setReturnQuantities({});
      setShowReturns(true);
      if (response.data.items.length === 0) {
        showToast("info", "এই কাস্টমারের ফেরতযোগ্য আগের বিক্রয় পণ্য পাওয়া যায়নি।");
      }
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setLoadingReturns(false);
    }
  }

  const saleLines = items
    .map((item) => {
      const product = products.find((entry) => entry.id === Number(item.product_id));
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unit_price);
      return {
        ...item,
        product,
        lineTotal: Number.isFinite(quantity) && Number.isFinite(unitPrice)
          ? Math.round(quantity * unitPrice * 100) / 100
          : 0,
      };
    });
  const selectedReturns = returnableItems
    .filter((item) => Number(returnQuantities[item.sale_item_id]) > 0)
    .map((item) => ({
      ...item,
      return_quantity: Number(returnQuantities[item.sale_item_id]),
    }));
  const subtotal = saleLines.reduce((sum, item) => sum + item.lineTotal, 0);
  const returnTotal = selectedReturns.reduce(
    (sum, item) => sum + Math.round(item.return_quantity * Number(item.unit_price) * 100) / 100,
    0,
  );
  const grossAmount = subtotal
    + Number(values.vat_amount || 0)
    - Number(values.discount_amount || 0);
  const invoiceAmount = grossAmount - returnTotal - Number(values.special_discount_amount || 0);
  const cashRefund = !selectedCustomer ? Math.max(0, -invoiceAmount) : 0;
  const enteredPayment = values.payment_received === ""
    ? (!selectedCustomer && invoiceAmount > 0 ? invoiceAmount : 0)
    : Number(values.payment_received);
  const presentDue = !selectedCustomer && invoiceAmount < 0
    ? 0
    : (selectedCustomer ? previousDue : 0) + grossAmount - returnTotal - enteredPayment;
  const netAmount = selectedCustomer
    ? presentDue - Number(values.special_discount_amount || 0)
    : 0;
  const selectedInvoiceItems = returnableItems.filter(
    (item) => String(item.sale_id) === selectedReturnInvoice,
  );
  const availableInvoices = Array.from(
    new Map(returnableItems.map((item) => [item.sale_id, item])).values(),
  );

  async function handleSubmit(event) {
    event.preventDefault();
    if (items.some((item) => !item.product_id || !item.quantity || item.unit_price === "")) {
      showToast("error", "বিক্রয়ের প্রতিটি সারিতে পণ্য, পরিমাণ ও বিক্রয়মূল্য পূরণ করুন।");
      return;
    }
    if (saleSource === "warehouse" && !warehouseId) {
      showToast("error", "বিক্রয়ের জন্য একটি গুদাম নির্বাচন করুন।");
      return;
    }
    const quantityByProduct = saleLines.reduce((totals, item) => {
      totals[item.product_id] = (totals[item.product_id] || 0) + Number(item.quantity);
      return totals;
    }, {});
    const unavailableProduct = saleLines.find((item) => (
      quantityByProduct[item.product_id] > Number(item.product?.available_stock || 0) + 0.000001
    ));
    if (unavailableProduct && !initialSale) {
      showToast("error", `${unavailableProduct.product?.product_name || "পণ্য"}-এর নির্বাচিত স্থানে পর্যাপ্ত স্টক নেই।`);
      return;
    }
    if (grossAmount < 0) {
      showToast("error", "ছাড় ও ডিসকাউন্ট বিক্রয়মূল্য এবং ভ্যাটের চেয়ে বেশি হতে পারবে না।");
      return;
    }
    if (selectedReturns.some((item) => item.return_quantity > Number(item.remaining_quantity))) {
      showToast("error", "ফেরতের পরিমাণ আগের বিলে অবশিষ্ট পণ্যের চেয়ে বেশি।");
      return;
    }

    setSaving(true);
    try {
      const response = await apiRequest("/sales/create.php", {
        method: "POST",
        token,
        shopId,
        body: JSON.stringify({
          ...values,
          sale_source: saleSource,
          warehouse_id: saleSource === "warehouse" ? warehouseId : "",
          payment_received: values.payment_received === "" && !selectedCustomer
            ? Math.max(0, invoiceAmount).toFixed(2)
            : values.payment_received,
          sale_id: initialSale?.id,
          quotation_id: initialQuote?.id,
          items: saleLines.map(({ product_id, quantity, unit_price }) => ({
            product_id,
            quantity,
            unit_price,
          })),
          returns: selectedReturns.map(({ sale_item_id, return_quantity }) => ({
            sale_item_id,
            quantity: String(return_quantity),
          })),
        }),
      });
      setReceipt(response.data.sale);
      onSaved();
      if (initialQuote) onQuoteConverted();
      showToast("success", response.message);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setSaving(false);
    }
  }

  async function shareReceipt() {
    const shareText = [
      "মিতালী রেডিও ইলেকট্রিক",
      `বিল: ${receipt.invoice_number}`,
      `কাস্টমার: ${receipt.customer_name}`,
      `নিট পরিমাণ: ৳${formatMoney(receipt.net_amount)}`,
      `বিক্রয় ফেরত: ৳${formatMoney(receipt.sales_return_amount)}`,
      `বর্তমান বকেয়া: ৳${formatMoney(receipt.present_due)}`,
    ].join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: "বিক্রয় রসিদ", text: shareText });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        showToast("success", "রসিদের সারাংশ কপি হয়েছে।");
      } else {
        showToast("error", "এই ব্রাউজারে রসিদ শেয়ার বা কপি করা যায়নি।");
      }
    } catch (error) {
      if (error.name !== "AbortError") showToast("error", "রসিদ শেয়ার করা যায়নি।");
    }
  }

  return (
    <>
    <div className={`product-modal-backdrop${receipt ? " sales-print-backdrop" : ""}`}>
      <section
        aria-labelledby="sales-form-title"
        aria-modal="true"
        className="product-modal sales-modal"
        role="dialog"
      >
        <header className="product-modal-header no-print">
          <span className="product-modal-icon"><ShoppingCart size={22} /></span>
          <div>
            <h2 id="sales-form-title">{receipt ? "বিক্রয় রসিদ" : initialSale ? "বিক্রয় মেমো সম্পাদনা" : initialQuote ? "কোটেশন থেকে বিক্রয়" : "নতুন বিক্রয় / মেমো"}</h2>
            <p>{receipt ? receipt.invoice_number : "পণ্য বিক্রি, পুরোনো পণ্য ফেরত ও বিল সমন্বয় করুন।"}</p>
          </div>
          <button
            aria-label="বিক্রয় ফর্ম বন্ধ করুন"
            className="product-modal-close"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </header>

        {loading ? (
          <div className="user-list-empty"><span className="button-spinner" /> বিক্রয়ের তথ্য লোড হচ্ছে...</div>
        ) : receipt ? (
          <div className="sales-receipt">
            <SalesReceiptHeader receipt={receipt} shop={shop} />
            <div className="sales-receipt-lines">
              <table className="sales-receipt-table">
                <thead>
                  <tr><th>পণ্যের নাম</th><th>পরিমাণ</th><th>ইউনিট</th><th>দর</th><th>মোট মূল্য</th></tr>
                </thead>
                <tbody>
                  {receipt.items.map((item, index) => (
                    <tr key={`sale-${index}`}>
                      <td>{item.product_name}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unit || "—"}</td>
                      <td>৳ {formatMoney(item.unit_price)}</td>
                      <td>৳ {formatMoney(item.line_total)}</td>
                    </tr>
                  ))}
                  {receipt.returns.map((item, index) => (
                    <tr className="sales-receipt-return" key={`return-${index}`}>
                      <td>ফেরত: {item.product_name}<small>{item.original_invoice_number}</small></td>
                      <td>{item.quantity}</td>
                      <td>{item.unit || "—"}</td>
                      <td>৳ {formatMoney(item.unit_price)}</td>
                      <td>− ৳ {formatMoney(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="sales-receipt-summary">
              <div><dt>বিক্রয় মূল্য</dt><dd>৳ {formatMoney(receipt.subtotal)}</dd></div>
              <div><dt>ভ্যাট (+)</dt><dd>৳ {formatMoney(receipt.vat_amount)}</dd></div>
              <div><dt>ছাড় (−)</dt><dd>৳ {formatMoney(receipt.discount_amount)}</dd></div>
              {receipt.customer_id ? <div><dt>পূর্ববর্তী বকেয়া (+)</dt><dd>৳ {formatMoney(receipt.previous_due_amount)}</dd></div> : null}
              <div><dt>বিক্রয় ফেরত (−)</dt><dd>৳ {formatMoney(receipt.sales_return_amount)}</dd></div>
              <div><dt>জমা/পরিশোধ (−)</dt><dd>৳ {formatMoney(receipt.payment_received)}</dd></div>
              {receipt.cash_refund_amount > 0 ? <div><dt>কাস্টমারকে ফেরত</dt><dd>৳ {formatMoney(receipt.cash_refund_amount)}</dd></div> : null}
              <div><dt>বর্তমান বকেয়া</dt><dd>৳ {formatMoney(receipt.present_due)}</dd></div>
              <div><dt>বিশেষ ছাড় (−)</dt><dd>৳ {formatMoney(receipt.special_discount_amount)}</dd></div>
              <div className="sales-receipt-net"><dt>{receipt.net_amount < 0 ? "কাস্টমারের জমা" : "নিট পরিমাণ"}</dt><dd>৳ {formatMoney(Math.abs(receipt.net_amount))}</dd></div>
            </dl>
            {receipt.items.some((item) => item.cost_allocations?.length) ? (
              <section className="sales-cost-analysis no-print">
                <h3>অভ্যন্তরীণ ব্যাচভিত্তিক লাভ/ক্ষতি <small>(ভ্যাট ও বিল-ছাড়ের আগে)</small></h3>
                {receipt.items.flatMap((item, itemIndex) => item.cost_allocations.map((allocation, allocationIndex) => (
                  <div className="sales-cost-row" key={`cost-${itemIndex}-${allocationIndex}`}>
                    <span>{item.product_name} · {allocation.quantity} × ক্রয়দর ৳{formatMoney(allocation.unit_cost)}</span>
                    <span>বিক্রয়দর ৳{formatMoney(allocation.sale_unit_price)}</span>
                    <strong className={allocation.gross_profit < 0 ? "sales-cost-loss" : ""}>
                      {allocation.gross_profit < 0 ? "ক্ষতি" : "লাভ"} ৳{formatMoney(Math.abs(allocation.gross_profit))}
                    </strong>
                  </div>
                )))}
              </section>
            ) : null}
            <SalesReceiptFooter />
            <div className="sales-receipt-actions no-print">
              <button className="user-action-button sales-receipt-print-button" onClick={() => window.print()} type="button">
                <Printer size={16} /> প্রিন্ট
              </button>
              <button className="user-action-button sales-receipt-share-button" onClick={shareReceipt} type="button">
                <Share2 size={16} /> শেয়ার
              </button>
              <button className="product-save-button" onClick={onClose} type="button">সম্পন্ন</button>
            </div>
          </div>
        ) : (
          <form className="product-form sales-form" onSubmit={handleSubmit}>
            {initialSale ? (
              <p className="sales-fifo-note">
                <strong>নিরাপদ সম্পাদনা</strong>
                <span>কাস্টমার, তারিখ ও বিক্রয়ের স্থান অপরিবর্তিত থাকবে। Return বা পরবর্তী স্টক-লেনদেন থাকলে সার্ভার সম্পাদনা বন্ধ করবে।</span>
              </p>
            ) : null}
            <div className="sales-form-grid">
              <label className="product-form-field" htmlFor="sale-stock-source">
                <span className="product-field-label">পণ্য বিক্রির স্থান</span>
                <SearchableSelect
                  disabled={Boolean(initialSale)}
                  id="sale-stock-source"
                  onChange={changeSaleSource}
                  options={[
                    { value: "shop", label: "দোকান" },
                    { value: "warehouse", label: "গুদাম" },
                  ]}
                  placeholder="দোকান বা গুদাম খুঁজুন"
                  value={saleSource}
                />
              </label>
              {saleSource === "warehouse" ? (
                <label className="product-form-field" htmlFor="sale-warehouse">
                  <span className="product-field-label">গুদাম নির্বাচন করুন</span>
                  <SearchableSelect
                    disabled={Boolean(initialSale)}
                    id="sale-warehouse"
                    onChange={(event) => {
                      setWarehouseId(event.target.value);
                      setProducts([]);
                        if (!initialQuote) {
                          setItems((current) => current.map((item) => ({
                            ...item,
                            product_id: "",
                            product_search: "",
                            unit_price: "",
                          })));
                        }
                    }}
                    options={[
                      { value: "", label: "গুদাম নির্বাচন করুন" },
                      ...warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.warehouse_name })),
                    ]}
                    placeholder="গুদামের নাম লিখে খুঁজুন"
                    required
                    value={warehouseId}
                  />
                  {warehouses.length === 0 ? <small>বিক্রির আগে গুদাম সেটআপ করুন।</small> : null}
                </label>
              ) : null}
              <div className="product-form-field">
                <div className="sales-customer-field-heading">
                  <span className="product-field-label">কাস্টমার খুঁজুন (নাম/মোবাইল)</span>
                  {canCreateCustomer && !initialSale && !initialQuote ? (
                    <button
                      aria-label="নতুন কাস্টমার যোগ করুন"
                      className="user-action-button customer-quick-add"
                      onClick={() => setShowQuickCustomerForm(true)}
                      title="নতুন কাস্টমার যোগ করুন"
                      type="button"
                    >
                      <Plus size={16} />
                    </button>
                  ) : null}
                </div>
                <SearchableSelect
                  ariaLabel="কাস্টমার খুঁজুন (নাম/মোবাইল)"
                  disabled={Boolean(initialSale || initialQuote)}
                  id="sale-customer"
                  name="customer_id"
                  onChange={updateField}
                  options={[
                    { value: "", label: "কোনো কাস্টমার নয় (ওয়াক-ইন)" },
                    ...customers.map((customer) => ({
                      value: customer.id,
                      label: customerOptionLabel(customer),
                    })),
                  ]}
                  placeholder="নাম বা মোবাইল নম্বর লিখে খুঁজুন"
                  value={values.customer_id}
                />
                {selectedCustomer ? <small>পূর্ববর্তী বকেয়া: ৳ {formatMoney(previousDue)}</small> : null}
              </div>
              {!selectedCustomer ? (
                <label className="product-form-field" htmlFor="sale-customer-name">
                  <span className="product-field-label">ওয়াক-ইন নাম <span className="optional-label">ঐচ্ছিক</span></span>
                  <input
                    autoComplete="off"
                    className="product-field-control"
                    id="sale-customer-name"
                    list="sale-walkin-name-options"
                    maxLength={180}
                    name="customer_name"
                    onChange={updateField}
                    placeholder="আগের নাম লিখে নির্বাচন করুন, অথবা নতুন নাম দিন"
                    readOnly={Boolean(initialSale || initialQuote)}
                    value={values.customer_name}
                  />
                  <datalist id="sale-walkin-name-options">
                    {walkInSuggestions.map((name) => <option key={name} value={name} />)}
                  </datalist>
                </label>
              ) : null}
              <label className="product-form-field" htmlFor="sale-date">
                <span className="product-field-label">বিক্রয়ের তারিখ</span>
                <input className="product-field-control" disabled={Boolean(initialSale)} id="sale-date" name="sale_date" onChange={updateField} required type="date" value={values.sale_date} />
              </label>
            </div>

            <div className="purchase-cart-heading sales-cart-heading">
              <div><h3>বিক্রয়ের পণ্য</h3><span>{initialQuote ? "কোটেশনের পণ্য ও দর অপরিবর্তিত থাকবে" : "পণ্যের নাম বা বারকোড লিখে খুঁজুন"}</span></div>
              {!initialQuote ? <button className="purchase-add-row" onClick={addItem} type="button"><Plus size={17} /> পণ্য যোগ করুন</button> : null}
            </div>
            <p className="sales-fifo-note">
              <strong>FIFO স্টক হিসাব</strong>
              <span>একই পণ্যের একাধিক ক্রয়দর থাকলে, নির্বাচিত দোকান/গুদামের পুরোনো ব্যাচ আগে স্টক থেকে কমবে; লাভ/ক্ষতি ব্যাচের ক্রয়দর অনুযায়ী হিসাব হবে।</span>
            </p>
            <div className="sales-cart-table-wrap">
              <table className="sales-cart-table">
                <thead>
                  <tr>
                    <th scope="col">ক্রম</th>
                    <th scope="col">পণ্য</th>
                    <th scope="col">পরিমাণ</th>
                    <th scope="col">একক বিক্রয়মূল্য (৳)</th>
                    <th scope="col">মোট (৳)</th>
                    <th scope="col"><span className="sr-only">অ্যাকশন</span></th>
                  </tr>
                </thead>
                <tbody>
                  {saleLines.map((item, index) => {
                    const selectedUnit = ELECTRICAL_UNITS.find((unit) => unit.value === item.product?.unit);
                    return (
                    <tr key={item.rowId}>
                      <td className="sales-cart-index">{index + 1}</td>
                      <td>
                        <div className="sales-cart-cell-control">
                          <SearchableSelect
                            ariaLabel={`${index + 1} নম্বর সারির পণ্য নির্বাচন`}
                            className="product-field-control product-select-control"
                            id={`sale-product-${item.rowId}`}
                            name={`sale_product_${item.rowId}`}
                            disabled={Boolean(initialQuote)}
                            onChange={(event) => updateItem(item.rowId, "product_id", event.target.value)}
                            options={products.map((product) => ({
                              value: product.id,
                              label: `${product.product_name}${product.product_code ? ` · ${product.product_code}` : ` · #${product.id}`} · স্টক ${numberFormatter.format(Number(product.available_stock) || 0)} ${product.unit || ""}`.trim(),
                            }))}
                            placeholder="নাম/বারকোড"
                            portalOptions
                            required
                            value={item.product_id}
                          />
                        </div>
                      </td>
                      <td>
                        <label className="sales-cart-cell-control" htmlFor={`sale-qty-${item.rowId}`}>
                          <span className="purchase-input-group">
                            <input aria-label="পরিমাণ" className="product-field-control" id={`sale-qty-${item.rowId}`} max={item.product?.available_stock} min="0.001" onChange={(event) => updateItem(item.rowId, "quantity", event.target.value)} readOnly={Boolean(initialQuote)} step="0.001" type="number" value={item.quantity} />
                            <span className="purchase-input-group-text">{selectedUnit?.label || item.product?.unit || "ইউনিট"}</span>
                          </span>
                        </label>
                      </td>
                      <td>
                        <label className="sales-cart-cell-control" htmlFor={`sale-price-${item.rowId}`}>
                          <input aria-label="একক বিক্রয়মূল্য" className="product-field-control" id={`sale-price-${item.rowId}`} min="0" onChange={(event) => updateItem(item.rowId, "unit_price", event.target.value)} readOnly={Boolean(initialQuote)} step="0.01" type="number" value={item.unit_price} />
                        </label>
                      </td>
                      <td>
                        <input
                          aria-label={`${index + 1} নম্বর বিক্রয় সারির মোট মূল্য`}
                          className="product-field-control purchase-line-total-input"
                          readOnly
                          type="text"
                          value={formatMoney(item.lineTotal)}
                        />
                      </td>
                      <td>
                        <button aria-label={`${index + 1} নম্বর বিক্রয় সারি সরান`} className="purchase-remove-row" disabled={Boolean(initialQuote)} onClick={() => removeItem(item.rowId)} type="button"><Trash2 size={17} /></button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!initialQuote ? <div className="sales-return-toolbar">
              <div><strong>বিক্রয় ফেরত (−)</strong><small>কাস্টমার নির্বাচন করুন, অথবা ওয়াক-ইন নাম লিখে সেই নামের আগের বিল থেকে পণ্য ফেরত দিন।</small></div>
              <button className="purchase-add-row" disabled={loadingReturns} onClick={loadReturnableItems} type="button">
                {loadingReturns ? <span className="button-spinner" /> : <RotateCcw size={16} />}
                {showReturns ? "ফেরত বন্ধ" : "পণ্য ফেরত যোগ করুন"}
              </button>
            </div> : null}
            {!initialQuote && showReturns ? (
              <div className="sales-return-panel">
                {availableInvoices.length > 0 ? (
                  <>
                    <label className="sales-invoice-picker" htmlFor="sale-return-invoice">
                      <span>পুরোনো বিল নম্বর</span>
                      <SearchableSelect
                        id="sale-return-invoice"
                        onChange={(event) => setSelectedReturnInvoice(event.target.value)}
                        options={[
                          { value: "", label: "বিল নির্বাচন করুন" },
                          ...availableInvoices.map((invoice) => ({
                            value: invoice.sale_id,
                            label: `${invoice.invoice_number} · ${invoice.sale_date}`,
                          })),
                        ]}
                        placeholder="পুরোনো বিল নম্বর লিখে নির্বাচন করুন"
                        value={selectedReturnInvoice}
                      />
                    </label>
                    {selectedInvoiceItems.map((item) => (
                      <label className="sales-return-item" key={item.sale_item_id}>
                        <span><strong>{item.product_name}</strong><small>{item.invoice_number} · বিক্রি {item.original_quantity} · ফেরতযোগ্য {item.remaining_quantity} · ৳{formatMoney(item.unit_price)}/টি</small></span>
                        <span className="sales-return-quantity"><small>ফেরত পরিমাণ</small><input className="product-field-control" max={item.remaining_quantity} min="0" onChange={(event) => setReturnQuantities((current) => ({ ...current, [item.sale_item_id]: event.target.value }))} step="0.001" type="number" value={returnQuantities[item.sale_item_id] || ""} /></span>
                      </label>
                    ))}
                  </>
                ) : <p className="user-list-empty">এই কাস্টমারের ফেরতযোগ্য আগের বিক্রয় বিল নেই।</p>}
              </div>
            ) : null}

            <div className="sales-summary-grid">
              <div className="product-form-field sales-summary-field">
                <span className="product-field-label">বিক্রয় মূল্য</span>
                <div aria-label={`বিক্রয় মূল্য ৳ ${formatMoney(subtotal)}`} aria-readonly="true" className="product-field-control sales-summary-readonly" role="textbox">৳ {formatMoney(subtotal)}</div>
              </div>
              <label className="product-form-field" htmlFor="sale-vat"><span className="product-field-label">ভ্যাট (+)</span><input className="product-field-control" id="sale-vat" min="0" name="vat_amount" onChange={updateField} readOnly={Boolean(initialQuote)} step="0.01" type="number" value={values.vat_amount} /></label>
              <label className="product-form-field" htmlFor="sale-discount"><span className="product-field-label">ছাড় (−)</span><input className="product-field-control" id="sale-discount" min="0" name="discount_amount" onChange={updateField} readOnly={Boolean(initialQuote)} step="0.01" type="number" value={values.discount_amount} /></label>
              {selectedCustomer ? (
                <div className="product-form-field sales-summary-field">
                  <span className="product-field-label">পূর্ববর্তী বকেয়া (+)</span>
                  <div aria-label={`পূর্ববর্তী বকেয়া ৳ ${formatMoney(previousDue)}`} aria-readonly="true" className="product-field-control sales-summary-readonly" role="textbox">৳ {formatMoney(previousDue)}</div>
                </div>
              ) : null}
              <div className="product-form-field sales-summary-field">
                <span className="product-field-label">বিক্রয় ফেরত (−)</span>
                <div aria-label={`বিক্রয় ফেরত ৳ ${formatMoney(returnTotal)}`} aria-readonly="true" className="product-field-control sales-summary-readonly" role="textbox">৳ {formatMoney(returnTotal)}</div>
              </div>
              <label className="product-form-field" htmlFor="sale-payment"><span className="product-field-label">জমা/পরিশোধ (−)</span><input className="product-field-control" id="sale-payment" min="0" name="payment_received" onChange={updateField} step="0.01" type="number" value={values.payment_received === "" && !selectedCustomer && invoiceAmount > 0 ? invoiceAmount.toFixed(2) : values.payment_received} /></label>
              <div className="product-form-field sales-summary-field">
                <span className="product-field-label">বর্তমান বকেয়া</span>
                <div aria-label={`বর্তমান বকেয়া ৳ ${formatMoney(presentDue)}`} aria-readonly="true" className="product-field-control sales-summary-readonly" role="textbox">৳ {formatMoney(presentDue)}</div>
              </div>
              <label className="product-form-field" htmlFor="sale-special-discount"><span className="product-field-label">বিশেষ ছাড় (−)</span><input className="product-field-control" id="sale-special-discount" min="0" name="special_discount_amount" onChange={updateField} readOnly={Boolean(initialQuote)} step="0.01" type="number" value={values.special_discount_amount} /></label>
              <div className="product-form-field sales-summary-field">
                <span className="product-field-label">{netAmount < 0 ? "কাস্টমারের জমা" : "নিট পরিমাণ"}</span>
                <div aria-label={`${netAmount < 0 ? "কাস্টমারের জমা" : "নিট পরিমাণ"} ৳ ${formatMoney(Math.abs(netAmount))}`} aria-readonly="true" className="product-field-control sales-summary-readonly sales-summary-net">৳ {formatMoney(Math.abs(netAmount))}</div>
              </div>
              <label className="product-form-field" htmlFor="sale-payment-method"><span className="product-field-label">পেমেন্ট পদ্ধতি</span><SearchableSelect id="sale-payment-method" name="payment_method" onChange={updateField} options={[{ value: "cash", label: "নগদ" }, { value: "mobile_banking", label: "মোবাইল ব্যাংকিং" }, ...(selectedCustomer ? [{ value: "credit", label: "বাকিতে" }] : [])]} placeholder="পেমেন্ট পদ্ধতি খুঁজুন" value={values.payment_method} /></label>
              <label className="product-form-field" htmlFor="sale-notes"><span className="product-field-label">নোট <span className="optional-label">ঐচ্ছিক</span></span><input className="product-field-control" id="sale-notes" maxLength={500} name="notes" onChange={updateField} value={values.notes} /></label>
            </div>
            {!selectedCustomer && cashRefund > 0 ? <p className="sales-cash-refund">কাস্টমারকে নগদ ফেরত: ৳ {formatMoney(cashRefund)}</p> : null}
            <footer className="product-form-actions purchase-form-actions no-print">
              <button className="product-cancel-button" disabled={saving} onClick={onClose} type="button">বাতিল</button>
              <button className="product-save-button" disabled={saving || loadingReturns || loadingProducts} type="submit">{saving ? <span className="button-spinner" /> : <Save size={17} />}{saving ? "সংরক্ষণ হচ্ছে..." : "বিক্রয় বিল সংরক্ষণ"}</button>
            </footer>
          </form>
        )}
      </section>
    </div>
    {showQuickCustomerForm && typeof document !== "undefined" ? createPortal(
      <CustomerSetupForm
        canDelete={false}
        canEdit={false}
        initialShowEditor
        onClose={() => setShowQuickCustomerForm(false)}
        onCustomerCreated={handleQuickCustomerCreated}
        onDataChanged={onSaved}
        showToast={showToast}
        shopId={shopId}
        token={token}
      />,
      document.body,
    ) : null}
    </>
  );
}

function CustomerReturnForm({ token, shopId, shop, onClose, onSaved, showToast }) {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [walkInName, setWalkInName] = useState("");
  const [returnDate, setReturnDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10));
  const [items, setItems] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState("");
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const selectedCustomer = customers.find((customer) => customer.id === Number(customerId));
  const availableInvoices = Array.from(new Map(items.map((item) => [item.sale_id, item])).values());
  const invoiceItems = items.filter((item) => String(item.sale_id) === selectedInvoice);
  const selectedReturns = items
    .filter((item) => String(item.sale_id) === selectedInvoice)
    .filter((item) => Number(quantities[item.sale_item_id]) > 0)
    .map((item) => ({
      ...item,
      return_quantity: Number(quantities[item.sale_item_id]),
    }));
  const returnTotal = selectedReturns.reduce(
    (total, item) => total + Math.round(item.return_quantity * Number(item.unit_price) * 100) / 100,
    0,
  );

  useEffect(() => {
    let active = true;
    apiRequest("/customers/list.php", { token, shopId })
      .then((response) => {
        if (active) setCustomers(response.data.customers);
      })
      .catch((error) => {
        if (active) showToast("error", error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, shopId, showToast]);

  function resetReturnItems() {
    setItems([]);
    setSelectedInvoice("");
    setQuantities({});
  }

  async function loadReturnableItems() {
    if (!customerId && !walkInName.trim()) {
      showToast("info", "আগের বিল খুঁজতে কাস্টমার নির্বাচন করুন অথবা ওয়াক-ইন কাস্টমারের নাম লিখুন।");
      return;
    }

    setLoadingItems(true);
    try {
      const query = new URLSearchParams();
      if (customerId) query.set("customer_id", customerId);
      else query.set("customer_name", walkInName.trim());
      const response = await apiRequest(`/sales/returnable.php?${query.toString()}`, { token, shopId });
      setItems(response.data.items);
      setSelectedInvoice("");
      setQuantities({});
      if (response.data.items.length === 0) {
        showToast("info", "এই কাস্টমারের কোনো ফেরতযোগ্য আগের বিল পাওয়া যায়নি।");
      }
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setLoadingItems(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (selectedReturns.length === 0) {
      showToast("error", "ফেরত দেওয়ার জন্য অন্তত একটি পণ্যের পরিমাণ লিখুন।");
      return;
    }
    if (selectedReturns.some((item) => (
      item.return_quantity > Number(item.remaining_quantity)
    ))) {
      showToast("error", "ফেরতের পরিমাণ আগের বিলে অবশিষ্ট পণ্যের চেয়ে বেশি।");
      return;
    }

    setSaving(true);
    try {
      const response = await apiRequest("/sales/create.php", {
        method: "POST",
        token,
        shopId,
        body: JSON.stringify({
          customer_id: customerId,
          customer_name: selectedCustomer ? selectedCustomer.customer_name : walkInName.trim(),
          sale_date: returnDate,
          sale_source: "shop",
          warehouse_id: "",
          vat_amount: "0",
          discount_amount: "0",
          special_discount_amount: "0",
          payment_method: selectedCustomer ? "credit" : "cash",
          payment_received: "0",
          notes: "",
          items: [],
          returns: selectedReturns.map((item) => ({
            sale_item_id: item.sale_item_id,
            quantity: String(item.return_quantity),
          })),
        }),
      });
      setReceipt({ ...response.data.sale, document_type: "customer_return" });
      onSaved();
      showToast("success", "কাস্টমার রিটার্ন সংরক্ষণ হয়েছে।");
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setSaving(false);
    }
  }

  if (receipt) {
    return (
      <SalesReceiptMemo
        onClose={() => {
          setReceipt(null);
          onClose();
        }}
        receipt={receipt}
        shop={shop}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="product-modal-backdrop">
      <section aria-labelledby="customer-return-title" aria-modal="true" className="product-modal sales-modal" role="dialog">
        <header className="product-modal-header">
          <span className="product-modal-icon"><RotateCcw size={22} /></span>
          <div>
            <h2 id="customer-return-title">কাস্টমার রিটার্ন</h2>
            <p>আগের বিক্রয় বিল থেকে ফেরত পণ্য গ্রহণ করুন।</p>
          </div>
          <button aria-label="কাস্টমার রিটার্ন ফর্ম বন্ধ করুন" className="product-modal-close" disabled={saving} onClick={onClose} type="button">
            <X size={20} />
          </button>
        </header>
        {loading ? (
          <div className="user-list-empty"><span className="button-spinner" /> কাস্টমারের তথ্য লোড হচ্ছে...</div>
        ) : (
          <form className="product-form sales-form" onSubmit={handleSubmit}>
            <div className="sales-form-grid">
              <label className="product-form-field" htmlFor="customer-return-customer">
                <span className="product-field-label">কাস্টমার খুঁজুন</span>
                <SearchableSelect
                  id="customer-return-customer"
                  onChange={(event) => {
                    setCustomerId(event.target.value);
                    setWalkInName("");
                    resetReturnItems();
                  }}
                  options={[
                    { value: "", label: "ওয়াক-ইন কাস্টমার" },
                    ...customers.map((customer) => ({
                      value: customer.id,
                      label: `${customer.customer_name}${customer.mobile_number ? ` · ${customer.mobile_number}` : ` · #${customer.id}`}`,
                    })),
                  ]}
                  placeholder="নাম বা মোবাইল নম্বর লিখে খুঁজুন"
                  value={customerId}
                />
                {selectedCustomer ? (
                  <small>বর্তমান বকেয়া: ৳ {formatMoney(selectedCustomer.current_balance)}</small>
                ) : null}
              </label>
              {!selectedCustomer ? (
                <label className="product-form-field" htmlFor="customer-return-walkin-name">
                  <span className="product-field-label">ওয়াক-ইন কাস্টমারের নাম</span>
                  <input
                    className="product-field-control"
                    id="customer-return-walkin-name"
                    maxLength={180}
                    onChange={(event) => {
                      setWalkInName(event.target.value);
                      resetReturnItems();
                    }}
                    required={!customerId}
                    value={walkInName}
                  />
                </label>
              ) : null}
              <label className="product-form-field" htmlFor="customer-return-date">
                <span className="product-field-label">রিটার্নের তারিখ</span>
                <input className="product-field-control" id="customer-return-date" onChange={(event) => setReturnDate(event.target.value)} required type="date" value={returnDate} />
              </label>
            </div>

            <div className="sales-return-toolbar">
              <div>
                <strong>আগের বিলের পণ্য</strong>
                <small>ফেরতযোগ্য পরিমাণ বেছে রিটার্ন যোগ করুন।</small>
              </div>
              <button className="purchase-add-row" disabled={loadingItems} onClick={loadReturnableItems} type="button">
                {loadingItems ? <span className="button-spinner" /> : <RotateCcw size={16} />}
                ফেরতযোগ্য পণ্য খুঁজুন
              </button>
            </div>
            {items.length > 0 ? (
              <div className="sales-return-panel">
                <label className="sales-invoice-picker" htmlFor="customer-return-invoice">
                  <span>পুরোনো বিল নম্বর</span>
                  <SearchableSelect
                    id="customer-return-invoice"
                    onChange={(event) => {
                      setSelectedInvoice(event.target.value);
                      setQuantities({});
                    }}
                    options={[
                      { value: "", label: "বিল নির্বাচন করুন" },
                      ...availableInvoices.map((invoice) => ({
                        value: invoice.sale_id,
                        label: `${invoice.invoice_number} · ${invoice.sale_date}`,
                      })),
                    ]}
                    placeholder="পুরোনো বিল নম্বর লিখে নির্বাচন করুন"
                    value={selectedInvoice}
                  />
                </label>
                {invoiceItems.map((item) => (
                  <label className="sales-return-item" key={item.sale_item_id}>
                    <span>
                      <strong>{item.product_name}</strong>
                      <small>{item.invoice_number} · বিক্রি {item.original_quantity} · ফেরতযোগ্য {item.remaining_quantity} · ৳{formatMoney(item.unit_price)}/{item.unit || "টি"}</small>
                    </span>
                    <span className="sales-return-quantity">
                      <small>ফেরত পরিমাণ</small>
                      <input
                        className="product-field-control"
                        max={item.remaining_quantity}
                        min="0"
                        onChange={(event) => setQuantities((current) => ({ ...current, [item.sale_item_id]: event.target.value }))}
                        step="0.001"
                        type="number"
                        value={quantities[item.sale_item_id] || ""}
                      />
                    </span>
                  </label>
                ))}
              </div>
            ) : null}
            {selectedReturns.length > 0 ? (
              <div className="sales-return-total">
                <span>
                  {selectedCustomer
                    ? `বকেয়া থেকে সমন্বয় · রিটার্নের পর বকেয়া ৳ ${formatMoney(Number(selectedCustomer.current_balance || 0) - returnTotal)}`
                    : "কাস্টমারকে নগদ ফেরত"}
                </span>
                <strong>৳ {formatMoney(returnTotal)}</strong>
              </div>
            ) : null}
            <footer className="product-form-actions purchase-form-actions">
              <button className="product-cancel-button" disabled={saving} onClick={onClose} type="button">বাতিল</button>
              <button className="product-save-button" disabled={saving || loadingItems} type="submit">
                {saving ? <span className="button-spinner" /> : <Save size={17} />}
                {saving ? "সংরক্ষণ হচ্ছে..." : "কাস্টমার রিটার্ন সংরক্ষণ"}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}

function SalesReceiptMemo({ receipt, shop, onClose, showToast }) {
  const isCustomerReturn = receipt.document_type === "customer_return";
  useEffect(() => {
    document.body.classList.add("printing-sales-memo");
    return () => document.body.classList.remove("printing-sales-memo");
  }, []);

  async function shareReceipt() {
    const shareText = [
      shop?.shop_name || "মিতালী রেডিও ইলেকট্রিক",
      `বিল: ${receipt.invoice_number}`,
      `কাস্টমার: ${receipt.customer_name}`,
      `নিট পরিমাণ: ৳${formatMoney(receipt.net_amount)}`,
      `বিক্রয় ফেরত: ৳${formatMoney(receipt.sales_return_amount)}`,
      `বর্তমান বকেয়া: ৳${formatMoney(receipt.present_due)}`,
    ].join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: isCustomerReturn ? "কাস্টমার রিটার্ন রসিদ" : "বিক্রয় রসিদ", text: shareText });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        showToast("success", "রসিদের সারাংশ কপি হয়েছে।");
      } else {
        showToast("error", "এই ব্রাউজারে রসিদ শেয়ার বা কপি করা যায়নি।");
      }
    } catch (error) {
      if (error.name !== "AbortError") showToast("error", "রসিদ শেয়ার করা যায়নি।");
    }
  }

  return createPortal((
    <div className="product-modal-backdrop sales-print-backdrop">
      <section aria-label={`${isCustomerReturn ? "কাস্টমার রিটার্ন" : "বিক্রয় মেমো"} ${receipt.invoice_number}`} aria-modal="true" className="product-modal sales-modal" role="dialog">
        <header className="product-modal-header no-print">
          <span className="product-modal-icon">{isCustomerReturn ? <RotateCcw size={22} /> : <Receipt size={22} />}</span>
          <div><h2>{isCustomerReturn ? "কাস্টমার রিটার্ন রসিদ" : "বিক্রয় মেমো"}</h2><p>{receipt.invoice_number}</p></div>
          <button aria-label="মেমো বন্ধ করুন" className="product-modal-close" onClick={onClose} type="button"><X size={20} /></button>
        </header>
        <div className="sales-receipt">
          <SalesReceiptHeader receipt={receipt} shop={shop} />
          <div className="sales-receipt-lines">
            <table className="sales-receipt-table">
              <thead><tr><th>পণ্যের নাম</th><th>পরিমাণ</th><th>ইউনিট</th><th>দর</th><th>মোট মূল্য</th></tr></thead>
              <tbody>
                {receipt.items.map((item, index) => (
                  <tr key={`sale-${index}`}>
                    <td>{item.product_name}</td><td>{item.quantity}</td><td>{item.unit || "—"}</td>
                    <td>৳ {formatMoney(item.unit_price)}</td><td>৳ {formatMoney(item.line_total)}</td>
                  </tr>
                ))}
                {receipt.returns.map((item, index) => (
                  <tr className="sales-receipt-return" key={`return-${index}`}>
                    <td>ফেরত: {item.product_name}<small>{item.original_invoice_number}</small></td>
                    <td>{item.quantity}</td><td>{item.unit || "—"}</td>
                    <td>৳ {formatMoney(item.unit_price)}</td><td>− ৳ {formatMoney(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="sales-receipt-summary">
            <div><dt>বিক্রয় মূল্য</dt><dd>৳ {formatMoney(receipt.subtotal)}</dd></div>
            <div><dt>ভ্যাট (+)</dt><dd>৳ {formatMoney(receipt.vat_amount)}</dd></div>
            <div><dt>ছাড় (−)</dt><dd>৳ {formatMoney(receipt.discount_amount)}</dd></div>
            {receipt.customer_id ? <div><dt>পূর্ববর্তী বকেয়া (+)</dt><dd>৳ {formatMoney(receipt.previous_due_amount)}</dd></div> : null}
            <div><dt>বিক্রয় ফেরত (−)</dt><dd>৳ {formatMoney(receipt.sales_return_amount)}</dd></div>
            <div><dt>জমা/পরিশোধ (−)</dt><dd>৳ {formatMoney(receipt.payment_received)}</dd></div>
            {receipt.cash_refund_amount > 0 ? <div><dt>কাস্টমারকে ফেরত</dt><dd>৳ {formatMoney(receipt.cash_refund_amount)}</dd></div> : null}
            <div><dt>বর্তমান বকেয়া</dt><dd>৳ {formatMoney(receipt.present_due)}</dd></div>
            <div><dt>বিশেষ ছাড় (−)</dt><dd>৳ {formatMoney(receipt.special_discount_amount)}</dd></div>
            <div className="sales-receipt-net"><dt>{receipt.net_amount < 0 ? "কাস্টমারের জমা" : "নিট পরিমাণ"}</dt><dd>৳ {formatMoney(Math.abs(receipt.net_amount))}</dd></div>
          </dl>
          <SalesReceiptFooter />
          <div className="sales-receipt-actions no-print">
            <button className="user-action-button sales-receipt-print-button" onClick={() => window.print()} type="button"><Printer size={17} /> প্রিন্ট মেমো</button>
            <button className="user-action-button sales-receipt-share-button" onClick={shareReceipt} type="button"><Share2 size={17} /> শেয়ার</button>
            <button className="product-save-button" onClick={onClose} type="button">বন্ধ</button>
          </div>
        </div>
      </section>
    </div>
  ), document.body);
}

function ActivityReceiptMemo({ receipt, type, shop, onClose }) {
  useEffect(() => {
    document.body.classList.add("printing-sales-memo");
    return () => document.body.classList.remove("printing-sales-memo");
  }, []);

  const isPurchase = type === "purchase";
  const isCustomerPayment = type === "customer_payment";
  const title = isPurchase
    ? "ক্রয় চালান"
    : isCustomerPayment ? "কাস্টমার বাকি আদায় রসিদ" : "সাপ্লায়ার পেমেন্ট রসিদ";
  const reference = isPurchase
    ? (receipt.bill_number || `ক্রয় #${receipt.id}`)
    : isCustomerPayment ? `আদায় রসিদ #${receipt.id}` : `সাপ্লায়ার পেমেন্ট #${receipt.id}`;
  const receiptDate = isPurchase ? receipt.purchase_date : receipt.payment_date;
  const receiptTime = isPurchase ? receipt.purchase_time : receipt.payment_time;
  const formattedDate = receiptDate ? new Intl.DateTimeFormat("bn-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
    numberingSystem: "latn",
  }).format(new Date(`${receiptDate}T00:00:00Z`)) : "—";

  return createPortal((
    <div className="product-modal-backdrop sales-print-backdrop">
      <section aria-label={`${title} ${reference}`} aria-modal="true" className="product-modal sales-modal" role="dialog">
        <header className="product-modal-header no-print">
          <span className="product-modal-icon"><Receipt size={22} /></span>
          <div><h2>{title}</h2><p>{reference}</p></div>
          <button aria-label="মেমো বন্ধ করুন" className="product-modal-close" onClick={onClose} type="button"><X size={20} /></button>
        </header>
        <div className="sales-receipt">
          <div className="sales-receipt-heading">
            <ShopPrintHeader shop={shop} />
            <span className="sales-receipt-title">{title}</span>
            <div className="sales-receipt-meta">
              <span><strong>{isPurchase ? "চালান নম্বর" : "রসিদ নম্বর"}</strong><b>{reference}</b></span>
              <span><strong>তারিখ ও সময়</strong><b>{formattedDate}{receiptTime ? ` · ${receiptTime}` : ""}</b></span>
              <span><strong>{isCustomerPayment ? "কাস্টমার" : "সাপ্লায়ার"}</strong><b>{isCustomerPayment ? receipt.customer_name : receipt.supplier_name}</b></span>
              {(receipt.customer_mobile_number || receipt.supplier_mobile_number) ? <span><strong>মোবাইল</strong><b>{receipt.customer_mobile_number || receipt.supplier_mobile_number}</b></span> : null}
              {(receipt.customer_address || receipt.supplier_address) ? <span><strong>ঠিকানা</strong><b>{receipt.customer_address || receipt.supplier_address}</b></span> : null}
              <span><strong>অপারেটর</strong><b>{receipt.operator_name || "—"}</b></span>
            </div>
          </div>
          {isPurchase ? (
            <>
              <div className="sales-receipt-lines">
                <table className="sales-receipt-table">
                  <thead><tr><th>পণ্যের নাম</th><th>পরিমাণ</th><th>ইউনিট</th><th>দর</th><th>মোট মূল্য</th></tr></thead>
                  <tbody>{receipt.items.map((item, index) => (
                    <tr key={`purchase-${index}`}>
                      <td>{item.product_name}{item.product_code ? <small>{item.product_code}</small> : null}</td>
                      <td>{numberFormatter.format(Number(item.quantity) || 0)}</td><td>{item.unit || "—"}</td>
                      <td>৳ {formatMoney(item.unit_price)}</td><td>৳ {formatMoney(item.line_total)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <dl className="sales-receipt-summary">
                <div><dt>পণ্যের গন্তব্য</dt><dd>{receipt.destination_type === "warehouse" ? `গুদাম${receipt.warehouse_name ? ` · ${receipt.warehouse_name}` : ""}` : "দোকান"}</dd></div>
                <div className="sales-receipt-net"><dt>মোট ক্রয়</dt><dd>৳ {formatMoney(receipt.total_amount)}</dd></div>
              </dl>
            </>
          ) : (
            <dl className="sales-receipt-summary">
              <div><dt>{isCustomerPayment ? "আদায়ের মাধ্যম" : "পেমেন্ট পদ্ধতি"}</dt><dd>{receipt.payment_method === "bank" ? "By Bank · ব্যাংক" : "By Cash · নগদ"}</dd></div>
              {receipt.payment_method === "bank" ? (
                <div><dt>ব্যাংক হিসাব</dt><dd>{[receipt.bank_name, receipt.account_name, receipt.account_number, receipt.branch_name].filter(Boolean).join(" · ") || "—"}</dd></div>
              ) : null}
              <div className="sales-receipt-net"><dt>{isCustomerPayment ? "আদায়কৃত অর্থ" : "পরিশোধিত অর্থ"}</dt><dd>৳ {formatMoney(receipt.payment_amount)}</dd></div>
            </dl>
          )}
          {receipt.notes || receipt.note ? <p className="sales-receipt-note"><strong>নোট:</strong> {receipt.notes || receipt.note}</p> : null}
          <footer className="sales-receipt-footer">
            <div className="sales-receipt-signatures">
              <div><span /><strong>কর্তৃপক্ষের স্বাক্ষর</strong></div>
              <div><span /><strong>{isPurchase ? "সাপ্লায়ারের স্বাক্ষর" : "গ্রহণকারীর স্বাক্ষর"}</strong></div>
            </div>
            <div className="sales-receipt-thanks"><span>এই মেমোটি কম্পিউটার দ্বারা তৈরি।</span></div>
          </footer>
          <div className="sales-receipt-actions no-print">
            <button className="user-action-button sales-receipt-print-button" onClick={() => window.print()} type="button"><Printer size={17} /> প্রিন্ট মেমো</button>
            <button className="product-save-button" onClick={onClose} type="button">বন্ধ</button>
          </div>
        </div>
      </section>
    </div>
  ), document.body);
}

function SupplierReturnForm({ token, shopId, onClose, onDataChanged, showToast }) {
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [purchaseBillId, setPurchaseBillId] = useState("");
  const [returnDate, setReturnDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest("/suppliers/list.php", { token, shopId })
      .then((response) => {
        if (active) setSuppliers(response.data.suppliers);
      })
      .catch((error) => {
        if (active) showToast("error", error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, shopId, showToast]);

  async function selectSupplier(value) {
    setSupplierId(value);
    setItems([]);
    setPurchaseBillId("");
    setQuantities({});
    if (!value) return;
    setLoadingItems(true);
    try {
      const response = await apiRequest(
        `/purchases/returnable.php?supplier_id=${encodeURIComponent(value)}`,
        { token, shopId },
      );
      setItems(response.data.items);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setLoadingItems(false);
    }
  }

  const bills = Array.from(new Map(items.map((item) => [item.purchase_bill_id, item])).values());
  const selectedItems = items.filter((item) => String(item.purchase_bill_id) === purchaseBillId);
  const returnTotal = selectedItems.reduce(
    (total, item) => total + Number(quantities[item.purchase_item_id] || 0) * Number(item.unit_price),
    0,
  );
  async function handleSubmit(event) {
    event.preventDefault();
    const returnItems = selectedItems
      .filter((item) => Number(quantities[item.purchase_item_id]) > 0)
      .map((item) => ({
        purchase_item_id: item.purchase_item_id,
        quantity: quantities[item.purchase_item_id],
      }));
    if (!supplierId || !purchaseBillId || returnItems.length === 0) {
      showToast("error", "সাপ্লায়ার, মূল ক্রয় বিল ও ফেরত পণ্যের পরিমাণ দিন।");
      return;
    }
    if (returnItems.some((item) => {
      const source = selectedItems.find((row) => row.purchase_item_id === item.purchase_item_id);
      return Number(item.quantity) > Number(source.remaining_quantity);
    })) {
      showToast("error", "ফেরতের পরিমাণ মূল বিলে অবশিষ্ট পণ্যের চেয়ে বেশি।");
      return;
    }
    setSaving(true);
    try {
      const response = await apiRequest("/purchases/return.php", {
        method: "POST",
        token,
        shopId,
        body: JSON.stringify({
          supplier_id: supplierId,
          purchase_bill_id: purchaseBillId,
          return_date: returnDate,
          notes,
          items: returnItems,
        }),
      });
      showToast("success", `${response.message} মোট রিটার্ন: ৳ ${formatMoney(response.data.total_amount)}।`);
      onDataChanged();
      onClose();
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="product-modal-backdrop">
      <section aria-labelledby="supplier-return-title" aria-modal="true" className="product-modal stock-entry-modal" role="dialog">
        <header className="product-modal-header">
          <span className="product-modal-icon"><RotateCcw size={22} /></span>
          <div><h2 id="supplier-return-title">সাপ্লায়ার রিটার্ন</h2><p>মূল ক্রয় বিল থেকে ফেরত দিয়ে দোকানের স্টক কমান।</p></div>
          <button aria-label="ফর্ম বন্ধ করুন" className="product-modal-close" disabled={saving} onClick={onClose} type="button"><X size={20} /></button>
        </header>
        {loading ? <div className="user-list-empty"><span className="button-spinner" /> সাপ্লায়ারের তালিকা লোড হচ্ছে...</div> : (
          <form className="product-form" onSubmit={handleSubmit}>
            <div className="sales-form-grid">
              <label className="product-form-field" htmlFor="supplier-return-supplier">
                <span className="product-field-label">সাপ্লায়ার</span>
                <SearchableSelect
                  id="supplier-return-supplier"
                  onChange={(event) => selectSupplier(event.target.value)}
                  options={[
                    { value: "", label: "সাপ্লায়ার নির্বাচন করুন" },
                    ...suppliers.map((supplier) => ({
                      value: supplier.id,
                      label: `${supplier.supplier_name}${supplier.address ? ` · ${supplier.address}` : ""}`,
                    })),
                  ]}
                  placeholder="সাপ্লায়ারের নাম লিখে খুঁজুন"
                  value={supplierId}
                />
              </label>
              <label className="product-form-field" htmlFor="supplier-return-date">
                <span className="product-field-label">রিটার্নের তারিখ</span>
                <input className="product-field-control" id="supplier-return-date" max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)} onChange={(event) => setReturnDate(event.target.value)} required type="date" value={returnDate} />
              </label>
              <label className="product-form-field" htmlFor="supplier-return-bill">
                <span className="product-field-label">মূল ক্রয় বিল</span>
                <SearchableSelect
                  disabled={!supplierId || loadingItems}
                  id="supplier-return-bill"
                  onChange={(event) => { setPurchaseBillId(event.target.value); setQuantities({}); }}
                  options={[
                    { value: "", label: loadingItems ? "বিল লোড হচ্ছে..." : "বিল নির্বাচন করুন" },
                    ...bills.map((bill) => ({
                      value: bill.purchase_bill_id,
                      label: `${bill.bill_number || `ক্রয় #${bill.purchase_bill_id}`} · ${bill.purchase_date}`,
                    })),
                  ]}
                  placeholder="বিল নম্বর দিয়ে খুঁজুন"
                  value={purchaseBillId}
                />
              </label>
            </div>
            {supplierId && !loadingItems && bills.length === 0 ? <p className="user-list-empty">এই সাপ্লায়ারের ফেরতযোগ্য দোকান ক্রয় নেই।</p> : null}
            {selectedItems.map((item) => (
              <label className="sales-return-item stock-return-item" key={item.purchase_item_id}>
                <span><strong>{item.product_name}</strong><small>ক্রয় {item.purchased_quantity} · ফেরতযোগ্য {item.remaining_quantity} · ক্রয়মূল্য ৳{formatMoney(Number(item.unit_price))}</small></span>
                <span className="sales-return-quantity"><small>ফেরত পরিমাণ</small><input className="product-field-control" max={item.remaining_quantity} min="0" onChange={(event) => setQuantities((current) => ({ ...current, [item.purchase_item_id]: event.target.value }))} step="0.001" type="number" value={quantities[item.purchase_item_id] || ""} /></span>
              </label>
            ))}
            <label className="product-form-field stock-entry-notes" htmlFor="supplier-return-notes"><span className="product-field-label">নোট <span className="optional-label">ঐচ্ছিক</span></span><textarea className="product-field-control customer-address-control" id="supplier-return-notes" maxLength={500} onChange={(event) => setNotes(event.target.value)} rows={2} value={notes} /></label>
            <footer className="product-form-actions purchase-form-actions">
              <strong>রিটার্ন মূল্য: ৳ {formatMoney(returnTotal)}</strong>
              <div><button className="product-cancel-button" disabled={saving} onClick={onClose} type="button">বাতিল</button><button className="product-save-button" disabled={saving || loadingItems || !selectedItems.length} type="submit">{saving ? <span className="button-spinner" /> : <Save size={17} />}{saving ? "সংরক্ষণ হচ্ছে..." : "সাপ্লায়ার রিটার্ন সংরক্ষণ"}</button></div>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}

function SupplierPaymentForm({ token, shopId, shop, onClose, onDataChanged, showToast }) {
  const [suppliers, setSuppliers] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [bankAccountId, setBankAccountId] = useState("");
  const [note, setNote] = useState("");
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedPaymentId, setSavedPaymentId] = useState(null);
  const [paymentReceipt, setPaymentReceipt] = useState(null);

  useEffect(() => {
    let active = true;
    apiRequest("/suppliers/payment-options.php", { token, shopId })
      .then((response) => {
        if (active) setSuppliers(response.data.suppliers);
      })
      .catch((error) => {
        if (active) showToast("error", error.message);
      })
      .finally(() => {
        if (active) setLoadingSuppliers(false);
      });
    return () => {
      active = false;
    };
  }, [token, shopId, showToast]);

  useEffect(() => {
    if (paymentMethod !== "bank") {
      setBankAccountId("");
      return undefined;
    }

    let active = true;
    setLoadingBanks(true);
    apiRequest("/banks/list.php", { token, shopId })
      .then((response) => {
        if (active) setBankAccounts(response.data.accounts);
      })
      .catch((error) => {
        if (active) showToast("error", error.message);
      })
      .finally(() => {
        if (active) setLoadingBanks(false);
      });
    return () => {
      active = false;
    };
  }, [paymentMethod, token, shopId, showToast]);

  const selectedSupplier = suppliers.find((supplier) => String(supplier.id) === String(supplierId));
  const previousDue = Number(selectedSupplier?.current_due || 0);
  const numericPayment = Number(paymentAmount);
  const currentDue = previousDue - (Number.isFinite(numericPayment) ? numericPayment : 0);

  async function openSavedPaymentMemo(paymentId) {
    try {
      const response = await apiRequest(
        `/supplier-payments/receipt.php?id=${encodeURIComponent(paymentId)}`,
        { token, shopId },
      );
      setPaymentReceipt(response.data.payment);
    } catch (error) {
      showToast("error", `পেমেন্ট সংরক্ষিত হয়েছে, কিন্তু মেমো লোড করা যায়নি: ${error.message}`);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedSupplier) {
      showToast("error", "সাপ্লায়ার নির্বাচন করুন।");
      return;
    }
    if (!Number.isFinite(numericPayment) || numericPayment <= 0) {
      showToast("error", "পেমেন্টের সঠিক পরিমাণ লিখুন।");
      return;
    }
    if (previousDue <= 0 || numericPayment > previousDue) {
      showToast("error", "পেমেন্টের পরিমাণ বর্তমান বকেয়ার বেশি হতে পারবে না।");
      return;
    }
    if (paymentMethod === "bank" && !bankAccountId) {
      showToast("error", "ব্যাংক হিসাব নির্বাচন করুন।");
      return;
    }

    setSaving(true);
    try {
      const response = await apiRequest("/supplier-payments/create.php", {
        method: "POST",
        token,
        shopId,
        body: JSON.stringify({
          supplier_id: supplierId,
          payment_amount: paymentAmount,
          payment_method: paymentMethod,
          bank_account_id: paymentMethod === "bank" ? bankAccountId : null,
          note,
        }),
      });
      setSavedPaymentId(response.data.payment.id);
      showToast(
        "success",
        `${response.message} বর্তমান বকেয়া: ৳ ${formatMoney(response.data.payment.current_due)}।`,
      );
      onDataChanged();
      await openSavedPaymentMemo(response.data.payment.id);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setSaving(false);
    }
  }

  if (paymentReceipt) {
    return (
      <ActivityReceiptMemo
        onClose={onClose}
        receipt={paymentReceipt}
        shop={shop}
        type="supplier_payment"
      />
    );
  }

  return (
    <div className="product-modal-backdrop">
      <section aria-labelledby="supplier-payment-title" aria-modal="true" className="product-modal stock-entry-modal" role="dialog">
        <header className="product-modal-header">
          <span className="product-modal-icon"><Wallet size={22} /></span>
          <div><h2 id="supplier-payment-title">সাপ্লায়ার পেমেন্ট</h2><p>সাপ্লায়ারের বকেয়া থেকে নগদ বা ব্যাংক পেমেন্ট সংরক্ষণ করুন।</p></div>
          <button aria-label="সাপ্লায়ার পেমেন্ট ফর্ম বন্ধ করুন" className="product-modal-close" disabled={saving} onClick={onClose} type="button"><X size={20} /></button>
        </header>
        {loadingSuppliers ? (
          <div className="user-list-empty"><span className="button-spinner" /> সাপ্লায়ারের বকেয়া লোড হচ্ছে...</div>
        ) : suppliers.length === 0 ? (
          <div className="user-list-empty">এই দোকানে কোনো সাপ্লায়ার নেই। আগে সাপ্লায়ার সেটআপ থেকে সাপ্লায়ার যোগ করুন।</div>
        ) : (
          <form className="product-form" onSubmit={handleSubmit}>
            <div className="sales-form-grid">
              <label className="product-form-field" htmlFor="supplier-payment-supplier">
                <span className="product-field-label">সাপ্লায়ার</span>
                <SearchableSelect
                  id="supplier-payment-supplier"
                  name="supplier_id"
                  onChange={(event) => {
                    setSupplierId(event.target.value);
                    setPaymentAmount("");
                  }}
                  options={[
                    { value: "", label: "সাপ্লায়ার নির্বাচন করুন" },
                    ...suppliers.map((supplier) => ({
                      value: supplier.id,
                      label: `${supplier.supplier_name}${supplier.address ? ` · ${supplier.address}` : ""}`,
                    })),
                  ]}
                  placeholder="নাম বা ঠিকানা দিয়ে খুঁজুন"
                  required
                  value={supplierId}
                />
              </label>
              <div className="product-form-field">
                <span className="product-field-label">পূর্বের বকেয়া</span>
                <div aria-label={`পূর্বের বকেয়া ৳ ${formatMoney(previousDue)}`} aria-readonly="true" className="product-field-control sales-summary-readonly" role="textbox">৳ {formatMoney(previousDue)}</div>
              </div>
              <label className="product-form-field" htmlFor="supplier-payment-amount">
                <span className="product-field-label">পেমেন্ট (৳)</span>
                <input
                  className="product-field-control"
                  id="supplier-payment-amount"
                  max={previousDue > 0 ? previousDue : undefined}
                  min="0.01"
                  onChange={(event) => setPaymentAmount(event.target.value)}
                  required
                  step="0.01"
                  type="number"
                  value={paymentAmount}
                />
              </label>
              <div className="product-form-field">
                <span className="product-field-label">বর্তমান বকেয়া</span>
                <div aria-label={`বর্তমান বকেয়া ৳ ${formatMoney(currentDue)}`} aria-readonly="true" className="product-field-control sales-summary-readonly" role="textbox">৳ {formatMoney(currentDue)}</div>
              </div>
              <label className="product-form-field" htmlFor="supplier-payment-method">
                <span className="product-field-label">পেমেন্ট পদ্ধতি</span>
                <SearchableSelect
                  id="supplier-payment-method"
                  name="payment_method"
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  options={[
                    { value: "cash", label: "By Cash · নগদ" },
                    { value: "bank", label: "By Bank · ব্যাংক" },
                  ]}
                  placeholder="পেমেন্ট পদ্ধতি নির্বাচন করুন"
                  value={paymentMethod}
                />
              </label>
              {paymentMethod === "bank" ? (
                <label className="product-form-field" htmlFor="supplier-payment-bank">
                  <span className="product-field-label">ব্যাংক হিসাব</span>
                  {loadingBanks ? (
                    <span className="product-field-control">ব্যাংক হিসাব লোড হচ্ছে...</span>
                  ) : (
                    <SearchableSelect
                      id="supplier-payment-bank"
                      name="bank_account_id"
                      onChange={(event) => setBankAccountId(event.target.value)}
                      options={[
                        { value: "", label: "ব্যাংক হিসাব নির্বাচন করুন" },
                        ...bankAccounts.map((account) => ({
                          value: account.id,
                          label: `${account.bank_name} · ${account.account_name}${account.account_number ? ` · ${account.account_number}` : ""}`,
                        })),
                      ]}
                      placeholder={bankAccounts.length ? "ব্যাংক বা হিসাব দিয়ে খুঁজুন" : "আগে ব্যাংক সেটআপে হিসাব যোগ করুন"}
                      required
                      value={bankAccountId}
                    />
                  )}
                  {!loadingBanks && bankAccounts.length === 0 ? <small className="user-management-note">ব্যাংক পেমেন্টের আগে ব্যাংক সেটআপে হিসাব যোগ করুন।</small> : null}
                </label>
              ) : null}
              <label className="product-form-field" htmlFor="supplier-payment-note">
                <span className="product-field-label">নোট <span className="optional-label">ঐচ্ছিক</span></span>
                <textarea className="product-field-control customer-address-control" id="supplier-payment-note" maxLength={500} onChange={(event) => setNote(event.target.value)} rows={2} value={note} />
              </label>
            </div>
            {selectedSupplier && previousDue <= 0 ? <p className="user-management-note">এই সাপ্লায়ারের বর্তমানে পরিশোধযোগ্য বকেয়া নেই।</p> : null}
            <footer className="product-form-actions purchase-form-actions">
              <strong>পরিশোধযোগ্য বকেয়া: ৳ {formatMoney(Math.max(previousDue, 0))}</strong>
              <div>
                <button className="product-cancel-button" disabled={saving} onClick={onClose} type="button">বাতিল</button>
                <button className="product-save-button" disabled={saving || savedPaymentId !== null || !selectedSupplier || previousDue <= 0 || (paymentMethod === "bank" && (loadingBanks || bankAccounts.length === 0))} type="submit">
                  {saving ? <span className="button-spinner" /> : <Save size={17} />}
                  {saving ? "সংরক্ষণ হচ্ছে..." : savedPaymentId !== null ? "পেমেন্ট সংরক্ষিত" : "পেমেন্ট সংরক্ষণ"}
                </button>
              </div>
            </footer>
            {savedPaymentId !== null ? (
              <p className="user-management-note">
                পেমেন্ট সংরক্ষিত হয়েছে। মেমো লোড না হলে{" "}
                <button className="user-action-button" onClick={() => openSavedPaymentMemo(savedPaymentId)} type="button">মেমো আবার খুলুন</button>।
              </p>
            ) : null}
          </form>
        )}
      </section>
    </div>
  );
}

function CustomerPaymentForm({ token, shopId, shop, onClose, onDataChanged, showToast }) {
  const [customers, setCustomers] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [bankAccountId, setBankAccountId] = useState("");
  const [note, setNote] = useState("");
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedPaymentId, setSavedPaymentId] = useState(null);
  const [paymentReceipt, setPaymentReceipt] = useState(null);

  useEffect(() => {
    let active = true;
    apiRequest("/customers/payment-options.php", { token, shopId })
      .then((response) => {
        if (active) setCustomers(response.data.customers);
      })
      .catch((error) => {
        if (active) showToast("error", error.message);
      })
      .finally(() => {
        if (active) setLoadingCustomers(false);
      });
    return () => {
      active = false;
    };
  }, [token, shopId, showToast]);

  useEffect(() => {
    if (paymentMethod !== "bank") {
      setBankAccountId("");
      return undefined;
    }
    let active = true;
    setLoadingBanks(true);
    apiRequest("/banks/list.php", { token, shopId })
      .then((response) => {
        if (active) setBankAccounts(response.data.accounts);
      })
      .catch((error) => {
        if (active) showToast("error", error.message);
      })
      .finally(() => {
        if (active) setLoadingBanks(false);
      });
    return () => {
      active = false;
    };
  }, [paymentMethod, token, shopId, showToast]);

  const selectedCustomer = customers.find((customer) => String(customer.id) === String(customerId));
  const previousDue = Number(selectedCustomer?.current_due || 0);
  const numericPayment = Number(paymentAmount);
  const currentDue = previousDue - (Number.isFinite(numericPayment) ? numericPayment : 0);

  async function openPaymentMemo(paymentId) {
    try {
      const response = await apiRequest(
        `/customer-payments/receipt.php?id=${encodeURIComponent(paymentId)}`,
        { token, shopId },
      );
      setPaymentReceipt(response.data.payment);
    } catch (error) {
      showToast("error", `আদায় সংরক্ষিত হয়েছে, কিন্তু রসিদ লোড করা যায়নি: ${error.message}`);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedCustomer) {
      showToast("error", "বকেয়া থাকা কাস্টমার নির্বাচন করুন।");
      return;
    }
    if (!Number.isFinite(numericPayment) || numericPayment <= 0 || numericPayment > previousDue) {
      showToast("error", "আদায়ের পরিমাণ শূন্যের বেশি এবং বর্তমান বকেয়ার মধ্যে লিখুন।");
      return;
    }
    if (paymentMethod === "bank" && !bankAccountId) {
      showToast("error", "ব্যাংক হিসাব নির্বাচন করুন।");
      return;
    }
    setSaving(true);
    try {
      const response = await apiRequest("/customer-payments/create.php", {
        method: "POST",
        token,
        shopId,
        body: JSON.stringify({
          customer_id: customerId,
          payment_amount: paymentAmount,
          payment_method: paymentMethod,
          bank_account_id: paymentMethod === "bank" ? bankAccountId : null,
          note,
        }),
      });
      setSavedPaymentId(response.data.payment.id);
      showToast("success", `${response.message} বর্তমান বকেয়া: ৳ ${formatMoney(response.data.payment.current_due)}।`);
      onDataChanged();
      await openPaymentMemo(response.data.payment.id);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setSaving(false);
    }
  }

  if (paymentReceipt) {
    return (
      <ActivityReceiptMemo
        onClose={onClose}
        receipt={paymentReceipt}
        shop={shop}
        type="customer_payment"
      />
    );
  }

  return (
    <div className="product-modal-backdrop">
      <section aria-labelledby="customer-payment-title" aria-modal="true" className="product-modal stock-entry-modal" role="dialog">
        <header className="product-modal-header">
          <span className="product-modal-icon"><Wallet size={22} /></span>
          <div><h2 id="customer-payment-title">বাকি আদায়</h2><p>কাস্টমারের বকেয়া নগদ বা ব্যাংকে গ্রহণ করুন।</p></div>
          <button aria-label="বাকি আদায় ফর্ম বন্ধ করুন" className="product-modal-close" disabled={saving} onClick={onClose} type="button"><X size={20} /></button>
        </header>
        {loadingCustomers ? (
          <div className="user-list-empty"><span className="button-spinner" /> বকেয়াসহ কাস্টমারের তালিকা লোড হচ্ছে...</div>
        ) : customers.length === 0 ? (
          <div className="user-list-empty">কোনো কাস্টমারের বকেয়া নেই।</div>
        ) : (
          <form className="product-form" onSubmit={handleSubmit}>
            <div className="sales-form-grid">
              <label className="product-form-field" htmlFor="customer-payment-customer">
                <span className="product-field-label">কাস্টমার</span>
                <SearchableSelect
                  id="customer-payment-customer"
                  onChange={(event) => {
                    setCustomerId(event.target.value);
                    setPaymentAmount("");
                  }}
                  options={[
                    { value: "", label: "কাস্টমার নির্বাচন করুন" },
                    ...customers.map((customer) => ({
                      value: customer.id,
                      label: `${customer.customer_name}${customer.mobile_number ? ` · ${customer.mobile_number}` : ""}${customer.address ? ` · ${customer.address}` : ""}`,
                    })),
                  ]}
                  placeholder="নাম, মোবাইল বা ঠিকানা দিয়ে খুঁজুন"
                  required
                  value={customerId}
                />
              </label>
              <div className="product-form-field">
                <span className="product-field-label">পূর্বের বকেয়া</span>
                <div aria-label={`পূর্বের বকেয়া ৳ ${formatMoney(previousDue)}`} aria-readonly="true" className="product-field-control sales-summary-readonly" role="textbox">৳ {formatMoney(previousDue)}</div>
              </div>
              <label className="product-form-field" htmlFor="customer-payment-amount">
                <span className="product-field-label">আদায় (৳)</span>
                <input className="product-field-control" id="customer-payment-amount" max={previousDue > 0 ? previousDue : undefined} min="0.01" onChange={(event) => setPaymentAmount(event.target.value)} required step="0.01" type="number" value={paymentAmount} />
              </label>
              <div className="product-form-field">
                <span className="product-field-label">বর্তমান বকেয়া</span>
                <div aria-label={`বর্তমান বকেয়া ৳ ${formatMoney(currentDue)}`} aria-readonly="true" className="product-field-control sales-summary-readonly" role="textbox">৳ {formatMoney(currentDue)}</div>
              </div>
              <label className="product-form-field" htmlFor="customer-payment-method">
                <span className="product-field-label">আদায়ের মাধ্যম</span>
                <SearchableSelect
                  id="customer-payment-method"
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  options={[
                    { value: "cash", label: "By Cash · নগদ" },
                    { value: "bank", label: "By Bank · ব্যাংক" },
                  ]}
                  placeholder="আদায়ের মাধ্যম নির্বাচন করুন"
                  value={paymentMethod}
                />
              </label>
              {paymentMethod === "bank" ? (
                <label className="product-form-field" htmlFor="customer-payment-bank">
                  <span className="product-field-label">ব্যাংক হিসাব</span>
                  {loadingBanks ? (
                    <span className="product-field-control">ব্যাংক হিসাব লোড হচ্ছে...</span>
                  ) : (
                    <SearchableSelect
                      id="customer-payment-bank"
                      onChange={(event) => setBankAccountId(event.target.value)}
                      options={[
                        { value: "", label: "ব্যাংক হিসাব নির্বাচন করুন" },
                        ...bankAccounts.map((account) => ({
                          value: account.id,
                          label: `${account.bank_name} · ${account.account_name}${account.account_number ? ` · ${account.account_number}` : ""}`,
                        })),
                      ]}
                      placeholder="ব্যাংক বা হিসাবের নাম লিখে খুঁজুন"
                      required
                      value={bankAccountId}
                    />
                  )}
                  {!loadingBanks && bankAccounts.length === 0 ? <small>ব্যাংক পেমেন্টের আগে ব্যাংক সেটআপ করুন।</small> : null}
                </label>
              ) : null}
            </div>
            <label className="product-form-field stock-entry-notes" htmlFor="customer-payment-note">
              <span className="product-field-label">নোট <span className="optional-label">ঐচ্ছিক</span></span>
              <textarea className="product-field-control customer-address-control" id="customer-payment-note" maxLength={500} onChange={(event) => setNote(event.target.value)} rows={2} value={note} />
            </label>
            <footer className="product-form-actions purchase-form-actions">
              <strong>আদায়: ৳ {formatMoney(numericPayment || 0)}</strong>
              <div>
                <button className="product-cancel-button" disabled={saving} onClick={onClose} type="button">বাতিল</button>
                <button className="product-save-button" disabled={saving || savedPaymentId !== null || !selectedCustomer || previousDue <= 0 || (paymentMethod === "bank" && (loadingBanks || bankAccounts.length === 0))} type="submit">
                  {saving ? <span className="button-spinner" /> : <Save size={17} />}
                  {saving ? "সংরক্ষণ হচ্ছে..." : savedPaymentId !== null ? "আদায় সংরক্ষিত" : "আদায় সংরক্ষণ"}
                </button>
              </div>
            </footer>
            {savedPaymentId !== null ? (
              <p className="user-management-note">
                আদায় সংরক্ষিত হয়েছে। রসিদ লোড না হলে{" "}
                <button className="user-action-button" onClick={() => openPaymentMemo(savedPaymentId)} type="button">রসিদ আবার খুলুন</button>।
              </p>
            ) : null}
          </form>
        )}
      </section>
    </div>
  );
}

function DamageStockForm({ token, shopId, onClose, onDataChanged, showToast }) {
  const [products, setProducts] = useState([]);
  const [values, setValues] = useState({
    product_id: "",
    product_search: "",
    quantity: "",
    adjustment_date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10),
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest("/products/list.php", { token, shopId })
      .then((response) => {
        if (active) setProducts(response.data.products);
      })
      .catch((error) => {
        if (active) showToast("error", error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, shopId, showToast]);

  function updateProductSearch(productId) {
    const product = products.find((entry) => String(entry.id) === String(productId));
    setValues((current) => ({
      ...current,
      product_id: product ? String(product.id) : "",
    }));
  }

  const selectedProduct = products.find((product) => product.id === Number(values.product_id));

  async function handleSubmit(event) {
    event.preventDefault();
    if (!values.product_id || !values.quantity) {
      showToast("error", "ড্যামেজ হওয়া পণ্য ও পরিমাণ দিন।");
      return;
    }
    setSaving(true);
    try {
      const response = await apiRequest("/stock/damage.php", {
        method: "POST",
        token,
        shopId,
        body: JSON.stringify(values),
      });
      showToast("success", response.message);
      onDataChanged();
      onClose();
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="product-modal-backdrop">
      <section aria-labelledby="damage-stock-title" aria-modal="true" className="product-modal stock-entry-modal" role="dialog">
        <header className="product-modal-header">
          <span className="product-modal-icon"><Package size={22} /></span>
          <div><h2 id="damage-stock-title">ড্যামেজ স্টক এন্ট্রি</h2><p>নষ্ট পণ্য স্টক থেকে বাদ দিয়ে রিপোর্টে সংরক্ষণ করুন।</p></div>
          <button aria-label="ফর্ম বন্ধ করুন" className="product-modal-close" disabled={saving} onClick={onClose} type="button"><X size={20} /></button>
        </header>
        {loading ? <div className="user-list-empty"><span className="button-spinner" /> পণ্যের তালিকা লোড হচ্ছে...</div> : (
          <form className="product-form" onSubmit={handleSubmit}>
            <div className="sales-form-grid">
              <label className="product-form-field" htmlFor="damage-product">
                <span className="product-field-label">পণ্য খুঁজুন</span>
                <SearchableSelect
                  ariaLabel="ড্যামেজ হওয়া পণ্য নির্বাচন"
                  className="product-field-control product-select-control"
                  id="damage-product"
                  name="product_id"
                  onChange={(event) => updateProductSearch(event.target.value)}
                  options={products.map((product) => ({
                    value: product.id,
                    label: `${product.product_name}${product.product_code ? ` · ${product.product_code}` : ` · #${product.id}`}`,
                  }))}
                  placeholder="নাম বা কোড লিখুন"
                  required
                  value={values.product_id}
                />
                {selectedProduct ? <small>বর্তমান স্টক: {selectedProduct.current_stock} {selectedProduct.unit || ""}</small> : null}
              </label>
              <label className="product-form-field" htmlFor="damage-quantity"><span className="product-field-label">ড্যামেজ পরিমাণ</span><input className="product-field-control" id="damage-quantity" max={selectedProduct?.current_stock} min="0.001" onChange={(event) => setValues((current) => ({ ...current, quantity: event.target.value }))} required step="0.001" type="number" value={values.quantity} /></label>
              <label className="product-form-field" htmlFor="damage-date"><span className="product-field-label">তারিখ</span><input className="product-field-control" id="damage-date" max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)} onChange={(event) => setValues((current) => ({ ...current, adjustment_date: event.target.value }))} required type="date" value={values.adjustment_date} /></label>
            </div>
            <label className="product-form-field stock-entry-notes" htmlFor="damage-notes"><span className="product-field-label">কারণ/নোট <span className="optional-label">ঐচ্ছিক</span></span><textarea className="product-field-control customer-address-control" id="damage-notes" maxLength={500} onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))} rows={2} value={values.notes} /></label>
            <footer className="product-form-actions purchase-form-actions"><button className="product-cancel-button" disabled={saving} onClick={onClose} type="button">বাতিল</button><button className="product-save-button" disabled={saving || !products.length} type="submit">{saving ? <span className="button-spinner" /> : <Save size={17} />}{saving ? "সংরক্ষণ হচ্ছে..." : "ড্যামেজ স্টক সংরক্ষণ"}</button></footer>
          </form>
        )}
      </section>
    </div>
  );
}

function WarehouseTransferPanel({ token, shopId, onClose, onSaved, showToast }) {
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [stockItems, setStockItems] = useState([]);
  const [items, setItems] = useState([{ product_id: "", quantity: "" }]);
  const [transferDate, setTransferDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest("/warehouses/list.php", { token, shopId })
      .then((response) => {
        if (!active) return;
        const available = response.data.warehouses;
        setWarehouses(available);
        setWarehouseId(available[0] ? String(available[0].id) : "");
      })
      .catch((error) => {
        if (active) showToast("error", error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, shopId, showToast]);

  useEffect(() => {
    if (!warehouseId) {
      setStockItems([]);
      return undefined;
    }
    let active = true;
    setLoadingStock(true);
    apiRequest(`/warehouses/stock.php?${new URLSearchParams({ warehouse_id: warehouseId })}`, { token, shopId })
      .then((response) => {
        if (active) setStockItems(response.data.items);
      })
      .catch((error) => {
        if (active) showToast("error", error.message);
      })
      .finally(() => {
        if (active) setLoadingStock(false);
      });
    return () => {
      active = false;
    };
  }, [token, shopId, showToast, warehouseId]);

  function updateItem(index, key, value) {
    setItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [key]: value } : item
    )));
  }

  async function submitTransfer(event) {
    event.preventDefault();
    if (!warehouseId) {
      showToast("error", "যে গুদাম থেকে স্টক নেবেন সেটি নির্বাচন করুন।");
      return;
    }
    if (items.some((item) => !item.product_id || !item.quantity || Number(item.quantity) <= 0)) {
      showToast("error", "প্রতিটি সারিতে পণ্য এবং শূন্যের বেশি পরিমাণ দিন।");
      return;
    }
    const productIds = items.map((item) => String(item.product_id));
    if (new Set(productIds).size !== productIds.length) {
      showToast("error", "একই পণ্য একাধিক সারিতে আছে; একটি সারিতে পরিমাণ একত্র করুন।");
      return;
    }
    const exceedsStock = items.some((item) => {
      const available = stockItems.find((stockItem) => String(stockItem.product_id) === String(item.product_id));
      return !available || Number(item.quantity) > Number(available.quantity);
    });
    if (exceedsStock) {
      showToast("error", "স্থানান্তরের পরিমাণ নির্বাচিত গুদামের স্টকের চেয়ে বেশি হতে পারবে না।");
      return;
    }

    setSaving(true);
    try {
      const response = await apiRequest("/warehouses/transfer.php", {
        method: "POST",
        token,
        shopId,
        body: JSON.stringify({
          warehouse_id: Number(warehouseId),
          transfer_date: transferDate,
          notes,
          items: items.map(({ product_id, quantity }) => ({ product_id, quantity })),
        }),
      });
      showToast("success", response.message);
      onSaved();
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setSaving(false);
    }
  }

  const productOptions = stockItems.map((item) => ({
    value: item.product_id,
    label: `${item.product_name}${item.product_code ? ` · ${item.product_code}` : ""} · স্টক ${item.quantity}${item.unit ? ` ${item.unit}` : ""}`,
  }));

  return (
    <div className="product-modal-backdrop stock-report-backdrop">
      <section aria-labelledby="warehouse-transfer-title" aria-modal="true" className="product-modal warehouse-transfer-modal" role="dialog">
        <header className="product-modal-header">
          <span className="product-modal-icon"><Truck size={22} /></span>
          <div><h2 id="warehouse-transfer-title">গুদাম থেকে দোকানে স্টক</h2><p>গুদামের FIFO ক্রয়ব্যাচ ও ক্রয়দর অক্ষত রেখে দোকানে স্থানান্তর করুন।</p></div>
          <button aria-label="স্টক স্থানান্তর বন্ধ করুন" className="product-modal-close" onClick={onClose} type="button"><X size={20} /></button>
        </header>
        {loading ? (
          <div className="user-list-empty"><span className="button-spinner" /> গুদামের তালিকা লোড হচ্ছে...</div>
        ) : warehouses.length === 0 ? (
          <div className="user-list-empty">গুদাম সেটআপ করা নেই। আগে সেটআপ থেকে গুদাম যোগ করুন।</div>
        ) : (
          <form className="warehouse-transfer-form" onSubmit={submitTransfer}>
            <div className="warehouse-transfer-fields">
              <label className="product-form-field">
                <span className="product-field-label">যে গুদাম থেকে নেওয়া হবে</span>
                <SearchableSelect
                  ariaLabel="যে গুদাম থেকে নেওয়া হবে"
                  onChange={(event) => {
                    setWarehouseId(event.target.value);
                    setItems([{ product_id: "", quantity: "" }]);
                  }}
                  options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.warehouse_name }))}
                  placeholder="গুদামের নাম লিখে খুঁজুন"
                  value={warehouseId}
                />
              </label>
              <label className="product-form-field">
                <span className="product-field-label">স্থানান্তরের তারিখ</span>
                <input className="product-field-control" max={today} onChange={(event) => setTransferDate(event.target.value)} required type="date" value={transferDate} />
              </label>
            </div>
            {loadingStock ? (
              <div className="user-list-empty"><span className="button-spinner" /> গুদামের পণ্য লোড হচ্ছে...</div>
            ) : stockItems.length === 0 ? (
              <div className="user-list-empty">নির্বাচিত গুদামে স্থানান্তরের জন্য কোনো স্টক নেই।</div>
            ) : (
              <>
                <div className="warehouse-transfer-items">
                  {items.map((item, index) => {
                    const selectedItem = stockItems.find((stockItem) => String(stockItem.product_id) === String(item.product_id));
                    return (
                      <div className="warehouse-transfer-row" key={index}>
                        <SearchableReportSelect
                          label={`পণ্য ${index + 1}`}
                          onChange={(value) => updateItem(index, "product_id", value)}
                          options={productOptions}
                          placeholder="পণ্যের নাম বা কোড খুঁজুন"
                          value={item.product_id}
                        />
                        <label className="product-form-field">
                          <span className="product-field-label">পরিমাণ{selectedItem ? ` · স্টক ${selectedItem.quantity} ${selectedItem.unit || ""}` : ""}</span>
                          <input className="product-field-control" max={selectedItem?.quantity || undefined} min="0.001" onChange={(event) => updateItem(index, "quantity", event.target.value)} required step="0.001" type="number" value={item.quantity} />
                        </label>
                        <button aria-label={`পণ্য ${index + 1} বাদ দিন`} className="user-action-button warehouse-transfer-remove" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} type="button"><X size={16} /></button>
                      </div>
                    );
                  })}
                </div>
                <button className="user-action-button warehouse-transfer-add" onClick={() => setItems((current) => [...current, { product_id: "", quantity: "" }])} type="button"><Plus size={16} /> আরেকটি পণ্য যোগ করুন</button>
                <label className="product-form-field warehouse-transfer-notes">
                  <span className="product-field-label">নোট <span className="optional-label">ঐচ্ছিক</span></span>
                  <textarea className="product-field-control customer-address-control" maxLength={500} onChange={(event) => setNotes(event.target.value)} rows={2} value={notes} />
                </label>
              </>
            )}
            <footer className="product-form-actions purchase-form-actions">
              <button className="product-cancel-button" disabled={saving} onClick={onClose} type="button">বাতিল</button>
              <button className="product-save-button" disabled={saving || loadingStock || !stockItems.length} type="submit">{saving ? <span className="button-spinner" /> : <Truck size={17} />}{saving ? "স্থানান্তর হচ্ছে..." : "দোকানে স্থানান্তর করুন"}</button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}

function WarehouseStockPanel({ token, shopId, shop, onClose, showToast }) {
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [productId, setProductId] = useState("");
  const [items, setItems] = useState([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest("/warehouses/list.php", { token, shopId })
      .then((response) => {
        if (!active) return;
        const available = response.data.warehouses;
        setWarehouses(available);
        setWarehouseId(available[0] ? String(available[0].id) : "");
      })
      .catch((error) => {
        if (active) showToast("error", error.message);
      })
      .finally(() => {
        if (active) setLoadingWarehouses(false);
      });
    return () => {
      active = false;
    };
  }, [token, shopId, showToast]);

  useEffect(() => {
    if (!warehouseId) {
      setItems([]);
      return undefined;
    }
    let active = true;
    setLoadingStock(true);
    const query = new URLSearchParams({ warehouse_id: warehouseId });
    apiRequest(`/warehouses/stock.php?${query}`, { token, shopId })
      .then((response) => {
        if (active) setItems(response.data.items);
      })
      .catch((error) => {
        if (active) showToast("error", error.message);
      })
      .finally(() => {
        if (active) setLoadingStock(false);
      });
    return () => {
      active = false;
    };
  }, [token, shopId, showToast, warehouseId]);

  const visibleItems = productId
    ? items.filter((item) => String(item.product_id) === productId)
    : items;
  const selectedProduct = items.find((item) => String(item.product_id) === productId);
  const productOptions = items.map((item) => ({
    value: item.product_id,
    label: `${item.product_name}${item.product_code ? ` · ${item.product_code}` : ""}`,
  }));

  const formatQuantity = (value) => new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(Number(value) || 0);

  return (
    <div className="product-modal-backdrop stock-report-backdrop">
      <section aria-labelledby="warehouse-stock-title" aria-modal="true" className="product-modal warehouse-stock-modal" role="dialog">
        <header className="product-modal-header">
          <span className="product-modal-icon"><Boxes size={22} /></span>
          <div><h2 id="warehouse-stock-title">গুদাম স্টক রিপোর্ট</h2><p>নির্বাচিত গুদামে থাকা পণ্যের মজুত দেখুন এবং প্রিন্ট করুন।</p></div>
          <button aria-label="গুদাম স্টক রিপোর্ট বন্ধ করুন" className="product-modal-close" onClick={onClose} type="button"><X size={20} /></button>
        </header>
        {loadingWarehouses ? (
          <div className="user-list-empty"><span className="button-spinner" /> গুদামের তালিকা লোড হচ্ছে...</div>
        ) : warehouses.length === 0 ? (
          <div className="user-list-empty">গুদাম সেটআপ করা নেই। আগে সেটআপ থেকে গুদাম যোগ করুন।</div>
        ) : (
          <>
            <div className="warehouse-stock-filters">
              <label className="product-form-field" htmlFor="warehouse-stock-warehouse">
                <span className="product-field-label">গুদাম</span>
                <SearchableSelect
                  id="warehouse-stock-warehouse"
                  onChange={(event) => {
                    setWarehouseId(event.target.value);
                    setProductId("");
                  }}
                  options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.warehouse_name }))}
                  placeholder="গুদামের নাম লিখে খুঁজুন"
                  value={warehouseId}
                />
              </label>
              <SearchableReportSelect
                label="পণ্য খুঁজুন"
                onChange={setProductId}
                options={productOptions}
                placeholder="নাম বা কোড দিয়ে খুঁজুন"
                value={productId}
              />
            </div>
            <div className="warehouse-stock-toolbar">
              <strong className="warehouse-stock-count">মোট পণ্য: {formatQuantity(visibleItems.length)}</strong>
              <button className="warehouse-stock-print-button no-print" disabled={loadingStock || !items.length} onClick={() => window.print()} type="button"><Printer size={17} /> প্রিন্ট</button>
            </div>
            <div className="warehouse-stock-print-heading">
              <ShopPrintHeader shop={shop} />
              <span>গুদাম স্টক · {warehouses.find((warehouse) => String(warehouse.id) === warehouseId)?.warehouse_name || ""}{selectedProduct ? ` · ${selectedProduct.product_name}` : ""}</span>
            </div>
            <div className="warehouse-stock-table-wrap">
              {loadingStock ? (
                <div className="user-list-empty"><span className="button-spinner" /> গুদামের স্টক লোড হচ্ছে...</div>
              ) : visibleItems.length === 0 ? (
                <div className="user-list-empty">{productId ? "নির্বাচিত পণ্যের স্টক পাওয়া যায়নি।" : "এই গুদামে বর্তমানে কোনো পণ্য স্টক নেই।"}</div>
              ) : (
                <table className="warehouse-stock-table">
                  <thead><tr><th>ক্রম</th><th>পণ্যের নাম</th><th>কোড</th><th>স্টক</th><th>ইউনিট</th></tr></thead>
                  <tbody>{visibleItems.map((item, index) => (
                    <tr key={item.product_id}>
                      <td>{formatQuantity(index + 1)}</td>
                      <td>{item.product_name}</td>
                      <td>{item.product_code || "—"}</td>
                      <td>{formatQuantity(item.quantity)}</td>
                      <td>{item.unit || "—"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function SearchableSelect({
  id,
  name,
  label,
  value,
  options,
  placeholder = "লিখে খুঁজুন",
  onChange,
  className = "product-field-control product-select-control",
  disabled = false,
  required = false,
  ariaLabel,
  portalOptions = false,
}) {
  const generatedId = useId();
  const controlId = id || generatedId;
  const inputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [portalStyle, setPortalStyle] = useState(null);
  const selectedOption = value === "" || value === null
    ? null
    : options.find((option) => String(option.value) === String(value));
  const visibleOptions = options.filter((option) => (
    option.label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  ));

  useLayoutEffect(() => {
    inputRef.current?.setCustomValidity(
      required && !selectedOption ? "তালিকা থেকে একটি বিকল্প নির্বাচন করুন।" : "",
    );
  }, [required, selectedOption]);

  useLayoutEffect(() => {
    if (!isOpen || !portalOptions) {
      setPortalStyle(null);
      return undefined;
    }

    function updatePortalPosition() {
      const input = inputRef.current;
      if (!input) return;
      const rect = input.getBoundingClientRect();
      const margin = 8;
      const gap = 3;
      const availableWidth = Math.max(0, window.innerWidth - margin * 2);
      const dropdownWidth = Math.min(Math.max(rect.width, 280), availableWidth);
      const left = Math.min(
        Math.max(rect.left, margin),
        window.innerWidth - dropdownWidth - margin,
      );
      const belowSpace = window.innerHeight - rect.bottom - margin;
      const aboveSpace = rect.top - margin;
      const openAbove = belowSpace < 180 && aboveSpace > belowSpace;
      const availableSpace = openAbove ? aboveSpace : belowSpace;
      const maxHeight = Math.max(100, Math.min(260, availableSpace - gap));

      setPortalStyle({
        position: "fixed",
        left: `${left}px`,
        width: `${dropdownWidth}px`,
        maxHeight: `${maxHeight}px`,
        top: openAbove ? "auto" : `${rect.bottom + gap}px`,
        bottom: openAbove ? `${window.innerHeight - rect.top + gap}px` : "auto",
      });
    }

    updatePortalPosition();
    window.addEventListener("resize", updatePortalPosition);
    document.addEventListener("scroll", updatePortalPosition, true);
    return () => {
      window.removeEventListener("resize", updatePortalPosition);
      document.removeEventListener("scroll", updatePortalPosition, true);
    };
  }, [isOpen, portalOptions]);

  function chooseOption(option) {
    onChange({ target: { name, value: String(option.value) } });
    setIsOpen(false);
    setSearch("");
  }

  function closeOptions() {
    setIsOpen(false);
    setSearch("");
    setActiveIndex(0);
  }

  return (
    <div className={`searchable-select${isOpen ? " searchable-select-open" : ""}`}>
      {label ? <label className="stock-report-select-label" htmlFor={controlId}>{label}</label> : null}
      <div className="searchable-select-control-wrap">
        <input
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-label={ariaLabel || label}
          aria-controls={isOpen ? `${controlId}-options` : undefined}
          aria-activedescendant={isOpen && visibleOptions[activeIndex]
            ? `${controlId}-option-${activeIndex}`
            : undefined}
          aria-required={required}
          autoComplete="off"
          className={`searchable-select-input ${className}`}
          disabled={disabled}
          id={controlId}
          onBlur={closeOptions}
          onChange={(event) => {
            setSearch(event.target.value);
            setActiveIndex(0);
            setIsOpen(true);
          }}
          onClick={() => setIsOpen(true)}
          onFocus={() => {
            setSearch("");
            setActiveIndex(0);
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") closeOptions();
            if (event.key === "ArrowDown" && isOpen && visibleOptions.length) {
              event.preventDefault();
              setActiveIndex((index) => Math.min(index + 1, visibleOptions.length - 1));
            }
            if (event.key === "ArrowUp" && isOpen && visibleOptions.length) {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            }
            if (event.key === "Enter" && isOpen && visibleOptions.length) {
              event.preventDefault();
              chooseOption(visibleOptions[activeIndex] || visibleOptions[0]);
            }
          }}
          placeholder={!isOpen && selectedOption ? "" : placeholder}
          ref={inputRef}
          role="combobox"
          required={required && !selectedOption}
          value={isOpen ? search : (selectedOption?.label || "")}
        />
        <span aria-hidden="true" className="searchable-select-arrow" />
      </div>
      {isOpen ? (() => {
        const optionsList = (
          <div
            className={`searchable-select-options${portalOptions ? " searchable-select-options-portal" : ""}`}
            id={`${controlId}-options`}
            role="listbox"
            style={portalOptions ? portalStyle || undefined : undefined}
          >
          {visibleOptions.map((option, index) => (
            <button
              aria-selected={String(value) === String(option.value)}
              className={`searchable-select-option${String(value) === String(option.value) ? " selected" : ""}${index === activeIndex ? " active" : ""}`}
              id={`${controlId}-option-${index}`}
              key={option.value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseOption(option)}
              role="option"
              type="button"
            >
              {option.label}
            </button>
          ))}
          {visibleOptions.length === 0 ? <span className="searchable-select-empty">কোনো মিল পাওয়া যায়নি</span> : null}
          </div>
        );
        return portalOptions && typeof document !== "undefined"
          ? createPortal(optionsList, document.body)
          : optionsList;
      })() : null}
    </div>
  );
}

function SearchableReportSelect({ label, value, options, placeholder, onChange }) {
  return (
    <SearchableSelect
      ariaLabel={label}
      id={`stock-report-select-${label}`}
      label={label}
      onChange={(event) => onChange(event.target.value)}
      options={[{ value: "", label: "সব" }, ...options]}
      placeholder={placeholder}
      value={value}
    />
  );
}

function StockReportPanel({ token, shopId, shop, onClose, showToast }) {
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const [filters, setFilters] = useState({ date_from: today, date_to: today, product_id: "", category: "" });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadReport(event) {
    if (event) event.preventDefault();
    setLoading(true);
    try {
      const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== ""));
      const response = await apiRequest(`/stock/report.php?${query.toString()}`, { token, shopId });
      setReport(response.data);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, [token, shopId]);

  const formatQuantity = (value) => numberFormatter.format(Number(value) || 0);

  return (
    <div className="product-modal-backdrop stock-report-backdrop">
      <section aria-labelledby="stock-report-title" aria-modal="true" className="product-modal stock-report-modal" role="dialog">
        <header className="product-modal-header no-print">
          <span className="product-modal-icon"><FileText size={22} /></span>
          <div><h2 id="stock-report-title">স্টক রিপোর্ট</h2><p>তারিখ ও পণ্য অনুযায়ী মজুতের চলাচল দেখুন ও প্রিন্ট করুন।</p></div>
          <button aria-label="রিপোর্ট বন্ধ করুন" className="product-modal-close" onClick={onClose} type="button"><X size={20} /></button>
        </header>
        <form className="stock-report-filters no-print" onSubmit={loadReport}>
          <label><span>তারিখ থেকে</span><input className="product-field-control" max={today} onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))} required type="date" value={filters.date_from} /></label>
          <label><span>তারিখ পর্যন্ত</span><input className="product-field-control" max={today} onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))} required type="date" value={filters.date_to} /></label>
          <SearchableReportSelect
            label="পণ্য/কোড"
            onChange={(productId) => setFilters((current) => ({ ...current, product_id: productId }))}
            options={(report?.products || []).map((product) => ({
              value: product.product_id,
              label: `${product.product_name}${product.product_code ? ` · ${product.product_code}` : ""}`,
            }))}
            placeholder="পণ্য বা কোড খুঁজুন"
            value={filters.product_id}
          />
          <SearchableReportSelect
            label="ক্যাটাগরি"
            onChange={(category) => setFilters((current) => ({ ...current, category }))}
            options={(report?.categories || []).map((category) => ({ value: category, label: category }))}
            placeholder="ক্যাটাগরি খুঁজুন"
            value={filters.category}
          />
          <button className="product-save-button" disabled={loading} type="submit">{loading ? <span className="button-spinner" /> : <BarChart3 size={16} />} রিপোর্ট দেখুন</button>
          <button className="user-action-button" disabled={!report} onClick={() => window.print()} type="button"><Printer size={16} /> প্রিন্ট</button>
        </form>
        <div className="stock-report-print-heading">
          <ShopPrintHeader shop={shop} />
          <span>স্টক রিপোর্ট · {report?.date_from || filters.date_from} থেকে {report?.date_to || filters.date_to}</span>
        </div>
        <div className="stock-report-table-wrap">
          {loading && !report ? <div className="user-list-empty"><span className="button-spinner" /> স্টক রিপোর্ট তৈরি হচ্ছে...</div> : report?.rows.length ? (
            <table className="stock-report-table">
              <thead><tr><th>পণ্য</th><th>পূর্বের দিনের স্টক</th><th>নির্বাচিত সময়ে ক্রয়</th><th>গুদাম থেকে স্থানান্তর</th><th>নির্বাচিত সময়ে বিক্রয়</th><th>কাস্টমার ফেরত</th><th>সাপ্লায়ার ফেরত</th><th>ড্যামেজ</th><th>বর্তমান ব্যালেন্স</th></tr></thead>
              <tbody>{report.rows.map((row) => (
                <tr key={row.product_id}>
                  <td><strong>{row.product_name}</strong><small>{[row.product_code, row.category].filter(Boolean).join(" · ") || "—"}</small></td>
                  <td>{formatQuantity(row.previous_day_stock)} {row.unit || ""}</td>
                  <td>{formatQuantity(row.today_purchase)}</td>
                  <td>{formatQuantity(row.today_transfer)}</td>
                  <td>{formatQuantity(row.today_sale)}</td>
                  <td>{formatQuantity(row.today_customer_return)}</td>
                  <td>{formatQuantity(row.today_supplier_return)}</td>
                  <td>{formatQuantity(row.today_damage)}</td>
                  <td><strong>{formatQuantity(row.balance)} {row.unit || ""}</strong></td>
                </tr>
              ))}</tbody>
              <tfoot><tr><th>মোট পণ্য: {report.rows.length}</th><td colSpan="8">রিপোর্ট তৈরির সময়: {new Intl.DateTimeFormat("bn-BD", { dateStyle: "medium", timeStyle: "short", numberingSystem: "latn" }).format(new Date())}</td></tr></tfoot>
            </table>
          ) : report ? <div className="user-list-empty">এই ফিল্টারে কোনো পণ্য পাওয়া যায়নি।</div> : null}
        </div>
      </section>
    </div>
  );
}

function CustomerLedgerPanel({ token, shopId, shop, onClose, showToast }) {
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const [filters, setFilters] = useState({
    customer_id: "",
    date_from: `${today.slice(0, 7)}-01`,
    date_to: today,
  });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadReport(event) {
    if (event) event.preventDefault();
    setLoading(true);
    try {
      const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== ""));
      const response = await apiRequest(`/customers/ledger-report.php?${query.toString()}`, { token, shopId });
      setReport(response.data);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, [token, shopId]);

  const formatLedgerDate = (value) => new Intl.DateTimeFormat("bn-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
    numberingSystem: "latn",
  }).format(new Date(`${value}T00:00:00Z`));

  return (
    <div className="product-modal-backdrop stock-report-backdrop">
      <section aria-labelledby="customer-ledger-title" aria-modal="true" className="product-modal stock-report-modal customer-ledger-modal" role="dialog">
        <header className="product-modal-header no-print">
          <span className="product-modal-icon"><ContactRound size={22} /></span>
          <div><h2 id="customer-ledger-title">কাস্টমার লেজার</h2><p>কাস্টমারের বিক্রয়, ফেরত, আদায় ও চলতি বকেয়া দেখুন।</p></div>
          <button aria-label="কাস্টমার লেজার বন্ধ করুন" className="product-modal-close" onClick={onClose} type="button"><X size={20} /></button>
        </header>
        <form className="sales-report-filters no-print" onSubmit={loadReport}>
          <label>
            <span>কাস্টমার</span>
            <SearchableSelect
              onChange={(event) => setFilters((current) => ({ ...current, customer_id: event.target.value }))}
              options={[
                { value: "", label: "কাস্টমার নির্বাচন করুন" },
                ...(report?.customers || []).map((customer) => ({
                  value: customer.id,
                  label: `${customer.customer_name}${customer.mobile_number ? ` · ${customer.mobile_number}` : ""}${customer.address ? ` · ${customer.address}` : ""}`,
                })),
              ]}
              placeholder="নাম, মোবাইল বা ঠিকানা দিয়ে খুঁজুন"
              value={filters.customer_id}
            />
          </label>
          <label><span>তারিখ থেকে</span><input className="product-field-control" max={today} onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))} required type="date" value={filters.date_from} /></label>
          <label><span>তারিখ পর্যন্ত</span><input className="product-field-control" max={today} onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))} required type="date" value={filters.date_to} /></label>
          <button className="product-save-button" disabled={loading} type="submit">{loading ? <span className="button-spinner" /> : <BarChart3 size={16} />} লেজার দেখুন</button>
          <button className="user-action-button" disabled={!report?.customer} onClick={() => window.print()} type="button"><Printer size={16} /> প্রিন্ট</button>
        </form>
        <div className="stock-report-print-heading customer-ledger-print-heading">
          <ShopPrintHeader shop={shop} />
          <span>
            কাস্টমার লেজার
            {report?.customer ? ` · ${report.customer.customer_name}` : ""}
            {" · "}{report?.date_from ? formatLedgerDate(report.date_from) : filters.date_from}
            {" থেকে "}{report?.date_to ? formatLedgerDate(report.date_to) : filters.date_to}
          </span>
          {report?.customer?.mobile_number ? <small>মোবাইল: {report.customer.mobile_number}</small> : null}
        </div>
        {report?.customer ? (
          <div className="sales-report-summary customer-ledger-summary">
            <div><span>শুরুর বকেয়া</span><strong>৳ {formatMoney(report.opening_balance)}</strong></div>
            <div><span>মোট ডেবিট</span><strong>৳ {formatMoney(report.summary.debit)}</strong></div>
            <div><span>মোট ক্রেডিট</span><strong>৳ {formatMoney(report.summary.credit)}</strong></div>
            <div><span>শেষ বকেয়া</span><strong>৳ {formatMoney(report.closing_balance)}</strong></div>
          </div>
        ) : null}
        <div className="sales-report-table-wrap customer-ledger-table-wrap">
          {loading && !report ? (
            <div className="user-list-empty"><span className="button-spinner" /> কাস্টমার লেজার তৈরি হচ্ছে...</div>
          ) : !report?.customer ? (
            <div className="user-list-empty">লেজার দেখতে কাস্টমার নির্বাচন করুন।</div>
          ) : report.customer ? (
            <>
              <table className="sales-report-table customer-ledger-table">
                <thead><tr><th>তারিখ</th><th>বিবরণ</th><th>রেফারেন্স</th><th>ডেবিট</th><th>ক্রেডিট</th><th>বকেয়া</th></tr></thead>
                <tbody>
                  <tr className="customer-ledger-opening">
                    <td>{formatLedgerDate(report.date_from)}</td>
                    <td>প্রারম্ভিক বকেয়া</td><td>—</td>
                    <td>—</td><td>—</td><td>৳ {formatMoney(report.opening_balance)}</td>
                  </tr>
                  {report.rows.map((row, index) => (
                    <tr key={`${row.event_type}-${row.reference}-${index}`}>
                      <td>{formatLedgerDate(row.transaction_date)}</td>
                      <td>{row.description}</td>
                      <td>{row.reference}</td>
                      <td>{row.debit > 0 ? `৳ ${formatMoney(row.debit)}` : "—"}</td>
                      <td>{row.credit > 0 ? `৳ ${formatMoney(row.credit)}` : "—"}</td>
                      <td><strong>৳ {formatMoney(row.balance)}</strong></td>
                    </tr>
                  ))}
                  {report.rows.length === 0 ? <tr><td colSpan="6">নির্বাচিত সময়ে কোনো লেনদেন নেই।</td></tr> : null}
                </tbody>
                <tfoot><tr><th colSpan="3">মোট · {numberFormatter.format(report.summary.transaction_count)}টি লেনদেন</th><td>৳ {formatMoney(report.summary.debit)}</td><td>৳ {formatMoney(report.summary.credit)}</td><td>৳ {formatMoney(report.closing_balance)}</td></tr></tfoot>
              </table>
              {report.truncated ? <p className="sales-report-limit">প্রদর্শিত সীমা {numberFormatter.format(report.limit)}টি লেনদেন। ছোট সময়সীমা নির্বাচন করে আবার দেখুন।</p> : null}
            </>
          ) : <div className="user-list-empty">লেজার দেখতে কাস্টমার নির্বাচন করুন।</div>}
        </div>
      </section>
    </div>
  );
}

function SupplierLedgerPanel({ token, shopId, shop, onClose, showToast }) {
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const [filters, setFilters] = useState({
    supplier_id: "",
    date_from: `${today.slice(0, 7)}-01`,
    date_to: today,
  });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadReport(event) {
    if (event) event.preventDefault();
    setLoading(true);
    try {
      const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== ""));
      const response = await apiRequest(`/suppliers/ledger-report.php?${query.toString()}`, { token, shopId });
      setReport(response.data);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, [token, shopId]);

  const formatLedgerDate = (value) => new Intl.DateTimeFormat("bn-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
    numberingSystem: "latn",
  }).format(new Date(`${value}T00:00:00Z`));

  return (
    <div className="product-modal-backdrop stock-report-backdrop">
      <section aria-labelledby="supplier-ledger-title" aria-modal="true" className="product-modal stock-report-modal supplier-ledger-modal" role="dialog">
        <header className="product-modal-header no-print">
          <span className="product-modal-icon"><Truck size={22} /></span>
          <div><h2 id="supplier-ledger-title">সাপ্লায়ার লেজার</h2><p>সাপ্লায়ারের ক্রয়, রিটার্ন, পেমেন্ট ও চলতি বকেয়া দেখুন।</p></div>
          <button aria-label="সাপ্লায়ার লেজার বন্ধ করুন" className="product-modal-close" onClick={onClose} type="button"><X size={20} /></button>
        </header>
        <form className="sales-report-filters no-print" onSubmit={loadReport}>
          <label>
            <span>সাপ্লায়ার</span>
            <SearchableSelect
              onChange={(event) => setFilters((current) => ({ ...current, supplier_id: event.target.value }))}
              options={[
                { value: "", label: "সাপ্লায়ার নির্বাচন করুন" },
                ...(report?.suppliers || []).map((supplier) => ({
                  value: supplier.id,
                  label: `${supplier.supplier_name}${supplier.mobile_number ? ` · ${supplier.mobile_number}` : ""}${supplier.address ? ` · ${supplier.address}` : ""}`,
                })),
              ]}
              placeholder="নাম, মোবাইল বা ঠিকানা দিয়ে খুঁজুন"
              value={filters.supplier_id}
            />
          </label>
          <label><span>তারিখ থেকে</span><input className="product-field-control" max={today} onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))} required type="date" value={filters.date_from} /></label>
          <label><span>তারিখ পর্যন্ত</span><input className="product-field-control" max={today} onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))} required type="date" value={filters.date_to} /></label>
          <button className="product-save-button" disabled={loading} type="submit">{loading ? <span className="button-spinner" /> : <BarChart3 size={16} />} লেজার দেখুন</button>
          <button className="user-action-button" disabled={!report?.supplier} onClick={() => window.print()} type="button"><Printer size={16} /> প্রিন্ট</button>
        </form>
        <div className="stock-report-print-heading supplier-ledger-print-heading">
          <ShopPrintHeader shop={shop} />
          <span>
            সাপ্লায়ার লেজার
            {report?.supplier ? ` · ${report.supplier.supplier_name}` : ""}
            {" · "}{report?.date_from ? formatLedgerDate(report.date_from) : filters.date_from}
            {" থেকে "}{report?.date_to ? formatLedgerDate(report.date_to) : filters.date_to}
          </span>
          {report?.supplier?.mobile_number ? <small>মোবাইল: {report.supplier.mobile_number}</small> : null}
          {report?.supplier?.address ? <small>ঠিকানা: {report.supplier.address}</small> : null}
        </div>
        {report?.supplier ? (
          <div className="sales-report-summary supplier-ledger-summary">
            <div><span>শুরুর বকেয়া</span><strong>৳ {formatMoney(report.opening_balance)}</strong></div>
            <div><span>মোট ক্রয়</span><strong>৳ {formatMoney(report.summary.purchase)}</strong></div>
            <div><span>মোট রিটার্ন</span><strong>৳ {formatMoney(report.summary.returns)}</strong></div>
            <div><span>মোট পরিশোধ</span><strong>৳ {formatMoney(report.summary.payments)}</strong></div>
            <div><span>শেষ বকেয়া</span><strong>৳ {formatMoney(report.closing_balance)}</strong></div>
          </div>
        ) : null}
        <div className="sales-report-table-wrap supplier-ledger-table-wrap">
          {loading && !report ? (
            <div className="user-list-empty"><span className="button-spinner" /> সাপ্লায়ার লেজার তৈরি হচ্ছে...</div>
          ) : !report?.supplier ? (
            <div className="user-list-empty">লেজার দেখতে সাপ্লায়ার নির্বাচন করুন।</div>
          ) : (
            <>
              <table className="sales-report-table supplier-ledger-table">
                <thead><tr><th>তারিখ</th><th>বিবরণ</th><th>রেফারেন্স</th><th>ডেবিট</th><th>ক্রেডিট</th><th>বকেয়া</th></tr></thead>
                <tbody>
                  <tr className="supplier-ledger-opening">
                    <td>{formatLedgerDate(report.date_from)}</td>
                    <td>প্রারম্ভিক বকেয়া</td><td>—</td>
                    <td>—</td><td>—</td><td>৳ {formatMoney(report.opening_balance)}</td>
                  </tr>
                  {report.rows.map((row, index) => (
                    <tr key={`${row.event_type}-${row.reference}-${index}`}>
                      <td>{formatLedgerDate(row.transaction_date)}</td>
                      <td>{row.description}</td>
                      <td>{row.reference}</td>
                      <td>{row.debit > 0 ? `৳ ${formatMoney(row.debit)}` : "—"}</td>
                      <td>{row.credit > 0 ? `৳ ${formatMoney(row.credit)}` : "—"}</td>
                      <td><strong>৳ {formatMoney(row.balance)}</strong></td>
                    </tr>
                  ))}
                  {report.rows.length === 0 ? <tr><td colSpan="6">নির্বাচিত সময়ে কোনো লেনদেন নেই।</td></tr> : null}
                </tbody>
                <tfoot><tr><th colSpan="3">মোট · {numberFormatter.format(report.summary.transaction_count)}টি লেনদেন</th><td>৳ {formatMoney(report.summary.debit)}</td><td>৳ {formatMoney(report.summary.credit)}</td><td>৳ {formatMoney(report.closing_balance)}</td></tr></tfoot>
              </table>
              {report.truncated ? <p className="sales-report-limit">প্রদর্শিত সীমা {numberFormatter.format(report.limit)}টি লেনদেন। ছোট সময়সীমা নির্বাচন করে আবার দেখুন।</p> : null}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function SalesReportPanel({ token, shopId, shop, onClose, onChanged, showToast, canEdit, canDelete }) {
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const [filters, setFilters] = useState({
    date_from: `${today.slice(0, 7)}-01`,
    date_to: today,
    sale_source: "",
    search: "",
  });
  const [report, setReport] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingReceiptId, setLoadingReceiptId] = useState(null);
  const [editingSale, setEditingSale] = useState(null);
  const [deletingSaleId, setDeletingSaleId] = useState(null);

  async function loadReport(event) {
    if (event) event.preventDefault();
    setLoading(true);
    try {
      const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== ""));
      const response = await apiRequest(`/sales/report.php?${query.toString()}`, { token, shopId });
      setReport(response.data);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, [token, shopId]);

  async function openReceipt(bill) {
    setLoadingReceiptId(bill.id);
    try {
      const response = await apiRequest(`/sales/receipt.php?id=${encodeURIComponent(bill.id)}`, { token, shopId });
      setReceipt(response.data.sale);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setLoadingReceiptId(null);
    }
  }

  async function openEdit(bill) {
    setLoadingReceiptId(bill.id);
    try {
      const response = await apiRequest(`/sales/receipt.php?id=${encodeURIComponent(bill.id)}`, { token, shopId });
      setEditingSale(response.data.sale);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setLoadingReceiptId(null);
    }
  }

  async function deleteSale(bill) {
    if (!window.confirm(`“${bill.invoice_number}” বিক্রয় মেমোটি মুছে ফেলবেন?`)) return;
    const reason = promptDeletionReason(`${bill.invoice_number} বিক্রয় মেমো`, showToast);
    if (!reason) return;
    setDeletingSaleId(bill.id);
    try {
      const response = await apiRequest("/sales/delete.php", {
        method: "POST",
        token,
        shopId,
        body: JSON.stringify({ sale_id: bill.id, reason }),
      });
      showToast("success", response.message);
      onChanged();
      await loadReport();
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setDeletingSaleId(null);
    }
  }

  const formatReportDate = (value) => new Intl.DateTimeFormat("bn-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
    numberingSystem: "latn",
  }).format(new Date(`${value}T00:00:00Z`));

  return (
    <div className={`product-modal-backdrop stock-report-backdrop${receipt ? " sales-report-receipt-open" : ""}`}>
      <section aria-labelledby="sales-report-title" aria-modal="true" className="product-modal stock-report-modal sales-report-modal" role="dialog">
        <header className="product-modal-header no-print">
          <span className="product-modal-icon"><BarChart3 size={22} /></span>
          <div><h2 id="sales-report-title">বিক্রয় রিপোর্ট</h2><p>তারিখ, বিল নম্বর বা কাস্টমার দিয়ে বিল খুঁজুন এবং মেমো পুনরায় প্রিন্ট করুন।</p></div>
          <button aria-label="বিক্রয় রিপোর্ট বন্ধ করুন" className="product-modal-close" onClick={onClose} type="button"><X size={20} /></button>
        </header>
        <form className="sales-report-filters no-print" onSubmit={loadReport}>
          <label><span>তারিখ থেকে</span><input className="product-field-control" max={today} onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))} required type="date" value={filters.date_from} /></label>
          <label><span>তারিখ পর্যন্ত</span><input className="product-field-control" max={today} onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))} required type="date" value={filters.date_to} /></label>
          <label><span>বিক্রয়ের স্থান</span><SearchableSelect onChange={(event) => setFilters((current) => ({ ...current, sale_source: event.target.value }))} options={[{ value: "", label: "সব স্থান" }, { value: "shop", label: "দোকান" }, { value: "warehouse", label: "গুদাম" }]} placeholder="দোকান/গুদাম বাছুন" value={filters.sale_source} /></label>
          <label><span>বিল / কাস্টমার</span><input className="product-field-control" maxLength={120} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="বিল নম্বর, কাস্টমার নাম বা ID" value={filters.search} /></label>
          <button className="product-save-button" disabled={loading} type="submit">{loading ? <span className="button-spinner" /> : <BarChart3 size={16} />} রিপোর্ট দেখুন</button>
          <button className="user-action-button" disabled={!report?.bills.length} onClick={() => window.print()} type="button"><Printer size={16} /> প্রিন্ট রিপোর্ট</button>
        </form>
        <div className="stock-report-print-heading sales-report-print-heading">
          <ShopPrintHeader shop={shop} />
          <span>বিক্রয় রিপোর্ট · {report?.date_from ? formatReportDate(report.date_from) : filters.date_from} থেকে {report?.date_to ? formatReportDate(report.date_to) : filters.date_to}</span>
        </div>
        {report ? (
          <div className="sales-report-summary">
            <div><span>মোট বিল</span><strong>{numberFormatter.format(report.summary.bill_count)}টি</strong></div>
            <div><span>মোট বিক্রয়</span><strong>৳ {formatMoney(report.summary.subtotal)}</strong></div>
            <div><span>বিক্রয় ফেরত</span><strong>৳ {formatMoney(report.summary.returned_amount)}</strong></div>
            <div><span>আদায়</span><strong>৳ {formatMoney(report.summary.collected_amount)}</strong></div>
          </div>
        ) : null}
        <div className="sales-report-table-wrap">
          {loading && !report ? <div className="user-list-empty"><span className="button-spinner" /> বিক্রয় রিপোর্ট তৈরি হচ্ছে...</div> : report?.bills.length ? (
            <>
              <table className="sales-report-table">
                <thead><tr><th>তারিখ</th><th>বিল নম্বর</th><th>কাস্টমার</th><th>স্থান</th><th>পণ্য</th><th>বিক্রয় মূল্য</th><th>আদায়</th><th>বর্তমান বকেয়া</th><th className="no-print">অ্যাকশন</th></tr></thead>
                <tbody>{report.bills.map((bill) => (
                  <tr key={bill.id}>
                    <td>{formatReportDate(bill.sale_date)}</td>
                    <td><strong>{bill.invoice_number || `বিক্রয় #${bill.id}`}</strong></td>
                    <td>{bill.customer_name}</td>
                    <td>{bill.sale_source === "warehouse" ? `গুদাম${bill.warehouse_name ? ` · ${bill.warehouse_name}` : ""}` : "দোকান"}</td>
                    <td>{numberFormatter.format(bill.item_count)}টি · {numberFormatter.format(bill.total_quantity)}</td>
                    <td>৳ {formatMoney(bill.subtotal)}</td>
                    <td>৳ {formatMoney(bill.payment_received)}</td>
                    <td>৳ {formatMoney(bill.present_due)}</td>
                    <td className="no-print">
                      <details className="sales-report-action-menu">
                        <summary className="user-action-button" aria-label={`${bill.invoice_number} মেমো অ্যাকশন`}>
                          {loadingReceiptId === bill.id || deletingSaleId === bill.id ? <span className="button-spinner" /> : <MoreHorizontal size={16} />}
                          অ্যাকশন
                        </summary>
                        <div className="sales-report-action-options">
                          <button disabled={loadingReceiptId !== null} onClick={() => openReceipt(bill)} type="button"><Printer size={14} /> মেমো</button>
                          {canEdit ? <button disabled={loadingReceiptId !== null || deletingSaleId !== null} onClick={() => openEdit(bill)} type="button"><Pencil size={14} /> এডিট</button> : null}
                          {canDelete ? <button className="sales-report-delete-action" disabled={loadingReceiptId !== null || deletingSaleId !== null} onClick={() => deleteSale(bill)} type="button"><Trash2 size={14} /> ডিলিট</button> : null}
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
              {report.bills.length >= report.limit ? <p className="sales-report-limit">সর্বোচ্চ {numberFormatter.format(report.limit)}টি বিল দেখানো হয়েছে। ফল কমাতে তারিখ বা অনুসন্ধান ব্যবহার করুন।</p> : null}
            </>
          ) : report ? <div className="user-list-empty">এই ফিল্টারে কোনো বিক্রয় বিল পাওয়া যায়নি।</div> : null}
        </div>
      </section>
      {receipt ? <SalesReceiptMemo receipt={receipt} shop={shop} onClose={() => setReceipt(null)} showToast={showToast} /> : null}
      {editingSale ? (
        <SalesForm
          initialSale={editingSale}
          onClose={() => setEditingSale(null)}
          onSaved={() => {
            onChanged();
            loadReport();
          }}
          shop={shop}
          shopId={shopId}
          showToast={showToast}
          token={token}
        />
      ) : null}
    </div>
  );
}

function PurchaseReportPanel({
  token,
  shopId,
  shop,
  onClose,
  onChanged,
  showToast,
  canEdit,
  canDelete,
  canCreateSupplier = false,
}) {
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const [filters, setFilters] = useState({
    date_from: today,
    date_to: today,
    supplier_id: "",
    destination: "",
    search: "",
  });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [purchaseReceipt, setPurchaseReceipt] = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [loadingPurchaseMemoId, setLoadingPurchaseMemoId] = useState(null);
  const [deletingPurchaseId, setDeletingPurchaseId] = useState(null);

  async function loadReport(event) {
    if (event) event.preventDefault();
    setLoading(true);
    try {
      const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== ""));
      const response = await apiRequest(`/purchases/report.php?${query.toString()}`, { token, shopId });
      setReport(response.data);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setLoading(false);
    }
  }

  async function openPurchaseMemo(bill) {
    setLoadingPurchaseMemoId(bill.id);
    try {
      const response = await apiRequest(`/purchases/receipt.php?id=${encodeURIComponent(bill.id)}`, { token, shopId });
      setPurchaseReceipt(response.data.purchase);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setLoadingPurchaseMemoId(null);
    }
  }

  async function deletePurchase(bill) {
    const billLabel = bill.bill_number || `ক্রয় #${bill.id}`;
    if (!window.confirm(`“${billLabel}” ক্রয় চালানটি মুছে ফেলবেন?`)) return;
    const reason = promptDeletionReason(`${billLabel} ক্রয় চালান`, showToast);
    if (!reason) return;
    setDeletingPurchaseId(bill.id);
    try {
      const response = await apiRequest("/purchases/delete.php", {
        method: "POST",
        token,
        shopId,
        body: JSON.stringify({ purchase_id: bill.id, reason }),
      });
      showToast("success", response.message);
      onChanged();
      await loadReport();
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setDeletingPurchaseId(null);
    }
  }

  useEffect(() => {
    loadReport();
  }, [token, shopId]);

  const formatQuantity = (value) => new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(Number(value) || 0);

  return (
    <>
    <div className="product-modal-backdrop stock-report-backdrop">
      <section aria-labelledby="purchase-report-title" aria-modal="true" className="product-modal stock-report-modal purchase-report-modal" role="dialog">
        <header className="product-modal-header no-print">
          <span className="product-modal-icon"><Receipt size={22} /></span>
          <div><h2 id="purchase-report-title">ক্রয় / চালান রিপোর্ট</h2><p>তারিখ, সাপ্লায়ার, গন্তব্য ও চালান অনুযায়ী ক্রয়ের হিসাব দেখুন।</p></div>
          <button aria-label="রিপোর্ট বন্ধ করুন" className="product-modal-close" onClick={onClose} type="button"><X size={20} /></button>
        </header>
        <form className="purchase-report-filters no-print" onSubmit={loadReport}>
          <label><span>তারিখ থেকে</span><input className="product-field-control" max={today} onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))} required type="date" value={filters.date_from} /></label>
          <label><span>তারিখ পর্যন্ত</span><input className="product-field-control" max={today} onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))} required type="date" value={filters.date_to} /></label>
          <label><span>সাপ্লায়ার</span><SearchableSelect onChange={(event) => setFilters((current) => ({ ...current, supplier_id: event.target.value }))} options={[{ value: "", label: "সব সাপ্লায়ার" }, ...(report?.suppliers || []).map((supplier) => ({ value: supplier.id, label: `${supplier.supplier_name}${supplier.address ? ` · ${supplier.address}` : ""}` }))]} placeholder="সাপ্লায়ারের নাম বা ঠিকানা লিখে খুঁজুন" value={filters.supplier_id} /></label>
          <label><span>পণ্যের গন্তব্য</span><SearchableSelect onChange={(event) => setFilters((current) => ({ ...current, destination: event.target.value }))} options={[{ value: "", label: "সব গন্তব্য" }, { value: "shop", label: "দোকান" }, { value: "warehouse", label: "গুদাম" }]} placeholder="গন্তব্য লিখে খুঁজুন" value={filters.destination} /></label>
          <label><span>চালান/সাপ্লায়ার/পণ্য</span><input className="product-field-control" maxLength={120} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="নাম, কোড বা চালান নম্বর" value={filters.search} /></label>
          <button className="product-save-button" disabled={loading} type="submit">{loading ? <span className="button-spinner" /> : <BarChart3 size={16} />} রিপোর্ট দেখুন</button>
          <button className="user-action-button" disabled={!report} onClick={() => window.print()} type="button"><Printer size={16} /> প্রিন্ট</button>
        </form>
        <div className="stock-report-print-heading purchase-report-print-heading">
          <ShopPrintHeader shop={shop} />
          <span>ক্রয় / চালান রিপোর্ট · {report?.date_from || filters.date_from} থেকে {report?.date_to || filters.date_to}</span>
        </div>
        {report ? (
          <div className="purchase-report-summary">
            <div><span>চালান</span><strong>{numberFormatter.format(report.summary.bill_count)}টি</strong></div>
            <div><span>মোট ক্রয়</span><strong>৳ {formatMoney(report.summary.total_purchase)}</strong></div>
            <div><span>সাপ্লায়ার রিটার্ন</span><strong>৳ {formatMoney(report.summary.total_returned)}</strong></div>
            <div><span>নিট ক্রয়</span><strong>৳ {formatMoney(report.summary.net_purchase)}</strong></div>
          </div>
        ) : null}
        <div className="stock-report-table-wrap">
          {loading && !report ? <div className="user-list-empty"><span className="button-spinner" /> ক্রয় রিপোর্ট তৈরি হচ্ছে...</div> : report?.bills.length ? (
            <table className="purchase-report-table">
              <thead><tr><th>চালান / তারিখ</th><th>সাপ্লায়ার</th><th>গন্তব্য</th><th>পণ্য</th><th>মোট ক্রয়</th><th>রিটার্ন</th><th>নিট ক্রয়</th><th className="no-print">অ্যাকশন</th></tr></thead>
              <tbody>{report.bills.map((bill) => (
                <tr key={bill.id}>
                  <td><strong>{bill.bill_number || `ক্রয় #${bill.id}`}</strong><small>{bill.purchase_date}</small></td>
                  <td>{bill.supplier_name}</td>
                  <td>{bill.destination_type === "warehouse" ? `গুদাম · ${bill.warehouse_name || ""}` : "দোকান"}</td>
                  <td>
                    <details className="purchase-report-items">
                      <summary>{numberFormatter.format(bill.items.length)}টি পণ্য দেখুন</summary>
                      <div>{bill.items.map((item) => (
                        <span key={item.id}>
                          <strong>{item.product_name}</strong>{item.product_code ? ` · ${item.product_code}` : ""}
                          {" · "}{formatQuantity(item.quantity)} {item.unit || ""}
                          {" × ৳"}{formatMoney(item.unit_price)}
                          {" = ৳"}{formatMoney(item.line_total)}
                          {item.returned_quantity > 0 ? ` · ফেরত ${formatQuantity(item.returned_quantity)}` : ""}
                        </span>
                      ))}</div>
                    </details>
                  </td>
                  <td>৳ {formatMoney(bill.total_amount)}</td>
                  <td>৳ {formatMoney(bill.returned_amount)}</td>
                  <td><strong>৳ {formatMoney(bill.net_amount)}</strong></td>
                  <td className="no-print">
                    <details className="sales-report-action-menu">
                      <summary className="user-action-button" aria-label={`${bill.bill_number || `ক্রয় #${bill.id}`} চালান অ্যাকশন`}>
                        {loadingPurchaseMemoId === bill.id || deletingPurchaseId === bill.id ? <span className="button-spinner" /> : <MoreHorizontal size={16} />}
                        অ্যাকশন
                      </summary>
                      <div className="sales-report-action-options">
                        <button disabled={loadingPurchaseMemoId !== null || deletingPurchaseId !== null} onClick={() => openPurchaseMemo(bill)} type="button"><Printer size={14} /> মেমো</button>
                        {canEdit ? <button disabled={loadingPurchaseMemoId !== null || deletingPurchaseId !== null} onClick={() => setEditingPurchase(bill)} type="button"><Pencil size={14} /> এডিট</button> : null}
                        {canDelete ? <button className="sales-report-delete-action" disabled={loadingPurchaseMemoId !== null || deletingPurchaseId !== null} onClick={() => deletePurchase(bill)} type="button"><Trash2 size={14} /> ডিলিট</button> : null}
                      </div>
                    </details>
                  </td>
                </tr>
              ))}</tbody>
              <tfoot><tr><th colSpan="4">মোট · {numberFormatter.format(report.summary.bill_count)}টি চালান</th><td>৳ {formatMoney(report.summary.total_purchase)}</td><td>৳ {formatMoney(report.summary.total_returned)}</td><td>৳ {formatMoney(report.summary.net_purchase)}</td><td className="no-print" /></tr></tfoot>
            </table>
          ) : report ? <div className="user-list-empty">এই ফিল্টারে কোনো ক্রয় চালান পাওয়া যায়নি।</div> : null}
        </div>
      </section>
    </div>
    {purchaseReceipt ? <ActivityReceiptMemo receipt={purchaseReceipt} type="purchase" shop={shop} onClose={() => setPurchaseReceipt(null)} /> : null}
    {editingPurchase ? (
      <PurchaseForm
        canCreateSupplier={canCreateSupplier}
        initialPurchase={editingPurchase}
        onClose={() => setEditingPurchase(null)}
        onDataChanged={onChanged}
        onSaved={() => {
          setEditingPurchase(null);
          onChanged();
          loadReport();
        }}
        showToast={showToast}
        shopId={shopId}
        token={token}
      />
    ) : null}
    </>
  );
}

const USER_MENU_OPTIONS = [
  { key: "overview", label: "ওভারভিউ" },
  { key: "setup", label: "সেটআপ" },
  { key: "purchase", label: "ক্রয় ও স্টক" },
  { key: "sales", label: "বিক্রয়" },
  { key: "warranty", label: "ওয়ারেন্টি" },
  { key: "reports", label: "রিপোর্ট" },
];

const EMPTY_USER_FORM = {
  username: "",
  display_name: "",
  role: "staff",
  shop_id: "",
  password: "",
  permissions: ["overview", "setup"],
};

function UserManagementPanel({ token, shops, selectedShopId, onClose, onDataChanged, showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_USER_FORM);

  async function loadUsers() {
    setLoading(true);
    try {
      const response = await apiRequest("/users/list.php", { token });
      setUsers(response.data.users);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function startCreate() {
    setEditingUser(false);
    setForm({
      ...EMPTY_USER_FORM,
      shop_id: String(selectedShopId || ""),
      permissions: [...EMPTY_USER_FORM.permissions],
    });
  }

  function startEdit(user) {
    setEditingUser(user);
    setForm({
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      shop_id: String(user.shop_id || ""),
      password: "",
      permissions: [...user.permissions],
    });
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function togglePermission(permission) {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  }

  async function submitUser(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const isEditing = Boolean(editingUser);
      const response = await apiRequest(
        isEditing ? "/users/update.php" : "/users/create.php",
        {
          method: "POST",
          token,
          body: JSON.stringify({
            ...form,
            ...(isEditing ? { id: editingUser.id } : {}),
          }),
        },
      );
      showToast("success", response.message);
      setEditingUser(null);
      await loadUsers();
      onDataChanged();
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deactivateUser(user) {
    if (!window.confirm(`“${user.display_name}” অ্যাকাউন্টটি নিষ্ক্রিয় করবেন? আগের হিসাব মুছে যাবে না।`)) {
      return;
    }
    const reason = promptDeletionReason(`${user.display_name} ইউজার`, showToast);
    if (!reason) return;
    try {
      const response = await apiRequest("/users/delete.php", {
        method: "POST",
        token,
        body: JSON.stringify({ id: user.id, reason }),
      });
      showToast("success", response.message);
      await loadUsers();
      onDataChanged();
    } catch (error) {
      showToast("error", error.message);
    }
  }

  async function reactivateUser(user) {
    try {
      const response = await apiRequest("/users/activate.php", {
        method: "POST",
        token,
        body: JSON.stringify({ id: user.id }),
      });
      showToast("success", response.message);
      await loadUsers();
      onDataChanged();
    } catch (error) {
      showToast("error", error.message);
    }
  }

  return (
    <div className="product-modal-backdrop">
      <section
        aria-labelledby="user-management-title"
        aria-modal="true"
        className="product-modal user-management-modal"
        role="dialog"
      >
        <header className="product-modal-header">
          <span className="product-modal-icon"><ShieldCheck size={22} /></span>
          <div>
            <h2 id="user-management-title">ইউজার ও পারমিশন</h2>
            <p>কর্মচারীর অ্যাকাউন্ট, মেনু প্রবেশাধিকার ও কাজের অনুমতি পরিচালনা করুন।</p>
          </div>
          <button
            aria-label="ইউজার ব্যবস্থাপনা বন্ধ করুন"
            className="product-modal-close"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </header>

        {editingUser !== null ? (
          <form className="product-form" onSubmit={submitUser}>
            <div className="product-form-grid">
              <label className="product-form-field">
                <span className="product-field-label">ইউজারনেম</span>
                <input
                  autoComplete="username"
                  className="product-field-control"
                  maxLength={80}
                  name="username"
                  onChange={updateField}
                  pattern="[A-Za-z0-9._\\x2d]{3,80}"
                  required
                  value={form.username}
                />
              </label>
              <label className="product-form-field">
                <span className="product-field-label">নাম</span>
                <input
                  className="product-field-control"
                  maxLength={120}
                  name="display_name"
                  onChange={updateField}
                  required
                  value={form.display_name}
                />
              </label>
              <label className="product-form-field">
                <span className="product-field-label">রোল</span>
                <SearchableSelect
                  className="product-field-control product-select-control"
                  id="user-role"
                  name="role"
                  onChange={updateField}
                  options={[
                    { value: "staff", label: "কর্মচারী" },
                    { value: "manager", label: "ম্যানেজার" },
                  ]}
                  placeholder="রোল লিখে খুঁজুন"
                  value={form.role}
                />
              </label>
              <label className="product-form-field">
                <span className="product-field-label">কোন দোকানে কাজ করবে?</span>
                <SearchableSelect
                  className="product-field-control product-select-control"
                  id="user-shop-id"
                  name="shop_id"
                  onChange={updateField}
                  options={[
                    { value: "", label: "দোকান নির্বাচন করুন" },
                    ...shops.map((shop) => ({ value: shop.id, label: shop.shop_name })),
                  ]}
                  placeholder="দোকানের নাম লিখে খুঁজুন"
                  required
                  value={form.shop_id}
                />
              </label>
              <label className="product-form-field">
                <span className="product-field-label">
                  {editingUser ? "নতুন পাসওয়ার্ড" : "পাসওয়ার্ড"}
                  {editingUser ? <span className="optional-label">ফাঁকা রাখলে অপরিবর্তিত</span> : null}
                </span>
                <input
                  autoComplete="new-password"
                  className="product-field-control"
                  minLength={8}
                  name="password"
                  onChange={updateField}
                  required={!editingUser}
                  type="password"
                  value={form.password}
                />
              </label>
            </div>

            <div className="user-permission-group">
              <div className="user-permission-heading">
                <strong>কোন কোন মেনু ব্যবহার করতে পারবে?</strong>
                <span>টিক চিহ্ন দিয়ে প্রবেশাধিকার দিন</span>
              </div>
              <div className="user-permission-grid">
                {USER_MENU_OPTIONS.map(({ key, label }) => (
                  <label className="permission-choice" key={key}>
                    <input
                      checked={form.permissions.includes(key)}
                      onChange={() => togglePermission(key)}
                      type="checkbox"
                    />
                    <span className="permission-checkmark" />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="user-permission-group user-action-permissions">
              <div className="user-permission-heading">
                <strong>তথ্য পরিবর্তনের অনুমতি</strong>
                <span>ভবিষ্যতের এডিট ও ডিলিট সুবিধার জন্য</span>
              </div>
              <div className="user-permission-grid">
                {[
                  ["can_edit", "এডিট করতে পারবে"],
                  ["can_delete", "ডিলিট করতে পারবে"],
                ].map(([key, label]) => (
                  <label className="permission-choice" key={key}>
                    <input
                      checked={form.permissions.includes(key)}
                      onChange={() => togglePermission(key)}
                      type="checkbox"
                    />
                    <span className="permission-checkmark" />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <footer className="product-form-actions">
              <span>পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের দিন</span>
              <div>
                <button
                  className="product-cancel-button"
                  disabled={saving}
                  onClick={() => setEditingUser(null)}
                  type="button"
                >
                  বাতিল
                </button>
                <button className="product-save-button" disabled={saving} type="submit">
                  {saving ? <span className="button-spinner" /> : <Save size={17} />}
                  {saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ"}
                </button>
              </div>
            </footer>
          </form>
        ) : (
          <div className="user-list-content">
            <div className="user-list-toolbar">
              <span>দোকানের ব্যবহারকারী ও তাদের প্রবেশাধিকার</span>
              <button className="product-save-button" onClick={startCreate} type="button">
                <UserPlus size={17} /> নতুন ইউজার
              </button>
            </div>
            {loading ? (
              <div className="user-list-empty"><span className="button-spinner" /> ইউজার তালিকা লোড হচ্ছে...</div>
            ) : users.length === 0 ? (
              <div className="user-list-empty">কোনো ইউজার পাওয়া যায়নি।</div>
            ) : (
              <div className="user-table-wrap">
                <table className="user-management-table">
                  <thead>
                    <tr>
                      <th>নাম / ইউজারনেম</th>
                      <th>ধরন / দোকান</th>
                      <th>মেনু ও কাজের অনুমতি</th>
                      <th>অবস্থা</th>
                      <th>অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const isOwner = user.role === "owner";
                      const allowedMenus = USER_MENU_OPTIONS
                        .filter(({ key }) => user.permissions.includes(key))
                        .map(({ label }) => label);
                      return (
                        <tr className={user.is_active ? "" : "user-management-row-disabled"} key={user.id}>
                          <td>
                            <strong>{user.display_name}</strong>
                            <span className="user-table-secondary">{user.username}</span>
                          </td>
                          <td>
                            <span>{isOwner ? "System Admin" : user.role === "manager" ? "ম্যানেজার" : "কর্মচারী"}</span>
                            <span className="user-table-secondary">{user.shop_name || "—"}</span>
                          </td>
                          <td className="user-table-permissions">
                            {isOwner ? "সব মেনু ও কাজের পূর্ণ অনুমতি" : allowedMenus.length ? allowedMenus.join(" · ") : "কোনো মেনু অনুমতি নেই"}
                            {!isOwner && user.permissions.includes("can_edit") ? " · এডিট" : ""}
                            {!isOwner && user.permissions.includes("can_delete") ? " · ডিলিট" : ""}
                          </td>
                          <td>
                            <span className={`user-status ${user.is_active ? "user-status-active" : ""}`}>
                              {user.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                            </span>
                          </td>
                          <td>
                            {!isOwner ? (
                              <div className="user-list-actions">
                                <button
                                  aria-label={`${user.display_name} সম্পাদনা করুন`}
                                  className="user-action-button product-action-edit"
                                  onClick={() => startEdit(user)}
                                  title="এডিট"
                                  type="button"
                                >
                                  <Pencil size={16} />
                                </button>
                                {user.is_active ? (
                                  <button
                                    aria-label={`${user.display_name} নিষ্ক্রিয় করুন`}
                                    className="user-action-button user-action-delete product-action-trash"
                                    onClick={() => deactivateUser(user)}
                                    title="নিষ্ক্রিয় করুন"
                                    type="button"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                ) : (
                                  <button
                                    aria-label={`${user.display_name} সক্রিয় করুন`}
                                    className="user-action-button product-action-activate"
                                    onClick={() => reactivateUser(user)}
                                    title="সক্রিয় করুন"
                                    type="button"
                                  >
                                    <UserPlus size={16} />
                                  </button>
                                )}
                              </div>
                            ) : <span className="user-table-secondary">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="user-management-note">
              নিষ্ক্রিয় করলে ইউজার লগইন করতে পারবে না, তবে তার করা আগের হিসাব মুছে যাবে না।
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function ShopManagementPanel({ token, shops, onClose, onChanged, showToast }) {
  const [editingShop, setEditingShop] = useState(null);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState({
    shop_name: "",
    memo_heading: "",
    address: "",
    contact_number: "",
  });

  function startCreate() {
    setEditingShop(false);
    setValues({ shop_name: "", memo_heading: "", address: "", contact_number: "" });
  }

  function startEdit(shop) {
    setEditingShop(shop);
    setValues({
      shop_name: shop.shop_name,
      memo_heading: shop.memo_heading || "",
      address: shop.address || "",
      contact_number: shop.contact_number || "",
    });
  }

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function submitShop(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const isEditing = Boolean(editingShop);
      const response = await apiRequest(
        isEditing ? "/shops/update.php" : "/shops/create.php",
        {
          method: "POST",
          token,
          body: JSON.stringify({
            ...values,
            ...(isEditing ? { id: editingShop.id } : {}),
          }),
        },
      );
      showToast("success", response.message);
      const createdShopId = response.data.shop?.id;
      setEditingShop(null);
      await onChanged(createdShopId);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="product-modal-backdrop">
      <section
        aria-labelledby="shop-management-title"
        aria-modal="true"
        className="product-modal user-management-modal"
        role="dialog"
      >
        <header className="product-modal-header">
          <span className="product-modal-icon"><Store size={22} /></span>
          <div>
            <h2 id="shop-management-title">দোকান পরিচালনা</h2>
            <p>সর্বোচ্চ ৩টি দোকান; প্রতিটি দোকানের মেমো ও যোগাযোগের তথ্য আলাদা।</p>
          </div>
          <button
            aria-label="দোকান পরিচালনা বন্ধ করুন"
            className="product-modal-close"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </header>

        {editingShop !== null ? (
          <form className="product-form" onSubmit={submitShop}>
            <div className="product-form-grid">
              <label className="product-form-field">
                <span className="product-field-label">দোকানের নাম</span>
                <input
                  autoComplete="organization"
                  className="product-field-control"
                  maxLength={180}
                  name="shop_name"
                  onChange={updateField}
                  required
                  value={values.shop_name}
                />
              </label>
              <label className="product-form-field">
                <span className="product-field-label">মেমো হেডিং</span>
                <input
                  className="product-field-control"
                  maxLength={180}
                  name="memo_heading"
                  onChange={updateField}
                  placeholder="ফাঁকা রাখলে দোকানের নাম ব্যবহার হবে"
                  value={values.memo_heading}
                />
              </label>
              <label className="product-form-field">
                <span className="product-field-label">যোগাযোগের তথ্য / ফোন নম্বর</span>
                <input
                  className="product-field-control"
                  maxLength={120}
                  name="contact_number"
                  onChange={updateField}
                  placeholder="ফোন: ০২৩৩৪৪-৭৪৫৯৮, ০১৮৯৩-৩৯৪৯০১; দোকান: ০১৮১৯-৬৪৮১৮১, ০১৬১৯-৬৪৮১৮১"
                  value={values.contact_number}
                />
              </label>
              <label className="product-form-field">
                <span className="product-field-label">দোকানের ঠিকানা</span>
                <input
                  autoComplete="street-address"
                  className="product-field-control"
                  maxLength={255}
                  name="address"
                  onChange={updateField}
                  value={values.address}
                />
              </label>
            </div>
            <footer className="product-form-actions">
              <span>{shops.length}/৩টি দোকান</span>
              <div>
                <button
                  className="product-cancel-button"
                  disabled={saving}
                  onClick={() => setEditingShop(null)}
                  type="button"
                >
                  বাতিল
                </button>
                <button className="product-save-button" disabled={saving} type="submit">
                  {saving ? <span className="button-spinner" /> : <Save size={17} />}
                  {saving ? "সংরক্ষণ হচ্ছে..." : "দোকান সংরক্ষণ"}
                </button>
              </div>
            </footer>
          </form>
        ) : (
          <div className="user-list-content">
            <div className="user-list-toolbar">
              <span>{shops.length}/৩টি দোকান খোলা হয়েছে</span>
              {shops.length < 3 ? (
                <button className="product-save-button" onClick={startCreate} type="button">
                  <UserPlus size={17} /> নতুন দোকান
                </button>
              ) : null}
            </div>
            <div className="user-table-wrap shop-management-table-wrap">
              <table className="user-management-table shop-management-table">
                <thead>
                  <tr>
                    <th scope="col">ক্রম</th>
                    <th scope="col">দোকানের নাম</th>
                    <th scope="col">মেমো হেডিং</th>
                    <th scope="col">ঠিকানা</th>
                    <th scope="col">যোগাযোগ</th>
                    <th scope="col">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  {shops.map((shop, index) => (
                    <tr key={shop.id}>
                      <td>{index + 1}</td>
                      <td><strong>{shop.shop_name}</strong></td>
                      <td>{shop.memo_heading || shop.shop_name}</td>
                      <td>{shop.address || "ঠিকানা দেওয়া হয়নি"}</td>
                      <td>{shop.contact_number || "—"}</td>
                      <td>
                        <div className="user-list-actions">
                          <button aria-label={`${shop.shop_name} এডিট করুন`} className="user-action-button product-action-edit" onClick={() => startEdit(shop)} title="এডিট" type="button">
                            <Pencil size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {shops.length >= 3 ? (
              <p className="user-management-note">
                সর্বোচ্চ ৩টি দোকান খোলা আছে। নতুন দোকানের সীমা বাড়াতে ডেভেলপারের অনুমোদন নিতে হবে।
              </p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function WarehouseManagementPanel({ token, onClose, onDataChanged, showToast }) {
  const [warehouses, setWarehouses] = useState([]);
  const [maxWarehouses, setMaxWarehouses] = useState(6);
  const [loading, setLoading] = useState(true);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState({
    warehouse_name: "",
    address: "",
    contact_number: "",
  });

  async function loadWarehouses() {
    setLoading(true);
    try {
      const response = await apiRequest("/warehouses/list.php", { token });
      setWarehouses(response.data.warehouses);
      setMaxWarehouses(response.data.max_warehouses);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWarehouses();
  }, []);

  function startCreate() {
    setValues({ warehouse_name: "", address: "", contact_number: "" });
    setEditingWarehouse(false);
  }

  function startEdit(warehouse) {
    setValues({
      warehouse_name: warehouse.warehouse_name,
      address: warehouse.address || "",
      contact_number: warehouse.contact_number || "",
    });
    setEditingWarehouse(warehouse);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function submitWarehouse(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const isEditing = Boolean(editingWarehouse);
      const response = await apiRequest(
        isEditing ? "/warehouses/update.php" : "/warehouses/create.php",
        {
          method: "POST",
          token,
          body: JSON.stringify({
            ...values,
            ...(isEditing ? { id: editingWarehouse.id } : {}),
          }),
        },
      );
      showToast("success", response.message);
      setEditingWarehouse(null);
      await loadWarehouses();
      onDataChanged();
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="product-modal-backdrop">
      <section
        aria-labelledby="warehouse-management-title"
        aria-modal="true"
        className="product-modal user-management-modal"
        role="dialog"
      >
        <header className="product-modal-header">
          <span className="product-modal-icon"><Boxes size={22} /></span>
          <div>
            <h2 id="warehouse-management-title">গুদাম সেটআপ</h2>
            <p>সব দোকানের ক্রয় ও স্টক ব্যবস্থাপনায় ব্যবহারযোগ্য সর্বোচ্চ {numberFormatter.format(maxWarehouses)}টি গুদাম।</p>
          </div>
          <button
            aria-label="গুদাম সেটআপ বন্ধ করুন"
            className="product-modal-close"
            onClick={onClose}
            type="button"
          >
            <X size={20} />
          </button>
        </header>

        {editingWarehouse !== null ? (
          <form className="product-form" onSubmit={submitWarehouse}>
            <div className="product-form-grid">
              <label className="product-form-field">
                <span className="product-field-label">গুদামের নাম</span>
                <input
                  autoComplete="organization"
                  className="product-field-control product-required-field"
                  maxLength={180}
                  name="warehouse_name"
                  onChange={updateField}
                  required
                  value={values.warehouse_name}
                />
              </label>
              <label className="product-form-field">
                <span className="product-field-label">যোগাযোগের তথ্য / ফোন নম্বর</span>
                <input
                  className="product-field-control"
                  maxLength={120}
                  name="contact_number"
                  onChange={updateField}
                  placeholder="ফোন: ০১৭১২৩৪৫৬৭৮"
                  value={values.contact_number}
                />
              </label>
              <label className="product-form-field">
                <span className="product-field-label">গুদামের ঠিকানা</span>
                <input
                  autoComplete="street-address"
                  className="product-field-control"
                  maxLength={255}
                  name="address"
                  onChange={updateField}
                  value={values.address}
                />
              </label>
            </div>
            <footer className="product-form-actions">
              <span>{numberFormatter.format(warehouses.length)}/{numberFormatter.format(maxWarehouses)}টি গুদাম</span>
              <div>
                <button
                  className="product-cancel-button"
                  disabled={saving}
                  onClick={() => setEditingWarehouse(null)}
                  type="button"
                >
                  বাতিল
                </button>
                <button className="product-save-button" disabled={saving} type="submit">
                  {saving ? <span className="button-spinner" /> : <Save size={17} />}
                  {saving ? "সংরক্ষণ হচ্ছে..." : "গুদাম সংরক্ষণ"}
                </button>
              </div>
            </footer>
          </form>
        ) : (
          <div className="user-list-content">
            <div className="user-list-toolbar">
              <span>{numberFormatter.format(warehouses.length)}/{numberFormatter.format(maxWarehouses)}টি গুদাম খোলা হয়েছে · সব দোকানের জন্য</span>
              {warehouses.length < maxWarehouses ? (
                <button className="product-save-button" onClick={startCreate} type="button">
                  <UserPlus size={17} /> নতুন গুদাম
                </button>
              ) : null}
            </div>
            {loading ? (
              <div className="user-list-empty"><span className="button-spinner" /> গুদামের তালিকা লোড হচ্ছে...</div>
            ) : warehouses.length === 0 ? (
              <div className="user-list-empty">এখনো কোনো গুদাম যোগ করা হয়নি।</div>
            ) : (
              <div className="user-table-wrap warehouse-management-table-wrap">
                <table className="user-management-table warehouse-management-table">
                  <thead>
                    <tr>
                      <th scope="col">ক্রম</th>
                      <th scope="col">গুদামের নাম</th>
                      <th scope="col">ঠিকানা</th>
                      <th scope="col">যোগাযোগ</th>
                      <th scope="col">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {warehouses.map((warehouse, index) => (
                      <tr key={warehouse.id}>
                        <td>{index + 1}</td>
                        <td><strong>{warehouse.warehouse_name}</strong></td>
                        <td>{warehouse.address || "ঠিকানা দেওয়া হয়নি"}</td>
                        <td>{warehouse.contact_number || "—"}</td>
                        <td>
                          <div className="user-list-actions">
                            <button aria-label={`${warehouse.warehouse_name} এডিট করুন`} className="user-action-button product-action-edit" onClick={() => startEdit(warehouse)} title="এডিট" type="button">
                              <Pencil size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {warehouses.length >= maxWarehouses ? (
              <p className="user-management-note">
                সর্বোচ্চ {numberFormatter.format(maxWarehouses)}টি গুদাম খোলা আছে। সীমা বাড়াতে ডেভেলপারের অনুমোদন নিতে হবে।
              </p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function UserPresencePanel({ token, shopId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!shopId) return undefined;
    let active = true;
    let timer;

    async function loadPresence() {
      try {
        const response = await apiRequest("/users/presence.php", { token, shopId });
        if (active) {
          setUsers(response.data.users);
          setError("");
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) {
          setLoading(false);
          timer = window.setTimeout(loadPresence, 30_000);
        }
      }
    }

    setLoading(true);
    loadPresence();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [token, shopId]);

  const formatDateTime = (value) => {
    if (!value) return "লগইন তথ্য নেই";
    const date = new Date(value.replace(" ", "T"));
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("bn-BD", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      numberingSystem: "latn",
    }).format(date);
  };

  return (
    <div className="dashboard-presence" aria-live="polite">
      <div className="dashboard-presence-heading">
        <h3><Users size={16} /> ইউজার উপস্থিতি</h3>
        <span>প্রতি ৩০ সেকেন্ডে আপডেট</span>
      </div>
      {loading ? (
        <div className="dashboard-presence-message"><span className="button-spinner" /> তথ্য লোড হচ্ছে...</div>
      ) : error ? (
        <div className="dashboard-presence-message dashboard-presence-error" role="alert">{error}</div>
      ) : users.length ? (
        <div className="dashboard-presence-list">
          {users.map((presenceUser) => (
            <div className="dashboard-presence-item" key={presenceUser.id}>
              <span className={`presence-status-dot ${presenceUser.is_online ? "presence-online" : ""}`} />
              <div className="dashboard-presence-user">
                <strong>
                  {presenceUser.display_name || presenceUser.username}
                  {!presenceUser.is_active ? " · নিষ্ক্রিয়" : ""}
                </strong>
                <small>শেষ লগইন: {formatDateTime(presenceUser.last_login_at)}</small>
              </div>
              <span className={`presence-status-label ${presenceUser.is_online ? "presence-online-label" : ""}`}>
                {presenceUser.is_online ? "অনলাইন" : "অফলাইন"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="dashboard-presence-message">এই দোকানে কোনো ইউজার পাওয়া যায়নি।</div>
      )}
    </div>
  );
}

function DeleteAuditLogPanel({ token, onClose, showToast }) {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadLogs(searchValue = appliedSearch, pageValue = 1) {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ search: searchValue, page: String(pageValue) });
      const response = await apiRequest(`/audit/deletions.php?${query.toString()}`, { token });
      setEntries(response.data.entries);
      setPage(response.data.page);
      setPageCount(response.data.page_count);
      setTotal(response.data.total);
      setAppliedSearch(searchValue);
    } catch (requestError) {
      setError(requestError.message);
      showToast("error", requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs("", 1);
  }, [token]);

  const entityLabels = {
    product: "পণ্য",
    customer: "কাস্টমার",
    supplier: "সাপ্লায়ার",
    bank_account: "ব্যাংক হিসাব",
    sale: "বিক্রয় মেমো",
    purchase: "ক্রয় চালান",
    user: "ইউজার",
  };
  const formatDeletedAt = (value) => {
    const date = new Date(value.replace(" ", "T"));
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("bn-BD", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      numberingSystem: "latn",
    }).format(date);
  };

  return (
    <div className="product-modal-backdrop">
      <section aria-labelledby="delete-audit-title" aria-modal="true" className="product-modal user-management-modal delete-audit-modal" role="dialog">
        <header className="product-modal-header">
          <span className="product-modal-icon"><ClipboardList size={22} /></span>
          <div><h2 id="delete-audit-title">ডিলিট লগ</h2><p>কে, কখন, কোন রেকর্ড কী কারণে মুছেছেন—সার্চ করে দেখুন।</p></div>
          <button aria-label="ডিলিট লগ বন্ধ করুন" className="product-modal-close" onClick={onClose} type="button"><X size={20} /></button>
        </header>
        <div className="user-list-content">
          <form className="delete-audit-search" onSubmit={(event) => {
            event.preventDefault();
            loadLogs(search.trim(), 1);
          }}>
            <label className="product-list-search">
              <span>সার্চ</span>
              <input
                className="product-field-control"
                maxLength={120}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="নাম, দোকান, ইউজার বা মুছার কারণ"
                value={search}
              />
            </label>
            <button className="product-save-button" disabled={loading} type="submit">
              {loading ? <span className="button-spinner" /> : <Search size={16} />} খুঁজুন
            </button>
          </form>
          <div className="user-list-toolbar">
            <span>মোট {numberFormatter.format(total)}টি রেকর্ড</span>
            <div className="delete-audit-pagination">
              <button className="user-action-button" disabled={loading || page <= 1} onClick={() => loadLogs(appliedSearch, page - 1)} type="button">আগের</button>
              <strong>{numberFormatter.format(page)} / {numberFormatter.format(pageCount)}</strong>
              <button className="user-action-button" disabled={loading || page >= pageCount} onClick={() => loadLogs(appliedSearch, page + 1)} type="button">পরের</button>
            </div>
          </div>
          {error ? (
            <div className="user-list-empty" role="alert">{error}</div>
          ) : loading ? (
            <div className="user-list-empty"><span className="button-spinner" /> ডিলিট লগ লোড হচ্ছে...</div>
          ) : entries.length ? (
            <div className="user-table-wrap delete-audit-table-wrap">
              <table className="user-management-table delete-audit-table">
                <thead><tr><th>সময়</th><th>দোকান</th><th>রেকর্ড</th><th>যিনি মুছেছেন</th><th>কারণ</th></tr></thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDeletedAt(entry.deleted_at)}</td>
                      <td>{entry.shop_name || "—"}</td>
                      <td><strong>{entityLabels[entry.entity_type] || entry.entity_type} · {entry.record_label}</strong><small>রেকর্ড #{entry.record_id}</small></td>
                      <td>{entry.actor_name}<small>@{entry.actor_username}</small></td>
                      <td className="delete-audit-reason">{entry.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="user-list-empty">সার্চের সাথে মেলে এমন ডিলিট লগ নেই।</div>
          )}
        </div>
      </section>
    </div>
  );
}

function WelcomePage({ user, token, onLogout, showToast }) {
  const [activeTab, setActiveTab] = useState(() => (
    user.role === "owner" || user.permissions?.includes("overview")
      ? "overview"
      : DASHBOARD_TABS.find((tab) => user.permissions?.includes(tab.id))?.id || "overview"
  ));
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showSupplierPaymentForm, setShowSupplierPaymentForm] = useState(false);
  const [showBankSetup, setShowBankSetup] = useState(false);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [showSalesForm, setShowSalesForm] = useState(false);
  const [showQuotationPanel, setShowQuotationPanel] = useState(false);
  const [showCustomerPaymentForm, setShowCustomerPaymentForm] = useState(false);
  const [showCustomerReturnForm, setShowCustomerReturnForm] = useState(false);
  const [showSupplierReturnForm, setShowSupplierReturnForm] = useState(false);
  const [showDamageStockForm, setShowDamageStockForm] = useState(false);
  const [showStockReport, setShowStockReport] = useState(false);
  const [showSalesReport, setShowSalesReport] = useState(false);
  const [showCustomerLedger, setShowCustomerLedger] = useState(false);
  const [showSupplierLedger, setShowSupplierLedger] = useState(false);
  const [showPurchaseReport, setShowPurchaseReport] = useState(false);
  const [showWarehouseStock, setShowWarehouseStock] = useState(false);
  const [showWarehouseTransfer, setShowWarehouseTransfer] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showShopManagement, setShowShopManagement] = useState(false);
  const [showWarehouseManagement, setShowWarehouseManagement] = useState(false);
  const [showDeleteAuditLog, setShowDeleteAuditLog] = useState(false);
  const [shops, setShops] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [dashboardSummaryLoading, setDashboardSummaryLoading] = useState(false);
  const [dashboardSummaryError, setDashboardSummaryError] = useState(false);
  const [smsBalance, setSmsBalance] = useState(null);
  const [smsBalanceLoading, setSmsBalanceLoading] = useState(false);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);
  const [activityMemo, setActivityMemo] = useState(null);
  const [loadingActivityMemoId, setLoadingActivityMemoId] = useState(null);
  const [resendingActivitySmsId, setResendingActivitySmsId] = useState(null);
  const [activityPage, setActivityPage] = useState(1);
  const [selectedShopId, setSelectedShopId] = useState(user.shop_id || "");
  const displayName = user.display_name || user.username;
  const activityPageSize = 10;
  const recentActivity = dashboardSummary?.recent_activity || [];
  const activityPageCount = Math.ceil(recentActivity.length / activityPageSize);
  const currentActivityPage = Math.min(activityPage, Math.max(activityPageCount, 1));
  const activityPageStart = (currentActivityPage - 1) * activityPageSize;
  const visibleActivity = recentActivity.slice(activityPageStart, activityPageStart + activityPageSize);
  const activeShop = shops.find((shop) => shop.id === Number(selectedShopId));
  const visibleTabs = DASHBOARD_TABS.filter((tab) => (
    user.role === "owner" || user.permissions?.includes(tab.id)
  ));
  const activeSection = visibleTabs.find((tab) => tab.id === activeTab);
  const today = new Intl.DateTimeFormat("bn-BD", { dateStyle: "full", numberingSystem: "latn" }).format(new Date());
  const canEditSetup = user.role === "owner" || user.permissions?.includes("can_edit");
  const canDeleteSetup = user.role === "owner" || user.permissions?.includes("can_delete");
  const canManageSales = user.role === "owner" || user.permissions?.includes("sales");
  const canManagePurchases = user.role === "owner" || user.permissions?.includes("purchase");
  const refreshDashboardSummary = () => setDashboardRefreshKey((current) => current + 1);

  useEffect(() => {
    let failed = false;
    let pending = false;
    const heartbeat = async () => {
      if (pending) return;
      pending = true;
      try {
        await apiRequest("/auth/heartbeat.php", {
          method: "POST",
          token,
          body: JSON.stringify({}),
        });
        failed = false;
      } catch (error) {
        if (!failed) showToast("error", error.message);
        failed = true;
      } finally {
        pending = false;
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") heartbeat();
    };

    heartbeat();
    const intervalId = window.setInterval(heartbeat, 30_000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [token, showToast]);

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === activeTab) && visibleTabs.length > 0) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [activeTab, visibleTabs]);

  useEffect(() => {
    let active = true;
    apiRequest("/shops/list.php", { token })
      .then((response) => {
        if (!active) return;
        const availableShops = response.data.shops;
        setShops(availableShops);
        const savedShopId = user.role === "owner"
          ? Number(sessionStorage.getItem("mitali_shop_id"))
          : user.shop_id;
        const matchingShop = availableShops.find((shop) => shop.id === savedShopId);
        const defaultShopId = matchingShop?.id || availableShops[0]?.id || "";
        setSelectedShopId(defaultShopId);
        if (user.role === "owner" && defaultShopId) {
          sessionStorage.setItem("mitali_shop_id", String(defaultShopId));
        }
      })
      .catch((error) => showToast("error", error.message));
    return () => {
      active = false;
    };
  }, [token, user.role, user.shop_id]);

  useEffect(() => {
    if (!selectedShopId) return undefined;
    let active = true;
    setDashboardSummary(null);
    setDashboardSummaryError(false);
    setDashboardSummaryLoading(true);
    apiRequest("/dashboard/summary.php", { token, shopId: selectedShopId })
      .then((response) => {
        if (active) setDashboardSummary(response.data);
      })
      .catch((error) => {
        if (active) {
          setDashboardSummaryError(true);
          showToast("error", error.message);
        }
      })
      .finally(() => {
        if (active) setDashboardSummaryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, selectedShopId, dashboardRefreshKey, showToast]);

  useEffect(() => {
    if (!selectedShopId || (user.role !== "owner" && !user.permissions?.includes("overview"))) {
      setSmsBalance(null);
      return undefined;
    }
    let active = true;
    setSmsBalance(null);
    setSmsBalanceLoading(true);
    apiRequest("/sms/balance.php", { token, shopId: selectedShopId })
      .then((response) => {
        if (active) setSmsBalance(response.data.sms_balance);
      })
      .catch(() => {
        if (active) setSmsBalance({ available: false, balance: null, message: "ব্যালেন্স লোড করা যায়নি" });
      })
      .finally(() => {
        if (active) setSmsBalanceLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, selectedShopId, dashboardRefreshKey, user.role, user.permissions]);

  async function reloadShops(selectShopId) {
    const response = await apiRequest("/shops/list.php", { token });
    setShops(response.data.shops);
    const nextShopId = selectShopId || selectedShopId || response.data.shops[0]?.id || "";
    setSelectedShopId(nextShopId);
    if (user.role === "owner" && nextShopId) {
      sessionStorage.setItem("mitali_shop_id", String(nextShopId));
    }
  }

  function changeShop(event) {
    const nextShopId = Number(event.target.value);
    setSelectedShopId(nextShopId);
    sessionStorage.setItem("mitali_shop_id", String(nextShopId));
  }

  async function openActivityMemo(activity) {
    setLoadingActivityMemoId(`${activity.activity_type}-${activity.activity_id}`);
    try {
      const endpoints = {
        sale: `/sales/receipt.php?id=${encodeURIComponent(activity.activity_id)}`,
        purchase: `/purchases/receipt.php?id=${encodeURIComponent(activity.activity_id)}`,
        supplier_payment: `/supplier-payments/receipt.php?id=${encodeURIComponent(activity.activity_id)}`,
        customer_payment: `/customer-payments/receipt.php?id=${encodeURIComponent(activity.activity_id)}`,
      };
      const response = await apiRequest(endpoints[activity.activity_type], { token, shopId: selectedShopId });
      const receipt = activity.activity_type === "sale"
        ? response.data.sale
        : activity.activity_type === "purchase"
          ? response.data.purchase
          : response.data.payment;
      setActivityMemo({ type: activity.activity_type, receipt });
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setLoadingActivityMemoId(null);
    }
  }

  async function resendActivitySms(activity) {
    setResendingActivitySmsId(activity.activity_id);
    try {
      const response = await apiRequest("/sales/resend-sms.php", {
        method: "POST",
        token,
        shopId: selectedShopId,
        body: JSON.stringify({ sale_id: activity.activity_id }),
      });
      showToast("success", response.message);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setResendingActivitySmsId(null);
    }
  }

  function openModule(module) {
    if (module.key === "user-management") {
      setShowUserManagement(true);
      return;
    }
    if (module.key === "shop-management") {
      setShowShopManagement(true);
      return;
    }
    if (module.key === "warehouse-management") {
      setShowWarehouseManagement(true);
      return;
    }
    if (!selectedShopId) {
      showToast("error", "কাজ করার আগে একটি দোকান নির্বাচন করুন।");
      return;
    }
    if (module.key === "product-setup") {
      setShowProductForm(true);
      return;
    }
    if (module.key === "customer-setup") {
      setShowCustomerForm(true);
      return;
    }
    if (module.key === "supplier-setup") {
      setShowSupplierForm(true);
      return;
    }
    if (module.key === "bank-setup") {
      setShowBankSetup(true);
      return;
    }
    if (module.key === "purchase-create") {
      setShowPurchaseForm(true);
      return;
    }
    if (module.key === "warehouse-stock") {
      setShowWarehouseStock(true);
      return;
    }
    if (module.key === "warehouse-transfer") {
      setShowWarehouseTransfer(true);
      return;
    }
    if (module.key === "supplier-return") {
      setShowSupplierReturnForm(true);
      return;
    }
    if (module.key === "supplier-payment") {
      setShowSupplierPaymentForm(true);
      return;
    }
    if (module.key === "stock-damage") {
      setShowDamageStockForm(true);
      return;
    }
    if (module.key === "stock-report") {
      setShowStockReport(true);
      return;
    }
    if (module.key === "sales-report") {
      setShowSalesReport(true);
      return;
    }
    if (module.key === "customer-ledger") {
      setShowCustomerLedger(true);
      return;
    }
    if (module.key === "supplier-ledger") {
      setShowSupplierLedger(true);
      return;
    }
    if (module.key === "purchase-report") {
      setShowPurchaseReport(true);
      return;
    }
    if (module.key === "sales-create") {
      setShowSalesForm(true);
      return;
    }
    if (module.key === "quotation-create") {
      setShowQuotationPanel(true);
      return;
    }
    if (module.key === "sales-return") {
      setShowCustomerReturnForm(true);
      return;
    }
    if (module.key === "customer-payment") {
      setShowCustomerPaymentForm(true);
      return;
    }
    showToast("info", `${module.title} মডিউলটি পরবর্তী ধাপে চালু হবে।`);
  }

  function moduleBadgeText(moduleKey) {
    const countByModule = {
      "user-management": ["total_users", "ইউজার"],
      "shop-management": ["total_shops", "দোকান"],
      "warehouse-management": ["total_warehouses", "গুদাম"],
      "product-setup": ["total_products", "পণ্য"],
      "customer-setup": ["total_customers", "কাস্টমার"],
      "supplier-setup": ["total_suppliers", "সাপ্লায়ার"],
      "bank-setup": ["total_bank_accounts", "হিসাব"],
      "purchase-create": ["total_purchases", "ক্রয়"],
      "warehouse-transfer": ["total_transfers", "ট্রান্সফার"],
      "supplier-return": ["total_supplier_returns", "রিটার্ন"],
      "supplier-payment": ["total_supplier_payments", "পেমেন্ট"],
      "customer-payment": ["total_customer_payments", "আদায়"],
      "stock-damage": ["total_stock_damages", "এন্ট্রি"],
      "sales-create": ["total_sales", "বিক্রয়"],
      "quotation-create": ["total_quotations", "কোটেশন"],
      "sales-return": ["total_sales_returns", "রিটার্ন"],
      "sales-report": ["total_sales", "বিল"],
      "customer-ledger": ["total_customers", "কাস্টমার"],
      "supplier-ledger": ["total_suppliers", "সাপ্লায়ার"],
      "purchase-report": ["total_purchases", "বিল"],
      "stock-report": ["total_products", "পণ্য"],
      "warehouse-stock": ["total_warehouse_stock_items", "স্টক আইটেম"],
    };
    const countInfo = countByModule[moduleKey];
    if (countInfo) {
      const count = moduleKey === "shop-management"
        ? shops.length
        : dashboardSummary?.[countInfo[0]];
      if (count !== undefined) return `${numberFormatter.format(Number(count))} ${countInfo[1]}`;
      return dashboardSummaryLoading ? "লোড হচ্ছে…" : dashboardSummaryError ? "তথ্য নেই" : "—";
    }
    return "শীঘ্রই";
  }

  const countedModuleKeys = [
    "user-management",
    "shop-management",
    "warehouse-management",
    "product-setup",
    "customer-setup",
    "supplier-setup",
    "bank-setup",
    "purchase-create",
    "warehouse-transfer",
    "supplier-return",
    "supplier-payment",
    "stock-damage",
    "sales-create",
    "quotation-create",
    "sales-return",
    "sales-report",
    "supplier-ledger",
    "purchase-report",
    "stock-report",
    "warehouse-stock",
  ];

  return (
    <main className="dashboard-shell">
      {showProductForm ? (
        <ProductSetupForm
          onClose={() => setShowProductForm(false)}
          onDataChanged={refreshDashboardSummary}
          canDelete={canDeleteSetup}
          canEdit={canEditSetup}
          showToast={showToast}
          shopId={selectedShopId}
          token={token}
        />
      ) : null}
      {showCustomerForm ? (
        <CustomerSetupForm
          onClose={() => setShowCustomerForm(false)}
          onDataChanged={refreshDashboardSummary}
          canDelete={canDeleteSetup}
          canEdit={canEditSetup}
          showToast={showToast}
          shopId={selectedShopId}
          token={token}
        />
      ) : null}
      {showSupplierForm ? (
        <SupplierSetupForm
          onClose={() => setShowSupplierForm(false)}
          onDataChanged={refreshDashboardSummary}
          canDelete={canDeleteSetup}
          canEdit={canEditSetup}
          showToast={showToast}
          shopId={selectedShopId}
          token={token}
        />
      ) : null}
      {showBankSetup ? (
        <BankSetupForm
          onClose={() => setShowBankSetup(false)}
          onDataChanged={refreshDashboardSummary}
          canDelete={canDeleteSetup}
          canEdit={canEditSetup}
          showToast={showToast}
          shopId={selectedShopId}
          token={token}
        />
      ) : null}
      {activityMemo?.type === "sale" ? (
        <SalesReceiptMemo
          onClose={() => setActivityMemo(null)}
          receipt={activityMemo.receipt}
          shop={activeShop}
          showToast={showToast}
        />
      ) : null}
      {activityMemo && activityMemo.type !== "sale" ? (
        <ActivityReceiptMemo
          onClose={() => setActivityMemo(null)}
          receipt={activityMemo.receipt}
          shop={activeShop}
          type={activityMemo.type}
        />
      ) : null}
      {showPurchaseForm ? (
        <PurchaseForm
          canCreateSupplier={user.role === "owner" || user.permissions?.includes("setup")}
          onClose={() => setShowPurchaseForm(false)}
          onDataChanged={refreshDashboardSummary}
          onSaved={() => {
            setShowPurchaseForm(false);
            refreshDashboardSummary();
          }}
          showToast={showToast}
          shopId={selectedShopId}
          token={token}
        />
      ) : null}
      {showQuotationPanel ? (
        <QuotationPanel
          onClose={() => setShowQuotationPanel(false)}
          onChanged={refreshDashboardSummary}
          showToast={showToast}
          shop={activeShop}
          shopId={selectedShopId}
          token={token}
        />
      ) : null}
      {showSalesForm ? (
        <SalesForm
          canCreateCustomer={user.role === "owner" || user.permissions?.includes("setup")}
          onClose={() => setShowSalesForm(false)}
          onSaved={refreshDashboardSummary}
          showToast={showToast}
          shop={activeShop}
          shopId={selectedShopId}
          token={token}
        />
      ) : null}
      {showCustomerPaymentForm ? (
        <CustomerPaymentForm
          onClose={() => setShowCustomerPaymentForm(false)}
          onDataChanged={refreshDashboardSummary}
          showToast={showToast}
          shop={activeShop}
          shopId={selectedShopId}
          token={token}
        />
      ) : null}
      {showCustomerReturnForm ? (
        <CustomerReturnForm
          onClose={() => setShowCustomerReturnForm(false)}
          onSaved={refreshDashboardSummary}
          showToast={showToast}
          shop={activeShop}
          shopId={selectedShopId}
          token={token}
        />
      ) : null}
      {showSupplierReturnForm ? (
        <SupplierReturnForm
          onClose={() => setShowSupplierReturnForm(false)}
          onDataChanged={refreshDashboardSummary}
          showToast={showToast}
          shopId={selectedShopId}
          token={token}
        />
      ) : null}
      {showSupplierPaymentForm ? (
        <SupplierPaymentForm
          onClose={() => setShowSupplierPaymentForm(false)}
          onDataChanged={refreshDashboardSummary}
          showToast={showToast}
          shop={activeShop}
          shopId={selectedShopId}
          token={token}
        />
      ) : null}
      {showDamageStockForm ? (
        <DamageStockForm
          onClose={() => setShowDamageStockForm(false)}
          onDataChanged={refreshDashboardSummary}
          showToast={showToast}
          shopId={selectedShopId}
          token={token}
        />
      ) : null}
      {showStockReport ? (
        <StockReportPanel
          onClose={() => setShowStockReport(false)}
          showToast={showToast}
          shop={activeShop}
          shopId={selectedShopId}
          token={token}
        />
      ) : null}
      {showSalesReport ? (
        <SalesReportPanel
          canDelete={canDeleteSetup && canManageSales}
          canEdit={canEditSetup && canManageSales}
          onClose={() => setShowSalesReport(false)}
          onChanged={refreshDashboardSummary}
          showToast={showToast}
          shop={activeShop}
          shopId={selectedShopId}
          token={token}
        />
      ) : null}
      {showCustomerLedger ? (
        <CustomerLedgerPanel
          onClose={() => setShowCustomerLedger(false)}
          showToast={showToast}
          shop={activeShop}
          shopId={selectedShopId}
          token={token}
        />
      ) : null}
      {showSupplierLedger ? (
        <SupplierLedgerPanel
          onClose={() => setShowSupplierLedger(false)}
          showToast={showToast}
          shop={activeShop}
          shopId={selectedShopId}
          token={token}
        />
      ) : null}
      {showPurchaseReport ? (
        <PurchaseReportPanel
          canDelete={canDeleteSetup && canManagePurchases}
          canEdit={canEditSetup && canManagePurchases}
          canCreateSupplier={user.role === "owner" || user.permissions?.includes("setup")}
          onClose={() => setShowPurchaseReport(false)}
          onChanged={refreshDashboardSummary}
          showToast={showToast}
          shop={activeShop}
          shopId={selectedShopId}
          token={token}
        />
      ) : null}
      {showWarehouseStock ? (
        <WarehouseStockPanel
          onClose={() => setShowWarehouseStock(false)}
          showToast={showToast}
          shop={activeShop}
          shopId={selectedShopId}
          token={token}
        />
      ) : null}
      {showWarehouseTransfer ? (
        <WarehouseTransferPanel
          onClose={() => setShowWarehouseTransfer(false)}
          onSaved={() => {
            setShowWarehouseTransfer(false);
            refreshDashboardSummary();
          }}
          showToast={showToast}
          shopId={selectedShopId}
          token={token}
        />
      ) : null}
      {showUserManagement ? (
        <UserManagementPanel
          onDataChanged={refreshDashboardSummary}
          selectedShopId={selectedShopId}
          shops={shops}
          onClose={() => setShowUserManagement(false)}
          showToast={showToast}
          token={token}
        />
      ) : null}
      {showShopManagement ? (
        <ShopManagementPanel
          onChanged={reloadShops}
          onClose={() => setShowShopManagement(false)}
          showToast={showToast}
          shops={shops}
          token={token}
        />
      ) : null}
      {showWarehouseManagement ? (
        <WarehouseManagementPanel
          onClose={() => setShowWarehouseManagement(false)}
          onDataChanged={refreshDashboardSummary}
          showToast={showToast}
          token={token}
        />
      ) : null}
      {showDeleteAuditLog && user.role === "owner" ? (
        <DeleteAuditLogPanel
          onClose={() => setShowDeleteAuditLog(false)}
          showToast={showToast}
          token={token}
        />
      ) : null}
      <header className="welcome-header">
        <div className="dashboard-header-inner">
          <div className="welcome-brand">
            <BrandMark small />
            <div>
              <strong>{activeShop?.shop_name || "মিতালী রেডিও ইলেকট্রিক"}</strong>
            </div>
          </div>
          <div className="dashboard-header-actions">
            <span className="dashboard-live"><span /> সিস্টেম সচল</span>
            {user.role === "owner" && shops.length > 0 ? (
              <div className="active-shop-select-label">
                <Store size={15} />
                <SearchableSelect
                  ariaLabel="বর্তমান দোকান নির্বাচন"
                  className="active-shop-select"
                  onChange={(event) => changeShop({ target: { value: event.target.value } })}
                  options={shops.map((shop) => ({ value: shop.id, label: shop.shop_name }))}
                  portalOptions
                  placeholder="দোকান লিখে খুঁজুন"
                  value={selectedShopId}
                />
              </div>
            ) : activeShop ? (
              <span className="active-shop-badge"><Store size={14} /> {activeShop.shop_name}</span>
            ) : null}
            <div className="dashboard-user">
              <span className="dashboard-avatar">{displayName.charAt(0)}</span>
              <span className="dashboard-user-name">{displayName}</span>
            </div>
            <button className="logout-button" onClick={onLogout} type="button">
              <LogOut aria-hidden="true" size={16} />
              <span>লগআউট</span>
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-container">
        <section className="dashboard-hero">
          <div className="dashboard-hero-pattern" aria-hidden="true" />
          <div className="dashboard-hero-copy">
            <span className="dashboard-hero-kicker"><Store size={15} /> আপনার দোকানের হিসাব, এক জায়গায়</span>
            <h1>স্বাগতম, {displayName}</h1>
            <p>{activeShop?.memo_heading || activeShop?.shop_name || "মিতালী রেডিও ইলেকট্রিক"} · আজকের ব্যবসার সারাংশ</p>
            <span className="dashboard-date"><CalendarDays size={15} /> {today}</span>
          </div>
          <div className="dashboard-hero-art" aria-hidden="true">
            <span className="hero-art-orbit hero-art-orbit-one" />
            <span className="hero-art-orbit hero-art-orbit-two" />
            <span className="hero-art-bulb"><Lightbulb size={48} strokeWidth={1.4} /></span>
            <Zap className="hero-art-zap" size={19} fill="currentColor" />
          </div>
        </section>

        <section className="dashboard-menu-section">
          <div className="menu-section-heading">
            <div>
              <span className="panel-eyebrow">SHOP MANAGEMENT</span>
              <h2>দোকান পরিচালনা</h2>
            </div>
            <span className="menu-section-hint">বিভাগ বেছে নিয়ে মেনু দেখুন</span>
          </div>

          {visibleTabs.length > 0 ? <nav className="dashboard-tabs" role="tablist" aria-label="দোকান পরিচালনা বিভাগ">
            {visibleTabs.map(({ id, label, icon: Icon }) => (
              <button
                aria-selected={activeTab === id}
                className={`dashboard-tab ${activeTab === id ? "dashboard-tab-active" : ""}`}
                id={`tab-${id}`}
                key={id}
                onClick={() => setActiveTab(id)}
                role="tab"
                type="button"
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </nav> : <div className="overview-tabs-note">আপনার অ্যাকাউন্টে কোনো মেনু ব্যবহারের অনুমতি নেই।</div>}

          {activeTab !== "overview" && activeSection ? (
            <div
              aria-labelledby={`tab-${activeTab}`}
              className="dashboard-module-panel"
              role="tabpanel"
            >
              <div className="module-panel-heading">
                <div>
                  <h3>{activeSection.label}</h3>
                  <p>{activeSection.description}</p>
                </div>
                <span className="module-count">
                  {activeSection.modules.filter(({ key }) => (
                    (!["user-management", "shop-management", "warehouse-management"].includes(key))
                    || user.role === "owner"
                  )).length}টি মেনু
                </span>
              </div>
              <div className="dashboard-module-grid">
                {activeSection.modules
                  .filter(({ key }) => key !== "user-management" || user.role === "owner")
                  .filter(({ key }) => key !== "shop-management" || user.role === "owner")
                  .filter(({ key }) => key !== "warehouse-management" || user.role === "owner")
                  .map(({ key: moduleKey, title, detail, icon: Icon }) => (
                  <button
                    className="dashboard-module-card"
                    key={title}
                    onClick={() => openModule({ key: moduleKey, title })}
                    type="button"
                  >
                    <span className="module-icon"><Icon size={21} /></span>
                    <span className="module-card-copy">
                      <strong>{title}</strong>
                      <small>{detail}</small>
                    </span>
                    <ArrowUpRight className="module-arrow" size={17} />
                    <span className={countedModuleKeys.includes(moduleKey) ? "module-ready-badge" : "module-coming-soon"}>
                      {moduleBadgeText(moduleKey)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : activeTab === "overview" ? (
            <div className="overview-tabs-note">
              <span><LayoutDashboard size={18} /></span>
              <div><strong>আপনার প্রয়োজনীয় বিভাগ বেছে নিন</strong><small>সেটআপ, ক্রয়, বিক্রয়, ওয়ারেন্টি ও রিপোর্ট—সব মেনু ট্যাব অনুযায়ী সাজানো।</small></div>
              <ArrowRight size={18} />
            </div>
          ) : null}
        </section>

        {user.role === "owner" || user.permissions?.includes("overview") ? (
        <section className="dashboard-metrics" aria-label="দোকানের সারাংশ">
          {DASHBOARD_METRICS.map(({ key, label, icon: Icon, color, note }) => {
            const value = key === "sms_balance" ? smsBalance?.balance : dashboardSummary?.[key];
            const formattedValue = key === "warranty_claims"
              ? "চালু নয়"
              : key === "sms_balance"
                ? (smsBalanceLoading
                  ? "লোড হচ্ছে…"
                  : smsBalance?.available
                    ? numberFormatter.format(Number(value))
                    : "—")
              : value === undefined
                ? (dashboardSummaryLoading ? "লোড হচ্ছে…" : "—")
                : key === "today_sales" || key === "today_purchases"
                  ? `৳ ${formatMoney(value)}`
                  : numberFormatter.format(Number(value));
            return (
            <article className={`metric-card metric-${color}`} key={key}>
              <span className="metric-icon"><Icon size={20} /></span>
              <span className="metric-label">{label}</span>
              <strong className={`metric-value ${key === "warranty_claims" ? "metric-value-unavailable" : ""}`}>{formattedValue}</strong>
              <span className="metric-note">
                {key === "sms_balance"
                  ? smsBalance?.message || note
                  : dashboardSummaryError ? "তথ্য লোড করা যায়নি" : note}
              </span>
            </article>
          );
          })}
        </section>
        ) : null}

        {activeTab === "overview" && (user.role === "owner" || user.permissions?.includes("overview")) ? (
          <section className="dashboard-overview-grid">
            <article className="dashboard-panel dashboard-activity-panel">
              <div className="dashboard-panel-heading">
                <div>
                  <span className="panel-eyebrow">OVERVIEW</span>
                  <h2><Activity size={19} /> ব্যবসার কার্যক্রম</h2>
                </div>
                <span className="panel-date">{today}</span>
              </div>
              {dashboardSummaryLoading ? (
                <div className="dashboard-empty-state"><span className="button-spinner" /> কার্যক্রম লোড হচ্ছে...</div>
              ) : dashboardSummaryError ? (
                <div className="dashboard-empty-state">
                  <span className="empty-state-icon"><BarChart3 size={24} /></span>
                  <strong>কার্যক্রম লোড করা যায়নি</strong>
                  <span>আবার চেষ্টা করুন অথবা সার্ভার সংযোগ পরীক্ষা করুন।</span>
                </div>
              ) : dashboardSummary?.recent_activity?.length ? (
                <>
                  <div className="dashboard-activity-list">
                    {visibleActivity.map((activity) => {
                    const isSale = activity.activity_type === "sale";
                    const isPurchase = activity.activity_type === "purchase";
                    const isSupplierPayment = activity.activity_type === "supplier_payment";
                    const isCustomerPayment = activity.activity_type === "customer_payment";
                    const activityKind = isSale
                      ? "বিক্রয়"
                      : isPurchase ? "ক্রয়" : isCustomerPayment ? "বাকি আদায়" : "সাপ্লায়ার পেমেন্ট";
                    const activityKey = `${activity.activity_type}-${activity.activity_id}`;
                    const activityDate = new Date(`${activity.activity_date}T00:00:00`);
                    const formattedDate = Number.isNaN(activityDate.getTime())
                      ? activity.activity_date
                      : new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "short", numberingSystem: "latn" }).format(activityDate);
                    return (
                      <article className="dashboard-activity-item" key={activityKey}>
                        <span className={`dashboard-activity-icon ${isSale ? "activity-sale" : isPurchase ? "activity-purchase" : "activity-payment"}`}>
                          {isSale ? <ShoppingCart size={17} /> : isPurchase ? <Receipt size={17} /> : <Wallet size={17} />}
                        </span>
                        <span className="dashboard-activity-details">
                          <strong>{activityKind} · {activity.reference}</strong>
                          <small>{activity.party} · {formattedDate}</small>
                        </span>
                        <strong className={`dashboard-activity-amount ${isSale ? "activity-sale-amount" : isSupplierPayment ? "activity-payment-amount" : ""}`}>
                          {isSupplierPayment ? "− " : isCustomerPayment ? "+ " : ""}৳ {formatMoney(activity.amount)}
                        </strong>
                        <button
                          aria-label={`${activityKind} ${activity.reference} মেমো প্রিন্ট করুন`}
                          className="user-action-button dashboard-activity-print"
                          disabled={loadingActivityMemoId !== null}
                          onClick={() => openActivityMemo(activity)}
                          title="মেমো প্রিন্ট"
                          type="button"
                        >
                          {loadingActivityMemoId === activityKey ? <span className="button-spinner" /> : <Printer size={15} />}
                          <span>মেমো</span>
                        </button>
                        {isSale && canManageSales ? (
                          <button
                            aria-label={`${activity.reference} SMS আবার পাঠান`}
                            className="user-action-button dashboard-activity-print"
                            disabled={resendingActivitySmsId !== null}
                            onClick={() => resendActivitySms(activity)}
                            title="SMS আবার পাঠান"
                            type="button"
                          >
                            {resendingActivitySmsId === activity.activity_id
                              ? <span className="button-spinner" />
                              : <MessageSquareText size={15} />}
                            <span>SMS</span>
                          </button>
                        ) : null}
                      </article>
                    );
                    })}
                  </div>
                  {activityPageCount > 1 ? (
                    <div className="dashboard-activity-pagination">
                      <span>{activityPageStart + 1}–{Math.min(activityPageStart + activityPageSize, recentActivity.length)} / {recentActivity.length}</span>
                      <div>
                        <button
                          disabled={currentActivityPage === 1}
                          onClick={() => setActivityPage(currentActivityPage - 1)}
                          type="button"
                        >
                          আগের
                        </button>
                        <strong>{currentActivityPage} / {activityPageCount}</strong>
                        <button
                          disabled={currentActivityPage === activityPageCount}
                          onClick={() => setActivityPage(currentActivityPage + 1)}
                          type="button"
                        >
                          পরের
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="dashboard-empty-state">
                  <span className="empty-state-icon"><BarChart3 size={24} /></span>
                  <strong>এখনো কোনো হিসাব যোগ হয়নি</strong>
                  <span>বিক্রয় ও ক্রয়ের তথ্য এন্ট্রি হলে এখানে কার্যক্রম দেখা যাবে।</span>
                </div>
              )}
            </article>

            <article className="dashboard-panel dashboard-shortcuts">
              <div className="dashboard-panel-heading">
                <div>
                  <span className="panel-eyebrow">QUICK ACCESS</span>
                  <h2><ArrowUpRight size={19} /> দ্রুত কাজ</h2>
                </div>
                {user.role === "owner" ? (
                  <button className="user-action-button delete-audit-open-button" onClick={() => setShowDeleteAuditLog(true)} type="button">
                    <ClipboardList size={15} /> ডিলিট লগ
                  </button>
                ) : null}
              </div>
              <div className="quick-action-list">
                {user.role === "owner" || user.permissions?.includes("sales") ? <button type="button" onClick={() => setActiveTab("sales")}>
                  <span className="quick-action-icon quick-green"><ShoppingCart size={18} /></span>
                  <span><strong>নতুন বিক্রয়</strong><small>বিক্রয় বিভাগ খুলুন</small></span>
                  <ArrowRight size={17} />
                </button> : null}
                {user.role === "owner" || user.permissions?.includes("purchase") ? <button type="button" onClick={() => setActiveTab("purchase")}>
                  <span className="quick-action-icon quick-blue"><PackagePlus size={18} /></span>
                  <span><strong>নতুন ক্রয়</strong><small>ক্রয় ও স্টক বিভাগ খুলুন</small></span>
                  <ArrowRight size={17} />
                </button> : null}
                {user.role === "owner" || user.permissions?.includes("warranty") ? <button type="button" onClick={() => setActiveTab("warranty")}>
                  <span className="quick-action-icon quick-amber"><Wrench size={18} /></span>
                  <span><strong>ওয়ারেন্টি ক্লেইম</strong><small>সার্ভিস বিভাগ খুলুন</small></span>
                  <ArrowRight size={17} />
                </button> : null}
              </div>
              {user.role === "owner" || (user.role === "manager" && user.permissions?.includes("overview")) ? (
                <UserPresencePanel token={token} shopId={selectedShopId} />
              ) : null}
            </article>
          </section>
        ) : null}

        <footer className="dashboard-footer">
          <span>© {new Date().getFullYear()} মেসার্স মিতালী রেডিও ইলেকট্রিক · ফেনী</span>
          <a
            className="system-credit"
            href="https://a2technologiesbd.com/"
            rel="noopener noreferrer"
            target="_blank"
          >
            System By A2 Technologies
          </a>
        </footer>
      </div>
    </main>
  );
}

export default function App() {
  const [toast, setToast] = useState(initialToast);
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);

  const showToast = useCallback((type, message) => {
    setToast({ id: Date.now(), type, message });
  }, []);

  function dismissToast() {
    setToast(initialToast);
  }

  useLayoutEffect(() => {
    document.title = session
      ? "ড্যাশবোর্ড | মিতালী রেডিও ইলেকট্রিক"
      : "লগইন | মিতালী রেডিও ইলেকট্রিক";
  }, [session]);

  useEffect(() => {
    const savedToken = sessionStorage.getItem("mitali_token");
    if (!savedToken) {
      setSessionReady(true);
      return;
    }

    apiRequest("/auth/me.php", { token: savedToken })
      .then((response) => {
        setSession({ token: savedToken, user: response.data.user });
        showToast("success", response.message);
      })
      .catch((error) => {
        sessionStorage.removeItem("mitali_token");
        showToast("error", error.message);
      })
      .finally(() => {
        setSessionReady(true);
      });
  }, []);

  async function handleLogin(username, password, remember) {
    setBusy(true);
    try {
      const response = await apiRequest("/auth/login.php", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      if (remember) sessionStorage.setItem("mitali_token", response.data.token);
      showToast("success", response.message);
      setSession(response.data);
    } catch (error) {
      showToast("error", error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    try {
      await apiRequest("/auth/logout.php", {
        method: "POST",
        token: session?.token,
        body: JSON.stringify({}),
      });
      showToast("success", "আপনি সফলভাবে লগআউট করেছেন।");
    } catch (error) {
      showToast("error", `লগআউটের উপস্থিতি আপডেট করা যায়নি। ${error.message}`);
    } finally {
      sessionStorage.removeItem("mitali_token");
      setSession(null);
    }
  }

  return (
    <>
      {!sessionReady ? (
        <div className="session-loading" role="status" aria-live="polite">
          <BrandMark small />
          <span className="session-loading-spinner" />
          <span>সেশন যাচাই করা হচ্ছে...</span>
        </div>
      ) : session ? (
        <WelcomePage
          user={session.user}
          token={session.token}
          onLogout={handleLogout}
          showToast={showToast}
        />
      ) : (
        <LoginPage onLogin={handleLogin} busy={busy} showToast={showToast} />
      )}
      <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
    </>
  );
}
