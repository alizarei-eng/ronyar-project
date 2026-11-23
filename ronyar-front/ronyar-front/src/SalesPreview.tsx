import { useState } from "react";
import { createRoot } from "react-dom/client";
import type { Product } from "./api";
import { addQuickProduct, matchingQuickProducts, quickSaleItems, type QuickRow } from "./quickSaleCart";
import "./SalesPreview.css";

const products: Product[] = [
  { id: "tea", code: "101", name: "چای سیاه", barcode: "6260000000010", salePrice: "180000" },
  { id: "coffee", code: "102", name: "قهوه آسیاب‌شده", barcode: "6260000000027", salePrice: "320000" },
  { id: "biscuit", code: "103", name: "بیسکویت کره‌ای", barcode: "6260000000034", salePrice: "65000" },
  { id: "honey", code: "104", name: "عسل", barcode: "6260000000041", salePrice: "245000" },
].map(product => ({
  ...product,
  kind: "GOODS",
  isActive: true,
  unit: { id: "pack", code: "PACK", name: "بسته" },
  category: null,
}));

const customers = ["مشتری گذری", "سارا احمدی (نمونه)", "رضا کریمی (نمونه)"];
const paymentMethods = ["نقدی", "کارت‌خوان"];
const currency = new Intl.NumberFormat("fa-IR");

function money(amount: bigint) {
  return `${currency.format(amount)} تومان`;
}

function cartTotal(rows: QuickRow[]) {
  try {
    return { total: quickSaleItems(rows, products, "demo-warehouse", 0).total, error: "" };
  } catch (error) {
    return { total: null, error: error instanceof Error ? error.message : "سبد را بررسی کنید." };
  }
}

function SalesPreview() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<QuickRow[]>([]);
  const [customer, setCustomer] = useState(customers[0]);
  const [method, setMethod] = useState(paymentMethods[0]);
  const [addError, setAddError] = useState("");
  const [receipt, setReceipt] = useState<{ total: bigint; customer: string; method: string } | null>(null);
  const { total, error } = cartTotal(rows);
  const results = query.trim() ? matchingQuickProducts(products, query) : products;

  function addProduct(product: Product) {
    try {
      setRows(addQuickProduct(rows, product));
      setAddError("");
      setReceipt(null);
    } catch (error) {
      setAddError(error instanceof Error ? error.message : "افزودن کالا ممکن نیست.");
    }
  }

  function changeRow(productId: string, field: "quantity" | "unitPrice", value: string) {
    setRows(current => current.map(row => row.productId === productId ? { ...row, [field]: value } : row));
    setAddError("");
  }

  return (
    <main className="sales-preview">
      <header>
        <h1>پیش‌نمایش ثبت فروش</h1>
        <p>کالاها و مشتریان نمونه‌اند. تسویه فقط در این صفحه شبیه‌سازی می‌شود.</p>
      </header>
      <div className="preview-layout">
        <section aria-labelledby="preview-catalog">
          <h2 id="preview-catalog">کالاها</h2>
          <label className="preview-field">
            جستجوی کالا
            <input type="search" placeholder="نام، کد یا بارکد" value={query} onChange={event => setQuery(event.target.value)} />
          </label>
          {results.length === 0 && <p role="status">کالایی پیدا نشد.</p>}
          <ul className="preview-products">
            {results.map(product => (
              <li key={product.id}>
                <div>
                  <strong>{product.name}</strong>
                  <small>{money(BigInt(product.salePrice))} · <bdi>{product.code}</bdi></small>
                </div>
                <button type="button" aria-label={`افزودن ${product.name}`} onClick={() => addProduct(product)}>افزودن</button>
              </li>
            ))}
          </ul>
          {addError && <p className="preview-error" role="alert">{addError}</p>}
        </section>
        <section aria-labelledby="preview-cart">
          <h2 id="preview-cart">سبد فروش</h2>
          {rows.length === 0 && <p>سبد خالی است.</p>}
          <ul className="preview-cart">
            {rows.map(row => {
              const name = products.find(product => product.id === row.productId)?.name;
              return (
                <li key={row.productId}>
                  <div className="preview-row-heading">
                    <strong>{name}</strong>
                    <button type="button" aria-label={`حذف ${name}`} onClick={() => {
                      setRows(current => current.filter(item => item.productId !== row.productId));
                      setAddError("");
                    }}>حذف</button>
                  </div>
                  <div className="preview-fields">
                    <label className="preview-field">
                      تعداد
                      <input inputMode="decimal" aria-label={`تعداد ${name}`} value={row.quantity} onChange={event => changeRow(row.productId, "quantity", event.target.value)} />
                    </label>
                    <label className="preview-field">
                      قیمت واحد (تومان)
                      <input inputMode="numeric" aria-label={`قیمت واحد ${name}`} value={row.unitPrice} onChange={event => changeRow(row.productId, "unitPrice", event.target.value)} />
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>
          {error && <p className="preview-error" role="alert">{error}</p>}
          <form onSubmit={event => {
            event.preventDefault();
            if (!rows.length || total === null) return;
            setReceipt({ total, customer, method });
            setRows([]);
            setAddError("");
          }}>
            <div className="preview-fields">
              <label className="preview-field">
                مشتری
                <select value={customer} onChange={event => setCustomer(event.target.value)}>
                  {customers.map(name => <option key={name}>{name}</option>)}
                </select>
              </label>
              <label className="preview-field">
                روش پرداخت
                <select value={method} onChange={event => setMethod(event.target.value)}>
                  {paymentMethods.map(name => <option key={name}>{name}</option>)}
                </select>
              </label>
            </div>
            <p className="preview-total">جمع سبد <output>{total === null ? "—" : money(total)}</output></p>
            <button className="preview-checkout" type="submit" disabled={!rows.length || total === null}>تسویه نمایشی</button>
          </form>
          {receipt && <p className="preview-receipt" role="status">
            تسویه نمایشی انجام شد. {receipt.customer} · {receipt.method} · {money(receipt.total)}
          </p>}
        </section>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<SalesPreview />);
