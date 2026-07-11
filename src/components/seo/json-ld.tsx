/**
 * Renders a schema.org JSON-LD <script> for rich results. Server component;
 * `data` is serialized to JSON and injected. Only pass trusted, app-generated
 * data (never raw user input) into this.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
