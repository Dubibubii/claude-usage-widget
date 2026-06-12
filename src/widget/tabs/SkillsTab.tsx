import { useState } from "react";
import type { Tokens } from "../../theme/tokens";
import { TOKEN_SKILLS } from "../../data/skills";
import { saveTextFile } from "../../platform/native";

/** Skills tab: installable BEHAVIOR skills — they change how Claude
 * responds, so they can't ride along in the exported report. (Usage data +
 * the token playbook live in claude-usage.md — footer ⤓ Export.) */
export function SkillsTab({ t }: { t: Tokens }) {
  const [saved, setSaved] = useState<string | null>(null);

  const save = async (id: string) => {
    const s = TOKEN_SKILLS.find((x) => x.id === id);
    if (!s) return;
    if (await saveTextFile(s.filename, s.body)) {
      setSaved(id);
      setTimeout(() => setSaved((cur) => (cur === id ? null : cur)), 2200);
    }
  };

  return (
    <div>
      <div style={{ fontSize: 10.5, color: t.textSecondary, lineHeight: 1.5, marginBottom: 10 }}>
        Skills that change how Claude responds — ⤓ saves a <span className="mono">.md</span> for{" "}
        <span className="mono">~/.claude/skills/</span>. Your usage data + token playbook are
        in <b>⤓ Export</b> below.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {TOKEN_SKILLS.map((s) => (
          <div
            key={s.id}
            className="skill-row hov"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              borderRadius: 10,
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              padding: "8px 11px",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{s.title}</div>
              <div
                style={{
                  fontSize: 10.5,
                  color: t.textSecondary,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {s.blurb}
              </div>
            </div>
            {saved === s.id ? (
              <span className="mono" style={{ fontSize: 10, color: t.accentText }}>saved ✓</span>
            ) : (
              <span
                className="accent-hover hov"
                title="Save skill to Downloads"
                onClick={() => save(s.id)}
                style={{ fontSize: 13, color: t.textSecondary, cursor: "pointer" }}
              >
                ⤓
              </span>
            )}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, color: t.textSecondary, marginTop: 10 }}>
        starter pack v0 — curated &amp; community skills land in updates
      </div>
    </div>
  );
}
