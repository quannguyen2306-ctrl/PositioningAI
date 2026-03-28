"""
schema_auditor.py
-----------------
Parse HTML for schema.org JSON-LD markup and audit what structured data
the business has vs. what's missing.

Primary function: audit_schema_markup(html_text, url) -> SchemaAuditResult
"""

import json
import logging
from dataclasses import dataclass, field
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# Schema types to audit for
AUDITED_SCHEMA_TYPES = {
    "LocalBusiness": {
        "name": "LocalBusiness",
        "key_fields": ["name", "address", "telephone", "openingHours", "geo"],
        "description": "Local business information with address and contact details"
    },
    "FAQPage": {
        "name": "FAQPage",
        "key_fields": ["mainEntity"],
        "description": "FAQ page for AI search answer visibility"
    },
    "HowTo": {
        "name": "HowTo",
        "key_fields": ["name", "step"],
        "description": "How-to guides"
    },
    "Product": {
        "name": "Product",
        "key_fields": ["name", "description", "offers"],
        "description": "Product information"
    },
    "BreadcrumbList": {
        "name": "BreadcrumbList",
        "key_fields": ["itemListElement"],
        "description": "Navigation breadcrumbs"
    },
    "Organization": {
        "name": "Organization",
        "key_fields": ["name", "url", "logo", "contactPoint"],
        "description": "Organization information"
    },
}


@dataclass
class SchemaPresence:
    """Information about presence and completeness of a schema type."""
    schema_type: str           # e.g. "LocalBusiness", "FAQPage"
    found: bool
    field_count: int = 0       # number of key fields present in the schema
    missing_fields: list[str] = field(default_factory=list)


@dataclass
class SchemaAuditResult:
    """Result of auditing a URL for schema.org markup."""
    url: str
    schemas_found: list[SchemaPresence]
    overall_completeness: float    # 0.0–1.0
    recommendations: list[str]
    raw_schemas: list[dict]        # the actual parsed JSON-LD objects


def parse_json_ld(html_text: str) -> list[dict]:
    """
    Parse HTML for JSON-LD schema.org markup.
    Returns a list of parsed JSON-LD objects (unpacking @graph arrays).

    Args:
        html_text: HTML content as string

    Returns:
        List of parsed JSON-LD objects
    """
    schemas = []
    soup = BeautifulSoup(html_text, "html.parser")

    # Find all <script type="application/ld+json"> tags
    script_tags = soup.find_all("script", {"type": "application/ld+json"})

    for tag in script_tags:
        if not tag.string:
            continue

        try:
            data = json.loads(tag.string)

            # Check if @graph array exists
            if isinstance(data, dict) and "@graph" in data:
                graph_items = data["@graph"]
                if isinstance(graph_items, list):
                    schemas.extend(graph_items)
                else:
                    schemas.append(graph_items)
            else:
                # Single object
                schemas.append(data)

        except json.JSONDecodeError as e:
            logger.debug(f"Failed to parse JSON-LD: {e}")
            continue

    return schemas


def _has_field(obj: dict, field_name: str) -> bool:
    """
    Check if a field exists in the object and is non-empty.

    Args:
        obj: Dictionary to check
        field_name: Field name to check

    Returns:
        True if field exists and is non-empty
    """
    if field_name not in obj:
        return False

    value = obj[field_name]

    # Empty strings, empty lists, empty dicts = not present
    if isinstance(value, (list, dict, str)):
        return len(value) > 0

    # Other falsy values
    return value is not None


def _audit_schema(schema: dict) -> tuple[str, int, list[str], float]:
    """
    Audit a single schema object for field presence.

    Args:
        schema: Parsed JSON-LD object

    Returns:
        Tuple of (schema_type, field_count, missing_fields, completeness)
    """
    schema_type = schema.get("@type", "Unknown")

    # If not a recognized type, return defaults
    if schema_type not in AUDITED_SCHEMA_TYPES:
        return schema_type, 0, [], 0.0

    key_fields = AUDITED_SCHEMA_TYPES[schema_type]["key_fields"]
    present_fields = [f for f in key_fields if _has_field(schema, f)]
    missing_fields = [f for f in key_fields if f not in present_fields]

    field_count = len(present_fields)
    completeness = len(present_fields) / len(key_fields) if key_fields else 0.0

    return schema_type, field_count, missing_fields, completeness


def audit_schema_markup(html_text: str, url: str) -> SchemaAuditResult:
    """
    Parse HTML for JSON-LD schema.org markup and return audit result.

    Args:
        html_text: HTML content as string
        url: URL being audited (for reporting)

    Returns:
        SchemaAuditResult with findings and recommendations
    """
    # Parse JSON-LD schemas
    raw_schemas = parse_json_ld(html_text)

    # Audit each schema
    schemas_found = []
    completeness_scores = []

    for schema in raw_schemas:
        schema_type, field_count, missing_fields, completeness = _audit_schema(schema)

        # Only track audited schema types
        if schema_type in AUDITED_SCHEMA_TYPES:
            presence = SchemaPresence(
                schema_type=schema_type,
                found=True,
                field_count=field_count,
                missing_fields=missing_fields,
            )
            schemas_found.append(presence)
            completeness_scores.append(completeness)

    # Calculate overall completeness
    overall_completeness = (
        sum(completeness_scores) / len(completeness_scores)
        if completeness_scores
        else 0.0
    )

    # Generate recommendations
    recommendations = _generate_recommendations(schemas_found, len(raw_schemas))

    return SchemaAuditResult(
        url=url,
        schemas_found=schemas_found,
        overall_completeness=overall_completeness,
        recommendations=recommendations,
        raw_schemas=raw_schemas,
    )


def _generate_recommendations(schemas_found: list[SchemaPresence], total_schemas: int) -> list[str]:
    """
    Generate actionable recommendations based on audit results.

    Args:
        schemas_found: List of detected schemas
        total_schemas: Total number of JSON-LD schemas found

    Returns:
        List of recommendations
    """
    recommendations = []

    # Track which schema types were found
    found_types = {s.schema_type for s in schemas_found}

    # Recommend LocalBusiness if missing
    if "LocalBusiness" not in found_types:
        recommendations.append(
            "Add LocalBusiness schema with your business name, address, and phone number. "
            "This helps AI systems understand your core business information."
        )
    else:
        # Check if LocalBusiness is complete
        local_biz = next((s for s in schemas_found if s.schema_type == "LocalBusiness"), None)
        if local_biz and local_biz.missing_fields:
            fields_str = ", ".join(local_biz.missing_fields)
            recommendations.append(
                f"Complete your LocalBusiness schema by adding: {fields_str}. "
                f"These fields improve business visibility in AI answers."
            )

    # Recommend FAQPage if < 5 schemas total and no FAQPage
    if "FAQPage" not in found_types and total_schemas < 5:
        recommendations.append(
            "Add FAQPage schema to improve visibility in AI-generated search results. "
            "This helps answer common customer questions directly in AI responses."
        )

    # Recommend Organization if missing
    if "Organization" not in found_types and total_schemas < 3:
        recommendations.append(
            "Add Organization schema with your company name, URL, and logo. "
            "This ensures consistent representation across AI systems."
        )

    # Encourage adding more structured data
    if total_schemas == 0:
        recommendations.append(
            "Start by adding at least one schema.org JSON-LD block to your website. "
            "This is crucial for AI visibility and search engine optimization."
        )
    elif total_schemas < 3:
        recommendations.append(
            "Add more schema.org markup. Having 3+ different schema types significantly "
            "improves how AI systems understand and present your business."
        )

    return recommendations
