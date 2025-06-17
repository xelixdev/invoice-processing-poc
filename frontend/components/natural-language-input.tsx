'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Wand2, 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  Lightbulb,
  ArrowRight,
  Edit3,
  X
} from 'lucide-react'

interface ParsedEntity {
  type: 'amount' | 'department' | 'vendor' | 'action' | 'user' | 'operator' | 'field'
  value: string
  confidence: number
  start: number
  end: number
}

interface ParsedRule {
  trigger: {
    type: string
    description: string
  }
  conditions: Array<{
    field: string
    operator: string
    value: string
    valueMax?: string
  }>
  actions: Array<{
    type: string
    target?: string
    message?: string
  }>
  confidence: number
  entities: ParsedEntity[]
}

interface NaturalLanguageInputProps {
  onRuleGenerated: (rule: ParsedRule) => void
  onPreviewUpdate?: (preview: string) => void
}

export default function NaturalLanguageInput({ onRuleGenerated, onPreviewUpdate }: NaturalLanguageInputProps) {
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedRule, setParsedRule] = useState<ParsedRule | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Example patterns for suggestions
  const examplePatterns = [
    "Route Engineering invoices over $15,000 to CTO for approval",
    "If amount > $75,000 AND department = Finance, send notification to CFO", 
    "Auto-approve invoices under $1,000 from trusted vendors",
    "Route all Legal invoices to Legal Counsel and notify Finance Manager",
    "If vendor contains 'Acme Corp' and amount > $5,000, route to Legal Counsel",
    "Invoices between $10,000 and $50,000 require department head approval",
    "Route Marketing invoices over $25,000 to Marketing Director",
    "If department = Human Resources AND amount > $5,000, notify Finance Manager",
    "Auto-approve all Software category invoices under $2,500 for Engineering department"
  ]

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          textareaRef.current && !textareaRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSuggestions])

  // Mock entity extraction (in real implementation, this would call an LLM API)
  const parseNaturalLanguage = async (text: string): Promise<ParsedRule> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    const lowerText = text.toLowerCase()
    const entities: ParsedEntity[] = []
    const conditions: ParsedRule['conditions'] = []
    const actions: ParsedRule['actions'] = []

    // Extract amounts with various patterns
    const amountPatterns = [
      /\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
      /over \$?(\d+(?:,\d{3})*(?:k|thousand)?)/gi,
      /above \$?(\d+(?:,\d{3})*(?:k|thousand)?)/gi,
      /greater than \$?(\d+(?:,\d{3})*(?:k|thousand)?)/gi,
      /more than \$?(\d+(?:,\d{3})*(?:k|thousand)?)/gi,
      /under \$?(\d+(?:,\d{3})*(?:k|thousand)?)/gi,
      /less than \$?(\d+(?:,\d{3})*(?:k|thousand)?)/gi,
      /between \$?(\d+(?:,\d{3})*(?:k|thousand)?) and \$?(\d+(?:,\d{3})*(?:k|thousand)?)/gi
    ]

    // Extract departments (including patterns like "department = Finance")
    const departments = ['marketing', 'engineering', 'legal', 'finance', 'human resources', 'hr', 'procurement']
    departments.forEach(dept => {
      if (lowerText.includes(dept)) {
        entities.push({
          type: 'department',
          value: dept.charAt(0).toUpperCase() + dept.slice(1),
          confidence: 0.9,
          start: lowerText.indexOf(dept),
          end: lowerText.indexOf(dept) + dept.length
        })
      }
    })

    // Handle explicit "department = X" patterns
    const deptEqualMatch = text.match(/department\s*=\s*(\w+)/i)
    if (deptEqualMatch) {
      const deptValue = deptEqualMatch[1].trim()
      if (!entities.find(e => e.type === 'department' && e.value.toLowerCase() === deptValue.toLowerCase())) {
        entities.push({
          type: 'department',
          value: deptValue.charAt(0).toUpperCase() + deptValue.slice(1),
          confidence: 0.95,
          start: 0,
          end: 0
        })
      }
    }

    // Extract categories
    const categories = ['software', 'hardware', 'services', 'travel', 'office supplies']
    categories.forEach(cat => {
      if (lowerText.includes(cat)) {
        entities.push({
          type: 'field',
          value: cat.charAt(0).toUpperCase() + cat.slice(1),
          confidence: 0.9,
          start: lowerText.indexOf(cat),
          end: lowerText.indexOf(cat) + cat.length
        })
      }
    })

    // Extract action patterns
    if (lowerText.includes('route to') || lowerText.includes('send to')) {
      const routeMatch = text.match(/route to ([\w\s]+?)(?:\s|$|,|and|for)/i) || 
                        text.match(/send to ([\w\s]+?)(?:\s|$|,|and|for)/i)
      if (routeMatch) {
        actions.push({
          type: 'route-to-user',
          target: routeMatch[1].trim()
        })
        entities.push({
          type: 'action',
          value: 'route',
          confidence: 0.95,
          start: 0,
          end: 0
        })
      }
    }

    // Handle patterns like "Route [Department] invoices to [User]" or "Route [Department] invoices over $X to [User]"
    if (lowerText.includes('route') && !lowerText.includes('route to')) {
      const routeDeptMatch = text.match(/route (?:all )?(\w+) invoices.*?to ([\w\s]+?)(?:\s|$|,|and|for)/i)
      if (routeDeptMatch) {
        const dept = routeDeptMatch[1].trim()
        const target = routeDeptMatch[2].trim()
        
        // Add department condition if not already extracted
        if (!entities.find(e => e.type === 'department')) {
          if (departments.includes(dept.toLowerCase())) {
            entities.push({
              type: 'department',
              value: dept.charAt(0).toUpperCase() + dept.slice(1),
              confidence: 0.9,
              start: 0,
              end: 0
            })
          }
        }
        
        actions.push({
          type: 'route-to-user',
          target: target
        })
      }
    }

    // Handle "require [user] approval" pattern
    if (lowerText.includes('require') && lowerText.includes('approval')) {
      const requireMatch = text.match(/require ([\w\s]+?) approval/i)
      if (requireMatch) {
        actions.push({
          type: 'route-to-user',
          target: requireMatch[1].trim()
        })
      }
    }

    if (lowerText.includes('notify') || lowerText.includes('send notification')) {
      const notifyMatch = text.match(/notify ([\w\s]+?)(?:\s|$|,|and)/i)
      if (notifyMatch) {
        actions.push({
          type: 'send-notification',
          target: notifyMatch[1].trim(),
          message: 'Approval required for invoice'
        })
      }
    }

    if (lowerText.includes('auto-approve') || lowerText.includes('automatically approve')) {
      actions.push({
        type: 'approve'
      })
    }

    // Extract amount conditions
    if (lowerText.includes('over') || lowerText.includes('greater than') || lowerText.includes('above')) {
      const amountMatch = text.match(/(?:over|greater than|above)\s*\$?(\d+(?:,\d{3})*(?:k|thousand)?)/i)
      if (amountMatch) {
        let amount = amountMatch[1].replace(/,/g, '')
        if (amount.includes('k') || amount.includes('thousand')) {
          amount = amount.replace(/k|thousand/gi, '000')
        }
        conditions.push({
          field: 'amount',
          operator: '>',
          value: amount
        })
        entities.push({
          type: 'amount',
          value: amount,
          confidence: 0.9,
          start: 0,
          end: 0
        })
      }
    }

    if (lowerText.includes('under') || lowerText.includes('less than')) {
      const amountMatch = text.match(/(?:under|less than)\s*\$?(\d+(?:,\d{3})*(?:k|thousand)?)/i)
      if (amountMatch) {
        let amount = amountMatch[1].replace(/,/g, '')
        if (amount.includes('k') || amount.includes('thousand')) {
          amount = amount.replace(/k|thousand/gi, '000')
        }
        conditions.push({
          field: 'amount',
          operator: '<',
          value: amount
        })
      }
    }

    if (lowerText.includes('between')) {
      const betweenMatch = text.match(/between\s*\$?(\d+(?:,\d{3})*(?:k|thousand)?)\s*and\s*\$?(\d+(?:,\d{3})*(?:k|thousand)?)/i)
      if (betweenMatch) {
        let amount1 = betweenMatch[1].replace(/,/g, '').replace(/k|thousand/gi, '000')
        let amount2 = betweenMatch[2].replace(/,/g, '').replace(/k|thousand/gi, '000')
        conditions.push({
          field: 'amount',
          operator: 'between',
          value: amount1,
          valueMax: amount2
        })
      }
    }

    // Extract department conditions
    entities.filter(e => e.type === 'department').forEach(deptEntity => {
      // Avoid duplicate department conditions
      if (!conditions.find(c => c.field === 'department' && c.value === deptEntity.value)) {
        conditions.push({
          field: 'department',
          operator: '=',
          value: deptEntity.value
        })
      }
    })

    // Extract category conditions
    const catEntity = entities.find(e => e.type === 'field')
    if (catEntity) {
      conditions.push({
        field: 'category',
        operator: '=',
        value: catEntity.value
      })
    }

    // Extract vendor conditions
    const vendorMatch = text.match(/(?:vendor|from)\s+(?:contains\s+)?['"]?([^'"]+?)['"]?(?:\s|$|,|and)/i)
    if (vendorMatch) {
      const vendorValue = vendorMatch[1].trim()
      if (!departments.includes(vendorValue.toLowerCase())) {
        conditions.push({
          field: 'vendor',
          operator: lowerText.includes('contains') ? 'contains' : '=',
          value: vendorValue
        })
        entities.push({
          type: 'vendor',
          value: vendorValue,
          confidence: 0.8,
          start: 0,
          end: 0
        })
      }
    }

    return {
      trigger: {
        type: 'invoice-received',
        description: 'Invoice Received'
      },
      conditions,
      actions,
      confidence: entities.length > 0 ? 0.85 : 0.3,
      entities
    }
  }

  const handleProcess = async () => {
    if (!input.trim()) return

    setIsProcessing(true)
    try {
      const parsed = await parseNaturalLanguage(input)
      setParsedRule(parsed)
      
      // Generate preview text
      const preview = generatePreviewText(parsed)
      onPreviewUpdate?.(preview)
    } catch (error) {
      console.error('Error parsing natural language:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const generatePreviewText = (rule: ParsedRule): string => {
    let preview = "When an invoice is received, "
    
    if (rule.conditions.length > 0) {
      const conditionTexts = rule.conditions.map(condition => {
        switch (condition.operator) {
          case '>':
            return `amount is greater than $${condition.value}`
          case '<':
            return `amount is less than $${condition.value}`
          case '=':
            return `${condition.field} equals "${condition.value}"`
          case 'contains':
            return `${condition.field} contains "${condition.value}"`
          case 'between':
            return `amount is between $${condition.value} and $${condition.valueMax}`
          default:
            return `${condition.field} ${condition.operator} ${condition.value}`
        }
      })
      preview += `if ${conditionTexts.join(' and ')}, then `
    }
    
    if (rule.actions.length > 0) {
      const actionTexts = rule.actions.map(action => {
        switch (action.type) {
          case 'route-to-user':
            return `route to ${action.target}`
          case 'send-notification':
            return `notify ${action.target}`
          case 'approve':
            return 'automatically approve'
          default:
            return action.type
        }
      })
      preview += actionTexts.join(' and ')
    }
    
    return preview + "."
  }

  const handleConfirm = () => {
    if (parsedRule) {
      onRuleGenerated(parsedRule)
      setParsedRule(null)
      setInput('')
    }
  }

  const handleTryExample = (example: string) => {
    setInput(example)
    setShowSuggestions(false)
    // Small delay to ensure the dropdown closes before focusing
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 50)
  }

  return (
    <div className="space-y-4">
      {/* Input Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-600" />
            Natural Language Rule Builder
          </CardTitle>
          <CardDescription>
            Describe your approval rule in plain English and we'll build it for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => {
                if (input.length === 0) {
                  setShowSuggestions(true)
                }
              }}
              placeholder="E.g., Route Engineering invoices over $15,000 to CTO for approval..."
              className="min-h-[100px] resize-none pr-10"
            />
            
            {input.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setInput('')
                  setShowSuggestions(false)
                  setParsedRule(null)
                  textareaRef.current?.focus()
                }}
                className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-gray-100"
                title="Clear text"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </Button>
            )}
            
            {showSuggestions && (
              <div ref={suggestionsRef} className="absolute top-full left-0 right-0 mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-80 overflow-y-auto">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Try these examples:</span>
                </div>
                <div className="space-y-1">
                  {examplePatterns.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => handleTryExample(example)}
                      className="block w-full text-left text-sm text-gray-600 hover:text-violet-600 hover:bg-violet-50 p-2 rounded transition-colors"
                    >
                      "{example}"
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                onClick={handleProcess}
                disabled={!input.trim() || isProcessing}
                className="bg-violet-600 hover:bg-violet-700"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                {isProcessing ? 'Processing...' : 'Generate Rule'}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSuggestions(!showSuggestions)}
              >
                <Lightbulb className="h-4 w-4 mr-1" />
                {showSuggestions ? 'Hide Examples' : 'Examples'}
              </Button>
            </div>
            
            {input.length > 0 && (
              <span className="text-xs text-gray-500">
                {input.length} characters
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Parsed Result */}
      {parsedRule && (
        <Card className="border-violet-200 bg-violet-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              {parsedRule.confidence > 0.7 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              )}
              Interpreted Rule
              <Badge variant="secondary" className="ml-2">
                {Math.round(parsedRule.confidence * 100)}% confidence
              </Badge>
            </CardTitle>
            <CardDescription>
              Here's how I understood your rule description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preview Text */}
            <div className="p-3 bg-white rounded-lg border">
              <div className="text-sm font-medium text-gray-700 mb-1">Rule Preview:</div>
              <div className="text-sm text-gray-900">{generatePreviewText(parsedRule)}</div>
            </div>

            {/* Extracted Entities */}
            {parsedRule.entities.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Extracted Information:</div>
                <div className="flex flex-wrap gap-2">
                  {parsedRule.entities.map((entity, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {entity.type}: {entity.value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Workflow Breakdown */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">Workflow Steps:</div>
              
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
                <span className="text-sm">Trigger: {parsedRule.trigger.description}</span>
              </div>

              {parsedRule.conditions.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
                  <span className="text-sm">
                    Check conditions: {parsedRule.conditions.length} condition(s)
                  </span>
                </div>
              )}

              {parsedRule.actions.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
                  <span className="text-sm">
                    Execute actions: {parsedRule.actions.length} action(s)
                  </span>
                </div>
              )}
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => textareaRef.current?.focus()}
                className="flex items-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Edit Description
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setParsedRule(null)}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Discard
                </Button>
                
                <Button
                  onClick={handleConfirm}
                  className="bg-violet-600 hover:bg-violet-700 flex items-center gap-2"
                  disabled={parsedRule.confidence < 0.5}
                >
                  <ArrowRight className="h-4 w-4" />
                  Generate Workflow
                </Button>
              </div>
            </div>

            {parsedRule.confidence < 0.7 && (
              <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                Low confidence detection. Please review the interpreted rule and edit if needed.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}