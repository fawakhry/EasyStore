using System;
using System.IO;
using System.Reflection;
using System.Text;

internal static class RecoveryStartupDiagnostics
{
    private static readonly object Sync = new object();
    internal static string LogPath;
    internal static void Initialize()
    {
        LogPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "EasyStore_Startup_Diagnostic.txt");
        try { File.WriteAllText(LogPath, "Easy Store rebuilt candidate startup diagnostics\r\n", Encoding.UTF8); }
        catch { LogPath = Path.Combine(Path.GetTempPath(), "EasyStore_Startup_Diagnostic.txt"); File.WriteAllText(LogPath, "Easy Store startup diagnostics\r\n", Encoding.UTF8); }
        Write("Entered diagnostic Main");
        Write("CLR: " + Environment.Version + "; pointer bytes: " + IntPtr.Size + "; OS: " + Environment.OSVersion);
        AppDomain.CurrentDomain.UnhandledException += delegate(object sender, UnhandledExceptionEventArgs e) { Exception("Unhandled exception", e.ExceptionObject as Exception); };
        AppDomain.CurrentDomain.AssemblyLoad += delegate(object sender, AssemblyLoadEventArgs e) { Write("Loaded: " + e.LoadedAssembly.FullName); };
        AppDomain.CurrentDomain.AssemblyResolve += delegate(object sender, ResolveEventArgs e) { Write("Unresolved assembly: " + e.Name); return null; };
        foreach (Assembly a in AppDomain.CurrentDomain.GetAssemblies()) Write("Present: " + a.FullName);
    }
    internal static void Write(string message)
    {
        try { lock(Sync) File.AppendAllText(LogPath, DateTime.Now.ToString("O") + " " + message + "\r\n", Encoding.UTF8); } catch { }
    }
    internal static void Exception(string label, Exception e)
    {
        Write(label + ": " + (e == null ? "non-managed exception" : e.ToString()));
        ReflectionTypeLoadException loader = e as ReflectionTypeLoadException;
        if(loader != null) foreach(Exception child in loader.LoaderExceptions) Write("Loader exception: " + child);
    }
}
