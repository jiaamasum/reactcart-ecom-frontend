import fs from "fs"
import path from "path"
import { PrintButton } from "@/components/print-button"

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function mdToHtml(md: string): string {
  const lines = md.replace(/\r\n?/g, "\n").split("\n")
  let html = ""
  let inCode = false
  let inList = false
  const flushList = () => {
    if (inList) {
      html += "</ul>"
      inList = false
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line.startsWith("```")) {
      if (!inCode) {
        flushList()
        inCode = true
        html += "<pre class=\"p-3 bg-gray-900 text-gray-100 rounded overflow-auto text-sm\"><code>"
      } else {
        inCode = false
        html += "</code></pre>"
      }
      continue
    }
    if (inCode) {
      html += escapeHtml(raw) + "\n"
      continue
    }

    const h = /^(#{1,6})\s+(.+)$/.exec(line)
    if (h) {
      flushList()
      const level = h[1].length
      html += `<h${level} class="mt-6 mb-2 font-bold text-${level <= 2 ? "2xl" : "xl"}">${escapeHtml(h[2])}</h${level}>`
      continue
    }

    if (/^[-*+]\s+/.test(line)) {
      if (!inList) {
        html += "<ul class=\"list-disc ml-6 my-2 space-y-1\">"
        inList = true
      }
      html += `<li>${escapeHtml(line.replace(/^[-*+]\s+/, ""))}</li>`
      continue
    }

    if (line === "" || line === "---") {
      flushList()
      html += "<div class=\"h-3\"></div>"
      continue
    }

    // paragraph
    flushList()
    html += `<p class=\"my-2 leading-7\">${escapeHtml(line)}</p>`
  }
  flushList()
  if (inCode) html += "</code></pre>"
  return html
}

export default async function BackendSpecPage() {
  const file = path.join(process.cwd(), "docs", "backend-spec-v2.md")
  let content = "Specification not found."
  try {
    content = fs.readFileSync(file, "utf8")
  } catch {}
  const html = mdToHtml(content)
  return (
    <div className="bg-white text-gray-900">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Backend Specification</h1>
          <PrintButton />
        </div>
        <article className="prose max-w-none">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </article>
      </div>
      <style>{`
        @media print { button { display: none !important } .prose pre { page-break-inside: avoid } }
      `}</style>
    </div>
  )
}
