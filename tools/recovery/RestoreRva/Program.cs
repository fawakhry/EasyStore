using Mono.Cecil;
using System.Text.Json;
using System.Security.Cryptography;
static IEnumerable<TypeDefinition> Walk(TypeDefinition t){yield return t;foreach(var n in t.NestedTypes)foreach(var x in Walk(n))yield return x;}
static string Hash(byte[] data)=>Convert.ToHexString(SHA256.HashData(data));
var input=args[0];var output=args[1];var raw=args[2];var original=args[3];
using var module=ModuleDefinition.ReadModule(input);var types=module.Types.SelectMany(Walk).ToDictionary(t=>t.FullName);
var entries=JsonDocument.Parse(File.ReadAllText(raw)).RootElement.EnumerateArray().ToList();
var expected=new Dictionary<string,byte[]>();
foreach(var row in entries){var type=row.GetProperty("declaringType").GetString()!;var name=row.GetProperty("name").GetString()!;var bytes=Convert.FromBase64String(row.GetProperty("bytesBase64").GetString()!);if(!types.TryGetValue(type,out var t))throw new Exception("Missing data type "+type);var field=t.Fields.Single(f=>f.Name==name);if(field.FieldType.FullName!=row.GetProperty("type").GetString())throw new Exception("Data field type mismatch");field.InitialValue=bytes;field.Attributes|=FieldAttributes.HasFieldRVA;expected[type+"::"+name]=bytes;}
Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(output))!);module.Write(output);
using var check=ModuleDefinition.ReadModule(output);var actual=check.Types.SelectMany(Walk).SelectMany(t=>t.Fields).Where(f=>f.InitialValue.Length>0).ToDictionary(f=>f.DeclaringType.FullName+"::"+f.Name,f=>f.InitialValue);
foreach(var (key,value) in expected)if(!actual.TryGetValue(key,out var bytes)||!bytes.SequenceEqual(value))throw new Exception("RVA restore verification failed: "+key);
using var source=ModuleDefinition.ReadModule(original);var sourceResources=source.Resources.OfType<EmbeddedResource>().ToDictionary(r=>r.Name,r=>Hash(r.GetResourceData()));var rebuiltResources=check.Resources.OfType<EmbeddedResource>().ToDictionary(r=>r.Name,r=>Hash(r.GetResourceData()));
if(sourceResources.Count!=rebuiltResources.Count||sourceResources.Any(r=>!rebuiltResources.TryGetValue(r.Key,out var digest)||digest!=r.Value))throw new Exception("Managed resource verification failed");
var report=new{restoredRvaFields=expected.Count,verifiedRvaFields=expected.Count,managedResourcesVerified=sourceResources.Count,entryPoint=check.EntryPoint.FullName,assemblyVersion=check.Assembly.Name.Version.ToString(),references=check.AssemblyReferences.Select(r=>new{name=r.Name,version=r.Version.ToString()}),sha256=Hash(File.ReadAllBytes(output)),windowsRuntimeTested=false,experimental=true};
var json=JsonSerializer.Serialize(report,new JsonSerializerOptions{WriteIndented=true});File.WriteAllText(output+".verification.json",json);Console.WriteLine(json);
