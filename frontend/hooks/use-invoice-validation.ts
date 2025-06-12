import { useState, useCallback, useEffect } from 'react'

// Types for validation system
export type ValidationSeverity = 'error' | 'warning' | 'info'
export type ValidationType = 'required' | 'format' | 'range' | 'async' | 'custom'

export interface ValidationIssue {
  type: ValidationSeverity
  message: string
  field?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export interface ValidationRule {
  type: ValidationType
  severity?: ValidationSeverity
  message?: string
  validate: (value: any, formData?: any) => boolean | Promise<boolean>
}

export interface FieldValidation {
  [fieldName: string]: ValidationRule[]
}

interface ValidationState {
  [fieldName: string]: ValidationIssue[]
}

interface UseInvoiceValidationProps {
  initialData?: any
  validationRules?: FieldValidation
  backendValidation?: any
}

export function useInvoiceValidation({
  initialData,
  validationRules = {},
  backendValidation
}: UseInvoiceValidationProps = {}) {
  const [validationState, setValidationState] = useState<ValidationState>({})
  const [validatingFields, setValidatingFields] = useState<Set<string>>(new Set())

  // Merge backend validation into state
  useEffect(() => {
    if (backendValidation) {
      const newValidationState: ValidationState = {}
      
      // Parse backend validation response and map to fields
      // This is where you'd integrate the backend validation format
      // For now, this is a placeholder structure
      if (backendValidation.field_errors) {
        Object.entries(backendValidation.field_errors).forEach(([field, errors]: [string, any]) => {
          newValidationState[field] = errors.map((error: any) => ({
            type: error.severity || 'error',
            message: error.message
          }))
        })
      }

      setValidationState(prev => ({ ...prev, ...newValidationState }))
    }
  }, [backendValidation])

  // Validate a single field
  const validateField = useCallback(async (
    fieldName: string, 
    value: any, 
    allData?: any
  ): Promise<ValidationIssue[]> => {
    const rules = validationRules[fieldName] || []
    const issues: ValidationIssue[] = []

    // Mark field as validating
    setValidatingFields(prev => new Set(prev).add(fieldName))

    for (const rule of rules) {
      try {
        const isValid = await rule.validate(value, allData)
        
        if (!isValid) {
          issues.push({
            type: rule.severity || 'error',
            message: rule.message || `Validation failed for ${fieldName}`,
            field: fieldName
          })
        }
      } catch (error) {
        // Handle validation errors gracefully
        issues.push({
          type: 'error',
          message: 'Validation error occurred',
          field: fieldName
        })
      }
    }

    // Update validation state
    setValidationState(prev => ({
      ...prev,
      [fieldName]: issues
    }))

    // Remove from validating set
    setValidatingFields(prev => {
      const newSet = new Set(prev)
      newSet.delete(fieldName)
      return newSet
    })

    return issues
  }, [validationRules])

  // Clear validation for a field
  const clearFieldValidation = useCallback((fieldName: string) => {
    setValidationState(prev => {
      const newState = { ...prev }
      delete newState[fieldName]
      return newState
    })
  }, [])

  // Validate all fields
  const validateAll = useCallback(async (data: any): Promise<boolean> => {
    const allIssues: ValidationState = {}
    let hasErrors = false

    // Validate each field with rules
    for (const fieldName of Object.keys(validationRules)) {
      const issues = await validateField(fieldName, data[fieldName], data)
      if (issues.length > 0) {
        allIssues[fieldName] = issues
        if (issues.some(issue => issue.type === 'error')) {
          hasErrors = true
        }
      }
    }

    setValidationState(allIssues)
    return !hasErrors
  }, [validationRules, validateField])

  // Get validation status for a field
  const getFieldValidation = useCallback((fieldName: string) => {
    const issues = validationState[fieldName] || []
    const isValidating = validatingFields.has(fieldName)
    
    return {
      issues,
      hasError: issues.some(issue => issue.type === 'error'),
      hasWarning: issues.some(issue => issue.type === 'warning'),
      hasInfo: issues.some(issue => issue.type === 'info'),
      isValidating
    }
  }, [validationState, validatingFields])

  // Get all validation issues
  const getAllIssues = useCallback(() => {
    const allIssues: ValidationIssue[] = []
    Object.entries(validationState).forEach(([field, issues]) => {
      allIssues.push(...issues)
    })
    return allIssues
  }, [validationState])

  // Check if form has any errors
  const hasErrors = useCallback(() => {
    return getAllIssues().some(issue => issue.type === 'error')
  }, [getAllIssues])

  return {
    validateField,
    clearFieldValidation,
    validateAll,
    getFieldValidation,
    getAllIssues,
    hasErrors,
    validationState,
    isValidating: (field: string) => validatingFields.has(field)
  }
}

// Common validation rules factory
export const validationRules = {
  required: (message?: string): ValidationRule => ({
    type: 'required',
    severity: 'error',
    message: message || 'This field is required',
    validate: (value) => {
      return value !== null && value !== undefined && value !== ''
    }
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    type: 'format',
    severity: 'error',
    message: message || `Must be at least ${min} characters`,
    validate: (value) => {
      return !value || value.toString().length >= min
    }
  }),

  pattern: (pattern: RegExp, message?: string): ValidationRule => ({
    type: 'format',
    severity: 'error',
    message: message || 'Invalid format',
    validate: (value) => {
      return !value || pattern.test(value.toString())
    }
  }),

  minAmount: (min: number, message?: string): ValidationRule => ({
    type: 'range',
    severity: 'error',
    message: message || `Amount must be at least ${min}`,
    validate: (value) => {
      const num = parseFloat(value)
      return !isNaN(num) && num >= min
    }
  }),

  futureDate: (message?: string): ValidationRule => ({
    type: 'range',
    severity: 'warning',
    message: message || 'Date is in the past',
    validate: (value) => {
      if (!value) return true
      return new Date(value) > new Date()
    }
  }),

  matchingField: (fieldName: string, message?: string): ValidationRule => ({
    type: 'custom',
    severity: 'error',
    message: message || `Must match ${fieldName}`,
    validate: (value, formData) => {
      return value === formData?.[fieldName]
    }
  })
}