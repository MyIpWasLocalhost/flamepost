# Flamepost

Flamepost is an opensourced, web service project. It was aimed to be free, anonymous and public.

## Functionality

- Provide static web services
- By the use of Sqlite database to store content of posts.
- providing APIs for sending and receiving messages from back end
- show the post contents on the frontend

## To-Do List

- [X] Backend Refactor: API completion for applying to all the posts
- [X] Page Refactor: homepage display listing of the newest posted/replied post
- [x] Page Refactor: aethesetics
- [ ] Page Refactor: guidelines, unsecure post warnings, and disclaimer
- [x] Feature: Markdown rendering
- [ ] Feature: Make posting action related to an Email
- [ ] Feature: Verification code confirming spokesperson
- [ ] Feature: Report system. 3 reports on 1 content in the post would make it unavailable; 7 reports on the main post would make it unavailable; 20 reports on a single email would make it banned forever.
- [ ] Feature: Verification code confirming reports person
- [ ] Feature: Prevention of abuse of reporting system
- [ ] Readme update: disclaimer

## File Structure

- `/wwwroot` - storage of statical files(html/js/css)
- `Program.cs` - Entry file of the application. Included all routes and database operation in one
- `Flamepost.csproj` project file for flamepost.

## Run the project

0. Flamepost was designed on top of .NET CORE 8.0. 
   - Please correctly install the [runtime](https://dotnet.microsoft.com/en-us/download/dotnet/8.0).
1. clone the project：

   ```sh
   git clone https://github.com/MyIpWasLocalhost/flamepost
   cd flamepost
   ```
2. Install dependencies and run the project：

   ```sh
   dotnet restore
   dotnet run
   ```
3. Check and modify `appsettings.json` file based on your need
   
4. Run the project again:
   ```sh
   dotnet run
   ```

5. Open the browser and enter `localhost:{your_port}`(default 1090) to browse the content

## Default appsettings.json
```JSON
   {
      "Host": "*",
      "Port": 1090,
      "UseHttps": false,
      "PathToCert": "",
      "CertPassWord": ""
   }
```
- `PathToCert` and `CertPassWord` are not required if `UseHttps` is settled to false.