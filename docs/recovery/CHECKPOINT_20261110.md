# Verified recovery checkpoint — 2026-11-10

Artifact: `EasyStore_Normalized_Source_20261110.tar.gz`

- Size: 34,385,673 bytes
- SHA-256: `c8933ad14dbfaf888658bf2ec7c6db722b7adc476803a503fb9f9d83ad8069b4`
- Saved artifact was materialized again; SHA-256 matched byte for byte.
- Final compiler error diagnostic count: 15,594, all CS0246 for Crystal Reports types/namespaces. Baseline: 63,234.
- Not a successful rebuild or a runtime-tested release.
- Raw static RVA data exported for later restoration; unsupported decompiler initializers still require treatment before a rebuilt executable can be trusted.

Next required input: original compatible CrystalDecisions 10.5.3700.0 dependencies (Engine, ReportSource, Windows.Forms, Shared), typically from the installed application or its supported runtime. Then compile again and address newly revealed errors. Do not replace these with nonfunctional stubs.

Source/database remain privately delivered. The public branch holds only the recovery tool and documentation.
