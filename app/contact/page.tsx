import { Footer, Header, phone, whatsapp } from "../shop";

export default function ContactPage() {
  return <main>
    <Header />
    <section className="contact-layout">
      <div className="contact-copy">
        <span className="kicker">Let’s talk cards</span>
        <h1>Questions, trades,<br /><em>or a card hunt?</em></h1>
        <p>We’re always happy to help. WhatsApp is the quickest way to reach Taym Shop.</p>
        <div className="contact-list">
          <a href={whatsapp("Hi Taym Shop! I have a question.")} target="_blank" rel="noreferrer"><span>◔</span><div><small>WhatsApp</small><b>+961 71 234 567</b></div><i>→</i></a>
          <div><span>⌖</span><div><small>Based in</small><b>Beirut, Lebanon</b></div></div>
          <div><span>◷</span><div><small>Reply time</small><b>Usually within an hour</b></div></div>
        </div>
      </div>
      <div className="contact-card">
        <div className="contact-card-top"><span>T</span><div><b>TAYM SHOP</b><small>Collect · Trade · Connect</small></div></div>
        <h2>What can we help with?</h2>
        <div className="topic-list">
          <a href={whatsapp("Hi! I want to buy a card.")} target="_blank" rel="noreferrer"><b>Buy a card</b><span>Check availability and order →</span></a>
          <a href={whatsapp("Hi! I have cards to sell or trade.")} target="_blank" rel="noreferrer"><b>Sell or trade</b><span>Send photos for an offer →</span></a>
          <a href={whatsapp("Hi! Can you help me find a specific card?")} target="_blank" rel="noreferrer"><b>Find a card</b><span>Tell us what you need →</span></a>
        </div>
        <small className="phone-note">WhatsApp number: +{phone.slice(0,3)} {phone.slice(3,5)} {phone.slice(5,8)} {phone.slice(8)}</small>
      </div>
    </section>
    <Footer />
  </main>;
}
