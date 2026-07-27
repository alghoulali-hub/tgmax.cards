"use client";

import { FormEvent, useState } from "react";
import { Footer, Header, whatsapp } from "../shop";

const needs = [
  ["Pokémon", "Gengar VMAX", "Fusion Strike · 271/264", "High priority", "purple"],
  ["FIFA", "Cristiano Ronaldo", "Panini Prizm · Signature", "Open to offers", "blue"],
  ["Yu-Gi-Oh!", "Dark Magician Girl", "MFC-000 · 1st Edition", "Near mint only", "pink"],
  ["One Piece", "Shanks Manga Rare", "OP01-120", "High priority", "red"],
];

export default function WantedPage() {
  const [cardName, setCardName] = useState("");
  const [category, setCategory] = useState("Pokémon");
  const [details, setDetails] = useState("");

  function sendRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = `Hi TGMAX! I’m looking for a ${category} card: ${cardName}.${details ? ` Details: ${details}` : ""}`;
    window.open(whatsapp(message), "_blank", "noopener,noreferrer");
  }

  return <main>
    <Header />
    <section className="page-hero">
      <span className="kicker">Help us complete the set</span>
      <h1>Cards we’re <em>looking for.</em></h1>
      <p>Have one of these cards? Send us a clear photo and your asking price. We buy and trade.</p>
    </section>
    <section className="wanted-grid">
      {needs.map(([series, title, details, status, tone]) => <article className={`wanted-card ${tone}`} key={title}>
        <span className="series">{series}</span><div className="wanted-symbol">◎</div>
        <h2>{title}</h2><p>{details}</p><span className="status">{status}</span>
        <a href={whatsapp(`Hi TGMAX! I have ${title}. I can send photos and details.`)} target="_blank" rel="noreferrer">I have this card →</a>
      </article>)}
    </section>
    <section className="card-request">
      <div className="request-intro">
        <span className="kicker">Your card hunt</span>
        <h2>Need a specific card?</h2>
        <p>Tell us what you’re searching for. We’ll send the details directly to WhatsApp and help you track it down.</p>
        <div className="request-note"><span>01</span> Add the card name and category</div>
        <div className="request-note"><span>02</span> Include the set, year, or condition</div>
        <div className="request-note"><span>03</span> Send your request on WhatsApp</div>
      </div>
      <form className="request-form" onSubmit={sendRequest}>
        <label htmlFor="card-name">Card name</label>
        <input id="card-name" value={cardName} onChange={(event) => setCardName(event.target.value)} placeholder="e.g. Pikachu Illustrator" required />
        <label htmlFor="card-category">Category</label>
        <select id="card-category" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option>Pokémon</option><option>FIFA</option><option>Yu-Gi-Oh!</option><option>One Piece</option><option>Other</option>
        </select>
        <label htmlFor="card-details">Extra details <span>Optional</span></label>
        <textarea id="card-details" value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Set, card number, year, preferred condition..." rows={4} />
        <button type="submit">Send request on WhatsApp <span>→</span></button>
        <small>This opens WhatsApp with your request ready to send.</small>
      </form>
    </section>
    <section className="sell-cta"><div><span className="kicker">Not on the list?</span><h2>Show us what you have.</h2><p>Send photos of your cards on WhatsApp and we’ll get back to you with an offer.</p></div><a href={whatsapp("Hi TGMAX! I have some cards I’d like to sell or trade.")} target="_blank" rel="noreferrer">Send your cards →</a></section>
    <Footer />
  </main>;
}
