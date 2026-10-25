import Link from "next/link";
import { Children, isValidElement, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import documents from "./content/documents.json";

const sections = [
  {
    key: "overview",
    title: "Overview",
    href: "/docs",
    number: "01",
    description:
      "How Allo works, deployed contracts, architecture, and getting started.",
  },
  {
    key: "functions",
    title: "Contract functions",
    href: "/docs/functions",
    number: "02",
    description:
      "Public calls, internal helpers, and read-only getters across the contracts.",
  },
  {
    key: "endpoints",
    title: "API endpoints",
    href: "/docs/endpoints",
    number: "03",
    description:
      "Transaction preparation, permissions, query arguments, and indexed pool data.",
  },
] as const;
type DocumentKey = keyof typeof documents;
const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
function nodeText(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child)
        ? nodeText(child.props.children)
        : String(child),
    )
    .join("");
}
const localLinks: Record<string, string> = {
  "Functions.md": "/docs/functions",
  "Endpoints.md": "/docs/endpoints",
  "README.md": "/docs",
};
export default function Document({ section }: { section: DocumentKey }) {
  const source = documents[section];
  const meta = sections.find((item) => item.key === section)!;
  const headings = source.markdown
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.slice(3).replace(/`/g, ""));
  // The endpoint index's broad opening statement excludes health and indexed reads as well.
  const markdown =
    section === "endpoints"
      ? source.markdown
          .replace(
            "Every endpoint except `/pool-info` returns",
            "Transaction-preparation endpoints return",
          )
          .replace(
            "`from` (optional everywhere) is the sender; with it the call is dry-run and `gas` is filled in.",
            "`from` is the optional sender on transaction endpoints. It enables balance and allowance checks; when simulation is possible, the call is dry-run and `gas` is filled in. Health and indexed read endpoints return data rather than transactions.",
          )
      : source.markdown;
  return (
    <main id="main" className="docs-page">
      <div className="docs-intro">
        <div className="eyebrow">
          <span /> ALLO DOCUMENTATION
        </div>
        <h1>Understand the protocol.</h1>
        <p>From the first coin to the last line of the API.</p>
        <span className="docs-network">
          BSC TESTNET <b>97</b>
        </span>
      </div>
      <div className="docs-layout">
        <aside className="docs-sidebar">
          <span className="docs-nav-label">DOCUMENTATION</span>
          <nav aria-label="Documentation">
            {sections.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                aria-current={section === item.key ? "page" : undefined}
                className={section === item.key ? "selected" : ""}
              >
                <span>{item.number}</span>
                {item.title}
                <span className="docs-nav-arrow">↗</span>
              </Link>
            ))}
          </nav>
          <div className="docs-sidebar-note">
            <span>THE COIN LIFECYCLE</span>
            <p>Launch → Trade → Graduate → Migrate</p>
            <Link href="/launch">Launch your coin →</Link>
          </div>
        </aside>
        <div className="docs-body">
          <div className="docs-document-header">
            <div>
              <div className="eyebrow">
                {meta.number} / {meta.title.toUpperCase()}
              </div>
              <p>{meta.description}</p>
            </div>
            <a
              className="outline-button"
              href={`/docs/${source.file}`}
              download
            >
              DOWNLOAD .MD ↓
            </a>
          </div>
          <nav className="docs-toc" aria-label="On this page">
            <span>ON THIS PAGE</span>
            {headings.map((heading) => (
              <a key={heading} href={`#${slug(heading)}`}>
                {heading.replace(/^\d+\.\s*/, "")}
              </a>
            ))}
          </nav>
          <div className="docs-source-note">
            From <code>{source.file}</code>. Deployment addresses and initial
            fees reflect the source document; use the API quote for current
            launch values. Repository paths below refer to the backend/contracts
            repository.
          </div>
          <article className="docs-prose">
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children }) => (
                  <h2 id={slug(nodeText(children))}>{children}</h2>
                ),
                a: ({ href, children }) => {
                  if (href && localLinks[href])
                    return <Link href={localLinks[href]}>{children}</Link>;
                  if (
                    href?.startsWith("https://") ||
                    href?.startsWith("http://")
                  )
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        {children} ↗
                      </a>
                    );
                  return (
                    <span
                      className="docs-repository-ref"
                      title={`Repository path: ${href || ""}`}
                    >
                      {children}
                    </span>
                  );
                },
                table: ({ children }) => (
                  <div
                    className="docs-table-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label="Documentation reference table"
                  >
                    <table>{children}</table>
                  </div>
                ),
              }}
            >
              {markdown}
            </Markdown>
          </article>
          <div className="docs-page-links">
            {sections
              .filter((item) => item.key !== section)
              .map((item) => (
                <Link key={item.key} href={item.href}>
                  <span>EXPLORE {item.number}</span>
                  <strong>{item.title} →</strong>
                </Link>
              ))}
          </div>
        </div>
      </div>
    </main>
  );
}
