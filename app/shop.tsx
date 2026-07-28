"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ZoomableImage } from "./ZoomableImage";
import { defaultWhatsAppSettings, WhatsAppSettings, whatsappUrl } from "../lib/whatsapp";

export type Product = { id: number; title: string; series: string; price: number; condition: string; tone: string; code: string; icon: string; tag: string; imageUrl?: string; backImageUrl?: string };

const sampleProducts: Product[] = [
  { id: 1, title: "Pikachu VMAX", series: "Pokémon", price: 48, condition: "Near mint", tone: "yellow", code: "025/185", icon: "⚡", tag: "Popular" },
  { id: 2, title: "Charizard ex", series: "Pokémon", price: 72, condition: "Near mint", tone: "orange", code: "125/197", icon: "♨", tag: "Rare" },
  { id: 3, title: "Lionel Messi", series: "FIFA", price: 35, condition: "Excellent", tone: "blue", code: "LEO 10", icon: "10", tag: "Top pick" },
  { id: 4, title: "Kylian Mbappé", series: "FIFA", price: 28, condition: "Mint", tone: "purple", code: "KMB 09", icon: "9", tag: "New" },
  { id: 5, title: "Blue-Eyes Dragon", series: "Yu-Gi-Oh!", price: 54, condition: "Good", tone: "ice", code: "LOB-001", icon: "✦", tag: "Classic" },
  { id: 6, title: "Luffy Gear Five", series: "One Piece", price: 41, condition: "Near mint", tone: "red", code: "OP05-119", icon: "☀", tag: "Trending" },
];

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="TGMAX home">
      <span className="brand-mark"><span>TG</span></span>
      <span className="brand-name">TG<b>MAX</b></span>
    </Link>
  );
}

export function Header({ cart = 0, onCart }: { cart?: number; onCart?: () => void }) {
  const [menu, setMenu] = useState(false);
  return (
    <header className="site-header">
      <div className="nav-wrap">
        <Brand />
        <button className="menu-toggle" onClick={() => setMenu(!menu)} aria-label="Toggle navigation">☰</button>
        <nav className={menu ? "nav open" : "nav"} aria-label="Main navigation">
          <Link href="/">Shop cards</Link>
          <Link href="/wanted">Wanted cards</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <button className="cart-button" onClick={onCart} aria-label={`Open cart with ${cart} items`}>
          <span>Bag</span><b>{cart}</b>
        </button>
      </div>
    </header>
  );
}

function CardArt({ item }: { item: Product }) {
  if (item.imageUrl) {
    return (
      <div className={`card-flip-shell${item.backImageUrl ? " can-flip" : ""}`} tabIndex={item.backImageUrl ? 0 : undefined} aria-label={item.backImageUrl ? `${item.title}: hover or focus to see the back` : item.title}>
        <div className="card-art photo-card">
          <div className="card-face card-front"><ZoomableImage src={item.imageUrl} alt={`${item.title} front`} /></div>
          {item.backImageUrl && <div className="card-face card-back"><ZoomableImage src={item.backImageUrl} alt={`${item.title} back`} /></div>}
        </div>
      </div>
    );
  }
  return (
    <div className={`card-art clean-placeholder ${item.tone}`} aria-label={`${item.title} image coming soon`}>
      <div className="shine" />
      <span>{item.icon}</span>
    </div>
  );
}

function money(value: number) {
  return `$${value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}`;
}

export function ShopHome({ managedProducts = [], whatsappSettings = defaultWhatsAppSettings }: { managedProducts?: Product[]; whatsappSettings?: WhatsAppSettings }) {
  const products = managedProducts.length ? managedProducts : sampleProducts;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All cards");
  const [condition, setCondition] = useState("All conditions");
  const [cart, setCart] = useState<number[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState<number | null>(null);
  const [copiedCard, setCopiedCard] = useState<number | null>(null);
  const categories = ["All cards", ...Array.from(new Set(products.map((product) => product.series)))];
  const conditions = ["All conditions", ...Array.from(new Set(products.map((product) => product.condition)))];
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter(product =>
      (category === "All cards" || product.series === category) &&
      (condition === "All conditions" || product.condition === condition) &&
      (!needle || `${product.title} ${product.code} ${product.series}`.toLowerCase().includes(needle))
    );
  }, [products, query, category, condition]);
  const total = cart.reduce((sum, id) => sum + (products.find((p) => p.id === id)?.price ?? 0), 0);

  function cardShare(item: Product) {
    const url = `${window.location.origin}/#card-${item.id}`;
    const text = `Check out ${item.title} on TGMAX`;
    return {
      url,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    };
  }

  async function copyCardLink(item: Product) {
    await navigator.clipboard.writeText(cardShare(item).url);
    setCopiedCard(item.id);
    window.setTimeout(() => setCopiedCard(null), 1800);
  }

  return (
    <main>
      <Header cart={cart.length} onCart={() => setCartOpen(true)} />
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span /> Beirut’s card trading corner</div>
          <h1>Great cards.<br /><em>Better stories.</em></h1>
          <p>Discover collectible cards worth keeping—from iconic Pokémon to football legends and more.</p>
          <a className="primary-btn" href="#collection">Explore the collection <span>→</span></a>
          <div className="trust-row"><span>✓ Authentic cards</span><span>✓ Carefully packed</span><span>✓ Fast replies</span></div>
        </div>
        <div className="hero-cards" aria-label="Featured trading cards">
          <div className="float-card back"><CardArt item={products[Math.min(2, products.length - 1)]} /></div>
          <div className="float-card front"><CardArt item={products[0]} /></div>
          <div className="spark one">✦</div><div className="spark two">✦</div>
        </div>
      </section>

      <section className="catalog" id="collection">
        <div className="section-heading">
          <div><span className="kicker">Fresh in the shop</span><h2>Cards to collect</h2></div>
          <p>Every card is checked, sleeved, and ready for its next collection.</p>
        </div>
        <div className="shop-tools">
          <label className="shop-search"><span>⌕</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by card name or code…" aria-label="Search cards" /></label>
          <label className="shop-select">Condition<select value={condition} onChange={event => setCondition(event.target.value)}>{conditions.map(name => <option key={name}>{name}</option>)}</select></label>
        </div>
        <div className="filters" role="group" aria-label="Filter cards by category">
          {categories.map((name) => <button className={category === name ? "active" : ""} key={name} onClick={() => setCategory(name)}>{name}</button>)}
        </div>
        <div className="product-grid">
          {shown.map((item) => (
            <article className="product-card" id={`card-${item.id}`} key={item.id}>
              <div className="product-art"><span className="tag">{item.tag}</span><CardArt item={item} />{item.backImageUrl && <span className="flip-hint">Hover to flip ↻</span>}</div>
              <div className="product-info">
                <span>{item.series}</span><h3>{item.title}</h3>
                <div className="price-row"><strong>{money(item.price)}</strong><span>{item.condition}</span></div>
                <div className="card-actions">
                  <button onClick={() => setCart([...cart, item.id])}>Add to bag</button>
                  {whatsappSettings.enabled && <a href={whatsappUrl(whatsappSettings, `${whatsappSettings.greeting} Is the ${item.title} card still available?`)} target="_blank" rel="noreferrer" aria-label={`Ask about ${item.title} on WhatsApp`}>↗</a>}
                  <div className="share-wrap">
                    <button className="share-trigger" type="button" aria-label={`Share ${item.title}`} aria-expanded={shareOpen === item.id} onClick={() => setShareOpen(shareOpen === item.id ? null : item.id)}>⌯</button>
                    {shareOpen === item.id && <div className="share-menu">
                      <b>Share this card</b>
                      <a href={cardShare(item).whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>
                      <a href={cardShare(item).facebook} target="_blank" rel="noreferrer">Facebook</a>
                      <a href={cardShare(item).x} target="_blank" rel="noreferrer">X / Twitter</a>
                      <button type="button" onClick={() => void copyCardLink(item)}>{copiedCard === item.id ? "Link copied ✓" : "Copy link"}</button>
                    </div>}
                  </div>
                </div>
              </div>
            </article>
          ))}
          {!shown.length && <div className="shop-empty"><b>No matching cards</b><p>Try another search, category, or condition.</p><button onClick={() => { setQuery(""); setCategory("All cards"); setCondition("All conditions"); }}>Clear filters</button></div>}
        </div>
      </section>

      {whatsappSettings.enabled && <section className="whatsapp-band">
        <div><span className="wa-icon">◔</span><div><b>Looking for a specific card?</b><p>Send us your list and we’ll help you find it.</p></div></div>
        <a href={whatsappUrl(whatsappSettings, `${whatsappSettings.greeting} I’m looking for a specific trading card.`)} target="_blank" rel="noreferrer">Chat on WhatsApp →</a>
      </section>}
      <Footer whatsappSettings={whatsappSettings} />

      {cartOpen && <div className="drawer-overlay" onClick={() => setCartOpen(false)}>
        <aside className="drawer" onClick={(e) => e.stopPropagation()} aria-label="Shopping bag">
          <button className="close" onClick={() => setCartOpen(false)}>×</button>
          <span className="kicker">Your selection</span><h2>Shopping bag</h2>
          {cart.length === 0 ? <p className="empty">Your bag is waiting for a great card.</p> :
            <div className="bag-list">{cart.map((id, index) => { const p = products.find((x) => x.id === id)!; return <div key={`${id}-${index}`}><span>{p.title}<small>{p.series}</small></span><b>{money(p.price)}</b><button onClick={() => setCart(cart.filter((_, i) => i !== index))}>×</button></div>; })}</div>}
          <div className="bag-total"><span>Total</span><b>{money(total)}</b></div>
          {whatsappSettings.enabled && <a className="checkout" href={whatsappUrl(whatsappSettings, `${whatsappSettings.greeting} I’d like to order: ${cart.map((id) => products.find((p) => p.id === id)?.title).join(", ")}. Total: ${money(total)}.`)} target="_blank" rel="noreferrer">Order on WhatsApp</a>}
        </aside>
      </div>}
    </main>
  );
}

export function Footer({ whatsappSettings = defaultWhatsAppSettings }: { whatsappSettings?: WhatsAppSettings }) {
  return <footer><Brand /><p>Trading good cards and great stories.</p><div>{whatsappSettings.enabled && <a href={whatsappUrl(whatsappSettings, whatsappSettings.greeting)} target="_blank" rel="noreferrer">WhatsApp</a>}<Link href="/contact">Contact</Link></div><small>© 2026 TGMAX. All rights reserved.</small></footer>;
}
