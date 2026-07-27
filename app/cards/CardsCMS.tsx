"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Category = { id: number; name: string; slug: string; accent: string; item_count: number };
type Card = { id: number; title: string; category_id: number; category_name: string; card_code: string; image_key: string | null; image_url: string | null; back_image_key: string | null; back_image_url: string | null; price_cents: number; stock: number; condition: string; status: string };
type User = { id: number; name: string; email: string; role: string; status: string };
type CMSData = { currentUser: User; categories: Category[]; cards: Card[]; users: User[] };

const emptyCard = { title: "", categoryId: "", cardCode: "", imageKey: "", backImageKey: "", price: "", stock: "1", condition: "Near mint", status: "active" };

export function CardsCMS({ signedInAs }: { signedInAs: string }) {
  const [data, setData] = useState<CMSData | null>(null);
  const [tab, setTab] = useState<"cards" | "categories" | "users">("cards");
  const [modal, setModal] = useState<"card" | "category" | "user" | null>(null);
  const [editing, setEditing] = useState<Card | Category | User | null>(null);
  const [cardForm, setCardForm] = useState(emptyCard);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [backImageFile, setBackImageFile] = useState<File | null>(null);
  const [backImagePreview, setBackImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/cms");
    const result = await response.json() as CMSData & { error?: string };
    if (!response.ok) { setMessage(result.error ?? "Unable to load CMS"); return; }
    setData(result);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function mutate(payload: Record<string, unknown>) {
    setMessage("");
    const response = await fetch("/api/cms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setMessage(result.error ?? "Unable to save"); return false; }
    setModal(null); setEditing(null); await load(); return true;
  }

  function openCard(card?: Card) {
    setEditing(card ?? null);
    setCardForm(card ? { title: card.title, categoryId: String(card.category_id), cardCode: card.card_code, imageKey: card.image_key ?? "", backImageKey: card.back_image_key ?? "", price: String(card.price_cents / 100), stock: String(card.stock), condition: card.condition, status: card.status } : { ...emptyCard, categoryId: String(data?.categories[0]?.id ?? "") });
    setImageFile(null);
    setBackImageFile(null);
    setImagePreview(card?.image_url ?? "");
    setBackImagePreview(card?.back_image_url ?? "");
    setModal("card");
  }

  async function submitCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    let imageKey = cardForm.imageKey;
    let backImageKey = cardForm.backImageKey;
    if (imageFile) {
      const upload = new FormData();
      upload.append("image", imageFile);
      const response = await fetch("/api/cms/upload", { method: "POST", body: upload });
      const result = await response.json() as { key?: string; error?: string };
      if (!response.ok || !result.key) { setMessage(result.error ?? "Image upload failed"); setUploading(false); return; }
      imageKey = result.key;
    }
    if (backImageFile) {
      const upload = new FormData();
      upload.append("image", backImageFile);
      const response = await fetch("/api/cms/upload", { method: "POST", body: upload });
      const result = await response.json() as { key?: string; error?: string };
      if (!response.ok || !result.key) { setMessage(result.error ?? "Back image upload failed"); setUploading(false); return; }
      backImageKey = result.key;
    }
    await mutate({ action: editing ? "update_card" : "create_card", id: editing && "id" in editing ? editing.id : undefined, ...cardForm, imageKey, backImageKey });
    setUploading(false);
  }

  function chooseImage(file?: File) {
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  function chooseBackImage(file?: File) {
    if (!file) return;
    setBackImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setBackImagePreview(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  if (!data) return <main className="cms-loading"><div className="brand-mark"><span>TG</span></div><p>{message || "Loading TGMAX CMS…"}</p></main>;
  const totalStock = data.cards.reduce((sum, card) => sum + card.stock, 0);
  const value = data.cards.reduce((sum, card) => sum + card.price_cents * card.stock, 0) / 100;

  return <main className="cms-shell">
    <aside className="cms-sidebar">
      <Link className="cms-logo" href="/"><span className="brand-mark"><span>TG</span></span><b>TGMAX</b></Link>
      <div className="cms-nav-label">Workspace</div>
      <nav>
        <button className={tab === "cards" ? "active" : ""} onClick={() => setTab("cards")}><span>▱</span> Inventory <b>{data.cards.length}</b></button>
        <button className={tab === "categories" ? "active" : ""} onClick={() => setTab("categories")}><span>⌗</span> Categories <b>{data.categories.length}</b></button>
        <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}><span>◎</span> Users <b>{data.users.length}</b></button>
      </nav>
      <div className="cms-profile"><span>{signedInAs.slice(0, 1).toUpperCase()}</span><div><b>{signedInAs}</b><small>{data.currentUser.role}</small></div></div>
      <a className="cms-signout" href="/auth/signout">Sign out</a>
    </aside>
    <section className="cms-main">
      <header className="cms-header"><div><span className="kicker">TGMAX control room</span><h1>{tab === "cards" ? "Card inventory" : tab === "categories" ? "Categories" : "Team users"}</h1></div>
        <button className="cms-add" onClick={() => { setEditing(null); setModal(tab === "cards" ? "card" : tab === "categories" ? "category" : "user"); if (tab === "cards") openCard(); }}>+ Add {tab === "cards" ? "card" : tab === "categories" ? "category" : "user"}</button>
      </header>
      {message && <div className="cms-alert">{message}<button onClick={() => setMessage("")}>×</button></div>}
      {tab === "cards" && <>
        <div className="cms-stats"><article><small>Total cards</small><b>{data.cards.length}</b><span>Unique listings</span></article><article><small>Units in stock</small><b>{totalStock}</b><span>Across all categories</span></article><article><small>Inventory value</small><b>${value.toFixed(0)}</b><span>At listed prices</span></article></div>
        <div className="cms-table-wrap"><table><thead><tr><th>Card</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th /></tr></thead><tbody>
          {data.cards.map(card => <tr key={card.id}><td><div className="cms-card-cell">{card.image_url ? <img src={card.image_url} alt="" /> : <span className="cms-card-placeholder">TG</span>}<span><b>{card.title}</b><small>{card.card_code || "No card code"} · {card.condition}</small></span></div></td><td>{card.category_name}</td><td>${(card.price_cents / 100).toFixed(2)}</td><td><span className={card.stock < 2 ? "stock-low" : ""}>{card.stock}</span></td><td><span className={`cms-status ${card.status}`}>{card.status}</span></td><td><button className="row-action" onClick={() => openCard(card)}>Edit</button><button className="row-delete" onClick={() => void mutate({ action: "delete_card", id: card.id })}>×</button></td></tr>)}
          {!data.cards.length && <tr><td colSpan={6} className="cms-empty">No cards yet. Add your first card to begin.</td></tr>}
        </tbody></table></div>
      </>}
      {tab === "categories" && <div className="category-admin-grid">{data.categories.map(category => <article key={category.id}><span className="cat-swatch" style={{ background: category.accent }} /><small>{category.slug}</small><h2>{category.name}</h2><p>{category.item_count} cards</p><div><button onClick={() => { setEditing(category); setModal("category"); }}>Edit</button><button disabled={category.item_count > 0} onClick={() => void mutate({ action: "delete_category", id: category.id })}>Delete</button></div></article>)}{!data.categories.length && <p className="cms-empty">Add a category before creating cards.</p>}</div>}
      {tab === "users" && <div className="user-list">{data.users.map(user => <article key={user.id}><span className="user-avatar">{user.name.slice(0, 1).toUpperCase()}</span><div><b>{user.name}</b><small>{user.email}</small></div><span className="user-role">{user.role}</span><span className={`cms-status ${user.status}`}>{user.status}</span><button onClick={() => { setEditing(user); setModal("user"); }}>Manage</button></article>)}</div>}
    </section>

    {modal && <div className="cms-modal-backdrop" onClick={() => { setModal(null); setEditing(null); }}><div className="cms-modal" onClick={event => event.stopPropagation()}>
      <button className="cms-modal-close" onClick={() => { setModal(null); setEditing(null); }}>×</button>
      <span className="kicker">{editing ? "Update record" : "Create new"}</span><h2>{modal === "card" ? `${editing ? "Edit" : "Add"} card` : modal === "category" ? `${editing ? "Edit" : "Add"} category` : `${editing ? "Manage" : "Add"} user`}</h2>
      {modal === "card" && <form onSubmit={submitCard}>
        <div className="image-fields">
        <label>Front photo <span className="field-hint">Required for clean display</span>
          <div className="image-upload">
            {imagePreview ? <img src={imagePreview} alt="Card front preview" /> : <div className="image-upload-empty"><b>+</b><span>Add front photo</span></div>}
            <div><label className="upload-button">Choose front<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={e => chooseImage(e.target.files?.[0])} /></label>
              {imagePreview && <button type="button" className="remove-image" onClick={() => { setImageFile(null); setImagePreview(""); setCardForm({ ...cardForm, imageKey: "" }); }}>Remove</button>}</div>
          </div>
        </label>
        <label>Back photo <span className="field-hint">Optional · enables flip</span>
          <div className="image-upload">
            {backImagePreview ? <img src={backImagePreview} alt="Card back preview" /> : <div className="image-upload-empty"><b>↻</b><span>Add back photo</span></div>}
            <div><label className="upload-button">Choose back<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={e => chooseBackImage(e.target.files?.[0])} /></label>
              {backImagePreview && <button type="button" className="remove-image" onClick={() => { setBackImageFile(null); setBackImagePreview(""); setCardForm({ ...cardForm, backImageKey: "" }); }}>Remove</button>}</div>
          </div>
        </label>
        </div>
        <label>Card title<input required value={cardForm.title} onChange={e => setCardForm({ ...cardForm, title: e.target.value })} placeholder="e.g. Charizard ex" /></label>
        <div className="form-split"><label>Category<select required value={cardForm.categoryId} onChange={e => setCardForm({ ...cardForm, categoryId: e.target.value })}><option value="">Choose…</option>{data.categories.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label>Card code<input value={cardForm.cardCode} onChange={e => setCardForm({ ...cardForm, cardCode: e.target.value })} placeholder="125/197" /></label></div>
        <div className="form-split"><label>Price ($)<input required type="number" min="0" step=".01" value={cardForm.price} onChange={e => setCardForm({ ...cardForm, price: e.target.value })} /></label><label>Stock<input required type="number" min="0" value={cardForm.stock} onChange={e => setCardForm({ ...cardForm, stock: e.target.value })} /></label></div>
        <div className="form-split"><label>Condition<select value={cardForm.condition} onChange={e => setCardForm({ ...cardForm, condition: e.target.value })}><option>Mint</option><option>Near mint</option><option>Excellent</option><option>Good</option><option>Played</option></select></label><label>Status<select value={cardForm.status} onChange={e => setCardForm({ ...cardForm, status: e.target.value })}><option value="active">Active</option><option value="draft">Draft</option><option value="sold">Sold</option></select></label></div>
        <button type="submit" className="cms-submit" disabled={uploading}>{uploading ? "Uploading photo…" : editing ? "Save changes →" : "Add to inventory →"}</button>
      </form>}
      {modal === "category" && <CategoryForm category={editing as Category | null} onSubmit={mutate} />}
      {modal === "user" && <UserForm user={editing as User | null} onSubmit={mutate} />}
    </div></div>}
  </main>;
}

function CategoryForm({ category, onSubmit }: { category: Category | null; onSubmit: (data: Record<string, unknown>) => Promise<boolean> }) {
  const [name, setName] = useState(category?.name ?? ""); const [accent, setAccent] = useState(category?.accent ?? "#d8ff3e");
  return <form onSubmit={e => { e.preventDefault(); void onSubmit({ action: category ? "update_category" : "create_category", id: category?.id, name, accent }); }}>
    <label>Category name<input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Basketball" /></label>
    <label>Accent color<div className="color-field"><input type="color" value={accent} onChange={e => setAccent(e.target.value)} /><input value={accent} onChange={e => setAccent(e.target.value)} /></div></label>
    <button type="submit" className="cms-submit">{category ? "Save changes" : "Add category"} →</button>
  </form>;
}

function UserForm({ user, onSubmit }: { user: User | null; onSubmit: (data: Record<string, unknown>) => Promise<boolean> }) {
  const [name, setName] = useState(user?.name ?? ""); const [email, setEmail] = useState(user?.email ?? ""); const [role, setRole] = useState(user?.role ?? "editor"); const [status, setStatus] = useState(user?.status ?? "active");
  return <form onSubmit={e => { e.preventDefault(); void onSubmit({ action: user ? "update_user" : "create_user", id: user?.id, name, email, role, status }); }}>
    <label>Name<input required value={name} onChange={e => setName(e.target.value)} placeholder="Team member name" /></label>
    <label>Email<input required type="email" disabled={!!user} value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" /></label>
    <div className="form-split"><label>Role<select value={role} onChange={e => setRole(e.target.value)}><option value="editor">Editor</option><option value="admin">Admin</option><option value="owner">Owner</option></select></label><label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option value="active">Active</option><option value="disabled">Disabled</option></select></label></div>
    <button type="submit" className="cms-submit">{user ? "Save user" : "Add user"} →</button>
  </form>;
}
