"use client"

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="hidden print:hidden md:inline-flex border rounded px-3 py-1.5 text-sm hover:bg-gray-50"
    >
      Print / Save PDF
    </button>
  )
}

