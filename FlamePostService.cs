using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;
using Microsoft.Data.Sqlite;
using System.Runtime;

namespace FlamePost;
public class PostData
{
    public string content { get; set; } = string.Empty;
};

public class PostGenerateData
{
    public string title { get; set; } = string.Empty;
    public string content { get; set; } = string.Empty;
}

public class FlamePostService
{
    private readonly string PathToCert, CertPassWord, Url;
    private readonly bool UseHttps;
    public FlamePostService(Config config)
    {
        UseHttps = config.UseHttps;
        PathToCert = config.PathToCert;
        CertPassWord = config.CertPassWord;
        Url = config.UseHttps ? $"https://{config.Host}:{config.Port}" : $"http://{config.Host}:{config.Port}";
    }
    public void Main()
    {
        //initialize the web application
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseKestrel(options =>
        {
            if (UseHttps){
                options.ConfigureHttpsDefaults(https =>
                {
                    https.ServerCertificate = new System.Security.Cryptography.X509Certificates.X509Certificate2(PathToCert, CertPassWord);
                });
            }
        });
        var app = builder.Build();
        app.UseRouting();

        //initialize on the databse connection
        string connectionString = "Data Source=post_data.db";
        var connection = new SqliteConnection(connectionString);
        connection.Open();

        //create chart to hold all the titles and post id if not exists
        var createChartCommand = connection.CreateCommand();
        createChartCommand.CommandText = @"
            CREATE TABLE IF NOT EXISTS posts_serial (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                created_timestamp INTEGER NOT NULL,
                latest_timestamp INTEGER NOT NULL
            )";
        createChartCommand.ExecuteNonQuery();

        //create the api for getting the content from existed posts
        app.MapGet("/api/data/{postId:regex(^\\d{{6}}$)}", async (HttpContext context, string postId) =>
        {
            var posts = new List<object>();
            var get_posts_serial_information = connection.CreateCommand();
            get_posts_serial_information.CommandText = "SELECT * FROM posts_serial WHERE id = $id";
            get_posts_serial_information.Parameters.AddWithValue("$id", postId);
            using (var reader = get_posts_serial_information.ExecuteReader())
            {
                if (!reader.Read())
                {
                    context.Response.StatusCode = 404;
                    await context.Response.SendFileAsync("./wwwroot/content_404.html");
                    return;
                }
                else
                {
                    posts.Add(new
                    {
                        tier              = "content_header",
                        title             = reader.GetString(1),
                        created_timestamp = reader.GetInt64(2),
                        latest_timestamp  = reader.GetInt64(3)
                    });
                }
            }
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
                            content   = reader.GetString(0),
                            author    = reader.GetString(1),
                            tier      = reader.GetInt32(2),
                            timestamp = reader.GetInt64(3)
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
        {   
            var get_posts_serial_information = connection.CreateCommand();
            get_posts_serial_information.CommandText = "SELECT COUNT(*) FROM posts_serial WHERE id = $id";
            get_posts_serial_information.Parameters.AddWithValue("$id", postId);
            var count = get_posts_serial_information.ExecuteScalar()!;
            if (postId.Length != 6 || !int.TryParse(postId, out _)|| (long)count == 0)
            {
                context.Response.StatusCode = 404;
                await context.Response.SendFileAsync("./wwwroot/content_404.html");
                return;
            }
            context.Response.ContentType = "text/html";
            await context.Response.SendFileAsync("./wwwroot/webpost.html");
        });

        app.MapGet("/api/posts", async context =>
        {
            var posts = new List<object>();
            var getPostsCommand = connection.CreateCommand();
            getPostsCommand.CommandText = "SELECT * FROM posts_serial";
            using (var reader = getPostsCommand.ExecuteReader())
            {
                while (reader.Read())
                {
                    posts.Add(new
                    {
                        id = reader.GetInt32(0),
                        title = reader.GetString(1),
                        created_timestamp = reader.GetInt64(2),
                        latest_timestamp = reader.GetInt64(3)
                    });
                }
            }
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(posts);
        });

        //recieve post request from frontend and then insert it into the database.

        app.MapPost("/api/send/{postId:regex(^\\d{{6}}$)}", async (HttpContext context, string postId) =>
        {
            var postedData = await context.Request.ReadFromJsonAsync<PostData>();
            string response;
            if (string.IsNullOrWhiteSpace(postedData?.content))
            {
                response = "Content cannot be empty.";
            }
            else if (postedData.content.Length > 200)
            {
                response = "Content too long.";
            }
            else if (postId.Length != 6 || !int.TryParse(postId, out _))
            {
                response = "Post not found.";
            }
            else
            {
                //check validility of the postId
                var checkPostIdCommand = connection.CreateCommand();
                checkPostIdCommand.CommandText = @$"SELECT COUNT(*) FROM posts_serial WHERE id = $id";
                checkPostIdCommand.Parameters.AddWithValue("$id", postId);
                long count = Convert.ToInt64(checkPostIdCommand.ExecuteScalar());
                if (count! != 1)
                {
                    response = "Post not found or Post id is invalid.";
                    return;
                }

                //if the post is found, get the tier of new adding post
                var viewPostsCommand = connection.CreateCommand();
                viewPostsCommand.CommandText = @$"SELECT COUNT(*) FROM post_at_{postId}";
                var tier = viewPostsCommand.ExecuteScalar();

                //register the command for inserting post content
                var insertPostCommand = connection.CreateCommand();
                insertPostCommand.CommandText = @$"
                    INSERT INTO post_at_{postId} (content, author, tier, timestamp) VALUES ($content, $author, $tier, $timestamp)";
                long time = DateTimeOffset.Now.ToUnixTimeSeconds();
                insertPostCommand.Parameters.AddWithValue("$content", postedData.content);
                //TODO: add author name customization
                insertPostCommand.Parameters.AddWithValue("$author", "Anonymous User");
                insertPostCommand.Parameters.AddWithValue("$tier", tier);
                insertPostCommand.Parameters.AddWithValue("$timestamp", time);
                
                //register the command for update the post time in the post_serial
                var updatePostTimeCommand = connection.CreateCommand();
                updatePostTimeCommand.CommandText = @$"
                    UPDATE posts_serial SET latest_timestamp = $new_timestamp WHERE id = $id";
                updatePostTimeCommand.Parameters.AddWithValue("$new_timestamp", time);
                updatePostTimeCommand.Parameters.AddWithValue("$id", postId);

                try {
                    updatePostTimeCommand.ExecuteNonQuery();
                    insertPostCommand.ExecuteNonQuery();
                }catch{
                    response = "Post failed. Please contact the developer.";
                    return;
                }
                response = "post success";
                
                //dispose the commands registered
                checkPostIdCommand.Dispose();
                viewPostsCommand.Dispose();
                insertPostCommand.Dispose();
                updatePostTimeCommand.Dispose();
            }
            response ??= "Post failed. Please contact the developer.";
            context.Response.ContentType = "text/plain";
            await context.Response.WriteAsync(response);
        });
        
        app.MapPost("/api/create_post", async context =>
        {
            var postedData = await context.Request.ReadFromJsonAsync<PostGenerateData>();
            string response;
            if (string.IsNullOrWhiteSpace(postedData?.content))
            {
                response = "Content cannot be empty.";
            }
            else if (postedData.content.Length > 200)
            {
                response = "Content too long.";
            }
            else if (string.IsNullOrWhiteSpace(postedData.title))
            {
                response = "Title cannot be empty.";
            }
            else if (postedData.title.Length > 50)
            {
                response = "Title too long.";
            }
            else
            {        
                //read the database and get the latest post id
                var getLatestPostIdCommand = connection.CreateCommand();
                getLatestPostIdCommand.CommandText = "SELECT id FROM posts_serial ORDER BY id DESC LIMIT 1";
                object latestPostId = getLatestPostIdCommand.ExecuteScalar()?? "0";
                int thisPostId = Convert.ToInt32(latestPostId) + 1;

                //register command and variables for creating the new post
                var createPostCommand = connection.CreateCommand();
                var createPostSerialCommand = connection.CreateCommand();
                long time = DateTimeOffset.Now.ToUnixTimeSeconds();

                //append the new post to the posts_serial
                createPostSerialCommand.CommandText = @"
                    INSERT INTO posts_serial (id, title, created_timestamp, latest_timestamp) VALUES ($id, $title, $created_timestamp, $latest_timestamp)";
                createPostSerialCommand.Parameters.AddWithValue("$title", postedData.title);
                createPostSerialCommand.Parameters.AddWithValue("$created_timestamp", time);
                createPostSerialCommand.Parameters.AddWithValue("$latest_timestamp", time);
                createPostSerialCommand.Parameters.AddWithValue("$id", thisPostId);

                //create the table for the new post
                string strPostId = thisPostId.ToString("D6");
                createPostCommand.CommandText = @$"
                    CREATE TABLE post_at_{strPostId} (
                        content TEXT NOT NULL,
                        author TEXT NOT NULL,
                        tier INTEGER NOT NULL,
                        timestamp INTEGER NOT NULL
                    )";
                createPostSerialCommand.ExecuteNonQuery();
                createPostCommand.ExecuteNonQuery();
                
                var insertPostCommand = connection.CreateCommand();
                insertPostCommand.CommandText = @$"
                    INSERT INTO post_at_{strPostId} (content, author, tier, timestamp) VALUES ($content, $author, $tier, $timestamp)";
                insertPostCommand.Parameters.AddWithValue("$content", postedData.content);
                insertPostCommand.Parameters.AddWithValue("$author", "Anonymous User");
                insertPostCommand.Parameters.AddWithValue("$tier", 0);
                insertPostCommand.Parameters.AddWithValue("$timestamp", time);

                insertPostCommand.ExecuteNonQuery();
                response = "post success";

                //dispose the commands registered
                getLatestPostIdCommand.Dispose();
                createPostCommand.Dispose();
                createPostSerialCommand.Dispose();
                insertPostCommand.Dispose();
            }
            //if unexpected error occurs, return a default message
            response ??= "Post failed. Please contact the developer.";
            context.Response.ContentType = "text/plain";
            await context.Response.WriteAsync(response);
        });

        app.MapFallback(async context =>
        {
            context.Response.StatusCode = 404;
            await context.Response.SendFileAsync("./wwwroot/content_404.html");
        });

        app.Urls.Add(Url);
        
        app.UseStaticFiles();

        app.Run();
    }
}
