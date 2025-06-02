"""
AI Engineering Package

This package contains all AI/LLM related functionality including:
- Client implementations for various AI services (Anthropic, AWS Bedrock)
- Invoice extraction logic
- Image processing utilities
- AI prompts and templates
"""

from .anthropic_client import AnthropicClient
from .bedrock_client import BedrockClient
from .extract import extract_invoice_from_file, extract_invoice_from_csv
from .image_processor import get_image_from_pdf
from .prompts import INVOICE_EXTRACTION_PROMPT

__all__ = [
    'AnthropicClient',
    'BedrockClient', 
    'extract_invoice_from_file',
    'extract_invoice_from_csv',
    'get_image_from_pdf',
    'INVOICE_EXTRACTION_PROMPT'
] 