// Example of how to use the validation hook in the invoice create page

import { useInvoiceValidation, validationRules } from './use-invoice-validation'

// Define validation rules for invoice fields
export const invoiceFieldValidation = {
  invoice_number: [
    validationRules.required('Invoice number is required'),
    validationRules.pattern(/^[A-Z0-9-]+$/, 'Invoice number must contain only letters, numbers, and hyphens')
  ],
  
  amount: [
    validationRules.required('Amount is required'),
    validationRules.minAmount(0.01, 'Amount must be greater than 0')
  ],
  
  vendor: [
    validationRules.required('Vendor is required'),
    validationRules.minLength(2, 'Vendor name must be at least 2 characters')
  ],
  
  date: [
    validationRules.required('Invoice date is required')
  ],
  
  due_date: [
    validationRules.required('Due date is required'),
    validationRules.futureDate('Due date should be in the future')
  ],
  
  po_number: [
    validationRules.pattern(/^[A-Z]{3}\d{4}-\d{3}$/, 'PO number format: ABC1234-001')
  ]
}

// Example usage in a component:
/*
export default function InvoiceCreatePage() {
  const [invoice, setInvoice] = useState<Invoice>(initialInvoice)
  
  // Initialize validation
  const validation = useInvoiceValidation({
    validationRules: invoiceFieldValidation,
    backendValidation: backendValidationResponse // from API
  })

  // Handle field change with validation
  const handleFieldChange = async (fieldName: string, value: any) => {
    // Update the invoice data
    setInvoice(prev => ({ ...prev, [fieldName]: value }))
    
    // Validate the field
    await validation.validateField(fieldName, value, invoice)
  }

  // Handle form submission
  const handleSubmit = async () => {
    // Validate all fields
    const isValid = await validation.validateAll(invoice)
    
    if (!isValid) {
      // Show validation errors
      console.log('Validation failed:', validation.getAllIssues())
      return
    }
    
    // Proceed with submission
    submitInvoice(invoice)
  }

  // In your field component:
  const renderField = (fieldName: string) => {
    const fieldValidation = validation.getFieldValidation(fieldName)
    
    return (
      <div>
        <input 
          onChange={(e) => handleFieldChange(fieldName, e.target.value)}
          className={fieldValidation.hasError ? 'error' : ''}
        />
        {fieldValidation.isValidating && <span>Validating...</span>}
        {fieldValidation.issues.map(issue => (
          <span className={issue.type}>{issue.message}</span>
        ))}
      </div>
    )
  }
}
*/