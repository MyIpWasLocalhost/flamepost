using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;
using Microsoft.Data.Sqlite;
public class PostData
{
        public string content { get; set; } = string.Empty;
};

public partial class StartService
{
    public static void Main(string[] args)
    {
        //initialize the web application
        var builder = WebApplication.CreateBuilder(args);
        var app = builder.Build();
        app.UseStaticFiles();
        app.UseRouting();

        //initialize on the databse connection
        string connectionString = "Data Source=post_data.db";
        var connection = new SqliteConnection(connectionString);
        connection.Open();

        //create chart to hold all the titles and post id
        var createChartCommand = connection.CreateCommand();
        createChartCommand.CommandText = @"
            CREATE TABLE IF NOT EXISTS posts_serial (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL
            )";
        createChartCommand.ExecuteNonQuery();

        //create the api for getting the content from existed posts
        app.MapGet("/api/data/{postId:regex(^\\d{{6}}$)}", async (HttpContext context, string postId) =>
        {
            var posts = new List<object>();
            //Query the database for the posts
            var getPostsCommand = connection.CreateCommand();
            if ( postId.Length != 6 || !int.TryParse(postId, out _))
            {
                context.Response.StatusCode = 404;
                await context.Response.WriteAsync("Post not found");
                return;
            }else{
                getPostsCommand.CommandText = $"SELECT * FROM post_at_{postId}";
                using (var reader = getPostsCommand.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        posts.Add(new
                        {
                            content = reader.GetString(0),
                            author = reader.GetString(1),
                            tier = reader.GetInt32(2)
                        });
                    }
                }
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(posts);
            }
        });

        app.MapGet("/", async context =>
        {
            context.Response.Redirect("/home");
        });

        app.MapGet("/home", async context =>
        {
            context.Response.ContentType = "text/html";
            await context.Response.SendFileAsync("./wwwroot/index.html");
        });

        //using "domain/p/postid" like form to access to the posts.

        app.MapGet("/p/{postId}", async (HttpContext context, string postId) =>
        {   //To be done: use the id check if the post exists
            context.Response.ContentType = "text/html";
            await context.Response.SendFileAsync("./wwwroot/webpost.html");
        });

        //create pathway to the css and js file

        app.MapGet("/p/styles_webpost.css", async context =>
        {
            context.Response.ContentType = "text/css";
            await context.Response.SendFileAsync("./wwwroot/styles_webpost.css");
        });

        app.MapGet("/p/scripts_webpost.js", async context =>
        {
            context.Response.ContentType = "text/javascript";
            await context.Response.SendFileAsync("./wwwroot/scripts_webpost.js");
        });

        //recieve post request from frontend and then insert it into the database.

        app.MapPost("/api/send/{postId:regex(^\\d{{6}}$)}", async (HttpContext context, string postId) =>
        {
            var postedData = await context.Request.ReadFromJsonAsync<PostData>();
            var response = "";
            if (!(postedData == null || string.IsNullOrWhiteSpace(postedData.content) || postedData.content.Length > 200 || postId.Length != 6 || !int.TryParse(postId, out _)))
            {
                var insertPostCommand = connection.CreateCommand();
                var viewPostsCommand = connection.CreateCommand();
                viewPostsCommand.CommandText = @$"SELECT COUNT(*) FROM post_at_{postId}";
                var tier = viewPostsCommand.ExecuteScalar();

                insertPostCommand.CommandText = @$"
                    INSERT INTO post_at_{postId} (content, author, tier) VALUES ($content, $author, $tier)";
                insertPostCommand.Parameters.AddWithValue("$content", postedData.content);
                insertPostCommand.Parameters.AddWithValue("$author", "Anonymous User");
                insertPostCommand.Parameters.AddWithValue("$tier", tier);
                insertPostCommand.ExecuteNonQuery();
                response = "post success";
            }
            //handle different errors
            else if (postedData == null)
            {
                throw new Exception("Invalid data");
            }
            else if (string.IsNullOrWhiteSpace(postedData.content))
            {
                response = "Content cannot be empty.";
            }
            else if (postedData.content.Length > 200)
            {
                response = "Content too long.";
            }else
            {
                response =  "Unhandled case, please contact the developer.";
            }
            context.Response.ContentType = "text/plain";
            await context.Response.WriteAsync(response);
        });

        app.Urls.Add("http://*:1090");
        
        app.Run();

    }
}
