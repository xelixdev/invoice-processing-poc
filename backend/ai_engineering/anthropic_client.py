import base64
import json
import anthropic
import os
import sys
import re
from typing import Dict, Any, Optional, Union, List
from decimal import Decimal
from datetime import datetime
from .prompts import INVOICE_EXTRACTION_PROMPT
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class AnthropicClient:
    def __init__(self):
        api_key = os.getenv('ANTHROPIC_API_KEY')
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY not found in environment variables. Please set it in your .env file.")
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = "claude-3-5-sonnet-20240620"

    def _parse_numeric(self, value: str) -> Optional[float]:
        """Parse numeric values from strings, handling various formats."""
        if not value or not isinstance(value, str) or value.strip() == "":
            return None
        try:
            cleaned = "".join(c for c in value if c.isdigit() or c in ".-")
            return float(cleaned) if cleaned else None
        except (ValueError, TypeError):
            return None

    def _parse_line_items(self, items: list) -> list:
        """Parse numeric values in line items."""
        parsed_items = []
        for item in items:
            parsed_item = item.copy()
            for field in ["quantity", "unit_price", "total"]:
                if field in parsed_item and parsed_item[field] is not None:
                    parsed_item[field] = self._parse_numeric(str(parsed_item[field]))
                else:
                    # Handle cases where a numeric field might be missing or None
                    parsed_item[field] = None
            parsed_items.append(parsed_item)
        return parsed_items

    def extract_invoice_data(self, image_base64: Union[str, List[str]]) -> Dict[str, Any]:
        """
        Extract invoice data using Anthropic's Claude model from an image or list of images.

        Args:
            image_base64 (Union[str, List[str]]): Base64 encoded image(s) of the invoice(s)

        Returns:
            Dict[str, Any]: Extracted invoice data
        """
        try:
            # Always convert to list for consistent handling
            images = [image_base64] if isinstance(image_base64, str) else image_base64
            print(f"Processing {len(images)} image(s) with Anthropic...", file=sys.stderr)

            # Prepare the message content with all images
            content = [{"type": "text", "text": INVOICE_EXTRACTION_PROMPT}]
            for img in images:
                content.append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": img,
                    },
                })

            response = self.client.messages.create(
                model=self.model,
                max_tokens=1000,
                messages=[
                    {
                        "role": "user",
                        "content": content,
                    }
                ],
            )

            # Parse the response
            extracted_text = response.content[0].text
            extracted_data = json.loads(extracted_text)

            # Parse numeric values in the response
            if "invoices" in extracted_data:
                for invoice in extracted_data["invoices"]:
                    invoice["amount"] = self._parse_numeric(str(invoice.get("amount", "")))
                    invoice["tax_amount"] = self._parse_numeric(str(invoice.get("tax_amount", "")))
                    invoice["payment_term_days"] = self._parse_numeric(str(invoice.get("payment_term_days", "")))
                    if "line_items" in invoice and isinstance(invoice["line_items"], list):
                        invoice["line_items"] = self._parse_line_items(invoice["line_items"])
                    else:
                        invoice["line_items"] = []
                print(f"Found {len(extracted_data['invoices'])} invoices", file=sys.stderr)
            else:
                extracted_data["invoices"] = []
                print("No invoices found", file=sys.stderr)

            return extracted_data

        except anthropic.APIStatusError as e:
            print(f"Anthropic API returned an error: {e.status_code} - {e.message}", file=sys.stderr)
            return None
        except anthropic.APIConnectionError as e:
            print(f"Failed to connect to Anthropic API: {e}", file=sys.stderr)
            return None
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON from Anthropic response: {e}", file=sys.stderr)
            print(f"Raw response text: {extracted_text if 'extracted_text' in locals() else 'N/A'}", file=sys.stderr)
            return None
        except Exception as e:
            print(f"An unexpected error occurred in Anthropic client: {str(e)}", file=sys.stderr)
            return None 