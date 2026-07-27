import { requireChatGPTUser } from "../chatgpt-auth";
import { CardsCMS } from "./CardsCMS";

export const dynamic = "force-dynamic";

export default async function CardsPage() {
  const user = await requireChatGPTUser("/cards");
  return <CardsCMS signedInAs={user.displayName} />;
}
