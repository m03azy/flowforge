import { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
interface OrderItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  line_total: number;
}

interface ShopOrder {
  id: number;
  customer_id: number | null;
  customer_email: string | null;
  customer_name: string | null;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  notes: string | null;
  delivery_address: string | null;
  delivery_method: string | null;
  payment_method: string | null;
  payment_status: string;
  payment_reference: string | null;
  placed_at: string;
  updated_at: string;
}

interface ShopProduct {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  image_url: string | null;
  is_available: string;
}

interface AdminStats {
  total_orders: number;
  pending_orders: number;
  orders_today: number;
  revenue_total: number;
  revenue_today: number;
  total_customers: number;
  total_products: number;
  status_breakdown: Record<string, number>;
}

// ─────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  pending:    { color: "#f59e0b", bg: "#f59e0b18", label: "Pending",    icon: "⏳" },
  confirmed:  { color: "#3b82f6", bg: "#3b82f618", label: "Confirmed",  icon: "✅" },
  processing: { color: "#8b5cf6", bg: "#8b5cf618", label: "Processing", icon: "⚙️" },
  shipped:    { color: "#06b6d4", bg: "#06b6d418", label: "Shipped",    icon: "🚚" },
  delivered:  { color: "#22c55e", bg: "#22c55e18", label: "Delivered",  icon: "📦" },
  cancelled:  { color: "#ef4444", bg: "#ef444418", label: "Cancelled",  icon: "❌" },
  refunded:   { color: "#94a3b8", bg: "#94a3b818", label: "Refunded",   icon: "↩️" },
};

const PAY_META: Record<string, { color: string; label: string }> = {
  unpaid:   { color: "#ef4444", label: "Unpaid" },
  paid:     { color: "#22c55e", label: "Paid" },
  refunded: { color: "#94a3b8", label: "Refunded" },
};

const API = (window as any).__API_BASE__ ?? "http://localhost:8000";

function fmt(ts: string) {
  return new Date(ts).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────
export default function OrdersDashboard({ token, userRole: _userRole }: { token: string; userRole: string }) {
  const [view, setView] = useState<"orders" | "products" | "api-guide">("orders");

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>🛒 Shop Integration</h1>
          <p style={S.subtitle}>Orders, Products, and API documentation for your connected shopping app</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {(["orders", "products", "api-guide"] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              ...S.tabBtn,
              background: view === v ? "#3b82f6" : "rgba(255,255,255,0.05)",
              color: view === v ? "#fff" : "#94a3b8",
              borderColor: view === v ? "#3b82f6" : "rgba(255,255,255,0.1)",
            }}>
              {v === "orders" ? "📋 Orders" : v === "products" ? "🏷️ Products" : "🔌 API Guide"}
            </button>
          ))}
        </div>
      </div>

      {view === "orders" && <OrdersView token={token} />}
      {view === "products" && <ProductsView token={token} />}
      {view === "api-guide" && <ApiGuide />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Orders View
// ─────────────────────────────────────────────────────────────────
function OrdersView({ token }: { token: string }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<ShopOrder | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [payStatus, setPayStatus] = useState("");
  const [payRef, setPayRef] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statsRes, ordersRes] = await Promise.all([
        fetch(`${API}/api/shop/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/shop/admin/orders${filterStatus ? `?status=${filterStatus}` : ""}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
      else throw new Error("Failed to load orders");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [token, filterStatus]);

  useEffect(() => { load(); }, [load]);

  async function handleUpdateStatus() {
    if (!selected || !newStatus) return;
    setUpdating(true);
    setUpdateMsg("");
    try {
      const res = await fetch(`${API}/api/shop/admin/orders/${selected.id}/status`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, payment_status: payStatus || undefined, payment_reference: payRef || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      setUpdateMsg("✅ Status updated!");
      setSelected(null);
      load();
    } catch (e: any) { setUpdateMsg(`❌ ${e.message}`); }
    finally { setUpdating(false); }
  }

  return (
    <>
      {/* Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total Orders", value: stats.total_orders, icon: "📋", color: "#3b82f6" },
            { label: "Pending", value: stats.pending_orders, icon: "⏳", color: "#f59e0b" },
            { label: "Today's Orders", value: stats.orders_today, icon: "📅", color: "#8b5cf6" },
            { label: "Revenue Total", value: `KES ${stats.revenue_total.toLocaleString()}`, icon: "💰", color: "#22c55e" },
            { label: "Revenue Today", value: `KES ${stats.revenue_today.toLocaleString()}`, icon: "📈", color: "#10b981" },
            { label: "Customers", value: stats.total_customers, icon: "👥", color: "#06b6d4" },
            { label: "Products", value: stats.total_products, icon: "🏷️", color: "#a78bfa" },
          ].map(s => (
            <div key={s.label} style={{ ...S.statCard, borderColor: s.color }}>
              <div style={{ fontSize: 24 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <select style={S.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
        <button style={S.refreshBtn} onClick={load}>🔄 Refresh</button>
      </div>

      {error && <div style={S.error}>{error}</div>}

      {/* Orders Table */}
      <div style={S.tableWrap}>
        {loading ? (
          <div style={S.center}><div style={S.spinner} /><p style={{ color: "#64748b", marginTop: 12 }}>Loading orders…</p></div>
        ) : orders.length === 0 ? (
          <div style={S.center}><div style={{ fontSize: 48 }}>🛒</div><p style={{ color: "#64748b", marginTop: 8 }}>No orders found.</p></div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>{["Order", "Customer", "Items", "Total", "Status", "Payment", "Date", ""].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {orders.map((o, idx) => {
                const sm = STATUS_META[o.status] ?? { color: "#94a3b8", bg: "#94a3b818", label: o.status, icon: "?" };
                const pm = PAY_META[o.payment_status] ?? { color: "#94a3b8", label: o.payment_status };
                return (
                  <tr key={o.id} style={{ ...S.tr, background: idx % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent" }}>
                    <td style={{ ...S.td, fontWeight: 700, color: "#e2e8f0" }}>#{o.id}</td>
                    <td style={S.td}>
                      <div style={{ fontSize: 13, color: "#e2e8f0" }}>{o.customer_name ?? "—"}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{o.customer_email ?? ""}</div>
                    </td>
                    <td style={{ ...S.td, color: "#94a3b8", fontSize: 13 }}>{o.items.length} item(s)</td>
                    <td style={{ ...S.td, fontWeight: 700, color: "#22c55e" }}>
                      KES {Number(o.total).toLocaleString()}
                    </td>
                    <td style={S.td}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: sm.bg, color: sm.color, border: `1px solid ${sm.color}40` }}>
                        {sm.icon} {sm.label}
                      </span>
                    </td>
                    <td style={S.td}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: pm.color }}>{pm.label}</span>
                    </td>
                    <td style={{ ...S.td, fontSize: 12, color: "#64748b" }}>{fmt(o.placed_at)}</td>
                    <td style={S.td}>
                      <button style={S.viewBtn} onClick={() => { setSelected(o); setNewStatus(o.status); setPayStatus(o.payment_status); setPayRef(o.payment_reference ?? ""); setUpdateMsg(""); }}>
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Order Detail Modal */}
      {selected && (
        <div style={S.overlay} onClick={() => setSelected(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHdr}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: "#e2e8f0" }}>Order #{selected.id}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{fmt(selected.placed_at)}</div>
              </div>
              <button style={S.closeBtn} onClick={() => setSelected(null)}>✕</button>
            </div>

            <div style={{ padding: "0 24px 24px" }}>
              {/* Customer */}
              <div style={S.section}>
                <div style={S.sectionTitle}>👤 Customer</div>
                <div style={S.infoRow}><span>Name</span><span>{selected.customer_name ?? "—"}</span></div>
                <div style={S.infoRow}><span>Email</span><span>{selected.customer_email ?? "—"}</span></div>
                {selected.delivery_address && (
                  <div style={S.infoRow}><span>Address</span><span>{selected.delivery_address}</span></div>
                )}
                {selected.delivery_method && (
                  <div style={S.infoRow}><span>Method</span><span>{selected.delivery_method}</span></div>
                )}
              </div>

              {/* Items */}
              <div style={S.section}>
                <div style={S.sectionTitle}>🧾 Items</div>
                {selected.items.map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
                    <span style={{ color: "#e2e8f0" }}>{item.name} <span style={{ color: "#64748b" }}>×{item.quantity}</span></span>
                    <span style={{ color: "#22c55e", fontWeight: 600 }}>KES {Number(item.line_total).toLocaleString()}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontWeight: 800, fontSize: 15 }}>
                  <span style={{ color: "#94a3b8" }}>Total</span>
                  <span style={{ color: "#22c55e" }}>KES {Number(selected.total).toLocaleString()}</span>
                </div>
              </div>

              {/* Update Status */}
              <div style={S.section}>
                <div style={S.sectionTitle}>🔄 Update Order</div>
                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <label style={S.label}>Order Status</label>
                    <select style={S.select} value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                      {Object.entries(STATUS_META).map(([k, v]) => (
                        <option key={k} value={k}>{v.icon} {v.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>Payment Status</label>
                    <select style={S.select} value={payStatus} onChange={e => setPayStatus(e.target.value)}>
                      <option value="unpaid">Unpaid</option>
                      <option value="paid">Paid</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>Payment Reference (M-Pesa / Receipt #)</label>
                    <input style={S.input} value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="e.g. QH2XY123AB" />
                  </div>
                  {updateMsg && <div style={{ fontSize: 13, color: updateMsg.startsWith("✅") ? "#22c55e" : "#ef4444" }}>{updateMsg}</div>}
                  <button style={{ ...S.updateBtn, opacity: updating ? 0.6 : 1 }} onClick={handleUpdateStatus} disabled={updating}>
                    {updating ? "Updating…" : "💾 Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// Products View
// ─────────────────────────────────────────────────────────────────
function ProductsView({ token }: { token: string }) {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<ShopProduct | null>(null);
  const [form, setForm] = useState({ name: "", description: "", category: "", sku: "", price: "", compare_at_price: "", stock_quantity: "0", image_url: "", is_available: "yes" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/shop/admin/products`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setProducts(await res.json());
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditProduct(null);
    setForm({ name: "", description: "", category: "", sku: "", price: "", compare_at_price: "", stock_quantity: "0", image_url: "", is_available: "yes" });
    setMsg("");
    setShowForm(true);
  }

  function openEdit(p: ShopProduct) {
    setEditProduct(p);
    setForm({ name: p.name, description: p.description ?? "", category: p.category ?? "", sku: p.sku ?? "", price: String(p.price), compare_at_price: p.compare_at_price ? String(p.compare_at_price) : "", stock_quantity: String(p.stock_quantity), image_url: p.image_url ?? "", is_available: p.is_available });
    setMsg("");
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    setMsg("");
    try {
      const body = { ...form, price: parseFloat(form.price) || 0, compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : null, stock_quantity: parseInt(form.stock_quantity) || 0 };
      const url = editProduct ? `${API}/api/shop/admin/products/${editProduct.id}` : `${API}/api/shop/admin/products`;
      const res = await fetch(url, {
        method: editProduct ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).detail ?? "Save failed");
      setMsg("✅ Product saved!");
      setShowForm(false);
      load();
    } catch (e: any) { setMsg(`❌ ${e.message}`); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this product?")) return;
    await fetch(`${API}/api/shop/admin/products/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    load();
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button style={S.updateBtn} onClick={openNew}>+ Add Product</button>
      </div>

      {loading ? (
        <div style={S.center}><div style={S.spinner} /></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {products.map(p => (
            <div key={p.id} style={S.productCard}>
              {p.image_url && <img src={p.image_url} alt={p.name} style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 8, marginBottom: 12 }} />}
              <div style={{ fontWeight: 700, fontSize: 15, color: "#e2e8f0", marginBottom: 4 }}>{p.name}</div>
              {p.category && <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{p.category}</div>}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#22c55e", fontWeight: 700 }}>KES {Number(p.price).toLocaleString()}</span>
                <span style={{ fontSize: 12, color: p.is_available === "yes" ? "#22c55e" : "#ef4444" }}>
                  {p.is_available === "yes" ? "● Available" : "● Unavailable"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>Stock: {p.stock_quantity}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...S.viewBtn, flex: 1 }} onClick={() => openEdit(p)}>Edit</button>
                <button style={{ ...S.viewBtn, flex: 1, color: "#ef4444", borderColor: "#ef444440" }} onClick={() => handleDelete(p.id)}>Delete</button>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div style={{ gridColumn: "1/-1", ...S.center }}>
              <div style={{ fontSize: 48 }}>🏷️</div>
              <p style={{ color: "#64748b", marginTop: 8 }}>No products yet. Add your first product!</p>
            </div>
          )}
        </div>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <div style={S.overlay} onClick={() => setShowForm(false)}>
          <div style={{ ...S.modal, maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div style={S.modalHdr}>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#e2e8f0" }}>{editProduct ? "Edit Product" : "New Product"}</div>
              <button style={S.closeBtn} onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div style={{ padding: 24, display: "grid", gap: 12 }}>
              {[
                { key: "name", label: "Product Name *", type: "text", placeholder: "e.g. Blue T-Shirt" },
                { key: "category", label: "Category", type: "text", placeholder: "e.g. Clothing" },
                { key: "sku", label: "SKU / Barcode", type: "text", placeholder: "e.g. SHIRT-BLU-M" },
                { key: "price", label: "Price (KES) *", type: "number", placeholder: "0" },
                { key: "compare_at_price", label: "Original Price (crossed out)", type: "number", placeholder: "0" },
                { key: "stock_quantity", label: "Stock Quantity", type: "number", placeholder: "0" },
                { key: "image_url", label: "Image URL", type: "text", placeholder: "https://..." },
              ].map(f => (
                <div key={f.key}>
                  <label style={S.label}>{f.label}</label>
                  <input style={S.input} type={f.type} placeholder={f.placeholder}
                    value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label style={S.label}>Description</label>
                <textarea style={{ ...S.input, minHeight: 80, resize: "vertical" as const }}
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>Availability</label>
                <select style={S.select} value={form.is_available} onChange={e => setForm(p => ({ ...p, is_available: e.target.value }))}>
                  <option value="yes">✅ Available</option>
                  <option value="no">❌ Not Available</option>
                  <option value="hidden">🙈 Hidden</option>
                </select>
              </div>
              {msg && <div style={{ fontSize: 13, color: msg.startsWith("✅") ? "#22c55e" : "#ef4444" }}>{msg}</div>}
              <button style={{ ...S.updateBtn, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : editProduct ? "💾 Update Product" : "✨ Create Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// API Guide View
// ─────────────────────────────────────────────────────────────────
function ApiGuide() {
  const host = "http://YOUR_SERVER_IP:8000";

  const CodeBlock = ({ code }: { code: string }) => (
    <pre style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 18px", fontSize: 12, color: "#a5f3fc", overflowX: "auto" as const, margin: "8px 0 20px", lineHeight: 1.6 }}>
      {code}
    </pre>
  );

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 12, padding: 20, marginBottom: 28 }}>
        <div style={{ fontWeight: 700, color: "#60a5fa", marginBottom: 6 }}>🔌 How to Connect Your Shopping App</div>
        <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
          Your shopping app communicates with FlowForge via standard REST API calls using HTTPS + JWT Bearer tokens.
          The admin creates user accounts in FlowForge → users log in from your app → app accesses all endpoints using the token received.
        </p>
      </div>

      <div style={S.guideSection}>
        <div style={S.guideTitle}>STEP 1 — Admin Creates a User in FlowForge</div>
        <p style={S.guideText}>Go to <strong style={{ color: "#60a5fa" }}>Employee Directory → Create User</strong> and set role to <code style={{ color: "#a5f3fc" }}>customer</code>. Copy the email and password to give to the user.</p>
      </div>

      <div style={S.guideSection}>
        <div style={S.guideTitle}>STEP 2 — User Logs In From Your App</div>
        <CodeBlock code={`POST ${host}/api/auth/login
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "their-password"
}

// Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}

// Store the access_token — attach it to every request`} />
      </div>

      <div style={S.guideSection}>
        <div style={S.guideTitle}>STEP 3 — Browse Products</div>
        <CodeBlock code={`GET ${host}/api/shop/products
Authorization: Bearer <access_token>

// Optional query params:
// ?category=Clothing&search=blue&page=1&page_size=20

// Response: array of products
[
  {
    "id": 1,
    "name": "Blue T-Shirt",
    "price": 1500.00,
    "category": "Clothing",
    "stock_quantity": 50,
    "image_url": "https://...",
    "is_available": "yes"
  }
]`} />
      </div>

      <div style={S.guideSection}>
        <div style={S.guideTitle}>STEP 4 — Add to Cart</div>
        <CodeBlock code={`POST ${host}/api/shop/cart
Authorization: Bearer <access_token>
Content-Type: application/json

{ "product_id": 1, "quantity": 2 }

// → { "message": "Added 2x 'Blue T-Shirt' to cart" }`} />
      </div>

      <div style={S.guideSection}>
        <div style={S.guideTitle}>STEP 5 — Place an Order</div>
        <CodeBlock code={`POST ${host}/api/shop/orders
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "cart_checkout": true,
  "delivery_method": "delivery",
  "delivery_address": "123 Main St, Nairobi",
  "payment_method": "mpesa",
  "notes": "Please call before delivery"
}

// Response: full order object with id, items, total, status`} />
      </div>

      <div style={S.guideSection}>
        <div style={S.guideTitle}>STEP 6 — Track My Orders</div>
        <CodeBlock code={`GET ${host}/api/shop/orders/mine
Authorization: Bearer <access_token>

// Returns order history with current status:
// pending → confirmed → shipped → delivered`} />
      </div>

      <div style={S.guideSection}>
        <div style={S.guideTitle}>TOKEN REFRESH (Auto re-login)</div>
        <CodeBlock code={`POST ${host}/api/auth/refresh
Content-Type: application/json

{ "refresh_token": "<stored_refresh_token>" }

// → new access_token + refresh_token pair`} />
      </div>

      <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 12, padding: 20, marginTop: 16 }}>
        <div style={{ fontWeight: 700, color: "#4ade80", marginBottom: 8 }}>📖 Full API Docs</div>
        <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
          Access the interactive Swagger UI at: <a href={`${host}/docs`} target="_blank" rel="noreferrer" style={{ color: "#60a5fa" }}>{host}/docs</a>
          <br />All shopping endpoints are under the <strong style={{ color: "#a5f3fc" }}>Shopping App</strong> tag.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  page: { padding: "28px 32px", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#e2e8f0" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 },
  title: { fontSize: 28, fontWeight: 800, margin: 0, background: "linear-gradient(135deg, #34d399, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  subtitle: { color: "#64748b", margin: "4px 0 0", fontSize: 14 },
  tabBtn: { padding: "8px 16px", borderRadius: 10, border: "1px solid", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.2s" },
  statCard: { background: "rgba(255,255,255,0.03)", borderRadius: 14, border: "1px solid", padding: "18px 16px", textAlign: "center" as const },
  tableWrap: { background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" },
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { padding: "11px 14px", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "#64748b", textAlign: "left" as const, borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)" },
  tr: { borderBottom: "1px solid rgba(255,255,255,0.04)" },
  td: { padding: "12px 14px", verticalAlign: "middle" as const },
  viewBtn: { padding: "5px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#94a3b8", cursor: "pointer", fontSize: 12, fontWeight: 600 },
  select: { width: "100%", padding: "9px 12px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", fontSize: 13, outline: "none" },
  refreshBtn: { padding: "9px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#94a3b8", cursor: "pointer", fontSize: 13, fontWeight: 600 },
  error: { background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontSize: 14 },
  center: { padding: 60, textAlign: "center" as const, display: "flex", flexDirection: "column" as const, alignItems: "center" },
  spinner: { width: 36, height: 36, border: "3px solid rgba(255,255,255,0.1)", borderTop: "3px solid #3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)", overflowY: "auto" as const, padding: 24 },
  modal: { background: "#1e293b", borderRadius: 18, width: "90%", maxWidth: 580, border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", maxHeight: "90vh", overflowY: "auto" as const },
  modalHdr: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", position: "sticky" as const, top: 0 },
  closeBtn: { background: "rgba(255,255,255,0.07)", border: "none", color: "#94a3b8", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 12, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#64748b", marginBottom: 10 },
  infoRow: { display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13, color: "#94a3b8" },
  label: { fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 },
  input: { width: "100%", padding: "9px 12px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" as const },
  updateBtn: { padding: "10px 20px", borderRadius: 10, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", border: "none", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14, width: "100%" },
  productCard: { background: "rgba(255,255,255,0.03)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.07)", padding: 16 },
  guideSection: { marginBottom: 20 },
  guideTitle: { fontSize: 13, fontWeight: 700, color: "#60a5fa", marginBottom: 6, letterSpacing: "0.04em" },
  guideText: { color: "#94a3b8", fontSize: 14, lineHeight: 1.7, marginBottom: 8 },
};
