import { getLlmClient } from '../marketing/services/llmClient';
import { resolveSegment } from './segmentResolver';
import { resolvePromptTemplate } from './promptResolver';
import { renderPrompt } from './promptRenderer';

/**
 * High-level LLM invoker.
 *
 * Resolves the prompt template from the DB (segment-specific → global fallback),
 * renders variables, then delegates to the tenant's configured LLM provider.
 */
export async function invokeWithTemplate(opts: {
  templateKey: string;
  segmentId: string | null;
  variables: Record<string, string>;
  tenantId?: string | null;
  maxTokens?: number;
}): Promise<string> {
  const { templateKey, segmentId, variables, tenantId, maxTokens = 2000 } = opts;

  const template = await resolvePromptTemplate(templateKey, segmentId);
  if (!template) {
    throw new Error(`Prompt template not found: key="${templateKey}" segmentId=${segmentId}`);
  }

  const prompt = renderPrompt(template, variables);
  const llm = await getLlmClient(tenantId);
  return llm.complete(prompt, maxTokens);
}

/**
 * Convenience wrapper that resolves the segment automatically from tenantId+clientId,
 * then calls invokeWithTemplate.
 */
export async function invokeForContext(opts: {
  templateKey: string;
  tenantId: string;
  clientId?: string | null;
  variables: Record<string, string>;
  maxTokens?: number;
}): Promise<string> {
  const { templateKey, tenantId, clientId, variables, maxTokens } = opts;

  const segment = await resolveSegment(tenantId, clientId);

  return invokeWithTemplate({
    templateKey,
    segmentId: segment?.id ?? null,
    variables,
    tenantId,
    maxTokens,
  });
}
