"""
Data Comparison Utilities

This module handles the validation of data consistency between extracted invoice data
and matched purchase order data. It provides a three-tiered comparison system designed
for Accounts Payable processing workflows.

The comparison process:
1. Compares key data points (amount, currency, payment terms, vendor)
2. Categorizes each comparison as perfect match, within tolerance, or escalation required
3. Provides detailed variance calculations and reasons for AP processors
"""

from enum import Enum
from decimal import Decimal, InvalidOperation
from typing import Dict, Any, Optional, Union


class MatchResult(Enum):
    """
    Enumeration for comparison result classifications.
    
    These map to AP processor workflow requirements:
    - PERFECT_MATCH: No action needed, auto-approve
    - WITHIN_TOLERANCE: Minor variance acceptable, can be bulk-approved  
    - ESCALATION_REQUIRED: Significant variance, requires manual review/approval
    """
    PERFECT_MATCH = "perfect_match"
    WITHIN_TOLERANCE = "within_tolerance" 
    ESCALATION_REQUIRED = "escalation_required"


# Configuration constants for comparison tolerances
AMOUNT_TOLERANCE_PERCENT = 5.0  # ±5% tolerance for amount comparisons
PAYMENT_TERMS_TOLERANCE_DAYS = 1  # ±1 day tolerance for payment terms


def compare_amounts(
    invoice_amount: Optional[Union[str, int, float, Decimal]], 
    po_amount: Optional[Union[str, int, float, Decimal]]
) -> Dict[str, Any]:
    """
    Compare invoice amount against PO amount with percentage-based tolerance.
    
    Uses precise Decimal arithmetic for financial calculations to avoid
    floating-point precision issues.
    
    Args:
        invoice_amount: Amount from extracted invoice
        po_amount: Amount from matched purchase order
        
    Returns:
        Dict containing:
        - result: MatchResult enum value
        - details: Dictionary with comparison details including variance and percentages
        
    Example:
        >>> compare_amounts(3100.00, 3055.00)
        {
            'result': MatchResult.WITHIN_TOLERANCE,
            'details': {
                'reason': 'Amount difference within 5% tolerance',
                'invoice_amount': Decimal('3100.00'),
                'po_amount': Decimal('3055.00'),
                'variance': Decimal('45.00'),
                'variance_percent': 1.47
            }
        }
    """
    # Handle missing values
    if invoice_amount is None or po_amount is None:
        return {
            'result': MatchResult.ESCALATION_REQUIRED,
            'details': {
                'reason': 'Missing amount data - cannot compare',
                'invoice_amount': invoice_amount,
                'po_amount': po_amount,
                'variance': None,
                'variance_percent': None
            }
        }
    
    try:
        # Convert to Decimal for precise financial calculations
        invoice_decimal = Decimal(str(invoice_amount))
        po_decimal = Decimal(str(po_amount))
        
        # Calculate variance
        variance = invoice_decimal - po_decimal
        
        # Handle zero PO amount edge case
        if po_decimal == 0:
            if invoice_decimal == 0:
                return {
                    'result': MatchResult.PERFECT_MATCH,
                    'details': {
                        'reason': 'Both amounts are zero - perfect match',
                        'invoice_amount': invoice_decimal,
                        'po_amount': po_decimal,
                        'variance': variance,
                        'variance_percent': 0.0
                    }
                }
            else:
                return {
                    'result': MatchResult.ESCALATION_REQUIRED,
                    'details': {
                        'reason': 'PO amount is zero but invoice has amount',
                        'invoice_amount': invoice_decimal,
                        'po_amount': po_decimal,
                        'variance': variance,
                        'variance_percent': None
                    }
                }
        
        # Calculate percentage variance
        variance_percent = float((abs(variance) / po_decimal) * 100)
        
        # Determine result based on tolerance
        if variance == 0:
            result = MatchResult.PERFECT_MATCH
            reason = 'Amounts match exactly'
        elif variance_percent <= AMOUNT_TOLERANCE_PERCENT:
            result = MatchResult.WITHIN_TOLERANCE
            reason = f'Amount difference within {AMOUNT_TOLERANCE_PERCENT}% tolerance'
        else:
            result = MatchResult.ESCALATION_REQUIRED
            reason = f'Amount difference exceeds {AMOUNT_TOLERANCE_PERCENT}% tolerance'
        
        return {
            'result': result,
            'details': {
                'reason': reason,
                'invoice_amount': invoice_decimal,
                'po_amount': po_decimal,
                'variance': variance,
                'variance_percent': round(variance_percent, 2)
            }
        }
        
    except (InvalidOperation, ValueError, TypeError) as e:
        return {
            'result': MatchResult.ESCALATION_REQUIRED,
            'details': {
                'reason': f'Invalid amount data: {str(e)}',
                'invoice_amount': invoice_amount,
                'po_amount': po_amount,
                'variance': None,
                'variance_percent': None
            }
        }


def compare_currencies(invoice_currency: Optional[str], po_currency: Optional[str]) -> Dict[str, Any]:
    """
    Compare invoice currency against PO currency.
    
    This is a binary comparison - currencies must match exactly for financial compliance.
    
    Args:
        invoice_currency: Currency code from extracted invoice (e.g., 'USD')
        po_currency: Currency code from matched purchase order
        
    Returns:
        Dict containing result and comparison details
        
    Example:
        >>> compare_currencies('USD', 'USD')
        {
            'result': MatchResult.PERFECT_MATCH,
            'details': {
                'reason': 'Currencies match exactly',
                'invoice_currency': 'USD',
                'po_currency': 'USD'
            }
        }
    """
    # Handle missing values
    if invoice_currency is None or po_currency is None:
        return {
            'result': MatchResult.ESCALATION_REQUIRED,
            'details': {
                'reason': 'Missing currency data - cannot compare',
                'invoice_currency': invoice_currency,
                'po_currency': po_currency
            }
        }
    
    # Normalize currencies (uppercase, strip whitespace)
    invoice_norm = str(invoice_currency).upper().strip()
    po_norm = str(po_currency).upper().strip()
    
    if invoice_norm == po_norm:
        return {
            'result': MatchResult.PERFECT_MATCH,
            'details': {
                'reason': 'Currencies match exactly',
                'invoice_currency': invoice_norm,
                'po_currency': po_norm
            }
        }
    else:
        return {
            'result': MatchResult.ESCALATION_REQUIRED,
            'details': {
                'reason': 'Currency mismatch detected - requires FX approval',
                'invoice_currency': invoice_norm,
                'po_currency': po_norm
            }
        }


def compare_payment_terms(
    invoice_days: Optional[Union[str, int]], 
    po_days: Optional[Union[str, int]]
) -> Dict[str, Any]:
    """
    Compare payment terms between invoice and PO with day-based tolerance.
    
    Args:
        invoice_days: Payment term days from extracted invoice
        po_days: Payment term days from matched purchase order
        
    Returns:
        Dict containing result and comparison details
        
    Example:
        >>> compare_payment_terms(30, 30)
        {
            'result': MatchResult.PERFECT_MATCH,
            'details': {
                'reason': 'Payment terms match exactly',
                'invoice_days': 30,
                'po_days': 30,
                'variance_days': 0
            }
        }
    """
    # Handle missing values
    if invoice_days is None or po_days is None:
        return {
            'result': MatchResult.ESCALATION_REQUIRED,
            'details': {
                'reason': 'Payment terms comparison not available (missing PO payment terms)',
                'invoice_days': invoice_days,
                'po_days': po_days,
                'variance_days': None
            }
        }
    
    try:
        # Convert to integers
        invoice_int = int(invoice_days)
        po_int = int(po_days)
        
        # Calculate variance in days
        variance_days = invoice_int - po_int
        
        # Determine result based on tolerance
        if variance_days == 0:
            result = MatchResult.PERFECT_MATCH
            reason = 'Payment terms match exactly'
        elif abs(variance_days) <= PAYMENT_TERMS_TOLERANCE_DAYS:
            result = MatchResult.WITHIN_TOLERANCE
            reason = f'Payment terms difference within {PAYMENT_TERMS_TOLERANCE_DAYS} day tolerance'
        else:
            result = MatchResult.ESCALATION_REQUIRED
            reason = f'Payment terms difference exceeds {PAYMENT_TERMS_TOLERANCE_DAYS} day tolerance'
        
        return {
            'result': result,
            'details': {
                'reason': reason,
                'invoice_days': invoice_int,
                'po_days': po_int,
                'variance_days': variance_days
            }
        }
        
    except (ValueError, TypeError) as e:
        return {
            'result': MatchResult.ESCALATION_REQUIRED,
            'details': {
                'reason': f'Invalid payment terms data: {str(e)}',
                'invoice_days': invoice_days,
                'po_days': po_days,
                'variance_days': None
            }
        }


def compare_vendors(invoice_vendor: Optional[str], po_vendor: Optional[str]) -> Dict[str, Any]:
    """
    Compare vendor names between invoice and PO.
    
    This is a binary comparison - vendor names must match exactly for compliance.
    
    Args:
        invoice_vendor: Vendor name from extracted invoice
        po_vendor: Vendor name from matched purchase order
        
    Returns:
        Dict containing result and comparison details
        
    Example:
        >>> compare_vendors('Your Office LLC', 'Your Office LLC')
        {
            'result': MatchResult.PERFECT_MATCH,
            'details': {
                'reason': 'Vendor names match exactly',
                'invoice_vendor': 'Your Office LLC',
                'po_vendor': 'Your Office LLC'
            }
        }
    """
    # Handle missing values
    if invoice_vendor is None or po_vendor is None:
        return {
            'result': MatchResult.ESCALATION_REQUIRED,
            'details': {
                'reason': 'Missing vendor data - cannot compare',
                'invoice_vendor': invoice_vendor,
                'po_vendor': po_vendor
            }
        }
    
    # Normalize vendor names (strip whitespace, case-insensitive)
    invoice_norm = str(invoice_vendor).strip()
    po_norm = str(po_vendor).strip()
    
    if invoice_norm.lower() == po_norm.lower():
        return {
            'result': MatchResult.PERFECT_MATCH,
            'details': {
                'reason': 'Vendor names match exactly',
                'invoice_vendor': invoice_norm,
                'po_vendor': po_norm
            }
        }
    else:
        return {
            'result': MatchResult.ESCALATION_REQUIRED,
            'details': {
                'reason': 'Vendor mismatch detected - requires authorization',
                'invoice_vendor': invoice_norm,
                'po_vendor': po_norm
            }
        }


def perform_comprehensive_comparison(invoice_data: Dict[str, Any], po_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Perform comprehensive data comparison between extracted invoice and matched PO.
    
    This is the main function that orchestrates all individual comparisons and
    determines the overall status for AP processor workflow decisions.
    
    Args:
        invoice_data: Dictionary containing extracted invoice data
            Expected keys: amount, currency_code, payment_term_days, vendor
        po_data: Dictionary containing matched PO data
            Expected keys: total_amount, currency, payment_term_days, vendor_name
            
    Returns:
        Dict containing:
        - overall_status: Overall MatchResult for the invoice
        - comparisons: Dictionary of individual field comparison results
        
    Example:
        >>> invoice = {
        ...     'amount': 3100.00,
        ...     'currency_code': 'USD', 
        ...     'payment_term_days': 30,
        ...     'vendor': 'Your Office LLC'
        ... }
        >>> po = {
        ...     'total_amount': 3055.00,
        ...     'currency': 'USD',
        ...     'payment_term_days': None,
        ...     'vendor_name': 'Your Office LLC'
        ... }
        >>> perform_comprehensive_comparison(invoice, po)
        {
            'overall_status': MatchResult.ESCALATION_REQUIRED,
            'comparisons': {...}
        }
    """
    # Perform individual comparisons
    comparisons = {}
    
    # Amount comparison
    comparisons['amount'] = compare_amounts(
        invoice_data.get('amount'),
        po_data.get('total_amount')
    )
    
    # Currency comparison  
    comparisons['currency'] = compare_currencies(
        invoice_data.get('currency_code'),
        po_data.get('currency')
    )
    
    # Payment terms comparison
    comparisons['payment_terms'] = compare_payment_terms(
        invoice_data.get('payment_term_days'),
        po_data.get('payment_term_days')
    )
    
    # Vendor comparison
    comparisons['vendor'] = compare_vendors(
        invoice_data.get('vendor'),
        po_data.get('vendor_name')
    )
    
    # Determine overall status using AP processor escalation rules
    results = [comp['result'] for comp in comparisons.values()]
    
    if MatchResult.ESCALATION_REQUIRED in results:
        overall_status = MatchResult.ESCALATION_REQUIRED
    elif MatchResult.WITHIN_TOLERANCE in results:
        overall_status = MatchResult.WITHIN_TOLERANCE  
    else:
        overall_status = MatchResult.PERFECT_MATCH
    
    return {
        'overall_status': overall_status,
        'comparisons': comparisons
    }