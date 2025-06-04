"""
Matching utilities for reference comparison in 3-way matching.
Simple prototype implementation for demo purposes.
"""

from typing import List, Dict, Tuple, Optional


def levenshtein_distance(s1: str, s2: str) -> int:
    """
    Calculate the Levenshtein distance between two strings.
    Simple implementation for prototype use.
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


def normalize_reference(ref: str) -> str:
    """
    Normalize a reference string for comparison.
    Removes whitespace and converts to uppercase.
    """
    if not ref:
        return ""
    return ref.strip().upper()


def get_match_type(ref1: str, ref2: str, threshold: int = 1) -> str:
    """
    Determine the type of match between two reference strings.
    
    Args:
        ref1: First reference string
        ref2: Second reference string  
        threshold: Maximum edit distance for close match
        
    Returns:
        'exact': Exact match
        'close': Close match (within threshold)
        'none': No match
    """
    if not ref1 or not ref2:
        return 'none'
    
    norm_ref1 = normalize_reference(ref1)
    norm_ref2 = normalize_reference(ref2)
    
    if norm_ref1 == norm_ref2:
        return 'exact'
    
    distance = levenshtein_distance(norm_ref1, norm_ref2)
    
    if distance <= threshold:
        return 'close'
    
    return 'none'


def is_reference_match(ref1: str, ref2: str, threshold: int = 1) -> bool:
    """
    Check if two references match (exact or close).
    
    Args:
        ref1: First reference string
        ref2: Second reference string
        threshold: Maximum edit distance for close match
        
    Returns:
        True if references match (exact or close), False otherwise
    """
    match_type = get_match_type(ref1, ref2, threshold)
    return match_type in ['exact', 'close']


def find_matching_references(
    extracted_ref: str, 
    reference_list: List[str], 
    threshold: int = 1
) -> Dict[str, List[str]]:
    """
    Find matching references in a list, categorized by match type.
    
    Args:
        extracted_ref: The reference extracted from document
        reference_list: List of references to compare against
        threshold: Maximum edit distance for close match
        
    Returns:
        Dictionary with 'exact' and 'close' keys containing lists of matches
    """
    results = {
        'exact': [],
        'close': []
    }
    
    for ref in reference_list:
        match_type = get_match_type(extracted_ref, ref, threshold)
        if match_type == 'exact':
            results['exact'].append(ref)
        elif match_type == 'close':
            results['close'].append(ref)
    
    return results


def find_best_match(
    extracted_ref: str, 
    reference_list: List[str], 
    threshold: int = 1
) -> Optional[Tuple[str, str]]:
    """
    Find the best match for a reference in a list.
    
    Args:
        extracted_ref: The reference extracted from document
        reference_list: List of references to compare against
        threshold: Maximum edit distance for close match
        
    Returns:
        Tuple of (matched_reference, match_type) or None if no match
    """
    matches = find_matching_references(extracted_ref, reference_list, threshold)
    
    # Prefer exact matches
    if matches['exact']:
        return matches['exact'][0], 'exact'
    
    # Fall back to close matches
    if matches['close']:
        return matches['close'][0], 'close'
    
    return None 