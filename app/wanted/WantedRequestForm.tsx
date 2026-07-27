"use client";

import { FormEvent, useState } from "react";
import { whatsapp } from "../shop";

export function WantedRequestForm({ categories }: { categories: string[] }) {
  const [cardName, setCardName] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "Other");
  const [details, setDetails] = useState("");

  function sendRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = `Hi TGMAX! I’m looking for a ${category} card: ${cardName}.${details ? ` Details: ${details}` : ""}`;
    window.open(whatsapp(message), "_blank", "noopener,noreferrer");
  }

  return <form className="request-form" onSubmit={sendRequest}>
    <label htmlFor="card-name">Card name</label>
    <input id="card-name" value={cardName} onChange={event => setCardName(event.target.value)} placeholder="e.g. Pikachu Illustrator" required />
    <label htmlFor="card-category">Category</label>
    <select id="card-category" value={category} onChange={event => setCategory(event.target.value)}>
      {categories.map(name => <option key={name}>{name}</option>)}<option>Other</option>
    </select>
    <label htmlFor="card-details">Extra details <span>Optional</span></label>
    <textarea id="card-details" value={details} onChange={event => setDetails(event.target.value)} placeholder="Set, card number, year, preferred condition..." rows={4} />
    <button type="submit">Send request on WhatsApp <span>→</span></button>
    <small>This opens WhatsApp with your request ready to send.</small>
  </form>;
}
