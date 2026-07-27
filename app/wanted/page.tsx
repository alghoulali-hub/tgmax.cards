import { Footer, Header, whatsapp } from "../shop";

const needs = [
  ["Pokémon", "Gengar VMAX", "Fusion Strike · 271/264", "High priority", "purple"],
  ["FIFA", "Cristiano Ronaldo", "Panini Prizm · Signature", "Open to offers", "blue"],
  ["Yu-Gi-Oh!", "Dark Magician Girl", "MFC-000 · 1st Edition", "Near mint only", "pink"],
  ["One Piece", "Shanks Manga Rare", "OP01-120", "High priority", "red"],
];

export default function WantedPage() {
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
        <a href={whatsapp(`Hi Taym Shop! I have ${title}. I can send photos and details.`)} target="_blank" rel="noreferrer">I have this card →</a>
      </article>)}
    </section>
    <section className="sell-cta"><div><span className="kicker">Not on the list?</span><h2>Show us what you have.</h2><p>Send photos of your cards on WhatsApp and we’ll get back to you with an offer.</p></div><a href={whatsapp("Hi Taym Shop! I have some cards I’d like to sell or trade.")} target="_blank" rel="noreferrer">Send your cards →</a></section>
    <Footer />
  </main>;
}
