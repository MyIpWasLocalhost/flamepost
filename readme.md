# Flamepost

Flamepost is an opensourced, web service project. It was aimed to be free, anonymous and public.

## Functionality

- Provide static web services
- By the use of Sqlite database to store content of posts.
- providing APIs for sending and receiving messages from back end
- show the post contents on the frontend

## File Structure

- `/wwwroot` - storage of statical files(html/js/css)
- `Program.cs` - Entry file of the application. Included all routes and database operation in one
- `Flamepost.csproj` project file for flamepost.

## Run the project
0. Flamepost was designed on top of .NET CORE 8.0. Please correctly install the dependency.
1. clone the project：
    ```sh
    git clone [<your-repo-url>](https://github.com/MyIpWasLocalhost/flamepost)
    cd flamepost
    ```

2. Install dependencies and run the project：
    ```sh
    dotnet restore
    dotnet run
    ```

3. Open the browser and enter `localhost:1090` to browse the content

