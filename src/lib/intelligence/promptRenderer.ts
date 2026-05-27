/**
 * Replaces {{variable}} placeholders in a template string.
 * Unknown variables are left unchanged as {{variable}}.
 */
export function renderPrompt(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    key in variables ? variables[key] : match,
  );
}
