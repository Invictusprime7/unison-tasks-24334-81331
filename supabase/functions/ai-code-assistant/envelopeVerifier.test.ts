import { verifyAgainstEnvelope } from "./envelopeVerifier.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const files = {
  "/src/pages/Home.tsx":
    'export default function Home(){ return <button data-ut-intent="nav.goto">Open</button>; }',
};

Deno.test("runtime domain is not treated as a backend capability pack", () => {
  const result = verifyAgainstEnvelope({
    envelope: {
      requestedCapabilities: ["business_profile", "runtime"],
      scope: { level: "site", targets: [] },
      goals: [],
    },
    files,
  });

  assert(
    !result.unmetCriteria.some((criterion) =>
      criterion.includes('Capability "runtime"')
    ),
    `runtime leaked into backend pack verification: ${
      result.unmetCriteria.join(" | ")
    }`,
  );
});

Deno.test("unknown business capabilities still report missing backend packs", () => {
  const result = verifyAgainstEnvelope({
    envelope: {
      requestedCapabilities: ["portal.customer"],
      scope: { level: "site", targets: [] },
      goals: [],
    },
    files,
  });

  assert(
    result.unmetCriteria.some((criterion) =>
      criterion.includes('Capability "portal.customer"')
    ),
    "unsupported business capability was not reported",
  );
});
