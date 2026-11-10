# Experimental metadata normalizer

Build with .NET SDK 8 and Mono.Cecil 0.11.6:

```sh
dotnet build -p:CecilAssemblyPath=/absolute/path/to/Mono.Cecil.dll
dotnet bin/Debug/net8.0/MetadataNormalizer.dll input.exe output.exe framework-reference-directory
```

Always use an isolated copy. The tool renames identifiers containing control, formatting or whitespace characters and updates resolved internal member references. Signature-based method/property/event names aim to preserve matching virtual/interface slots. It removes repeated DebuggerNonUserCode and DebuggerStepThrough attributes only.

It emits a private identifier map and a report beside the output. It checks that method-body counts, opcode sequences, literals and branch positions are unchanged after rewriting. This check excludes member-reference operands and is NOT a proof of semantic equivalence, reflection safety, resource-name binding, correct overrides, successful compilation or runtime behavior. No activation or license checks are removed. The rewritten binary is an analysis intermediate, not a release.

Recovered third-party program source and binaries are not included in this public repository.
