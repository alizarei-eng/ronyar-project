import { useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import type { Product } from "./api";
import JalaliDateField from "./JalaliDateField";
import { jalaliText } from "./jalaliDate";
import MoneyInput from "./MoneyInput";
import { addQuickProduct, matchingQuickProducts, quickSaleItems, type QuickRow } from "./quickSaleCart";
import { normalizeDigits } from "./saleAmounts";
import "./SalesPreview.css";

const number = new Intl.NumberFormat("fa-IR");
const money = (value: bigint | null) => value === null ? "—" : number.format(value);
const settlementLabels = { FULL: "دریافت کامل", PARTIAL: "دریافت بخشی از مبلغ", CREDIT: "فروش نسیه" };
type Settlement = keyof typeof settlementLabels;
type Receipt = { date: string; customer: string; warehouse: string; account: string; total: bigint; paid: bigint };

function SalesPreview() {
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<QuickRow[]>([]);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [price, setPrice] = useState("");
  const [customerType, setCustomerType] = useState("walk-in");
  const [customerName, setCustomerName] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [date, setDate] = useState(() => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tehran" }).format(new Date()));
  const [mode, setMode] = useState<Settlement>("FULL");
  const [account, setAccount] = useState("");
  const [received, setReceived] = useState("");
  const [itemError, setItemError] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const results = matchingQuickProducts(products, query);

  let total: bigint | null = null;
  let cartError = "";
  try {
    total = quickSaleItems(rows, products, "preview", 0).total;
  } catch (error) {
    cartError = error instanceof Error ? error.message : "تعداد و قیمت اقلام سبد را بررسی کنید.";
  }
  const partial = normalizeDigits(received);
  const paid = mode === "FULL" ? total : mode === "CREDIT" ? 0n : /^\d{1,18}$/.test(partial) ? BigInt(partial) : null;
  const remaining = total !== null && paid !== null && paid <= total ? total - paid : null;

  function add(product: Product) {
    try {
      setRows(addQuickProduct(rows, product));
      setQuery("");
      setItemError("");
      setCheckoutError("");
      setReceipt(null);
    } catch (error) {
      setItemError(error instanceof Error ? error.message : "تعداد این کالا را در سبد بررسی کنید.");
    }
  }

  function addManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const salePrice = normalizeDigits(price);
    if (!name.trim() || !/^(0|[1-9]\d{0,17})$/.test(salePrice)) {
      setItemError("نام کالا و قیمت واحد را به تومان وارد کنید.");
      return;
    }
    const product: Product = {
      id: crypto.randomUUID(),
      name: name.trim(),
      code: normalizeDigits(code),
      barcode: null,
      salePrice,
      kind: "GOODS",
      isActive: true,
      unit: { id: "each", code: "EA", name: "عدد" },
      category: null,
    };
    if (rows.length >= 100) {
      setItemError("حداکثر ۱۰۰ قلم در سبد فروش مجاز است.");
      return;
    }
    setProducts(current => [...current, product]);
    add(product);
    setName("");
    setCode("");
    setPrice("");
  }

  function changeRow(productId: string, field: "quantity" | "unitPrice", value: string) {
    setRows(current => current.map(row => row.productId === productId ? { ...row, [field]: value } : row));
    setCheckoutError("");
  }

  function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const customer = customerType === "named" ? customerName.trim() : "خریدار حضوری";
    if (!rows.length || total === null || total <= 0n) return setCheckoutError("سبد را با دست‌کم یک کالا و مبلغی بیشتر از صفر تکمیل کنید.");
    if (!date || !warehouse.trim()) return setCheckoutError("تاریخ فروش و نام انبار را در مشخصات فروش وارد کنید.");
    if (!customer) return setCheckoutError("نام مشتری را در مشخصات فروش وارد کنید.");
    if (mode !== "FULL" && customerType === "walk-in") return setCheckoutError("برای دریافت بخشی از مبلغ یا فروش نسیه، نام مشتری را وارد کنید.");
    if (paid === null || remaining === null || (mode === "PARTIAL" && (paid <= 0n || paid >= total))) {
      return setCheckoutError("مبلغ دریافتی باید بیشتر از صفر و کمتر از جمع فروش باشد.");
    }
    if (paid > 0n && !account) return setCheckoutError("صندوق یا حساب بانکی را در بخش تسویه انتخاب کنید.");
    setReceipt({ date, customer, warehouse: warehouse.trim(), account: paid > 0n ? account : "", total, paid });
    setRows([]);
    setReceived("");
    setCheckoutError("");
  }

  return (
    <main className="sales-preview">
      <header className="sale-hero">
        <span className="sale-demo">حالت تمرینی</span>
        <h1>ثبت فروش جدید</h1>
        <p>مشخصات فروش را وارد کنید، کالاها را به سبد اضافه کنید و نتیجهٔ تسویه را در رسید تمرینی ببینید.</p>
      </header>
      <nav className="sale-nav" aria-label="مراحل ثبت فروش">
        <a href="#sale-details">مشخصات فروش</a>
        <a href="#sale-items">کالاها و سبد</a>
        <a href="#sale-payment">تسویه</a>
      </nav>

      <div className="sale-layout">
        <div className="sale-stack">
          <section className="sale-panel" id="sale-details">
            <h2>مشخصات فروش</h2>
            <p>مشتری، تاریخ و انبار خروج کالا را مشخص کنید.</p>
            <div className="sale-fields">
              <label>نوع مشتری
                <select value={customerType} onChange={event => setCustomerType(event.target.value)}>
                  <option value="walk-in">خریدار حضوری</option>
                  <option value="named">مشتری مشخص</option>
                </select>
              </label>
              {customerType === "named" && <label>نام مشتری<input value={customerName} onChange={event => setCustomerName(event.target.value)} /></label>}
              <label>نام انبار<input value={warehouse} onChange={event => setWarehouse(event.target.value)} /></label>
              <JalaliDateField id="preview-date" label="تاریخ فروش" value={date} onChange={setDate} />
            </div>
          </section>

          <section className="sale-panel" id="sale-items">
            <h2>کالاها و سبد فروش</h2>
            <label>جستجوی کالاهایی که در این دمو وارد کرده‌اید
              <input type="search" value={query} placeholder="نام، کد یا بارکد" onChange={event => setQuery(event.target.value)}
                onKeyDown={event => { if (event.key === "Enter" && results.length === 1) add(results[0]); }} />
            </label>
            {query.trim() && (results.length ? <ul className="sale-results">
              {results.map(product => <li key={product.id}>
                <button type="button" onClick={() => add(product)}>افزودن {product.name} به سبد</button>
              </li>)}
            </ul> : <p role="status">کالایی با این عبارت پیدا نشد. می‌توانید آن را دستی وارد کنید.</p>)}

            <details className="sale-manual" open={!products.length || undefined}>
              <summary>ورود دستی کالا</summary>
              <form onSubmit={addManual}>
                <div className="sale-fields">
                  <label>نام کالا<input required value={name} onChange={event => setName(event.target.value)} /></label>
                  <label>کد یا بارکد <small>(اختیاری)</small><input value={code} onChange={event => setCode(event.target.value)} /></label>
                  <label>قیمت واحد (تومان)<MoneyInput required value={price} onChange={setPrice} /></label>
                </div>
                <button type="submit">افزودن به سبد</button>
              </form>
            </details>
            {itemError && <p className="sale-error" role="alert">{itemError}</p>}

            <div className="sale-cart">
              <h3>اقلام سبد <span>{number.format(rows.length)}</span></h3>
              {rows.length ? <ul>
                {rows.map(row => {
                  const productName = products.find(product => product.id === row.productId)?.name;
                  return <li key={row.productId}>
                    <strong>{productName}</strong>
                    <div className="sale-fields">
                      <label>تعداد<input inputMode="decimal" aria-label={`تعداد ${productName}`} value={row.quantity} onChange={event => changeRow(row.productId, "quantity", event.target.value)} /></label>
                      <label>قیمت واحد (تومان)<MoneyInput aria-label={`قیمت واحد ${productName}`} value={row.unitPrice} onChange={value => changeRow(row.productId, "unitPrice", value)} /></label>
                    </div>
                    <button type="button" className="sale-remove" aria-label={`حذف ${productName}`}
                      onClick={() => { setRows(current => current.filter(item => item.productId !== row.productId)); setItemError(""); setCheckoutError(""); }}>حذف</button>
                  </li>;
                })}
              </ul> : <p className="sale-empty">سبد خالی است. اولین کالا را از بخش ورود دستی اضافه کنید.</p>}
              {cartError && <p className="sale-error" role="alert">{cartError}</p>}
            </div>
          </section>

          <section className="sale-panel" id="sale-payment">
            <h2>تسویه و دریافت</h2>
            <p>مشخص کنید چه مقدار از مبلغ فروش را همین حالا دریافت می‌کنید.</p>
            <fieldset className="sale-options">
              <legend>روش تسویه</legend>
              {(Object.keys(settlementLabels) as Settlement[]).map(value => <label key={value}>
                <input type="radio" name="settlement" checked={mode === value} onChange={() => setMode(value)} />
                {settlementLabels[value]}
              </label>)}
            </fieldset>
            <div className="sale-fields">
              {mode !== "CREDIT" && <label>محل دریافت وجه
                <select value={account} onChange={event => setAccount(event.target.value)}>
                  <option value="">صندوق یا حساب بانکی را انتخاب کنید</option>
                  <option>صندوق</option><option>حساب بانکی</option>
                </select>
              </label>}
              {mode === "PARTIAL" && <label>مبلغ دریافتی (تومان)<MoneyInput value={received} onChange={setReceived} /></label>}
            </div>
            {mode !== "FULL" && <p className="sale-hint">مانده به حساب مشتری می‌ماند. در بخش مشخصات فروش، «مشتری مشخص» را انتخاب کنید.</p>}
          </section>
        </div>

        <aside className="sale-summary" aria-labelledby="sale-summary-title">
          <form onSubmit={checkout}>
            <h2 id="sale-summary-title">خلاصه فروش</h2>
            <p>{number.format(rows.length)} قلم در سبد · مبالغ به تومان</p>
            <dl>
              <div><dt>جمع فروش</dt><dd>{money(total)}</dd></div>
              <div><dt>دریافت اکنون</dt><dd>{money(paid)}</dd></div>
              <div><dt>مانده مشتری</dt><dd>{money(remaining)}</dd></div>
            </dl>
            <button type="submit" className="sale-primary" disabled={!rows.length}>نمایش رسید تمرینی</button>
            {checkoutError && <p className="sale-error" role="alert">{checkoutError}</p>}
            <small>رسید فقط در همین صفحه نمایش داده می‌شود.</small>
          </form>
          {receipt && <div className="sale-receipt" role="status">
            <h3>رسید تمرینی</h3>
            <p>{receipt.customer} · {jalaliText(receipt.date)}</p>
            <p>انبار: {receipt.warehouse}</p>
            {receipt.account && <p>محل دریافت: {receipt.account}</p>}
            <p>جمع: {money(receipt.total)} تومان</p>
            <p>دریافت: {money(receipt.paid)} · مانده: {money(receipt.total - receipt.paid)} تومان</p>
          </div>}
        </aside>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<SalesPreview />);
