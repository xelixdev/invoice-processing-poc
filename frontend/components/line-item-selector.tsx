"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Search, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface LineItem {
  id: string
  description: string
  quantity: number
  unit_price?: number
  total?: number
}

interface LineItemSelectorProps {
  items: LineItem[]
  value?: string
  onSelect: (itemId: string) => void
  placeholder?: string
  type: 'po' | 'gr'
  lineNumber?: number
  isEmpty?: boolean
  formatCurrency?: (amount: number, currency?: string) => string
  currency?: string
  selectedItems?: string[]
}

export function LineItemSelector({
  items,
  value,
  onSelect,
  placeholder = "Select line",
  type,
  lineNumber,
  isEmpty = false,
  formatCurrency = (amount) => `$${amount.toFixed(2)}`,
  currency,
  selectedItems = []
}: LineItemSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  const selectedItem = value ? items.find(item => item.id === value) : null

  const filteredItems = items.filter(item =>
    item.description.toLowerCase().includes(search.toLowerCase()) ||
    item.id.toLowerCase().includes(search.toLowerCase())
  )

  // Reset highlighted index when search changes
  useEffect(() => {
    setHighlightedIndex(0)
  }, [search])
  
  // Calculate total items including clear option
  const totalItems = value ? filteredItems.length + 1 : filteredItems.length

  // Focus search input when popover opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [open])

  // Scroll highlighted item into view
  useEffect(() => {
    const highlightedItem = itemRefs.current[highlightedIndex]
    if (highlightedItem && open) {
      highlightedItem.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      })
    }
  }, [highlightedIndex, open])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < totalItems - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev)
        break
      case 'Enter':
        e.preventDefault()
        if (value && highlightedIndex === 0) {
          // Clear selection
          handleSelect('')
        } else {
          const adjustedIndex = value ? highlightedIndex - 1 : highlightedIndex
          if (filteredItems[adjustedIndex]) {
            handleSelect(filteredItems[adjustedIndex].id)
          }
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
    }
  }, [open, filteredItems, highlightedIndex, value, totalItems])

  const handleSelect = (itemId: string) => {
    onSelect(itemId)
    setOpen(false)
    setSearch("")
  }

  const renderTrigger = () => {
    if (isEmpty && !value) {
      // Empty state: dotted button
      return (
        <Button
          variant="outline"
          className={cn(
            "w-full h-8 px-2 justify-center text-xs font-normal",
            "border-dashed border-gray-300 hover:border-gray-400",
            "hover:bg-gray-50 transition-colors"
          )}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      )
    } else if (value && lineNumber) {
      // Selected state: solid button with line number
      return (
        <Button
          variant="outline"
          className={cn(
            "w-full h-8 px-2 justify-center text-xs font-normal",
            "border-solid hover:bg-gray-50 transition-colors"
          )}
        >
          <span className="font-medium">#{lineNumber}</span>
        </Button>
      )
    } else {
      // Regular dropdown state
      return (
        <Button
          variant="outline"
          className={cn(
            "w-full h-8 px-2 justify-between text-xs font-normal",
            "hover:bg-gray-50 transition-colors"
          )}
        >
          <span className="truncate">
            {selectedItem ? selectedItem.description.substring(0, 35) + "..." : placeholder}
          </span>
        </Button>
      )
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {renderTrigger()}
      </PopoverTrigger>
      <PopoverContent 
        className="w-[420px] p-0 shadow-lg" 
        align="start"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center border-b bg-gray-50 px-3 py-2.5">
          <Search className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
          <Input
            ref={searchInputRef}
            placeholder={`Search ${type.toUpperCase()} lines...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-0 px-2 focus:ring-0 text-sm bg-transparent placeholder:text-gray-500"
          />
        </div>
        
        {/* Clear selection option - sticky at top */}
        {value && (
          <div
            className={cn(
              "px-3 py-2.5 cursor-pointer border-b transition-all duration-150",
              "flex items-center gap-2 sticky top-0 bg-white z-10",
              highlightedIndex === 0 ? "bg-red-50" : "hover:bg-red-50"
            )}
            onClick={() => handleSelect('')}
            onMouseEnter={() => setHighlightedIndex(0)}
          >
            <X className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-600 font-medium">Clear selection</span>
          </div>
        )}
        
        <div className="max-h-[320px] overflow-y-auto">
          {filteredItems.length === 0 && !value ? (
            <div className="px-3 py-8 text-center text-sm text-gray-500">
              No matching items found
            </div>
          ) : (
            <div>
              
              {/* Header showing PO/GR number */}
              {filteredItems.length > 0 && (
                <div className="px-3 py-2 bg-gray-100 border-b">
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {type === 'po' ? 'PO-2023-001' : 'GR-2023-001'}
                  </div>
                </div>
              )}
              <div className="py-1">
                {filteredItems.map((item, index) => {
                const adjustedHighlightIndex = value ? highlightedIndex - 1 : highlightedIndex
                const isHighlighted = index === adjustedHighlightIndex
                const isSelected = item.id === value || selectedItems.includes(item.id)

                return (
                  <div
                    key={item.id}
                    ref={(el) => { itemRefs.current[index] = el }}
                    className={cn(
                      "py-2.5 pr-3 cursor-pointer transition-all duration-150",
                      "border-l-2 pl-[10px]",
                      isHighlighted && !isSelected && "bg-gray-50 border-l-transparent",
                      isHighlighted && isSelected && "bg-violet-100 border-l-violet-500",
                      !isHighlighted && isSelected && "bg-violet-100 border-l-violet-500",
                      !isHighlighted && !isSelected && "hover:bg-gray-50 border-l-transparent",
                      index > 0 && "border-t border-gray-100"
                    )}
                    onClick={() => handleSelect(item.id)}
                    onMouseEnter={() => setHighlightedIndex(value ? index + 1 : index)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-0.5">
                            {item.id}
                          </span>
                          <div className="flex-1">
                            <div className="text-sm text-gray-900 leading-relaxed font-medium">
                              {item.description}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Qty: <span className="font-medium text-gray-700">{item.quantity}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {type === 'po' && item.unit_price !== undefined && (
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrency(item.unit_price, currency)}
                          </div>
                          {item.total !== undefined && (
                            <div className="text-xs text-gray-500 mt-1">
                              Total: {formatCurrency(item.total, currency)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}