(() => {
  const store = { id: "demo-store", name: "فروشگاه نمونه", baseCurrency: "IRR", currencyScale: 0, moneyUnit: "TOMAN" };
  const prefix = "/v2/businesses/" + store.id;
  const page = items => ({ items, total: items.length, page: 1, limit: 20, totalPages: 1 });
  const product = (code, name, salePrice) => ({
    id: code, code, barcode: code, name, salePrice, kind: "GOODS", isActive: true,
    unit: { id: "each", name: "عدد", code: "EA" }, category: null
  });
  const endpoints = {
    "/v2/auth/refresh": { accessToken: "demo" },
    "/v2/me": { id: "demo-user", displayName: "کاربر نمونه", email: null },
    "/v2/businesses": [store],
    [prefix + "/access/effective-permissions"]: { businessId: store.id, permissions: [
      "dashboard.read", "sales.read", "sales.manage", "sales.post",
      "payments.manage", "payments.post", "accounts.read"
    ] },
    [prefix + "/dashboard"]: null,
    [prefix + "/sales"]: page([]),
    [prefix + "/parties"]: page([
      { id: "cash", name: "مشتری نقدی", customerEnabled: true, supplierEnabled: false, isCashCustomer: true, isActive: true, externalCode: null }
    ]),
    [prefix + "/catalog/products"]: page([
      product("1001", "چای ایرانی", "1800000"),
      product("1002", "بیسکویت", "450000"),
      product("1003", "قهوه", "2700000")
    ]),
    [prefix + "/inventory/warehouses"]: [{ id: "warehouse", code: "MAIN", name: "انبار اصلی", isActive: true, isDefault: true }],
    [prefix + "/accounting/periods"]: [{ id: "period", name: "دورهٔ نمونه", startDate: "2020-01-01", endDate: "2099-12-31", status: "OPEN" }],
    [prefix + "/accounting/accounts"]: [{ id: "cashbox", code: "SYS-CASH", name: "صندوق فروشگاه", type: "ASSET", normalSide: "DEBIT", isPosting: true, isCashBank: true, isActive: true, parentId: null }]
  };
  const fetchResource = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const requestUrl = new URL(typeof input === "string" || input instanceof URL ? input : input.url, location.href);
    if (!requestUrl.pathname.startsWith("/v2/")) return fetchResource(input, init);
    const method = init?.method ?? input?.method ?? "GET";
    const available = (method === "GET" || requestUrl.pathname === "/v2/auth/refresh") &&
      Object.hasOwn(endpoints, requestUrl.pathname);
    const data = available ? endpoints[requestUrl.pathname] : { code: "DEMO_ONLY", message: "در پیش‌نمایش، اطلاعات ثبت نمی‌شود." };
    return Promise.resolve(new Response(JSON.stringify(data), {
      status: available ? 200 : 422,
      headers: { "Content-Type": "application/json" }
    }));
  };
  document.addEventListener("DOMContentLoaded", () => {
    const note = document.createElement("div");
    note.textContent = "پیش‌نمایش ثبت فروش · داده‌های نمونه · بدون ثبت فاکتور واقعی";
    note.setAttribute("role", "note");
    Object.assign(note.style, { padding: "10px 16px", textAlign: "center", background: "#cceee5", color: "#15353d", fontFamily: "sans-serif" });
    document.body.prepend(note);
  });
})();
