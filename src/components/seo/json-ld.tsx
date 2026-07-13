/**
 * Renders a schema.org JSON-LD <script> for rich results. Server component.
 *
 * `data` can include app-generated fields derived from user content (e.g. review
 * text in Review nodes), so the serialized JSON is escaped before injection:
 * `<`, `>` and `&` become their \uXXXX forms so a value containing "</script>"
 * can't break out of the script block (JSON.stringify alone does NOT escape
 * these). The JS line separators U+2028/U+2029 are escaped too. This closes the
 * one XSS sink not covered by React's automatic escaping.
 */
const LINE_SEP = new RegExp(String.fromCharCode(0x2028), "g");
const PARA_SEP = new RegExp(String.fromCharCode(0x2029), "g");

function safeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(LINE_SEP, "\\u2028")
    .replace(PARA_SEP, "\\u2029");
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }} />;
}
