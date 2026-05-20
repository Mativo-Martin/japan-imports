from dataclasses import dataclass, field, asdict
from typing import Optional

SHIPPING_DEFAULTS = {
    "sedan":     1400.0,
    "suv":       1600.0,
    "hatchback": 1350.0,
    "wagon":     1450.0,
    "pickup":    1700.0,
    "minivan":   1550.0,
    "coupe":     1350.0,
    "default":   1500.0,
}

@dataclass
class ImportCostBreakdown:
    purchase_usd:        float
    shipping_usd:        float
    insurance_usd:       float
    cif_usd:             float
    usd_kes_rate:        float
    cif_kes:             float

    # KRA taxes (all in KES)
    customs_duty_kes:    float   # 25% of CIF
    excise_duty_kes:     float   # 20% of (CIF + customs)
    vat_kes:             float   # 16% of (CIF + customs + excise)
    idf_levy_kes:        float   # 3.5% of CIF, min KES 5,000
    rdl_levy_kes:        float   # 2.0% of CIF

    # Port and local charges (KES)
    port_cfs_kes:        float   # container freight station
    clearing_agent_kes:  float
    ntsa_inspection_kes: float
    number_plates_kes:   float
    comprehensive_ins_kes: float # 1 yr comprehensive insurance

    total_import_kes:    float
    total_import_usd:    float

    # convenience
    tax_total_kes:       float
    charges_total_kes:   float

    def to_dict(self) -> dict:
        return asdict(self)


def calculate_import_cost(
    purchase_usd:      float,
    body_type:         str   = "sedan",
    shipping_usd:      Optional[float] = None,
    usd_kes:           float = 130.0,
    clearing_agent_kes: float = 40_000.0,
) -> ImportCostBreakdown:
    """
    All formulas reference KRA customs tariff schedule (2024).
    CIF = Cost + Insurance + Freight (the dutiable value).
    """

    # 1. Build CIF value
    ship_usd  = shipping_usd or SHIPPING_DEFAULTS.get(
                    body_type.lower(), SHIPPING_DEFAULTS["default"])
    insure_usd = round(purchase_usd * 0.015, 2)   # 1.5% of purchase
    cif_usd    = purchase_usd + ship_usd + insure_usd
    cif_kes    = round(cif_usd * usd_kes, 2)

    # 2. KRA taxes
    customs   = round(cif_kes * 0.25,   2)               # Customs Duty   25%
    excise    = round((cif_kes + customs) * 0.20, 2)      # Excise Duty    20%
    vat       = round((cif_kes + customs + excise) * 0.16, 2)  # VAT       16%
    idf       = round(max(cif_kes * 0.035, 5_000), 2)    # IDF Levy   3.5%, min 5k
    rdl       = round(cif_kes * 0.02,   2)               # RDL Levy    2.0%

    tax_total = customs + excise + vat + idf + rdl

    # 3. Port & local charges (KES, approximate 2024 rates)
    port_cfs       = 35_000.0    # KPA container freight station
    ntsa_inspect   = 5_000.0     # NTSA inspection fee
    plates         = 3_500.0     # number plates
    comp_ins       = round(purchase_usd * usd_kes * 0.03, 2)  # 3% vehicle value

    charges_total = port_cfs + clearing_agent_kes + ntsa_inspect + plates + comp_ins

    # 4. Grand total
    total_kes = cif_kes + tax_total + charges_total
    total_usd = round(total_kes / usd_kes, 2)

    return ImportCostBreakdown(
        purchase_usd=purchase_usd,
        shipping_usd=ship_usd,
        insurance_usd=insure_usd,
        cif_usd=cif_usd,
        usd_kes_rate=usd_kes,
        cif_kes=cif_kes,
        customs_duty_kes=customs,
        excise_duty_kes=excise,
        vat_kes=vat,
        idf_levy_kes=idf,
        rdl_levy_kes=rdl,
        port_cfs_kes=port_cfs,
        clearing_agent_kes=clearing_agent_kes,
        ntsa_inspection_kes=ntsa_inspect,
        number_plates_kes=plates,
        comprehensive_ins_kes=comp_ins,
        total_import_kes=round(total_kes, 2),
        total_import_usd=total_usd,
        tax_total_kes=round(tax_total, 2),
        charges_total_kes=round(charges_total, 2),
    )
