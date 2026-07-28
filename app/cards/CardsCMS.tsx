"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { SmartScanCropper } from "./SmartScanCropper";
import { defaultWhatsAppSettings, WhatsAppSettings } from "../../lib/whatsapp";

type Category = { id: number; name: string; slug: string; accent: string; item_count: number };
type Card = { id: number; title: string; category_id: number; category_name: string; card_code: string; image_key: string | null; image_url: string | null; back_image_key: string | null; back_image_url: string | null; price_cents: number; stock: number; condition: string; status: string };
type User = { id: number; name: string; email: string; username: string | null; role: string; status: string };
type CardOption = { id: number; option_type: "status" | "condition"; label: string; value: string; sort_order: number };
type WantedCard = { id: number; title: string; category_id: number; category_name: string; details: string; priority: string; tone: string; status: string; sort_order: number; image_key: string | null; image_url: string | null };
type CMSData = { currentUser: User; categories: Category[]; cards: Card[]; users: User[]; options: CardOption[]; wantedCards: WantedCard[]; whatsappSettings: WhatsAppSettings | null };

const emptyCard = { title: "", categoryId: "", cardCode: "", imageKey: "", backImageKey: "", price: "", stock: "1", condition: "Near mint", status: "active" };
const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}`;

export function CardsCMS({ signedInAs }: { signedInAs: string }) {
  const [data, setData] = useState<CMSData | null>(null);
  const [tab, setTab] = useState<"cards" | "wanted" | "categories" | "options" | "users" | "whatsapp">("cards");
  const [modal, setModal] = useState<"card" | "wanted" | "category" | "option" | "user" | null>(null);
  const [editing, setEditing] = useState<Card | WantedCard | Category | CardOption | User | null>(null);
  const [cardForm, setCardForm] = useState(emptyCard);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [backImageFile, setBackImageFile] = useState<File | null>(null);
  const [backImagePreview, setBackImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [inventoryCategory, setInventoryCategory] = useState("all");
  const [inventoryCondition, setInventoryCondition] = useState("all");
  const [scanRequest, setScanRequest] = useState<{ file: File; side: "front" | "back" } | null>(null);
  const [whatsappForm, setWhatsappForm] = useState(defaultWhatsAppSettings);

  const load = useCallback(async () => {
    const response = await fetch("/api/cms");
    const result = await response.json() as CMSData & { error?: string };
    if (!response.ok) { setMessage(result.error ?? "Unable to load CMS"); return; }
    setData(result);
    setWhatsappForm({ ...defaultWhatsAppSettings, ...(result.whatsappSettings ?? {}) });
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

  async function chooseSmartImage(file: File | undefined, side: "front" | "back") {
    if (!file) return;
    setScanRequest({ file, side });
  }

  if (!data) return <main className="cms-loading"><div className="brand-mark"><span>TG</span></div><p>{message || "Loading TGMAX CMS…"}</p></main>;
  const totalStock = data.cards.reduce((sum, card) => sum + card.stock, 0);
  const value = data.cards.reduce((sum, card) => sum + card.price_cents * card.stock, 0) / 100;
  const filteredCards = data.cards.filter(card => {
    const needle = inventoryQuery.trim().toLowerCase();
    return (inventoryCategory === "all" || card.category_id === Number(inventoryCategory)) &&
      (inventoryCondition === "all" || card.condition === inventoryCondition) &&
      (!needle || `${card.title} ${card.card_code} ${card.category_name}`.toLowerCase().includes(needle));
  });

  return <main className="cms-shell">
    <aside className="cms-sidebar">
      <Link className="cms-logo" href="/"><span className="brand-mark"><span>TG</span></span><b>TGMAX</b></Link>
      <div className="cms-nav-label">Workspace</div>
      <nav>
        <button className={tab === "cards" ? "active" : ""} onClick={() => setTab("cards")}><span>▱</span> Inventory <b>{data.cards.length}</b></button>
        <button className={tab === "wanted" ? "active" : ""} onClick={() => setTab("wanted")}><span>♡</span> Wanted cards <b>{data.wantedCards.length}</b></button>
        <button className={tab === "categories" ? "active" : ""} onClick={() => setTab("categories")}><span>⌗</span> Categories <b>{data.categories.length}</b></button>
        <button className={tab === "options" ? "active" : ""} onClick={() => setTab("options")}><span>◇</span> Card options <b>{data.options.length}</b></button>
        <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}><span>◎</span> Users <b>{data.users.length}</b></button>
        <button className={tab === "whatsapp" ? "active" : ""} onClick={() => setTab("whatsapp")}><span>◔</span> WhatsApp</button>
      </nav>
      <div className="cms-profile"><span>{signedInAs.slice(0, 1).toUpperCase()}</span><div><b>{signedInAs}</b><small>{data.currentUser.role}</small></div></div>
      <a className="cms-signout" href="/auth/signout">Sign out</a>
    </aside>
    <section className="cms-main">
      <header className="cms-header"><div><span className="kicker">TGMAX control room</span><h1>{tab === "cards" ? "Card inventory" : tab === "wanted" ? "Wanted cards" : tab === "categories" ? "Categories" : tab === "options" ? "Card options" : tab === "users" ? "Team users" : "WhatsApp settings"}</h1></div>
        {tab !== "whatsapp" && <button className="cms-add" onClick={() => { setEditing(null); setModal(tab === "cards" ? "card" : tab === "wanted" ? "wanted" : tab === "categories" ? "category" : tab === "options" ? "option" : "user"); if (tab === "cards") openCard(); }}>+ Add {tab === "cards" ? "card" : tab === "wanted" ? "wanted card" : tab === "categories" ? "category" : tab === "options" ? "option" : "user"}</button>}
      </header>
      {message && <div className="cms-alert">{message}<button onClick={() => setMessage("")}>×</button></div>}
      {tab === "cards" && <>
        <div className="cms-stats"><article><small>Total cards</small><b>{data.cards.length}</b><span>Unique listings</span></article><article><small>Units in stock</small><b>{totalStock}</b><span>Across all categories</span></article><article><small>Inventory value</small><b>${value.toFixed(0)}</b><span>At listed prices</span></article></div>
        <div className="cms-filters">
          <label className="cms-search"><span>⌕</span><input type="search" value={inventoryQuery} onChange={event => setInventoryQuery(event.target.value)} placeholder="Search title, code, or category…" aria-label="Search inventory" /></label>
          <label>Category<select value={inventoryCategory} onChange={event => setInventoryCategory(event.target.value)}><option value="all">All categories</option>{data.categories.map(category => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
          <label>Condition<select value={inventoryCondition} onChange={event => setInventoryCondition(event.target.value)}><option value="all">All conditions</option>{data.options.filter(option => option.option_type === "condition").map(option => <option value={option.value} key={option.id}>{option.label}</option>)}</select></label>
          {(inventoryQuery || inventoryCategory !== "all" || inventoryCondition !== "all") && <button onClick={() => { setInventoryQuery(""); setInventoryCategory("all"); setInventoryCondition("all"); }}>Clear</button>}
        </div>
        <div className="cms-table-wrap"><table><thead><tr><th>Card</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th /></tr></thead><tbody>
          {filteredCards.map(card => <tr key={card.id}><td><div className="cms-card-cell">{card.image_url ? <img src={card.image_url} alt="" /> : <span className="cms-card-placeholder">TG</span>}<span><b>{card.title}</b><small>{card.card_code || "No card code"} · {card.condition}</small></span></div></td><td>{card.category_name}</td><td>{formatPrice(card.price_cents)}</td><td><span className={card.stock < 2 ? "stock-low" : ""}>{card.stock}</span></td><td><span className={`cms-status ${card.status}`}>{card.status}</span></td><td><button className="row-action" onClick={() => openCard(card)}>Edit</button><button className="row-delete" onClick={() => void mutate({ action: "delete_card", id: card.id })}>×</button></td></tr>)}
          {!filteredCards.length && <tr><td colSpan={6} className="cms-empty">{data.cards.length ? "No cards match these filters." : "No cards yet. Add your first card to begin."}</td></tr>}
        </tbody></table></div>
      </>}
      {tab === "categories" && <div className="category-admin-grid">{data.categories.map(category => <article key={category.id}><span className="cat-swatch" style={{ background: category.accent }} /><small>{category.slug}</small><h2>{category.name}</h2><p>{category.item_count} cards</p><div><button onClick={() => { setEditing(category); setModal("category"); }}>Edit</button><button disabled={category.item_count > 0} onClick={() => void mutate({ action: "delete_category", id: category.id })}>Delete</button></div></article>)}{!data.categories.length && <p className="cms-empty">Add a category before creating cards.</p>}</div>}
      {tab === "wanted" && <div className="wanted-admin-grid">
        {data.wantedCards.map(item => <article key={item.id}><span className={`wanted-admin-tone ${item.tone}`}>◎</span><div><small>{item.category_name} · #{item.sort_order}</small><h2>{item.title}</h2><p>{item.details || "No extra details"}</p><span className={`cms-status ${item.status}`}>{item.status}</span><b>{item.priority}</b></div><footer><button onClick={() => { setEditing(item); setModal("wanted"); }}>Edit</button><button className="row-delete" onClick={() => void mutate({ action: "delete_wanted_card", id: item.id })}>Delete</button></footer></article>)}
        {!data.wantedCards.length && <p className="cms-empty">No wanted cards yet. Add the first card you are looking for.</p>}
      </div>}
      {tab === "options" && <div className="option-admin">
        {(["status", "condition"] as const).map(optionType => <section key={optionType}><div className="option-heading"><span className="kicker">{optionType}</span><h2>{optionType === "status" ? "Card statuses" : "Card conditions"}</h2></div>
          <div className="option-list">{data.options.filter(option => option.option_type === optionType).map(option => {
            const used = data.cards.filter(card => optionType === "status" ? card.status === option.value : card.condition === option.value).length;
            return <article key={option.id}><span><b>{option.label}</b><small>{option.value} · {used} card{used === 1 ? "" : "s"}</small></span><span className="option-order">#{option.sort_order}</span><button onClick={() => { setEditing(option); setModal("option"); }}>Edit</button><button className="row-delete" disabled={used > 0} title={used ? "Change cards using this option before deleting it" : "Delete option"} onClick={() => void mutate({ action: "delete_option", id: option.id })}>×</button></article>;
          })}</div>
        </section>)}
      </div>}
      {tab === "users" && <div className="user-list">{data.users.map(user => <article key={user.id}><span className="user-avatar">{user.name.slice(0, 1).toUpperCase()}</span><div><b>{user.name}</b><small>@{user.username || "username-not-set"} · {user.email}</small></div><span className="user-role">{user.role}</span><span className={`cms-status ${user.status}`}>{user.status}</span><button onClick={() => { setEditing(user); setModal("user"); }}>Manage</button></article>)}</div>}
      {tab === "whatsapp" && <form className="settings-form" onSubmit={async event => {
        event.preventDefault();
        const saved = await mutate({ action: "update_whatsapp_settings", phoneNumber: whatsappForm.phone_number, displayNumber: whatsappForm.display_number, greeting: whatsappForm.greeting, location: whatsappForm.location, replyTime: whatsappForm.reply_time, enabled: whatsappForm.enabled });
        if (saved) setMessage("WhatsApp settings saved.");
      }}>
        <div className="settings-heading"><span className="settings-icon">◔</span><div><h2>Store WhatsApp</h2><p>These settings update every WhatsApp button across TGMAX.</p></div></div>
        <div className="form-split"><label>WhatsApp number <span className="field-help">International format, digits only</span><input required inputMode="tel" value={whatsappForm.phone_number} onChange={event => setWhatsappForm({ ...whatsappForm, phone_number: event.target.value })} placeholder="96171234567" /></label><label>Displayed number<input required value={whatsappForm.display_number} onChange={event => setWhatsappForm({ ...whatsappForm, display_number: event.target.value })} placeholder="+961 71 234 567" /></label></div>
        <label>Default greeting<input required value={whatsappForm.greeting} onChange={event => setWhatsappForm({ ...whatsappForm, greeting: event.target.value })} placeholder="Hi TGMAX!" /></label>
        <div className="form-split"><label>Location<input value={whatsappForm.location} onChange={event => setWhatsappForm({ ...whatsappForm, location: event.target.value })} placeholder="Beirut, Lebanon" /></label><label>Reply-time message<input value={whatsappForm.reply_time} onChange={event => setWhatsappForm({ ...whatsappForm, reply_time: event.target.value })} placeholder="Usually within an hour" /></label></div>
        <label className="settings-toggle"><input type="checkbox" checked={whatsappForm.enabled} onChange={event => setWhatsappForm({ ...whatsappForm, enabled: event.target.checked })} /><span><b>Enable WhatsApp buttons</b><small>Turn this off to hide contact actions from the storefront.</small></span></label>
        <button className="cms-submit" type="submit">Save WhatsApp settings →</button>
      </form>}
    </section>

    {modal && <div className="cms-modal-backdrop" onClick={() => { setModal(null); setEditing(null); }}><div className="cms-modal" onClick={event => event.stopPropagation()}>
      <button className="cms-modal-close" onClick={() => { setModal(null); setEditing(null); }}>×</button>
      <span className="kicker">{editing ? "Update record" : "Create new"}</span><h2>{modal === "card" ? `${editing ? "Edit" : "Add"} card` : modal === "wanted" ? `${editing ? "Edit" : "Add"} wanted card` : modal === "category" ? `${editing ? "Edit" : "Add"} category` : modal === "option" ? `${editing ? "Edit" : "Add"} card option` : `${editing ? "Manage" : "Add"} user`}</h2>
      {modal === "card" && <form onSubmit={submitCard}>
        <div className="image-fields">
        <label>Front photo <span className="field-hint">Required for clean display</span>
          <div className="image-upload">
            {imagePreview ? <img src={imagePreview} alt="Card front preview" /> : <div className="image-upload-empty"><b>+</b><span>Add front photo</span></div>}
            <div><label className="upload-button">Choose front<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={e => chooseImage(e.target.files?.[0])} /></label>
              <label className="upload-button scan-button">Smart scan<input type="file" accept="image/*" capture="environment" onChange={e => void chooseSmartImage(e.target.files?.[0], "front")} /></label>
              {imagePreview && <button type="button" className="remove-image" onClick={() => { setImageFile(null); setImagePreview(""); setCardForm({ ...cardForm, imageKey: "" }); }}>Remove</button>}</div>
          </div>
        </label>
        <label>Back photo <span className="field-hint">Optional · enables flip</span>
          <div className="image-upload">
            {backImagePreview ? <img src={backImagePreview} alt="Card back preview" /> : <div className="image-upload-empty"><b>↻</b><span>Add back photo</span></div>}
            <div><label className="upload-button">Choose back<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={e => chooseBackImage(e.target.files?.[0])} /></label>
              <label className="upload-button scan-button">Smart scan<input type="file" accept="image/*" capture="environment" onChange={e => void chooseSmartImage(e.target.files?.[0], "back")} /></label>
              {backImagePreview && <button type="button" className="remove-image" onClick={() => { setBackImageFile(null); setBackImagePreview(""); setCardForm({ ...cardForm, backImageKey: "" }); }}>Remove</button>}</div>
          </div>
        </label>
        </div>
        <label>Card title<input required value={cardForm.title} onChange={e => setCardForm({ ...cardForm, title: e.target.value })} placeholder="e.g. Charizard ex" /></label>
        <div className="form-split"><label>Category<select required value={cardForm.categoryId} onChange={e => setCardForm({ ...cardForm, categoryId: e.target.value })}><option value="">Choose…</option>{data.categories.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label>Card code<input value={cardForm.cardCode} onChange={e => setCardForm({ ...cardForm, cardCode: e.target.value })} placeholder="125/197" /></label></div>
        <div className="form-split"><label>Price ($)<input required type="number" min="0" step=".01" value={cardForm.price} onChange={e => setCardForm({ ...cardForm, price: e.target.value })} /></label><label>Stock<input required type="number" min="0" value={cardForm.stock} onChange={e => setCardForm({ ...cardForm, stock: e.target.value })} /></label></div>
        <div className="form-split"><label>Condition<select value={cardForm.condition} onChange={e => setCardForm({ ...cardForm, condition: e.target.value })}>{data.options.filter(option => option.option_type === "condition").map(option => <option value={option.value} key={option.id}>{option.label}</option>)}</select></label><label>Status<select value={cardForm.status} onChange={e => setCardForm({ ...cardForm, status: e.target.value })}>{data.options.filter(option => option.option_type === "status").map(option => <option value={option.value} key={option.id}>{option.label}</option>)}</select></label></div>
        <button type="submit" className="cms-submit" disabled={uploading}>{uploading ? "Uploading photo…" : editing ? "Save changes →" : "Add to inventory →"}</button>
      </form>}
      {modal === "category" && <CategoryForm category={editing as Category | null} onSubmit={mutate} />}
      {modal === "wanted" && <WantedCardForm wantedCard={editing as WantedCard | null} categories={data.categories} onSubmit={mutate} />}
      {modal === "option" && <OptionForm option={editing as CardOption | null} onSubmit={mutate} />}
      {modal === "user" && <UserForm user={editing as User | null} onSubmit={mutate} />}
    </div></div>}
    {scanRequest && <SmartScanCropper file={scanRequest.file} onCancel={() => setScanRequest(null)} onComplete={file => {
      if (scanRequest.side === "front") chooseImage(file); else chooseBackImage(file);
      setScanRequest(null); setMessage("Crop and enhancement applied. Review the preview, then save the card.");
    }} />}
  </main>;
}

function WantedCardForm({ wantedCard, categories, onSubmit }: { wantedCard: WantedCard | null; categories: Category[]; onSubmit: (data: Record<string, unknown>) => Promise<boolean> }) {
  const [title, setTitle] = useState(wantedCard?.title ?? "");
  const [categoryId, setCategoryId] = useState(String(wantedCard?.category_id ?? categories[0]?.id ?? ""));
  const [details, setDetails] = useState(wantedCard?.details ?? "");
  const [priority, setPriority] = useState(wantedCard?.priority ?? "Open to offers");
  const [tone, setTone] = useState(wantedCard?.tone ?? "purple");
  const [status, setStatus] = useState(wantedCard?.status ?? "active");
  const [sortOrder, setSortOrder] = useState(String(wantedCard?.sort_order ?? 0));
  const [imageKey, setImageKey] = useState(wantedCard?.image_key ?? "");
  const [imagePreview, setImagePreview] = useState(wantedCard?.image_url ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanFile, setScanFile] = useState<File | null>(null);
  function preview(file: File) { setImageFile(file); const reader = new FileReader(); reader.onload = () => setImagePreview(String(reader.result ?? "")); reader.readAsDataURL(file); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); let nextImageKey = imageKey;
    if (imageFile) {
      const upload = new FormData(); upload.append("image", imageFile);
      const response = await fetch("/api/cms/upload", { method: "POST", body: upload });
      const result = await response.json() as { key?: string };
      if (!response.ok || !result.key) { setSaving(false); return; }
      nextImageKey = result.key;
    }
    await onSubmit({ action: wantedCard ? "update_wanted_card" : "create_wanted_card", id: wantedCard?.id, title, categoryId, details, priority, tone, status, sortOrder: Number(sortOrder), imageKey: nextImageKey });
    setSaving(false);
  }
  function scan(file?: File) { if (file) setScanFile(file); }
  return <form onSubmit={submit}>
    <label>Wanted card photo <span className="field-hint">Optional</span><div className="image-upload">{imagePreview ? <img src={imagePreview} alt="Wanted card preview" /> : <div className="image-upload-empty"><b>+</b><span>Add a photo</span></div>}<div><label className="upload-button">Choose image<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={event => event.target.files?.[0] && preview(event.target.files[0])} /></label><label className="upload-button scan-button">Smart scan<input type="file" accept="image/*" capture="environment" onChange={event => void scan(event.target.files?.[0])} /></label>{imagePreview && <button type="button" className="remove-image" onClick={() => { setImageFile(null); setImagePreview(""); setImageKey(""); }}>Remove</button>}</div></div></label>
    <label>Card title<input required value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Gengar VMAX" /></label>
    <div className="form-split"><label>Category<select required value={categoryId} onChange={event => setCategoryId(event.target.value)}>{categories.map(category => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label><label>Priority label<input required value={priority} onChange={event => setPriority(event.target.value)} placeholder="High priority" /></label></div>
    <label>Details<textarea value={details} onChange={event => setDetails(event.target.value)} placeholder="Set, card number, edition, preferred condition…" rows={3} /></label>
    <div className="form-split"><label>Color<select value={tone} onChange={event => setTone(event.target.value)}><option value="purple">Purple</option><option value="blue">Blue</option><option value="pink">Pink</option><option value="red">Red</option></select></label><label>Status<select value={status} onChange={event => setStatus(event.target.value)}><option value="active">Active</option><option value="draft">Draft</option></select></label></div>
    <label>Sort order<input type="number" value={sortOrder} onChange={event => setSortOrder(event.target.value)} /><span className="field-help">Lower numbers appear first on the Wanted Cards page.</span></label>
    <button type="submit" className="cms-submit" disabled={saving}>{saving ? "Processing…" : wantedCard ? "Save wanted card →" : "Add wanted card →"}</button>
    {scanFile && <SmartScanCropper file={scanFile} onCancel={() => setScanFile(null)} onComplete={file => { preview(file); setScanFile(null); }} />}
  </form>;
}

function OptionForm({ option, onSubmit }: { option: CardOption | null; onSubmit: (data: Record<string, unknown>) => Promise<boolean> }) {
  const [optionType, setOptionType] = useState<"status" | "condition">(option?.option_type ?? "status");
  const [label, setLabel] = useState(option?.label ?? "");
  const [sortOrder, setSortOrder] = useState(String(option?.sort_order ?? 0));
  return <form onSubmit={e => { e.preventDefault(); void onSubmit({ action: option ? "update_option" : "create_option", id: option?.id, optionType, label, sortOrder: Number(sortOrder) }); }}>
    <label>Option type<select disabled={!!option} value={optionType} onChange={e => setOptionType(e.target.value as "status" | "condition")}><option value="status">Status</option><option value="condition">Condition</option></select></label>
    <label>Display label<input required value={label} onChange={e => setLabel(e.target.value)} placeholder={optionType === "status" ? "e.g. Reserved" : "e.g. Sealed"} /></label>
    <label>Sort order<input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} /><span className="field-help">Lower numbers appear first in the card form.</span></label>
    <button type="submit" className="cms-submit">{option ? "Save option" : "Add option"} →</button>
  </form>;
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
  const [name, setName] = useState(user?.name ?? ""); const [email, setEmail] = useState(user?.email ?? ""); const [username, setUsername] = useState(user?.username ?? ""); const [password, setPassword] = useState(""); const [role, setRole] = useState(user?.role ?? "editor"); const [status, setStatus] = useState(user?.status ?? "active");
  return <form onSubmit={e => { e.preventDefault(); void onSubmit({ action: user ? "update_user" : "create_user", id: user?.id, name, email, username, password, role, status }); }}>
    <label>Name<input required value={name} onChange={e => setName(e.target.value)} placeholder="Team member name" /></label>
    <label>Email<input required type="email" disabled={!!user} value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" /></label>
    <label>Username<input required value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. taym-admin" /></label>
    <label>{user ? "New password" : "Password"} <span className="field-hint">{user ? "Leave blank to keep the current password" : "Minimum 8 characters"}</span><input required={!user} minLength={8} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" /></label>
    <div className="form-split"><label>Role<select value={role} onChange={e => setRole(e.target.value)}><option value="editor">Editor</option><option value="admin">Admin</option><option value="owner">Owner</option></select></label><label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option value="active">Active</option><option value="disabled">Disabled</option></select></label></div>
    <button type="submit" className="cms-submit">{user ? "Save user" : "Add user"} →</button>
  </form>;
}
