using System.IO;
using System.Text.Json;
namespace FlamePost;

public class Config{
    public required string Host { get; set; }
    public int Port { get; set; }
    public bool UseHttps { get; set; }
    public required string PathToCert { get; set; }
    public required string CertPassWord { get; set; }
}
class Program
{
    static string DefaultAppSettings = JsonSerializer.Serialize(new Config
    {
        Host = "*",
        Port = 1090,
        UseHttps = false,
        PathToCert = "",
        CertPassWord = ""
    }, new JsonSerializerOptions { WriteIndented = true });

    static void Main()
    {
        if (!File.Exists("appsettings.json"))
        {
            File.WriteAllText("appsettings.json", DefaultAppSettings);
            Console.WriteLine("appsettings.json created. Please configure it and restart the program.");
            return;
        }

        var configuration = JsonSerializer.Deserialize<Config>(File.ReadAllText("appsettings.json"));
        if (configuration == null)
        {
            Console.WriteLine("appsettings.json is invalid. Please fix it and restart the program.");
            return;
        }

        new FlamePostService(configuration).Main();
    }
}