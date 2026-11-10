# Windows startup attempt failed — diagnosis pending (2026-11-10)

The user attempted to start the rebuilt candidate on Windows and received the generic "Easy Store V4.2 has stopped working" dialog. The exception and faulting module are not yet known. Compilation success and static data/resource checks remain valid; startup success is not established. A read-only event-log collector was delivered to obtain .NET Runtime/Application Error/WER details and .NET Framework installation state. No new rebuild or speculative fix was made from the screenshot alone.

---

# Recovery checkpoint — first successful C# build (2026-11-10)

**Compilation succeeded with zero compiler errors. Windows runtime execution is not tested.**

| Milestone | Error diagnostics |
|---|---:|
| Initial recovery | 63,234 |
| Identifier/source normalization | 15,594 |
| Supplied matching Crystal 10.5.3700.0 references | 699 |
| Remaining COM named-indexer repairs | 18 |
| Final C# build | 0 |

A new EXE was built from recovered C# source. It is not the installer EXE. Entry-point wrapper invokes the original normalized entry method and retains STAThread. Repaired C# representations include metadata type qualification, QRCoder enum names, COM get_Range calls, null byte-ref/pointer expressions, a decimal ref declaration and an implicit object base constructor.

Post-build RestoreRva restored and byte-verified 19 static-data fields. One embedded managed resource matches the original byte-for-byte. EXE SHA-256: `35357C62EE4FDF1E70B172F39FA2D7E9B988BBFF46BEC5CAEB87E7ABC1406D78`. Assembly version: 4.2.0.0. No activation/license branch was intentionally removed or disabled.

Artifact: `EasyStore_Rebuilt_CSharp_Test_20261110.tar.gz`, 60,414,937 bytes. Archive SHA-256: `86294cacf5a53b5d69708f29f220b2d0ec8736b14ec45e4264edf68f4e8d194c`. 2,920 files fully read during archive validation. Includes runtime candidate, source, original database copies, dependencies, reports, mappings, repair records, logs and recovery tool sources.

Not verified: Windows startup, SQL attachment, UI behavior, printing, reflection/resource-name binding, tamper/signing behavior, licensing, accounting correctness, or full semantic equivalence. Obfuscated control flow remains. Database copies are in database-template and were never attached/modified. Trend integration and data import have not started. Next step is a Windows smoke test with an isolated test database; this is not a production replacement.

Public branch contains documentation and our recovery utilities only. Recovered application source, binary and database remain in the privately delivered artifact. Branch: recovery/easystore-4.2.2; main unchanged.
