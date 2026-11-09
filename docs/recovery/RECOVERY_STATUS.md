# Recovery checkpoint

Decompilation completed using ILSpy 9.1.0.7988. The recovered project targets .NET Framework 3.5 Windows Forms. This is not a verified rebuild.

The deliverable is EasyStore_Recovered_Code_and_DB.zip (~35 MB), containing decompiled source/resources, recovered DLLs/configuration/reports, database files, dependency inventory and first build log. It excludes installer executables, PDBs and nested package archives. The larger scratch-only EasyStore_Recovery_Checkpoint.zip is not the delivered artifact.

Build attempt stopped at MSB3644 (missing .NET Framework 3.5 reference assemblies). Four CrystalDecisions references at 10.5.3700.0 are absent from the extracted installer files. Obfuscation and decompiler warnings remain to be resolved. No Trend integration or database migration was performed.

Source and database are delivered privately, not published in this public repository. Next: framework references, reporting dependencies, compile diagnostics and Windows execution test with an isolated database copy.
