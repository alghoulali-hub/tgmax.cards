import { createAdminClient } from "../../lib/supabase/admin";
import { Footer, Header } from "../shop";
import { WantedRequestForm } from "./WantedRequestForm";
import { ZoomableImage } from "../ZoomableImage";

export const dynamic = "force-dynamic";

const fallbackNeeds = [
  { id: 1, series: "Pokémon", title: "Gengar VMAX", details: "Fusion Strike · 271/264", priority: "High priority", tone: "purple", imageUrl: null as string | null },
  { id: 2, series: "FIFA", title: "Cristiano Ronaldo", details: "Panini Prizm · Signature", priority: "Open to offers", tone: "blue", imageUrl: null as string | null },
];

function wantedWhatsapp(message: string) {
  return `https://wa.me/96171234567?text=${encodeURIComponent(message)}`;
}

export default async function WantedPage() {
  let needs = fallbackNeeds;
  let categoryNames = ["Pokémon", "FIFA", "Yu-Gi-Oh!", "One Piece"];
  try {
    const supabase = createAdminClient();
    const [{ data: wanted }, { data: categories }] = await Promise.all([
      supabase.from("wanted_cards").select("id,title,details,priority,tone,image_key,categories(name)").eq("status", "active").order("sort_order").order("updated_at", { ascending: false }),
      supabase.from("categories").select("name").order("name"),
    ]);
    if (wanted?.length) needs = wanted.map(item => ({
      id: item.id,
      series: Array.isArray(item.categories) ? item.categories[0]?.name ?? "Other" : (item.categories as { name?: string } | null)?.name ?? "Other",
      title: item.title, details: item.details, priority: item.priority, tone: item.tone,
      imageUrl: item.image_key ? supabase.storage.from("card-images").getPublicUrl(item.image_key).data.publicUrl : null,
    }));
    if (categories?.length) categoryNames = categories.map(category => category.name);
  } catch {}

  return <main>
    <Header />
    <section className="page-hero">
      <span className="kicker">Help us complete the set</span>
      <h1>Cards we’re <em>looking for.</em></h1>
      <p>Have one of these cards? Send us a clear photo and your asking price. We buy and trade.</p>
    </section>
    <section className="wanted-grid">
      {needs.map(item => <article className={`wanted-card ${item.tone}`} key={item.id}>
        <span className="series">{item.series}</span>{item.imageUrl ? <ZoomableImage src={item.imageUrl} alt={item.title} className="wanted-photo" /> : <div className="wanted-symbol">◎</div>}
        <h2>{item.title}</h2><p>{item.details}</p><span className="status">{item.priority}</span>
        <a href={wantedWhatsapp(`Hi TGMAX! I have ${item.title}. I can send photos and details.`)} target="_blank" rel="noreferrer">I have this card →</a>
      </article>)}
    </section>
    <section className="card-request">
      <div className="request-intro">
        <span className="kicker">Your card hunt</span><h2>Need a specific card?</h2>
        <p>Tell us what you’re searching for. We’ll send the details directly to WhatsApp and help you track it down.</p>
        <div className="request-note"><span>01</span> Add the card name and category</div>
        <div className="request-note"><span>02</span> Include the set, year, or condition</div>
        <div className="request-note"><span>03</span> Send your request on WhatsApp</div>
      </div>
      <WantedRequestForm categories={categoryNames} />
    </section>
    <section className="sell-cta"><div><span className="kicker">Not on the list?</span><h2>Show us what you have.</h2><p>Send photos of your cards on WhatsApp and we’ll get back to you with an offer.</p></div><a href={wantedWhatsapp("Hi TGMAX! I have some cards I’d like to sell or trade.")} target="_blank" rel="noreferrer">Send your cards →</a></section>
    <Footer />
  </main>;
}
