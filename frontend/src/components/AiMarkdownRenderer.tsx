import React from "react";

interface AiMarkdownRendererProps {
  content: string;
  className?: string;
}

export const AiMarkdownRenderer: React.FC<AiMarkdownRendererProps> = ({ content, className = "" }) => {
  if (!content) return null;

  // Split lines to parse blocks
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];

  let tableLines: string[] = [];
  let inTable = false;

  const flushTable = (index: number) => {
    if (tableLines.length === 0) return;
    const [headerLine, , ...rowLines] = tableLines;
    if (!headerLine) return;

    const headers = headerLine
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const rows = rowLines
      .filter((l) => l.trim().startsWith("|"))
      .map((l) =>
        l
          .split("|")
          .map((c) => c.trim())
          .filter((c, i, arr) => (i > 0 && i < arr.length - 1) || c.length > 0)
      );

    blocks.push(
      <div key={`table-${index}`} className="my-3 overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
        <table className="w-full text-left text-xs text-slate-800">
          <thead className="bg-slate-100/90 text-[11px] font-bold uppercase tracking-wider text-slate-700">
            <tr>
              {headers.map((h, hIdx) => (
                <th key={hIdx} className="px-3 py-2 border-b border-slate-200">
                  {renderInlineFormatted(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((r, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                {r.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 whitespace-nowrap">
                    {renderInlineFormatted(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableLines = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check for markdown table line
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      inTable = true;
      tableLines.push(trimmed);
      continue;
    } else if (inTable) {
      flushTable(i);
    }

    if (trimmed === "") {
      blocks.push(<div key={`sp-${i}`} className="h-2" />);
      continue;
    }

    // Horizontal Rule
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      blocks.push(<hr key={`hr-${i}`} className="my-3 border-t border-slate-200" />);
      continue;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      const headingText = trimmed.replace("### ", "");
      blocks.push(
        <h3
          key={`h3-${i}`}
          className="mt-3.5 mb-1.5 text-sm md:text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5"
        >
          {renderInlineFormatted(headingText)}
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith("#### ")) {
      const subHeadingText = trimmed.replace("#### ", "");
      const isWarning = subHeadingText.includes("⚠️") || subHeadingText.toLowerCase().includes("warning");
      const isRecorded = subHeadingText.includes("📊") || subHeadingText.toLowerCase().includes("recorded");
      const isSuccess = subHeadingText.includes("✅") || subHeadingText.toLowerCase().includes("normal");

      blocks.push(
        <h4
          key={`h4-${i}`}
          className={`mt-3 mb-1 text-xs md:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 ${
            isWarning ? "text-amber-800" : isRecorded ? "text-slate-800" : isSuccess ? "text-emerald-800" : "text-slate-700"
          }`}
        >
          {renderInlineFormatted(subHeadingText)}
        </h4>
      );
      continue;
    }

    // Unordered list
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const itemText = trimmed.slice(2);
      blocks.push(
        <div key={`li-${i}`} className="my-1 flex items-start gap-2 text-xs md:text-sm text-slate-700 leading-relaxed">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
          <div className="flex-1">{renderInlineFormatted(itemText)}</div>
        </div>
      );
      continue;
    }

    // Ordered list (1., 2., etc)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const num = numMatch[1];
      const itemText = numMatch[2];
      blocks.push(
        <div key={`oli-${i}`} className="my-1 flex items-start gap-2 text-xs md:text-sm text-slate-700 leading-relaxed">
          <span className="shrink-0 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800 mt-0.5">
            {num}
          </span>
          <div className="flex-1">{renderInlineFormatted(itemText)}</div>
        </div>
      );
      continue;
    }

    // Callout alert box for warnings or advisory
    if (trimmed.startsWith("⚠️") || trimmed.startsWith("🚨")) {
      blocks.push(
        <div
          key={`warn-${i}`}
          className="my-2.5 rounded-xl border border-amber-300 bg-amber-50/90 p-3 text-xs md:text-sm text-amber-950 shadow-2xs"
        >
          {renderInlineFormatted(trimmed)}
        </div>
      );
      continue;
    }

    // Regular paragraph
    blocks.push(
      <p key={`p-${i}`} className="my-1 text-xs md:text-sm text-slate-800 leading-relaxed">
        {renderInlineFormatted(trimmed)}
      </p>
    );
  }

  if (inTable) {
    flushTable(lines.length);
  }

  return <div className={`space-y-0.5 ${className}`}>{blocks}</div>;
};

/**
 * Parses bold (**text**), italic (*text*), and code (`code`) within a text string.
 */
function renderInlineFormatted(text: string): React.ReactNode {
  if (!text) return null;

  // Tokenize bold, code, italic
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;

  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.substring(lastIdx, match.index));
    }

    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-slate-950">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={`c-${match.index}`}
          className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] md:text-xs font-medium text-emerald-800 border border-slate-200/80"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={`i-${match.index}`} className="italic text-slate-700">
          {token.slice(1, -1)}
        </em>
      );
    }

    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    parts.push(text.substring(lastIdx));
  }

  return <>{parts}</>;
}
