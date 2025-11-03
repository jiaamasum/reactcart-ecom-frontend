"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useMemo } from "react"
import { apiGetPublicSettings } from "./api"

interface CurrencyState {
  code: string
  symbol: string
}

interface CurrencyContextType {
  currency: CurrencyState
  formatPrice: (price: number) => string
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

const SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  PKR: "₨",
  BDT: "৳",
  AUD: "A$",
  CAD: "C$",
  JPY: "¥",
  CNY: "¥",
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyState>({ code: "USD", symbol: "$" })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const s = await apiGetPublicSettings()
        const code = (s?.defaultCurrency || "USD").toUpperCase()
        const symbol = SYMBOLS[code] || "$"
        setCurrency({ code, symbol })
      } catch {
        setCurrency({ code: "USD", symbol: "$" })
      } finally {
        setMounted(true)
      }
    }
    load()
  }, [])

  const numberFormatter = useMemo(() => {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.code, currencyDisplay: 'symbol' })
    } catch {
      return null
    }
  }, [currency.code])

  const formatPrice = (price: number): string => {
    // Special-case BDT to always show the Taka symbol regardless of locale/engine quirks
    if (currency.code === 'BDT') {
      const sym = SYMBOLS['BDT'] || currency.symbol || '৳'
      return `${sym}${price.toFixed(2)}`
    }
    if (numberFormatter) return numberFormatter.format(price)
    return `${currency.symbol}${price.toFixed(2)}`
  }

  // Always provide context so consumers can render safely even before settings load
  return <CurrencyContext.Provider value={{ currency, formatPrice }}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) throw new Error("useCurrency must be used within CurrencyProvider")
  return context
}
