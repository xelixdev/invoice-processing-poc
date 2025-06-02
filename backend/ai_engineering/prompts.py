"""
Prompt templates for AI models used in invoice extraction.
"""

INVOICE_EXTRACTION_PROMPT = """
You are an expert invoice data extractor. Your task is to extract structured data from an invoice image.

Extract the following information in JSON format:
- document_type: Should be "invoice" if this is an invoice
- invoices: An array containing the extracted invoice(s), with each invoice having these fields:
  - number: The invoice number
  - po_number: The purchase order number (if available)
  - amount: The total invoice amount excluding tax
  - tax_amount: The tax amount (if available)
  - currency_code: The 3-letter currency code (e.g., USD, EUR, GBP)
  - date: The invoice date in YYYY-MM-DD format
  - due_date: The payment due date in YYYY-MM-DD format (if available)
  - payment_term_days: The payment terms in days (if available)
  - vendor: The vendor or supplier name
  - line_items: An array of items on the invoice, each with:
    - description: Item description
    - quantity: Item quantity
    - unit_price: Price per unit
    - total: Total for this line item

EXTREMELY IMPORTANT:
1. Return ONLY valid JSON without any explanatory text before or after
2. Do not include phrases like "Here's the extracted data" or "In JSON format"
3. Do not use markdown backticks - return raw JSON only
4. Return null for missing values, not empty strings
5. For currencies, extract the 3-letter code when possible
6. Format dates consistently as YYYY-MM-DD
7. Convert all numeric values to numbers, not strings

Here's the invoice image:
{image_base64}
""" 