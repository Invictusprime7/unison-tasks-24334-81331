/**
 * Context Compactor — truncates messages and VFS context to fit token budgets.
 * Used by both lanes but especially important for Lane B edits.
 */

/**
 * Truncate conversation messages to a max count + per-message length limit.
 */
export function compactMessages(
  messages: Array<{ role: string; content: unknown }>,
  maxMessages = 6,
  maxContentLen = 15000,
): Array<{ role: string; content: unknown }> {
  const truncated = messages.length > maxMessages
    ? messages.slice(-maxMessages)
    : messages;

  return truncated.map((msg) => {
    const content = msg.content;
    if (typeof content === 'string') {
      return {
        role: msg.role,
        content: content.length > maxContentLen
          ? content.substring(0, maxContentLen) + '\n\n[Content truncated for token limit]'
          : content,
      };
    }
    return { role: msg.role, content };
  });
}

/**
 * Build the thinking instruction block.
 * Skipped for fast-path tasks.
 */
export function buildThinkingInstruction(skip: boolean): string {
  if (skip) return '';
  return `

[REASONING REQUIREMENT]
Before writing your final answer, reason through the problem step-by-step inside <thinking> tags.
Structure your thinking as follows:
<thinking>
1. UNDERSTAND: What exactly is the user asking for?
2. ANALYSE: What does the current code/context tell me?
3. PLAN: What approach will produce the best result?
4. CONSIDER: Are there edge cases, accessibility concerns, or performance issues?
5. DECIDE: Final plan before I write the output.
</thinking>
Write your <thinking> block FIRST, then immediately follow with your complete response (HTML/code/answer).
Never include the <thinking> block explanation text in your final output.`;
}
