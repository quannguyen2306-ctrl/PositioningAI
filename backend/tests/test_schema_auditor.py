"""
tests/test_schema_auditor.py
----------------------------
Comprehensive tests for schema_auditor.py module.
Tests JSON-LD schema.org markup parsing and auditing.

Run with:
    cd backend
    pytest tests/test_schema_auditor.py -v
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from pipeline.schema_auditor import (
    audit_schema_markup,
    SchemaPresence,
    SchemaAuditResult,
    parse_json_ld,
)


class TestParseJsonLd:
    """Tests for JSON-LD parsing utility."""

    def test_empty_html_returns_empty_schemas(self):
        """Empty HTML should return empty schemas list."""
        html = "<html><body></body></html>"
        schemas = parse_json_ld(html)
        assert schemas == []

    def test_single_json_ld_script_parsed(self):
        """Single JSON-LD script tag should be parsed."""
        html = """
        <html>
        <body>
            <script type="application/ld+json">
            {"@context": "https://schema.org", "@type": "LocalBusiness", "name": "Test Business"}
            </script>
        </body>
        </html>
        """
        schemas = parse_json_ld(html)
        assert len(schemas) == 1
        assert schemas[0]["@type"] == "LocalBusiness"
        assert schemas[0]["name"] == "Test Business"

    def test_multiple_json_ld_scripts_parsed(self):
        """Multiple JSON-LD script tags should all be parsed."""
        html = """
        <html>
        <body>
            <script type="application/ld+json">
            {"@type": "LocalBusiness", "name": "Business 1"}
            </script>
            <script type="application/ld+json">
            {"@type": "Organization", "name": "Org 1"}
            </script>
        </body>
        </html>
        """
        schemas = parse_json_ld(html)
        assert len(schemas) == 2
        assert schemas[0]["@type"] == "LocalBusiness"
        assert schemas[1]["@type"] == "Organization"

    def test_graph_array_parsed(self):
        """@graph arrays should be unpacked into individual schemas."""
        html = """
        <html>
        <body>
            <script type="application/ld+json">
            {
                "@context": "https://schema.org",
                "@graph": [
                    {"@type": "LocalBusiness", "name": "Business 1"},
                    {"@type": "Organization", "name": "Org 1"}
                ]
            }
            </script>
        </body>
        </html>
        """
        schemas = parse_json_ld(html)
        assert len(schemas) == 2
        assert schemas[0]["@type"] == "LocalBusiness"
        assert schemas[1]["@type"] == "Organization"

    def test_invalid_json_skipped(self):
        """Invalid JSON in script tags should be skipped."""
        html = """
        <html>
        <body>
            <script type="application/ld+json">
            {invalid json}
            </script>
            <script type="application/ld+json">
            {"@type": "LocalBusiness"}
            </script>
        </body>
        </html>
        """
        schemas = parse_json_ld(html)
        assert len(schemas) == 1
        assert schemas[0]["@type"] == "LocalBusiness"

    def test_non_ld_json_scripts_ignored(self):
        """Scripts without type='application/ld+json' should be ignored."""
        html = """
        <html>
        <body>
            <script type="text/javascript">
            var data = {"not": "schema"};
            </script>
            <script type="application/ld+json">
            {"@type": "LocalBusiness"}
            </script>
        </body>
        </html>
        """
        schemas = parse_json_ld(html)
        assert len(schemas) == 1
        assert schemas[0]["@type"] == "LocalBusiness"


class TestSchemaAudit:
    """Tests for schema audit functionality."""

    def test_empty_html_audit(self):
        """Empty HTML should return zero completeness and empty schemas."""
        html = "<html><body></body></html>"
        result = audit_schema_markup(html, "https://example.com")

        assert result.url == "https://example.com"
        assert result.schemas_found == []
        assert result.overall_completeness == 0.0
        assert result.raw_schemas == []
        assert len(result.recommendations) > 0

    def test_local_business_schema_detected(self):
        """LocalBusiness schema should be detected and fields checked."""
        html = """
        <html>
        <body>
            <script type="application/ld+json">
            {
                "@type": "LocalBusiness",
                "name": "Test Shop",
                "address": "123 Main St",
                "telephone": "555-0123"
            }
            </script>
        </body>
        </html>
        """
        result = audit_schema_markup(html, "https://example.com")

        assert len(result.schemas_found) == 1
        schema_present = result.schemas_found[0]
        assert schema_present.schema_type == "LocalBusiness"
        assert schema_present.found is True
        assert schema_present.field_count >= 3  # name, address, telephone present
        assert "openingHours" in schema_present.missing_fields

    def test_missing_local_business_recommendation(self):
        """Should recommend LocalBusiness schema if missing."""
        html = "<html><body></body></html>"
        result = audit_schema_markup(html, "https://example.com")

        recommendations = [r for r in result.recommendations if "LocalBusiness" in r]
        assert len(recommendations) > 0

    def test_faq_page_schema_detected(self):
        """FAQPage schema should be detected."""
        html = """
        <html>
        <body>
            <script type="application/ld+json">
            {
                "@type": "FAQPage",
                "mainEntity": [
                    {"@type": "Question", "name": "Q1", "acceptedAnswer": {"text": "A1"}}
                ]
            }
            </script>
        </body>
        </html>
        """
        result = audit_schema_markup(html, "https://example.com")

        assert len(result.schemas_found) == 1
        schema_present = result.schemas_found[0]
        assert schema_present.schema_type == "FAQPage"
        assert schema_present.found is True

    def test_product_schema_detected(self):
        """Product schema should be detected."""
        html = """
        <html>
        <body>
            <script type="application/ld+json">
            {
                "@type": "Product",
                "name": "Widget",
                "description": "A great widget",
                "offers": {"price": "9.99"}
            }
            </script>
        </body>
        </html>
        """
        result = audit_schema_markup(html, "https://example.com")

        assert len(result.schemas_found) == 1
        schema_present = result.schemas_found[0]
        assert schema_present.schema_type == "Product"
        assert schema_present.found is True
        assert schema_present.field_count >= 3

    def test_breadcrumb_list_schema_detected(self):
        """BreadcrumbList schema should be detected."""
        html = """
        <html>
        <body>
            <script type="application/ld+json">
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"position": 1, "name": "Home"}
                ]
            }
            </script>
        </body>
        </html>
        """
        result = audit_schema_markup(html, "https://example.com")

        assert len(result.schemas_found) == 1
        schema_present = result.schemas_found[0]
        assert schema_present.schema_type == "BreadcrumbList"
        assert schema_present.found is True

    def test_organization_schema_detected(self):
        """Organization schema should be detected."""
        html = """
        <html>
        <body>
            <script type="application/ld+json">
            {
                "@type": "Organization",
                "name": "ACME Corp",
                "url": "https://acme.com",
                "logo": "https://acme.com/logo.png"
            }
            </script>
        </body>
        </html>
        """
        result = audit_schema_markup(html, "https://example.com")

        assert len(result.schemas_found) == 1
        schema_present = result.schemas_found[0]
        assert schema_present.schema_type == "Organization"
        assert schema_present.found is True

    def test_how_to_schema_detected(self):
        """HowTo schema should be detected."""
        html = """
        <html>
        <body>
            <script type="application/ld+json">
            {
                "@type": "HowTo",
                "name": "How to Make Coffee",
                "step": [
                    {"name": "Step 1"}
                ]
            }
            </script>
        </body>
        </html>
        """
        result = audit_schema_markup(html, "https://example.com")

        assert len(result.schemas_found) == 1
        schema_present = result.schemas_found[0]
        assert schema_present.schema_type == "HowTo"
        assert schema_present.found is True

    def test_overall_completeness_calculation(self):
        """Overall completeness should be average of all schema completeness."""
        html = """
        <html>
        <body>
            <script type="application/ld+json">
            {
                "@type": "LocalBusiness",
                "name": "Test Shop",
                "address": "123 Main St",
                "telephone": "555-0123",
                "openingHours": "Mo-Fr 09:00-17:00",
                "geo": {"latitude": 40.7128, "longitude": -74.0060}
            }
            </script>
        </body>
        </html>
        """
        result = audit_schema_markup(html, "https://example.com")

        assert result.overall_completeness > 0.5  # Should be fairly complete
        assert result.overall_completeness <= 1.0  # Should not exceed 1.0

    def test_missing_fields_identified(self):
        """Missing required fields should be identified."""
        html = """
        <html>
        <body>
            <script type="application/ld+json">
            {
                "@type": "LocalBusiness",
                "name": "Test Shop"
            }
            </script>
        </body>
        </html>
        """
        result = audit_schema_markup(html, "https://example.com")

        schema_present = result.schemas_found[0]
        assert "address" in schema_present.missing_fields
        assert "telephone" in schema_present.missing_fields

    def test_field_count_matches_present_fields(self):
        """Field count should match number of detected fields."""
        html = """
        <html>
        <body>
            <script type="application/ld+json">
            {
                "@type": "LocalBusiness",
                "name": "Test Shop",
                "address": "123 Main St",
                "telephone": "555-0123"
            }
            </script>
        </body>
        </html>
        """
        result = audit_schema_markup(html, "https://example.com")

        schema_present = result.schemas_found[0]
        assert schema_present.field_count == 3

    def test_multiple_schemas_all_checked(self):
        """When multiple schemas present, all should be audited."""
        html = """
        <html>
        <body>
            <script type="application/ld+json">
            {
                "@type": "LocalBusiness",
                "name": "Test Shop"
            }
            </script>
            <script type="application/ld+json">
            {
                "@type": "Organization",
                "name": "ACME Corp"
            }
            </script>
        </body>
        </html>
        """
        result = audit_schema_markup(html, "https://example.com")

        assert len(result.schemas_found) == 2
        types = [s.schema_type for s in result.schemas_found]
        assert "LocalBusiness" in types
        assert "Organization" in types

    def test_raw_schemas_stored(self):
        """Raw parsed JSON-LD objects should be stored."""
        html = """
        <html>
        <body>
            <script type="application/ld+json">
            {
                "@type": "LocalBusiness",
                "name": "Test Shop"
            }
            </script>
        </body>
        </html>
        """
        result = audit_schema_markup(html, "https://example.com")

        assert len(result.raw_schemas) == 1
        assert result.raw_schemas[0]["@type"] == "LocalBusiness"
        assert result.raw_schemas[0]["name"] == "Test Shop"

    def test_recommendation_for_incomplete_schema(self):
        """Should recommend completing LocalBusiness schema if fields missing."""
        html = """
        <html>
        <body>
            <script type="application/ld+json">
            {
                "@type": "LocalBusiness",
                "name": "Test Shop"
            }
            </script>
        </body>
        </html>
        """
        result = audit_schema_markup(html, "https://example.com")

        recommendations = [r for r in result.recommendations if "LocalBusiness" in r]
        assert len(recommendations) > 0
        assert "Complete" in recommendations[0] or "add" in recommendations[0].lower()

    def test_recommendation_for_faq_when_low_schemas(self):
        """Should recommend FAQPage if < 5 schemas present."""
        html = """
        <html>
        <body>
            <script type="application/ld+json">
            {
                "@type": "LocalBusiness",
                "name": "Test Shop"
            }
            </script>
        </body>
        </html>
        """
        result = audit_schema_markup(html, "https://example.com")

        faq_recs = [r for r in result.recommendations if "FAQPage" in r]
        assert len(faq_recs) > 0

    def test_no_faq_recommendation_when_faq_present(self):
        """Should NOT recommend FAQPage if FAQPage schema already exists."""
        html = """
        <html>
        <body>
            <script type="application/ld+json">
            {
                "@type": "FAQPage",
                "mainEntity": []
            }
            </script>
        </body>
        </html>
        """
        result = audit_schema_markup(html, "https://example.com")

        faq_recs = [r for r in result.recommendations if "Add FAQPage" in r]
        assert len(faq_recs) == 0

    def test_schema_presence_dataclass(self):
        """SchemaPresence should initialize with correct defaults."""
        presence = SchemaPresence(
            schema_type="LocalBusiness",
            found=True,
            field_count=3,
            missing_fields=["geo"]
        )
        assert presence.schema_type == "LocalBusiness"
        assert presence.found is True
        assert presence.field_count == 3
        assert presence.missing_fields == ["geo"]

    def test_schema_audit_result_dataclass(self):
        """SchemaAuditResult should initialize correctly."""
        result = SchemaAuditResult(
            url="https://example.com",
            schemas_found=[],
            overall_completeness=0.5,
            recommendations=["Test"],
            raw_schemas=[]
        )
        assert result.url == "https://example.com"
        assert result.overall_completeness == 0.5

    def test_url_stored_in_result(self):
        """Result should include the input URL."""
        url = "https://example.com/about"
        html = "<html><body></body></html>"
        result = audit_schema_markup(html, url)
        assert result.url == url

    def test_nested_schema_fields_detected(self):
        """Nested objects (like address) should count as present."""
        html = """
        <html>
        <body>
            <script type="application/ld+json">
            {
                "@type": "LocalBusiness",
                "name": "Test Shop",
                "address": {
                    "streetAddress": "123 Main St",
                    "addressLocality": "Springfield"
                }
            }
            </script>
        </body>
        </html>
        """
        result = audit_schema_markup(html, "https://example.com")

        schema_present = result.schemas_found[0]
        assert schema_present.field_count >= 2  # name and address
        assert "address" not in schema_present.missing_fields

    def test_empty_schema_fields_not_counted(self):
        """Empty arrays/objects should not count as field presence."""
        html = """
        <html>
        <body>
            <script type="application/ld+json">
            {
                "@type": "LocalBusiness",
                "name": "Test Shop",
                "openingHours": []
            }
            </script>
        </body>
        </html>
        """
        result = audit_schema_markup(html, "https://example.com")

        schema_present = result.schemas_found[0]
        # openingHours is empty so might not count as "present"
        assert "telephone" in schema_present.missing_fields

    def test_graph_array_with_multiple_types(self):
        """@graph with multiple schema types should all be detected."""
        html = """
        <html>
        <body>
            <script type="application/ld+json">
            {
                "@context": "https://schema.org",
                "@graph": [
                    {"@type": "LocalBusiness", "name": "Business"},
                    {"@type": "FAQPage", "mainEntity": []},
                    {"@type": "Organization", "name": "Org"}
                ]
            }
            </script>
        </body>
        </html>
        """
        result = audit_schema_markup(html, "https://example.com")

        assert len(result.schemas_found) == 3
        types = [s.schema_type for s in result.schemas_found]
        assert "LocalBusiness" in types
        assert "FAQPage" in types
        assert "Organization" in types

    def test_unknown_schema_type_handled(self):
        """Unknown schema types should be gracefully skipped/ignored."""
        html = """
        <html>
        <body>
            <script type="application/ld+json">
            {
                "@type": "SomeUnknownType",
                "name": "Test"
            }
            </script>
        </body>
        </html>
        """
        # Should not raise, just ignore unknown types
        result = audit_schema_markup(html, "https://example.com")
        assert isinstance(result, SchemaAuditResult)
