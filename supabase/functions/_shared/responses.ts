import { createOpenAI } from "npm:@ai-sdk/openai@4.0.122";
import { streamText, type ModelMessage, type ToolSet } from "npm:ai@7.0.180";

import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "./run-id.ts";

/** Chamada Responses pelo Lovable AI Gateway (stateless: store false; raciocínio reenviado criptografado). */
export function createResponsesCall(
  request: Request,
  config: { baseURL: string; apiKey: string; model: string },
  messages: ModelMessage[],
  instructions?: string,
  extra: { tools?: ToolSet } = {},
) {
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: `${config.baseURL.replace(/\/+$/, "").replace(/\/v1$/, "")}/v1`,
    apiKey: config.apiKey,
    headers: { "Lovable-API-Key": config.apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  const reasoning = config.model !== "openai/chat-latest";
  const result = streamText({
    model: provider.responses(config.model),
    ...(instructions ? { instructions } : {}),
    messages,
    ...(extra.tools ? { tools: extra.tools } : {}),
    abortSignal: request.signal,
    providerOptions: {
      openai: {
        store: false,
        ...(reasoning
          ? { forceReasoning: true, reasoningEffort: "medium", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] }
          : {}),
      },
    },
  });
  return {
    result,
    response: (init?: HeadersInit, originalMessages?: unknown[], onError?: (error: unknown) => string) =>
      withLovableAiGatewayRunIdHeader(
        // deno-lint-ignore no-explicit-any
        result.toUIMessageStreamResponse({ sendReasoning: true, ...(onError ? { onError } : {}), ...(originalMessages ? { originalMessages: originalMessages as any } : {}) }),
        runIdFetch,
        init,
      ),
  };
}
