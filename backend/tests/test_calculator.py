import pytest
from app.calculator.kra import calculate_import_cost

RATE = 130.0   # fixed rate for deterministic tests

def test_cif_calculation():
    c = calculate_import_cost(5000, "sedan", 1400.0, RATE)
    expected_cif_usd = 5000 + 1400 + (5000 * 0.015)
    assert abs(c.cif_usd - expected_cif_usd) < 0.1

def test_customs_duty_is_25_pct_of_cif():
    c = calculate_import_cost(5000, "sedan", 1400.0, RATE)
    assert abs(c.customs_duty_kes - c.cif_kes * 0.25) < 1.0

def test_excise_duty_formula():
    c = calculate_import_cost(5000, "sedan", 1400.0, RATE)
    expected = (c.cif_kes + c.customs_duty_kes) * 0.20
    assert abs(c.excise_duty_kes - expected) < 1.0

def test_vat_formula():
    c = calculate_import_cost(5000, "sedan", 1400.0, RATE)
    expected = (c.cif_kes + c.customs_duty_kes + c.excise_duty_kes) * 0.16
    assert abs(c.vat_kes - expected) < 1.0

def test_idf_minimum_floor():
    c = calculate_import_cost(100, "sedan", 500.0, RATE)  # very cheap car
    assert c.idf_levy_kes >= 5_000.0

def test_rdl_levy_2pct():
    c = calculate_import_cost(5000, "sedan", 1400.0, RATE)
    assert abs(c.rdl_levy_kes - c.cif_kes * 0.02) < 1.0

def test_total_is_sum_of_parts():
    c = calculate_import_cost(8000, "suv", None, RATE)
    expected = (c.cif_kes + c.tax_total_kes + c.charges_total_kes)
    assert abs(c.total_import_kes - expected) < 1.0

def test_shipping_defaults_by_body_type():
    sedan = calculate_import_cost(5000, "sedan", None, RATE)
    suv   = calculate_import_cost(5000, "suv",   None, RATE)
    assert suv.shipping_usd > sedan.shipping_usd  # SUVs cost more to ship

def test_output_is_positive():
    c = calculate_import_cost(6000, "hatchback", 1350.0, RATE)
    for field in ["cif_kes", "customs_duty_kes", "excise_duty_kes",
                  "vat_kes", "total_import_kes"]:
        assert getattr(c, field) > 0
