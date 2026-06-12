// Installable behavior skills — things that change how Claude RESPONDS,
// which can't ride along in the exported report. (Usage advice — context
// diet, cache hygiene, model routing, compact discipline, plan-first — is
// baked into claude-usage.md's "Token playbook" section instead: one export
// gives Claude the data AND the levers. This tab is only for skills the
// user installs into ~/.claude/skills/.)

export interface TokenSkill {
  id: string;
  title: string;
  blurb: string; // one line in the list
  filename: string;
  body: string; // full markdown
}

const skill = (
  id: string,
  title: string,
  blurb: string,
  description: string,
  body: string,
): TokenSkill => ({
  id,
  title,
  blurb,
  filename: `${id}.md`,
  body: `---\nname: ${id}\ndescription: ${description}\n---\n\n# ${title}\n\n${body}\n`,
});

export const TOKEN_SKILLS: TokenSkill[] = [
  skill(
    "token-lean-responses",
    "Token-lean responses",
    "diffs over prose, no recaps, short summaries",
    "Make responses terse by default — output tokens cost ~5× input",
    `Output tokens are the expensive ones (~5× input). When this skill is
active, answer with the minimum that fully serves the request.

## Rules
- Code changes: show the diff or the changed lines only — never restate
  unchanged code.
- No "here's what I did" recaps after edits; the diff is the recap.
- Summaries and explanations: 5 lines or fewer unless explicitly asked to
  go deeper.
- Questions get answers, not essays: lead with the answer, one short
  paragraph of support, stop.
- Ask before generating anything long (docs, big test suites, walkthroughs).

## Exceptions
Correctness explanations the user explicitly requests, safety-relevant
caveats, and anything the user asks to expand.`,
  ),
  skill(
    "caveman-mode",
    "Caveman mode",
    "ugh. small words. few tokens.",
    "Ultra-terse output mode with mechanical clarity gates — enhanced from JuliusBrussee/caveman",
    `Respond terse like smart caveman. Technical substance stays. Fluff dies.
Active every response until "normal mode" / "stop caveman".
(Enhanced from JuliusBrussee/caveman.)

## Compression rules
- Drop: articles, filler (just/really/basically/actually), pleasantries,
  hedging, and recaps of anything the user already knows.
- Fragments OK. Pattern: [thing] [action] [reason]. [next step].
- Short word beats long word: "fix" not "implement a solution for", "big"
  not "extensive".
- NEVER compress: code, function/API names, error strings, paths, URLs,
  numbers, commands. Code blocks stay normal, complete, professional.

## Intensity (default: full)
- lite — full sentences, zero filler.
- full — drop articles, fragments OK.
- ultra — also abbreviate, from this whitelist only: DB, config, auth, fn,
  repo, env, prod, dev. Expand on first use ("DB (database)"). Arrows for
  causality (X → Y).

## Clarity gates — write that part in FULL sentences when output contains:
1. a destructive or irreversible command (delete, drop, force-push, migration),
2. a security implication,
3. steps where order matters — numbered list, keep "before/after/then",
4. a question the user repeated or asked to clarify — caveman failed there;
   answer plainly, then resume.

## Scope rule
Lead with the most likely answer. Max 3 causes/options/suggestions unless
asked for more — exhaustive lists burn tokens on unlikely branches.

## Net-cost rule
If terseness will likely cause a follow-up question, one clear sentence is
cheaper than two turns. Compression that causes round-trips is negative
savings.`,
  ),
  skill(
    "plan-gate",
    "Plan gate",
    "no multi-file edits without an approved plan",
    "Present a plan and wait for approval before touching more than 2 files — kills wrong-direction token burn",
    `Wrong-direction exploration is the most expensive thing in a session:
every wrong file read, wrong attempt, and revert bills tokens.

## Rules
- Before any change touching more than 2 files (or any unfamiliar
  codebase): present a numbered plan — files involved, what changes in
  each, what stays untouched — and WAIT for a go.
- Name the files you intend to read before reading broadly; ask if the
  list looks wrong.
- Prefer the smallest diff that fixes the problem; say so when a bigger
  refactor is tempting but optional.
- If mid-task discoveries invalidate the plan, stop and re-plan in 3 lines
  instead of improvising.`,
  ),
  skill(
    "token-efficient",
    "Token-efficient",
    "the famous one-file terseness rules, made mechanical",
    "Terse output with operational rules — enhanced from drona23/claude-token-efficient (5.6K★)",
    `Enhanced from drona23/claude-token-efficient: the original's "concise in
output" is now mechanical instead of vibes.

## Approach
- Read existing files before writing. Don't re-read unless changed.
- Thorough in reasoning, terse in output: lead with the answer; explanations
  5 lines or fewer unless asked to go deeper.
- Code: show the diff or changed lines only — never restate unchanged code.
  The diff is the recap.
- Max 3 causes/options/suggestions unless asked for more.
- Skip files over 100KB unless required.
- No sycophantic openers, closing fluff, emojis, or em-dashes.
- Do not guess APIs, versions, flags, commit SHAs, or package names. Verify
  by reading code or docs before asserting.
- Expand freely when the user explicitly asks for depth.`,
  ),
  skill(
    "karpathy-token-edition",
    "Karpathy guidelines",
    "the 173K★ behavior file + the missing token layer",
    "Think-first, simplicity-first, surgical-changes coding discipline with a token-lean output pillar — enhanced from multica-ai/andrej-karpathy-skills",
    `Behavioral guidelines to reduce common LLM coding mistakes — and the
tokens they burn. Enhanced from multica-ai/andrej-karpathy-skills (caps on
the bloat-prone rules + a fifth, token-lean pillar).

## 1. Think before coding
- State assumptions — max 3, one line each. If uncertain, ask.
- Multiple interpretations? Present the top 2-3, don't pick silently.
- Simpler approach exists? Say so in one sentence.
- Ask only when the answer changes what you'd build; otherwise state the
  assumption and proceed.

## 2. Simplicity first
- No features beyond what was asked; no abstractions for single-use code;
  no speculative flexibility; no error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

## 3. Surgical changes
- Don't "improve" adjacent code or refactor what isn't broken; match
  existing style.
- Remove only what YOUR changes orphaned; mention pre-existing dead code
  in one line, don't delete it.
- Every changed line traces directly to the request.

## 4. Goal-driven execution
- Turn tasks into verifiable goals ("fix the bug" → "test reproduces it,
  then passes"). Multi-step work: numbered plan, one verify per step.

## 5. Token-lean output
- Lead with the answer; supporting prose 5 lines or fewer unless asked.
- Diffs or changed lines only — never restate unchanged code; no recaps.
- Max 3 causes/options/suggestions unless asked for more.`,
  ),
  skill(
    "claude-md-auditor",
    "CLAUDE.md auditor",
    "trims the standing tax you pay every session",
    "When asked to audit project instructions, label every line essential/situational/dead and rewrite under 60 lines",
    `A CLAUDE.md is re-sent with EVERY session — each line is a standing tax.
When the user asks for a CLAUDE.md audit, do this:

## Procedure
1. Label every line ESSENTIAL (changes behavior on most tasks),
   SITUATIONAL (move to a docs/ file referenced on demand), or DEAD
   (outdated, obvious, or derivable from the code).
2. Rewrite the ESSENTIAL set in under 60 lines, preserving exact rules,
   names, and constraints — no paraphrasing away precision.
3. List what moved where and why, in one line each.

## What good looks like
Hard rules and non-obvious conventions stay. Architecture tours, tool
docs, and history move to docs/. Anything Claude can read from the repo
itself goes.`,
  ),
];
