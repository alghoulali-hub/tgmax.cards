import { Footer, Header } from "../shop";
import { createAdminClient } from "../../lib/supabase/admin";
import { defaultWhatsAppSettings, loadWhatsAppSettings, whatsappUrl } from "../../lib/whatsapp";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  let whatsappSettings = defaultWhatsAppSettings;
  try {
    whatsappSettings = await loadWhatsAppSettings(createAdminClient());
  } catch {}
  return <main>
    <Header />
    <section className="contact-layout">
      <div className="contact-copy">
        <span className="kicker">Let’s talk cards</span>
        <h1>Questions, trades,<br /><em>or a card hunt?</em></h1>
        <p>We’re always happy to help. WhatsApp is the quickest way to reach TGMAX.</p>
        <div className="contact-list">
          {whatsappSettings.enabled && <a href={whatsappUrl(whatsappSettings, `${whatsappSettings.greeting} I have a question.`)} target="_blank" rel="noreferrer"><span>◔</span><div><small>WhatsApp</small><b>{whatsappSettings.display_number}</b></div><i>→</i></a>}
          <div><span>⌖</span><div><small>Based in</small><b>{whatsappSettings.location}</b></div></div>
          <div><span>◷</span><div><small>Reply time</small><b>{whatsappSettings.reply_time}</b></div></div>
        </div>
      </div>
      <div className="contact-card">
        <div className="contact-card-top"><span>TG</span><div><b>TGMAX</b><small>Collect · Trade · Connect</small></div></div>
        <h2>What can we help with?</h2>
        <div className="topic-list">
          {whatsappSettings.enabled && <><a href={whatsappUrl(whatsappSettings, `${whatsappSettings.greeting} I want to buy a card.`)} target="_blank" rel="noreferrer"><b>Buy a card</b><span>Check availability and order →</span></a>
          <a href={whatsappUrl(whatsappSettings, `${whatsappSettings.greeting} I have cards to sell or trade.`)} target="_blank" rel="noreferrer"><b>Sell or trade</b><span>Send photos for an offer →</span></a>
          <a href={whatsappUrl(whatsappSettings, `${whatsappSettings.greeting} Can you help me find a specific card?`)} target="_blank" rel="noreferrer"><b>Find a card</b><span>Tell us what you need →</span></a></>}
        </div>
        {whatsappSettings.enabled && <small className="phone-note">WhatsApp number: {whatsappSettings.display_number}</small>}
      </div>
    </section>
    <Footer whatsappSettings={whatsappSettings} />
  </main>;
}
