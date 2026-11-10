# Restore static RVA data after C# rebuild

Build with .NET SDK 8 and `-p:CecilAssemblyPath=/absolute/path/to/Mono.Cecil.dll` (Mono.Cecil 0.11.6).

Run with four arguments: compiled EXE, separate output EXE, exported `.rva-data.json`, original EXE. It restores original byte initializers to matching fields and verifies every restored byte and each original embedded managed resource. It emits an adjacent `.verification.json`.

Use a separate output path. It does not test Windows runtime behavior or prove semantic equivalence. Runtime, reflection, signing/tamper behavior, database attachment and printing require separate testing. Original activation/license logic is not intentionally disabled. Input application and exported private data are not published here.
