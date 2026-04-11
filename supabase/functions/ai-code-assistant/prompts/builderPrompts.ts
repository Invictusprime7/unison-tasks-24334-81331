/**
 * Builder Lane Prompt Builders
 * Specialized prompt assembly for Lane B (in-builder editing).
 * Each function returns a complete system prompt for a specific task type.
 * 
 * Key difference from Lane A: these prompts include session memory,
 * diagnostics context, and task-specific preambles for smarter edits.
 */

/**
 * Shared React / TypeScript / Radix / shadcn knowledge block.
 * Injected into every builder-lane prompt so the AI produces
 * type-safe, conventional code that matches the VFS stack.
 */
const REACT_PRIMITIVES_KNOWLEDGE = `
[📚 STACK CONVENTIONS — MANDATORY FOR ALL EDITS]

**React 18+ / TypeScript patterns you MUST follow:**
- Always use \`React.FC<Props>\` or typed function signatures with explicit return types when adding components
- Destructure props — never use \`props.x\`; prefer \`{ onClick, className, children }: ButtonProps\`
- Hooks order: useState → useRef → useMemo/useCallback → useEffect (never conditional)
- Event handlers: type as \`React.MouseEvent<HTMLButtonElement>\`, \`React.ChangeEvent<HTMLInputElement>\`, etc.
- Refs: \`useRef<HTMLDivElement>(null)\` — always pass the element type generic
- When adding state, always provide explicit generic: \`useState<string>("")\`, \`useState<boolean>(false)\`
- Conditional rendering: prefer \`{condition && <El />}\` or ternary — never \`condition ? <El /> : ""\`
- Key props on mapped elements must be stable IDs, never array indices for dynamic lists
- forwardRef components: \`React.forwardRef<HTMLDivElement, Props>((props, ref) => …)\`

**Tailwind CSS conventions:**
- Use semantic design tokens from the project's CSS variables: \`bg-primary\`, \`text-foreground\`, \`border-border\`, \`bg-muted\`, \`text-muted-foreground\`, \`bg-accent\`, \`text-accent-foreground\`
- NEVER hardcode raw color values (\`bg-blue-500\`, \`text-white\`, \`#fff\`) — always use tokens
- Responsive: mobile-first with \`sm:\`, \`md:\`, \`lg:\` prefixes
- Dark mode: use \`dark:\` prefix only when the project already has dark mode tokens
- Use \`cn()\` from \`@/lib/utils\` to merge conditional classes (clsx + tailwind-merge)

**Radix UI primitives (used via shadcn/ui):**
When the user asks for interactive UI (dialog, dropdown, tabs, accordion, tooltip, popover, etc.),
use the project's existing shadcn components from \`@/components/ui/\`:
- Dialog → \`import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"\`
- DropdownMenu → \`import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"\`
- Tabs → \`import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"\`
- Tooltip → \`import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"\`
- Popover → \`import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"\`
- Accordion → \`import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"\`
- Sheet (side drawer) → \`import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"\`
- AlertDialog → \`import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"\`
- Select → \`import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"\`
- Button → \`import { Button } from "@/components/ui/button"\` (variants: default, destructive, outline, secondary, ghost, link)
- Input → \`import { Input } from "@/components/ui/input"\`
- Label → \`import { Label } from "@/components/ui/label"\`
- Card → \`import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"\`
- Badge → \`import { Badge } from "@/components/ui/badge"\`
- Separator → \`import { Separator } from "@/components/ui/separator"\`
- ScrollArea → \`import { ScrollArea } from "@/components/ui/scroll-area"\`
- Switch → \`import { Switch } from "@/components/ui/switch"\`
- Checkbox → \`import { Checkbox } from "@/components/ui/checkbox"\`
- Slider → \`import { Slider } from "@/components/ui/slider"\`
- Progress → \`import { Progress } from "@/components/ui/progress"\`
- Avatar → \`import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"\`
- Toast → use \`import { toast } from "sonner"\` — call \`toast("Message")\` or \`toast.success()\` / \`toast.error()\`

CRITICAL: ALWAYS prefer these existing \`@/components/ui/*\` primitives over hand-rolling custom UI.
If a shadcn component exists for the pattern, USE IT. Never create a raw \`<div role="dialog">\` when Dialog exists.
Never create a custom dropdown with \`position: absolute\` when DropdownMenu exists.

**Icons:**
- Use lucide-react: \`import { IconName } from "lucide-react"\`
- Common: ChevronDown, ChevronRight, X, Plus, Minus, Search, Menu, Settings, User, Mail, Phone, Check, AlertCircle, Info, Loader2
- For loading states: \`<Loader2 className="h-4 w-4 animate-spin" />\`

**Animation (framer-motion):**
- Import: \`import { motion, AnimatePresence } from "framer-motion"\`
- Entrance: \`<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>\`
- Exit: wrap with \`<AnimatePresence>\` and add \`exit={{ opacity: 0 }}\`
- Stagger children: use \`transition={{ delay: index * 0.1 }}\`

**Form handling (when adding forms):**
- Use react-hook-form: \`import { useForm } from "react-hook-form"\`
- With zod: \`import { zodResolver } from "@hookform/resolvers/zod"\`
- Pattern: \`const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: {} })\`

**Import aliasing:**
- \`@/\` maps to \`src/\` — always use \`@/components/\`, \`@/lib/\`, \`@/hooks/\`, etc.
- Never use relative paths like \`../../components/\` when \`@/\` alias is available
`;


/**
 * Build the edit assistant system prompt — for surgical, single-file, and multi-file edits.
 */
export function buildEditAssistantPrompt(opts: {
  basePrompt: string;
  memoryBlock: string;
  compactedFilesBlock: string;
  surgicalReinforcement: string;
  researchContext: string;
  designContext: string;
  blueprintContext: string;
  elementsLibrary: string;
  thinkingInstruction: string;
  behavioralContext?: string;
}): string {
  const editPreamble = `
[EDIT MODE — PRECISION PRIORITY — STRUCTURE PRESERVATION IS MANDATORY]
You are modifying an existing live project. The user's site is LIVE and ANY structural loss destroys their work.

CRITICAL OPERATING MODEL:
1. READ the user's prompt carefully — apply ONLY what they asked for, NOTHING more
2. IDENTIFY the exact element/component/section the user is referring to
3. MODIFY only that specific target — leave everything else BYTE-FOR-BYTE identical
4. Preserve ALL existing imports, hooks, state, event handlers, and component structure
5. If the user says "change the hero title" — ONLY the hero title text changes. Not the hero layout, not other sections, not imports.
6. NEVER regenerate the entire file from memory — copy the existing code and apply a minimal diff
7. NEVER remove sections, components, imports, hooks, or functionality unless the user EXPLICITLY says "remove" or "delete"
8. For multi-file edits, output JSON: {"files": {"path": "content"}}
9. For single-file edits, output a \`\`\`tsx code fence with the complete file

THINK OF YOURSELF AS A SURGICAL DIFF TOOL:
- Input: the existing file + a user instruction targeting ONE element
- Output: the same file with ONE element changed
- If your output is shorter than the input (and user didn't ask to remove), YOU MADE AN ERROR — stop and try again

[STRICT FILE SCOPE — ENFORCED BY POST-GENERATION VALIDATION]
- You may ONLY output files that are directly affected by the user's request.
- For single-element edits (text, color, style, one section): output ONLY the file containing that element.
- Do NOT create, rename, delete, or replace files outside the explicit target.
- Do NOT regenerate the router, entry point (App.tsx/main.tsx), or config files unless the user explicitly asks.
- If you output more than 3 files for a scoped edit, the system will BLOCK auto-apply.
- If you fail to include the resolved target file, the system will BLOCK auto-apply.
- Exceeding scope = your patch gets rejected. Stay focused.
`;

  const behavioralBlock = opts.behavioralContext ? `
[🧠 BEHAVIORAL EDIT MODE — FUNCTIONAL CHANGES AUTHORIZED]
You have full authority to add, modify, or rewire component BEHAVIOR and FUNCTIONALITY.
This includes: adding useState, useEffect, useCallback, useRef hooks; creating event handlers
(onClick, onSubmit, onChange, onKeyDown); adding conditional rendering based on state;
creating helper functions inside components; wiring elements to open modals, toggles,
drawers, tooltips, or any interactive UI pattern.

BEHAVIORAL AWARENESS (live preview snapshot):
${opts.behavioralContext}

BEHAVIORAL EDIT RULES:
1. READ the behavior map above to understand what interactive elements exist and what they currently do
2. Identify the TARGET element(s) the user is referring to from the behavior map
3. Find the SOURCE FILE for the target element (listed in the map)
4. Add the minimum hooks/state/handlers needed to achieve the requested behavior
5. If the element already has handlers, EXTEND them — don't replace unless asked
6. If you need new state (e.g., isOpen, messages[], inputValue), use React useState
7. If you need side effects (e.g., fetch data, listen for events), use useEffect
8. For complex interactions (chat widget, cart drawer, modals), create the UI inline
   in the same component using conditional rendering with state toggles
9. Wire the trigger element with an onClick/onSubmit that toggles the state
10. Preserve ALL existing visual styling — behavioral edits change LOGIC, not APPEARANCE
    (unless the new behavior requires new UI elements, which should match existing theme)
11. Use data-ut-intent attributes when the behavior maps to a known system intent
12. For new interactive sub-components (e.g., chat panel), render them conditionally
    within the existing component tree — do NOT create separate files unless
    the component would exceed ~200 lines

EXAMPLES OF BEHAVIORAL EDITS:
- "Make the chat bubble open a chat widget" → Add isOpen state + onClick toggle + render chat panel
- "Add a click counter to this button" → Add count state + onClick increment + display count
- "Make this form submit to the backend" → Add onSubmit handler + fetch call + loading/success state
- "Add a dark mode toggle" → Add isDark state + toggle handler + apply class conditionally
- "Make this accordion collapsible" → Add openIndex state + onClick toggle + conditional rendering
` : '';

  return opts.basePrompt
    + REACT_PRIMITIVES_KNOWLEDGE
    + editPreamble
    + behavioralBlock
    + opts.surgicalReinforcement
    + opts.memoryBlock
    + opts.compactedFilesBlock
    + opts.researchContext
    + opts.designContext
    + opts.blueprintContext
    + opts.elementsLibrary
    + opts.thinkingInstruction;
}

/**
 * Build the debug assistant system prompt — for error fixing and diagnostics.
 */
export function buildDebugAssistantPrompt(opts: {
  basePrompt: string;
  memoryBlock: string;
  compactedFilesBlock: string;
  thinkingInstruction: string;
}): string {
  const debugPreamble = `
[DEBUG MODE — DIAGNOSTIC PRIORITY]
The user is reporting a bug or error. Your approach:

1. DIAGNOSE: Identify the root cause from the error message, stack trace, and code context
2. LOCATE: Find the exact file(s) and line(s) causing the issue
3. FIX: Provide a targeted fix — modify ONLY the file(s) that contain the bug
4. VERIFY: Explain what was wrong and why the fix resolves it

COMMON PATTERNS TO CHECK:
- Import paths: verify the imported module exists in the project files
- Type mismatches: check interfaces/types match usage
- Missing dependencies: check if a component/hook is used but not imported
- Null/undefined access: check for optional chaining needs
- State updates: check for stale closures in useEffect/useCallback
- CSS class conflicts: check for Tailwind class contradictions

CRITICAL RULES:
- Do NOT refactor unrelated code
- Do NOT add new features alongside the fix
- Do NOT change styling unless it's the source of the bug
- Output the fixed file(s) in JSON format: {"files": {"path": "content"}}
- If the error is in the session context diagnostics, prioritize that
`;

  return opts.basePrompt
    + REACT_PRIMITIVES_KNOWLEDGE
    + debugPreamble
    + opts.memoryBlock
    + opts.compactedFilesBlock
    + opts.thinkingInstruction;
}

/**
 * Build the general builder assistant prompt — for open-ended builder questions.
 */
export function buildGeneralBuilderPrompt(opts: {
  basePrompt: string;
  memoryBlock: string;
  compactedFilesBlock: string;
  researchContext: string;
  industryPageContext: string;
  designContext: string;
  blueprintContext: string;
  elementsLibrary: string;
  thinkingInstruction: string;
  imageContext: string;
}): string {
  const generalPreamble = `
[BUILDER ASSISTANT MODE]
You are helping the user build and improve their web application.
- If session context shows recent errors or broken imports, mention them proactively
- Prefer actionable code output over explanations
- For new features: output complete, working React/TSX components
- For questions: be concise, then offer to implement
- Match the existing project's design system and patterns
`;

  return opts.basePrompt
    + REACT_PRIMITIVES_KNOWLEDGE
    + generalPreamble
    + opts.memoryBlock
    + opts.compactedFilesBlock
    + opts.researchContext
    + opts.industryPageContext
    + opts.designContext
    + opts.blueprintContext
    + opts.elementsLibrary
    + opts.thinkingInstruction
    + opts.imageContext;
}
