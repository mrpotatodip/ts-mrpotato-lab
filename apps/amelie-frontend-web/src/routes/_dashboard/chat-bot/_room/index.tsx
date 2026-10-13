import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/chat-bot/_room/")({
  component: RouteComponent,
});

function RouteComponent() {
  return null;
}
