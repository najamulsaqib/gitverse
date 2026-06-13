// Minimal TS/JS-ish syntax highlighter. Returns an HTML string (with `.t-*`
// token spans defined in App.css) for use with dangerouslySetInnerHTML.

const KW = new Set(
  "import from export default const let var function return if else await async new class extends implements interface type as public private protected readonly try catch finally throw for while do switch case break continue of in typeof instanceof null undefined true false void this super yield enum".split(
    " ",
  ),
);

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function hl(src: string): string {
  if (src === "") return "&nbsp;";
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  const re =
    /(\/\/[^\n]*)|(`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][A-Za-z0-9_$]*)/g;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    if (m[1]) out += `<span class="t-com">${esc(m[1])}</span>`;
    else if (m[2]) out += `<span class="t-str">${esc(m[2])}</span>`;
    else if (m[3]) out += `<span class="t-num">${m[3]}</span>`;
    else {
      const w = m[4];
      if (KW.has(w)) out += `<span class="t-kw">${w}</span>`;
      else if (/^[A-Z]/.test(w)) out += `<span class="t-type">${w}</span>`;
      else if (src[re.lastIndex] === "(") out += `<span class="t-fn">${w}</span>`;
      else out += esc(w);
    }
    last = re.lastIndex;
  }
  out += esc(src.slice(last));
  return out;
}
