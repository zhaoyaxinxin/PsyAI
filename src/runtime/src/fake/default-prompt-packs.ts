import { createPromptTemplate, type PromptPack } from "../prompt/prompt-asset.js";

export function createDefaultFakePromptPacks(): PromptPack[] {
  return [
    {
      packId: "counseling-core",
      version: "v1",
      workflow: "counseling",
      metadata: {
        owner: "runtime-core",
        provider: "fake"
      },
      prompts: [
        createPromptTemplate(
          "start",
          "Counseling start. Opening: {{openingMessage}}. Context: {{userContext}}.",
          { tags: ["counseling", "start"] }
        ),
        createPromptTemplate(
          "reply",
          "Counseling reply. Message: {{message}}. History count: {{historyCount}}.",
          { tags: ["counseling", "reply"] }
        )
      ]
    },
    {
      packId: "simulation-core",
      version: "v1",
      workflow: "simulation",
      metadata: {
        owner: "runtime-core",
        provider: "fake"
      },
      prompts: [
        createPromptTemplate(
          "start",
          "Simulation start at node {{currentNodeTitle}} in scenario {{scenarioTitle}}.",
          { tags: ["simulation", "start"] }
        ),
        createPromptTemplate(
          "advance",
          "Simulation advance to {{nextNodeTitle}} through branch {{selectedBranchLabel}}.",
          { tags: ["simulation", "advance"] }
        )
      ]
    },
    {
      packId: "resonance-core",
      version: "v1",
      workflow: "resonance",
      metadata: {
        owner: "runtime-core",
        provider: "fake"
      },
      prompts: [
        createPromptTemplate(
          "search",
          "Resonance search for query {{queryText}} with tags {{tags}}.",
          { tags: ["resonance", "search"] }
        ),
        createPromptTemplate(
          "rerank",
          "Resonance rerank for {{candidateCount}} candidates against {{inputPreview}}.",
          { tags: ["resonance", "rerank"] }
        )
      ]
    }
  ];
}
