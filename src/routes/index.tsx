import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const ForestVR = lazy(() => import("../vr/ForestVR"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Forest VR — Explore on Meta Quest 3" },
      {
        name: "description",
        content:
          "A WebXR forest for Meta Quest 3. Walk through streams, hills and mountains, meet rabbits and foxes, and pick up an axe, bow, or sword.",
      },
      { property: "og:title", content: "Forest VR — Explore on Meta Quest 3" },
      {
        property: "og:description",
        content: "Immersive WebXR forest with wildlife and pickable items. Open on Quest 3 to enter VR.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Loading() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        color: "#fff",
        fontFamily: "sans-serif",
      }}
    >
      Loading forest…
    </div>
  );
}

function Index() {
  return (
    <ClientOnly fallback={<Loading />}>
      <Suspense fallback={<Loading />}>
        <ForestVR />
      </Suspense>
    </ClientOnly>
  );
}
