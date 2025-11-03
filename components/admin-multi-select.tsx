"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"

interface AdminMultiSelectProps {
  options: string[]
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  label?: string
}

export function AdminMultiSelect({ options, value, onChange, placeholder = "Select...", label }: AdminMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return
      if (!rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(query.toLowerCase())),
    [options, query],
  )

  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt])
  }

  const remove = (opt: string) => onChange(value.filter((v) => v !== opt))

  return (
    <div ref={rootRef} className="relative">
      {label && <label className="text-sm font-medium text-gray-700 block mb-2">{label}</label>}
      <div
        className="w-full border rounded-lg p-2 min-h-11 flex items-center gap-2 flex-wrap bg-white cursor-text"
        onClick={() => setOpen(true)}
        role="button"
      >
        {value.length === 0 && (
          <span className="text-gray-400 text-sm select-none">{placeholder}</span>
        )}
        {value.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
          >
            {v}
            <button
              type="button"
              className="hover:text-blue-900"
              aria-label={`Remove ${v}`}
              onClick={(e) => {
                e.stopPropagation()
                remove(v)
              }}
            >
              ×
            </button>
          </span>
        ))}
        {/* search field inside */}
        <input
          className="flex-1 outline-none min-w-[6rem] text-sm"
          placeholder={value.length ? "Search..." : placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-56 overflow-auto">
          {filtered.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">No results</div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center justify-between ${
                  value.includes(opt) ? "bg-blue-50" : ""
                }`}
              >
                <span>{opt}</span>
                {value.includes(opt) && <span className="text-blue-600">✓</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )}

