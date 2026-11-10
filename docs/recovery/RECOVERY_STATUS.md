# Recovery checkpoint — 2026-11-10

Metadata identifier normalization and source repair completed experimentally. No runnable rebuild exists.

| Stage | Compiler error diagnostics |
|---|---:|
| Previous recovered source | 63,234 |
| First identifier normalization | 30,800 |
| Whitespace/interface/debugger-attribute fixes | 15,994 |
| Metadata-backed source qualification and repairs | 15,594 |

Latest diagnostics are exclusively CS0246 for missing Crystal Reports names. Counts are cascading diagnostics, not independent defects. Other errors may appear after references are supplied.

79,780 definitions and 38,049 parameters were renamed; 14,772 repeated debugger attributes were removed. 2,721 C# files were recovered. Opcode/literal/branch fingerprints match for 62,798 method bodies before/after rewriting; member-reference operand equivalence, reflection, resource binding, signing, virtual dispatch and runtime behavior are not proven.

Required dependencies: CrystalDecisions.CrystalReports.Engine, CrystalDecisions.ReportSource, CrystalDecisions.Windows.Forms and CrystalDecisions.Shared, referenced at 10.5.3700.0. Need the original compatible assemblies, not fabricated stubs. Static RVA initializer bytes are exported for later restoration; decompiled C# alone does not preserve those initializers. No activation/license check was intentionally removed or altered. Trend integration has not started.

New checkpoint: EasyStore_Normalized_Source_20261110.tar.gz, containing source, dependencies available in installer, database copies, name map, RVA data, repair records and logs. The earlier saved ZIP failed archive opening on restore; this run regenerated from the original RAR. Verify the new archive checksum before relying on transfer integrity.

Public repository contains our recovery utility and documentation only. Recovered third-party source/database remain in the privately delivered archive. Branch: recovery/easystore-4.2.2; main unchanged.
