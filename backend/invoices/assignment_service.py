"""
Invoice Assignment Service

This service handles automatic assignment of invoices to users based on natural language rules.
"""

from typing import Optional, List, Dict, Any, Tuple
from django.contrib.auth.models import User
from .models import Invoice, AssignmentRule, AssignmentRuleUser
from ai_engineering.anthropic_client import AnthropicClient
import logging
import json

logger = logging.getLogger(__name__)


class InvoiceAssignmentService:
    """Service for automatic invoice assignment based on rules."""
    
    def __init__(self):
        self.anthropic_client = AnthropicClient()
    
    def assign_invoice(self, invoice: Invoice, force_reassign: bool = False) -> Tuple[Optional[User], Optional[Dict[str, Any]]]:
        """
        Assign an invoice to a user based on assignment rules.
        
        Args:
            invoice: The invoice to assign
            force_reassign: Whether to reassign even if already assigned
            
        Returns:
            Tuple of (assigned_user, assignment_info) where both may be None.
            assignment_info contains rule details and explanation if available.
        """
        # Skip if already assigned and not forcing reassignment
        if invoice.assigned_to and not force_reassign:
            logger.info(f"Invoice {invoice.invoice_number} already assigned to {invoice.assigned_to}")
            return invoice.assigned_to, None
        
        # Get applicable rules using AI matching
        applicable_rules, rule_match = self._get_applicable_rules_with_ai(invoice)
        
        if not applicable_rules:
            logger.warning(f"No applicable rules found for invoice {invoice.invoice_number}")
            return None, None
        
        # Use the highest priority rule
        rule = applicable_rules[0]
        assigned_user = rule.get_next_user()
        
        if assigned_user:
            invoice.assigned_to = assigned_user
            invoice.save()
            logger.info(f"Assigned invoice {invoice.invoice_number} to {assigned_user} using rule '{rule.name}'")
            
            # Build assignment info
            assignment_info = {
                'rule': {
                    'id': rule.id,
                    'name': rule.name,
                    'description': rule.rule,
                    'department': rule.function_assignees,
                    'priority': rule.priority
                },
                'confidence': rule_match['confidence'] if rule_match else None,
                'explanation': rule_match['explanation'] if rule_match else f"Assigned based on matching rules for {rule.function_assignees} department"
            }
        else:
            logger.warning(f"No available user found for rule '{rule.name}' for invoice {invoice.invoice_number}")
            assignment_info = None
        
        return assigned_user, assignment_info

    def _get_applicable_rules_with_ai(self, invoice: Invoice) -> Tuple[List[AssignmentRule], Optional[Dict[str, Any]]]:
        """
        Use Claude to intelligently match invoice data against natural language rules.
        
        Args:
            invoice: The invoice to find rules for
            
        Returns:
            Tuple of (list of applicable rules in priority order, top match details)
            where top match details includes rule confidence and explanation
        """
        # Get all active rules
        active_rules = AssignmentRule.objects.filter(is_active=True).order_by('priority')
        
        if not active_rules.exists():
            return [], None
            
        # Prepare invoice data for Claude
        invoice_data = {
            "invoice_number": invoice.invoice_number,
            "amount": float(invoice.total_due),
            "currency": invoice.currency,
            "vendor": invoice.vendor.name,
            "company": invoice.company.name,
            "po_number": invoice.po_number,
            "gr_number": invoice.gr_number,
            "payment_terms": invoice.payment_terms,
            "line_items": [
                {
                    "description": item.item.description,
                    "quantity": float(item.quantity),
                    "unit_price": float(item.unit_price),
                    "total": float(item.total)
                }
                for item in invoice.line_items.all()
            ]
        }
        
        # Prepare rules data
        rules_data = [
            {
                "id": rule.id,
                "name": rule.name,
                "rule": rule.rule,
                "department": rule.function_assignees,
                "priority": rule.priority
            }
            for rule in active_rules
        ]
        
        # Create prompt for Claude
        prompt = f"""You are an expert in invoice processing and workflow assignment. Your task is to analyze an invoice and determine which assignment rules should apply to it.

Here is the invoice data:
{json.dumps(invoice_data, indent=2)}

Here are the available assignment rules:
{json.dumps(rules_data, indent=2)}

For each rule, evaluate if it should apply to this invoice based on the natural language rule description and invoice characteristics.
Consider factors like:
- Invoice amount and currency
- Vendor and company
- Line item descriptions and categories
- PO/GR presence
- Payment terms
- Department relevance

Return a JSON array of rule IDs that should apply, ordered by confidence (highest first). Include a brief explanation for each match.
Format:
[
  {{
    "rule_id": 123,
    "confidence": 0.95,
    "explanation": "Rule matches because..."
  }}
]

Only include rules where you are at least 70% confident they should apply."""

        try:
            # Get Claude's analysis
            response = self.anthropic_client.client.messages.create(
                model=self.anthropic_client.model,
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            # Parse the response - extract the JSON array from the text content
            response_text = response.content[0].text
            
            # Find the JSON array in the response text
            start_idx = response_text.find('[')
            end_idx = response_text.rfind(']') + 1
            
            if start_idx == -1 or end_idx == 0:
                logger.error("Could not find JSON array in Claude's response")
                return self._get_applicable_rules(invoice), None
                
            json_str = response_text[start_idx:end_idx]
            matches = json.loads(json_str)
            
            # Get rules in order of AI confidence
            applicable_rules = []
            top_match = None
            for match in matches:
                try:
                    rule = active_rules.get(id=match['rule_id'])
                    applicable_rules.append(rule)
                    # Store the first (highest confidence) match details
                    if not top_match:
                        top_match = {
                            'confidence': match['confidence'],
                            'explanation': match['explanation']
                        }
                    logger.info(
                        f"Rule {rule.name} matched invoice {invoice.invoice_number} "
                        f"with {match['confidence']*100:.1f}% confidence: {match['explanation']}"
                    )
                except AssignmentRule.DoesNotExist:
                    continue
            
            return applicable_rules, top_match
            
        except Exception as e:
            logger.error(f"Error using AI for rule matching: {str(e)}")
            # Fallback to basic department matching
            return self._get_applicable_rules(invoice), None
    
    def _get_applicable_rules(self, invoice: Invoice) -> List[AssignmentRule]:
        """
        Basic rule matching based on department (fallback method).
        
        Args:
            invoice: The invoice to find rules for
            
        Returns:
            List of applicable rules in priority order
        """
        # Simple matching based on line item categories or amounts
        active_rules = AssignmentRule.objects.filter(is_active=True).order_by('priority')
        
        applicable_rules = []
        for rule in active_rules:
            # Basic matching logic (fallback)
            if (
                # IT equipment items
                (rule.function_assignees == 'IT' and any('software' in item.item.description.lower() or 'hardware' in item.item.description.lower() for item in invoice.line_items.all())) or
                # High value invoices to Finance
                (rule.function_assignees == 'Finance' and invoice.total_due >= 10000) or
                # Office supplies to Operations
                (rule.function_assignees == 'Operations' and any('office' in item.item.description.lower() for item in invoice.line_items.all())) or
                # Default to Procurement
                (rule.function_assignees == 'Procurement')
            ):
                applicable_rules.append(rule)
        
        return applicable_rules
    
    def create_rule_from_data(self, rule_data: Dict[str, Any]) -> AssignmentRule:
        """
        Create an assignment rule from frontend data.
        
        Args:
            rule_data: Dictionary containing rule information
                {
                    "rule": "If an invoice is to do with software licences",
                    "function_assignees": "IT", 
                    "user_ruleset": "round_robin",
                    "users_priority": [(1, "john.smith"), (2, "sarah.johnson")]
                }
        """
        # Create the rule
        assignment_rule = AssignmentRule.objects.create(
            name=rule_data.get('name', f"Rule for {rule_data['function_assignees']}"),
            rule=rule_data['rule'],
            function_assignees=rule_data['function_assignees'],
            user_ruleset=rule_data['user_ruleset'],
            priority=rule_data.get('priority', 100)
        )
        
        # Create user priorities if provided
        if 'users_priority' in rule_data:
            for priority, username in rule_data['users_priority']:
                try:
                    user = User.objects.get(username=username)
                    AssignmentRuleUser.objects.create(
                        assignment_rule=assignment_rule,
                        user=user,
                        priority=priority
                    )
                except User.DoesNotExist:
                    logger.warning(f"User {username} not found for rule {assignment_rule.name}")
        
        return assignment_rule
    
    def get_rule_data_format(self, rule: AssignmentRule) -> Dict[str, Any]:
        """
        Convert a rule to the frontend data format.
        """
        users_priority = []
        for rule_user in rule.rule_users.all():
            users_priority.append((rule_user.priority, rule_user.user.username))
        
        return {
            "name": rule.name,
            "rule": rule.rule,
            "function_assignees": rule.function_assignees,
            "user_ruleset": rule.user_ruleset,
            "users_priority": users_priority,
            "priority": rule.priority,
            "is_active": rule.is_active
        } 