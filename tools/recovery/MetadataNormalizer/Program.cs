using Mono.Cecil;
using Mono.Cecil.Cil;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

static class Program {
 static bool Bad(string n) => n.Any(c=>char.IsControl(c)||char.IsWhiteSpace(c)||char.GetUnicodeCategory(c)==System.Globalization.UnicodeCategory.Format);
 static string Hash(string n)=>Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(n)))[..20];
 static IEnumerable<TypeDefinition> Walk(TypeDefinition t) { yield return t;foreach(var n in t.NestedTypes)foreach(var x in Walk(n))yield return x; }
 static void Main(string[] args) {
  var resolver=new DefaultAssemblyResolver();resolver.AddSearchDirectory(Path.GetDirectoryName(Path.GetFullPath(args[0]))!);resolver.AddSearchDirectory(args[2]);
  var module=ModuleDefinition.ReadModule(args[0],new ReaderParameters{AssemblyResolver=resolver,ReadSymbols=false});
  var types=module.Types.SelectMany(Walk).ToList();
  var renames=new Dictionary<IMemberDefinition,string>();var map=new List<object>();
  void Plan(IMemberDefinition m,string name){renames[m]=name;map.Add(new{token=m.MetadataToken.ToUInt32().ToString("X8"),oldName=m.Name,newName=name,kind=m.GetType().Name});}
  foreach(var t in types){
   if(Bad(t.Name))Plan(t,"RecoveredType_"+t.MetadataToken.ToUInt32().ToString("X8")+(t.HasGenericParameters?"`"+t.GenericParameters.Count:""));
   foreach(var f in t.Fields)if(Bad(f.Name))Plan(f,"field_"+f.MetadataToken.ToUInt32().ToString("X8"));
   foreach(var p in t.Properties)if(Bad(p.Name))Plan(p,"Property_"+Hash(p.Name+"|"+p.PropertyType.FullName+"|"+string.Join("|",p.Parameters.Select(a=>a.ParameterType.FullName))));
   foreach(var e in t.Events)if(Bad(e.Name))Plan(e,"Event_"+Hash(e.Name+"|"+e.EventType.FullName));
   foreach(var m in t.Methods)if(!m.IsConstructor&&Bad(m.Name)){
    // Signature-based names keep matching internal virtual slots consistent.
    var sig=m.Name+"|"+m.GenericParameters.Count+"|"+m.ReturnType.FullName+"|"+string.Join("|",m.Parameters.Select(p=>p.ParameterType.FullName));
    Plan(m,"Method_"+Hash(sig));
   }
  }
  // Resolve and retain all internal references before any name is changed.
  var typeRefs=new List<(TypeReference,TypeDefinition)>();
  foreach(var r in module.GetTypeReferences())try{var d=r.Resolve();if(d?.Module==module)typeRefs.Add((r,d));}catch{}
  var memberRefs=new List<(MemberReference,IMemberDefinition)>();
  void Capture(MemberReference r){try{IMemberDefinition? d=r switch{MethodReference m=>m.Resolve(),FieldReference f=>f.Resolve(),_=>null};if(d?.DeclaringType.Module==module)memberRefs.Add((r,d));}catch{}}
  foreach(var r in module.GetMemberReferences())Capture(r);
  foreach(var t in types)foreach(var m in t.Methods){foreach(var o in m.Overrides)Capture(o);if(m.HasBody)foreach(var i in m.Body.Instructions)if(i.Operand is MemberReference r)Capture(r);}
  var methodFingerprint=types.SelectMany(t=>t.Methods).Where(m=>m.HasBody).ToDictionary(m=>m,m=>Fingerprint(m));
  foreach(var (d,n) in renames)d.Name=n;
  foreach(var (r,d) in typeRefs){r.Name=d.Name;r.Namespace=d.Namespace;}
  foreach(var (r,d) in memberRefs)if(renames.TryGetValue(d,out var n)){
   if(r is GenericInstanceMethod g)g.ElementMethod.Name=n;else r.Name=n;
  }
  int parameters=0;
  foreach(var t in types)foreach(var m in t.Methods)foreach(var p in m.Parameters)if(Bad(p.Name)){p.Name="arg_"+p.Index;parameters++;}
  int duplicateDebugAttributes=0;
  void Dedupe(Mono.Cecil.ICustomAttributeProvider provider) {
   var seen=new HashSet<string>();
   for(int i=0;i<provider.CustomAttributes.Count;i++){
    var attr=provider.CustomAttributes[i];var name=attr.AttributeType.FullName;
    if(name!="System.Diagnostics.DebuggerNonUserCodeAttribute" && name!="System.Diagnostics.DebuggerStepThroughAttribute")continue;
    if(!seen.Add(name)){provider.CustomAttributes.RemoveAt(i--);duplicateDebugAttributes++;}
   }
  }
  foreach(var t in types){Dedupe(t);foreach(var m in t.Methods)Dedupe(m);foreach(var p in t.Properties)Dedupe(p);foreach(var f in t.Fields)Dedupe(f);foreach(var e in t.Events)Dedupe(e);}
  Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(args[1]))!);
  module.Write(args[1],new WriterParameters{WriteSymbols=false});
  var check=ModuleDefinition.ReadModule(args[1],new ReaderParameters{AssemblyResolver=resolver});
  var after=check.Types.SelectMany(Walk).SelectMany(t=>t.Methods).Where(m=>m.HasBody).ToList();
  var expected=methodFingerprint.ToDictionary(kv=>kv.Key.FullName,kv=>kv.Value);
  int changedBodies=after.Count(m=>!expected.TryGetValue(m.FullName,out var hash)||hash!=Fingerprint(m));
  var report=new{experimental=true,duplicateDebugAttributes,renamedDefinitions=renames.Count,renamedParameters=parameters,typeReferences=typeRefs.Count,internalMemberReferences=memberRefs.Count,methodBodiesBefore=methodFingerprint.Count,methodBodiesAfter=after.Count,changedBodyFingerprints=changedBodies,resourcesBefore=module.Resources.Count,resourcesAfter=check.Resources.Count,reflectionAndResourceNameBindingVerified=false,activationModified=false};
  File.WriteAllText(args[1]+".map.json",JsonSerializer.Serialize(map,new JsonSerializerOptions{WriteIndented=true}));
  File.WriteAllText(args[1]+".report.json",JsonSerializer.Serialize(report,new JsonSerializerOptions{WriteIndented=true}));
  Console.WriteLine(JsonSerializer.Serialize(report));
  if(changedBodies!=0)Environment.Exit(2);
 }
 static string Fingerprint(MethodDefinition m){
  var instructions=m.Body.Instructions;var s=new StringBuilder();
  foreach(var i in instructions){s.Append(i.OpCode.Code).Append(':');if(i.Operand is string str)s.Append(Convert.ToBase64String(Encoding.UTF8.GetBytes(str)));else if(i.Operand is Instruction target)s.Append(instructions.IndexOf(target));else if(i.Operand is Instruction[] targets)s.Append(string.Join(',',targets.Select(t=>instructions.IndexOf(t))));else if(i.Operand is ParameterDefinition par)s.Append("P").Append(par.Index);else if(i.Operand is VariableDefinition variable)s.Append("V").Append(variable.Index);else if(i.Operand is not MemberReference && i.Operand is not CallSite)s.Append(i.Operand);s.Append(';');}
  s.Append("EH:").Append(m.Body.ExceptionHandlers.Count);return Hash(s.ToString());
 }
}
