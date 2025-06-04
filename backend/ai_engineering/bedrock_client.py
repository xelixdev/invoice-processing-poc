import boto3
import json
import os
import sys
from typing import Dict, Any, Union, List, Optional
from decimal import Decimal
from prompts import INVOICE_EXTRACTION_PROMPT

# Set AWS region in environment variable
os.environ["AWS_DEFAULT_REGION"] = "us-east-1"


class BedrockClient:
    def __init__(self):
        # Create session with explicit region
        session = boto3.Session(region_name="us-east-1")
        self.client = session.client("bedrock-runtime")
        self.model_id = (
            "anthropic.claude-3-5-sonnet-20240620-v1:0"  # Using Claude 3.5 Sonnet
        )

    def _parse_numeric(self, value: str) -> Optional[float]:
        """Parse numeric values from strings, handling various formats."""
        if not value or not isinstance(value, str) or value.strip() == "":
            return None
        try:
            # Remove currency symbols and other non-numeric characters except decimal point and minus
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
                if field in parsed_item:
                    parsed_item[field] = self._parse_numeric(str(parsed_item[field]))
            parsed_items.append(parsed_item)
        return parsed_items

    def extract_invoice_data(self, image_base64: Union[str, List[str]]) -> Dict[str, Any]:
        """
        Extract invoice data using AWS Bedrock's Claude model from an image or list of images.

        Args:
            image_base64 (Union[str, List[str]]): Base64 encoded image(s) of the invoice(s)

        Returns:
            Dict[str, Any]: Extracted invoice data
        """
        try:
            # Always convert to list for consistent handling
            images = [image_base64] if isinstance(image_base64, str) else image_base64
            print(f"Processing {len(images)} image(s) with AWS Bedrock...", file=sys.stderr)

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

            response = self.client.invoke_model(
                modelId=self.model_id,
                body=json.dumps(
                    {
                        "anthropic_version": "bedrock-2023-05-31",
                        "max_tokens": 1000,
                        "messages": [
                            {
                                "role": "user",
                                "content": content,
                            }
                        ],
                    }
                ),
            )

            # Parse the response
            response_body = json.loads(response["body"].read())
            extracted_text = response_body["content"][0]["text"]

            # Parse the JSON response
            extracted_data = json.loads(extracted_text)

            # Parse numeric values in the response
            if extracted_data.get("invoices"):
                for invoice in extracted_data["invoices"]:
                    # Parse main invoice amounts
                    invoice["amount"] = self._parse_numeric(str(invoice.get("amount", "")))
                    invoice["tax_amount"] = self._parse_numeric(str(invoice.get("tax_amount", "")))
                    invoice["payment_term_days"] = self._parse_numeric(str(invoice.get("payment_term_days", "")))

                    # Parse line items
                    if "line_items" in invoice:
                        invoice["line_items"] = self._parse_line_items(invoice["line_items"])
                print(f"Found {len(extracted_data['invoices'])} invoices", file=sys.stderr)
            else:
                print("No invoices found", file=sys.stderr)

            return extracted_data

        except Exception as e:
            print(f"Error calling Bedrock: {str(e)}", file=sys.stderr)
            return None
