"""
Document Matching Utilities

This module handles the process of matching extracted document reference numbers 
against database reference numbers using fuzzy string matching with Levenshtein distance.

While initially designed for Purchase Order matching, this module can be extended
to match other types of document references (invoices, goods receipts, contracts, etc.).

The matching process:
1. Normalizes both extracted and database reference numbers
2. Uses Levenshtein distance to find similar reference numbers
3. Returns the best match within the specified threshold
"""

from typing import Optional, List, Tuple


def levenshtein_distance(s1: str, s2: str) -> int:
    """
    Calculate the Levenshtein distance between two strings.
    
    The Levenshtein distance is the minimum number of single-character edits
    (insertions, deletions, or substitutions) required to change one string
    into another.
    
    Args:
        s1 (str): First string
        s2 (str): Second string
        
    Returns:
        int: The Levenshtein distance between the strings
        
    Example:
        >>> levenshtein_distance("WBS2385224", "WBS2385-224")
        1
        >>> levenshtein_distance("PO20250107002", "PO-20250107-002")
        2
    """
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)

    if len(s2) == 0:
        return len(s1)

    previous_row = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def normalize_reference(reference: str) -> str:
    """
    Normalize a document reference number for comparison.
    
    This removes common formatting variations to improve matching accuracy.
    Works for various document types: PO numbers, invoice numbers, etc.
    
    Args:
        reference (str): Document reference number to normalize
        
    Returns:
        str: Normalized reference number
        
    Example:
        >>> normalize_reference("WBS2385-224")
        "WBS2385224"
        >>> normalize_reference("inv-2025-01-07-002")
        "INV20250107002"
    """
    if not reference:
        return ""
    
    # Convert to uppercase and strip whitespace
    normalized = reference.upper().strip()
    
    # Remove common separators
    separators = ['-', '_', '.', ' ']
    for separator in separators:
        normalized = normalized.replace(separator, '')
    
    return normalized


def get_match_type(extracted_reference: str, database_reference: str, threshold: int = 2) -> str:
    """
    Determine the type of match between two document reference numbers.
    
    Args:
        extracted_reference (str): Reference number from extracted document
        database_reference (str): Reference number from database
        threshold (int): Maximum edit distance for fuzzy matching
        
    Returns:
        str: Match type ('exact', 'close', or 'poor')
        
    Example:
        >>> get_match_type("WBS2385-224", "WBS2385-224", 2)
        'exact'
        >>> get_match_type("WBS2385224", "WBS2385-224", 2)
        'close'
        >>> get_match_type("INVALID123", "WBS2385-224", 2)
        'poor'
    """
    # Normalize both strings for comparison
    norm_extracted = normalize_reference(extracted_reference)
    norm_database = normalize_reference(database_reference)
    
    # Check for exact match first
    if norm_extracted == norm_database:
        return 'exact'
    
    # Calculate Levenshtein distance
    distance = levenshtein_distance(norm_extracted, norm_database)
    
    # Determine match quality
    if distance <= threshold:
        return 'close'
    else:
        return 'poor'


def find_best_match(
    extracted_reference: str, 
    database_references: List[str], 
    threshold: int = 2
) -> Optional[Tuple[str, str]]:
    """
    Find the best matching document reference from the database for an extracted reference.
    
    Uses Levenshtein distance to find the most similar reference number within the threshold.
    
    Args:
        extracted_reference (str): Reference number extracted from document
        database_references (List[str]): List of all reference numbers in database
        threshold (int): Maximum edit distance for fuzzy matching (default: 2)
        
    Returns:
        Optional[Tuple[str, str]]: Tuple of (matched_reference, match_type) or None if no match
        
    Example:
        >>> database_refs = ["WBS2385-224", "PO-20250107-002"]
        >>> find_best_match("WBS2385224", database_refs, 2)
        ("WBS2385-224", "close")
        >>> find_best_match("INVALID123", database_refs, 2)
        None
    """
    if not extracted_reference or not database_references:
        return None
    
    extracted_reference = extracted_reference.strip()
    if not extracted_reference:
        return None
    
    # Normalize the extracted reference for comparison
    norm_extracted = normalize_reference(extracted_reference)
    
    best_match = None
    best_distance = float('inf')
    best_match_type = 'poor'
    
    for database_reference in database_references:
        if not database_reference:
            continue
            
        # Get match type for this reference
        match_type = get_match_type(extracted_reference, database_reference, threshold)
        
        # If we found an exact match, return immediately
        if match_type == 'exact':
            return (database_reference, 'exact')
        
        # For fuzzy matches, track the best one
        if match_type == 'close':
            norm_database = normalize_reference(database_reference)
            distance = levenshtein_distance(norm_extracted, norm_database)
            
            if distance < best_distance:
                best_distance = distance
                best_match = database_reference
                best_match_type = 'close'
    
    # Return the best match if we found one within threshold
    if best_match and best_match_type == 'close':
        return (best_match, 'close')
    
    return None


def calculate_match_confidence(extracted_reference: str, matched_reference: str, match_type: str) -> int:
    """
    Calculate a confidence score for a document reference match.
    
    Args:
        extracted_reference (str): Original extracted reference number
        matched_reference (str): Matched reference number from database
        match_type (str): Type of match ('exact' or 'close')
        
    Returns:
        int: Confidence score from 0-100
        
    Example:
        >>> calculate_match_confidence("WBS2385-224", "WBS2385-224", "exact")
        100
        >>> calculate_match_confidence("WBS2385224", "WBS2385-224", "close")
        92
    """
    if match_type == 'exact':
        return 100
    
    # For fuzzy matches, calculate confidence based on edit distance
    norm_extracted = normalize_reference(extracted_reference)
    norm_matched = normalize_reference(matched_reference)
    
    distance = levenshtein_distance(norm_extracted, norm_matched)
    max_length = max(len(norm_extracted), len(norm_matched))
    
    if max_length == 0:
        return 0
    
    # Convert distance to confidence (inverse relationship)
    confidence = max(0, int(100 * (1 - distance / max_length)))
    return confidence


 