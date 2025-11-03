"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { X } from "lucide-react"

interface ShopFiltersProps {
  categories: string[]
  selectedCategory: string
  onCategoryChange: (category: string) => void
  priceRange: [number, number]
  onPriceChange: (range: [number, number]) => void
  maxPrice: number
  inStockOnly: boolean
  onInStockChange: (value: boolean) => void
  onReset: () => void
}

export function ShopFilters({
  categories,
  selectedCategory,
  onCategoryChange,
  priceRange,
  onPriceChange,
  maxPrice,
  inStockOnly,
  onInStockChange,
  onReset,
}: ShopFiltersProps) {
  return (
    <div className="w-full md:w-64 space-y-4">
      {/* Reset Button */}
      <Button variant="outline" className="w-full bg-transparent" onClick={onReset}>
        <X className="w-4 h-4 mr-2" />
        Reset Filters
      </Button>

      {/* Price Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Price Range</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Slider
            value={priceRange}
            onValueChange={onPriceChange}
            min={0}
            max={maxPrice}
            step={10}
            className="w-full"
          />
          <div className="flex justify-between text-sm">
            <span>${priceRange[0]}</span>
            <span>${priceRange[1]}</span>
          </div>
        </CardContent>
      </Card>

      {/* Category Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Category</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => onCategoryChange(category)}
              className="w-full justify-start"
            >
              {category}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Stock Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Availability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="in-stock"
              checked={inStockOnly}
              onCheckedChange={(checked) => onInStockChange(checked as boolean)}
            />
            <label htmlFor="in-stock" className="text-sm cursor-pointer">
              In Stock Only
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
