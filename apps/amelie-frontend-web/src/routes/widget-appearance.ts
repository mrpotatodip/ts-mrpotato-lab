import { createFileRoute } from "@tanstack/react-router";
import { PublicChatSlugSchema } from "@repo/contracts/amelie";

import { API_BASE_URL } from "#/lib/api-base-url";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const jsonHeaders = { ...cors, "Content-Type": "application/json" };

const defaultLook = { data: { customerChatLabel: "Chat with us", customerChatAccent: null }, error: null };

export const Route = createFileRoute("/widget-appearance")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        const slug = new URL(request.url).searchParams.get("slug") ?? "";
        const parsed = PublicChatSlugSchema.safeParse(slug);
        if (!parsed.success) return Response.json(defaultLook, { headers: jsonHeaders });
        const res = await fetch(
          `${API_BASE_URL}/public/chat-bot/appearance?slug=${encodeURIComponent(parsed.data)}`,
        );
        return new Response(await res.text(), { status: res.status, headers: jsonHeaders });
      },
    },
  },
});
