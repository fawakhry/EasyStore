# Resource startup failure identified; targeted fix passed (2026-11-10)

The user startup log reached EnableVisualStyles and then failed while constructing the first form: string-reader type initialization threw NullReferenceException because GetManifestResourceStream("Easy Store V4.2$") returned null.

Original metadata contains a <Module>..cctor calling the resource resolver bootstrap; recovered C# had no module initializer. The embedded Easy Store V4.2& bytes were intact. Restored the original bootstrap call in diagnostic Main before the original entry point. The unpacker now reads DeflateStream until EOF instead of assuming full reads. No DES/format/license branch was removed.

Cold targeted smoke test on .NET 8 host, invoking the actual new bootstrap helper from EXE: resource missing before initialization, available after; packed resource assembly loads; a known UI string decodes to 144 characters. This is not a Windows/.NET 3.5 UI/runtime test.

ComponentResourceManager source adaptation restores original simple type resource names after identifier normalization. All 312 constructor sites / 306 types map to actual packed resources. Full UI resource deserialization is not tested.

Compilation: zero errors. Post-build: 19 RVA fields byte-verified; original embedded resource matches. Database and Trend integration untouched. Windows test pending.

Artifact: EasyStore_Resource_Startup_Fix_20261110.tar.gz (24,351,110 bytes). SHA-256: 00592f8e1bfa650f1e375af22b7a4260a577a3e2b717d567d70bdac265d63459. Contains 321 verified files, including 313 changed C# source files, diagnostic EXE and smoke/coverage evidence. Apply to the existing isolated runtime test folder, retain dependencies, run Run_EasyStore_Diagnostic.cmd and inspect the next startup log if necessary.

Original startup crash evidence is now understood; successful full Windows startup is not yet established. Public branch remains documentation/our generic utilities only; original application source remains privately delivered.
