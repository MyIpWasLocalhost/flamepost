var posts_generated = 0;
async function fetchData(){
    const response = await fetch("/api/posts");
    data = await response.json();
    return data;
}
function timestampToDate(timestamp){
    const date = new Date(timestamp * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    let formattedTime = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
    return formattedTime;
}
function escapeHtml(html){
    var text = document.createTextNode(html);
    var p = document.createElement('p');
    p.appendChild(text);
    return p.innerHTML;
}

function generatepost(item){
    const gridItem = document.createElement('div');
    let created_time = timestampToDate(item.created_timestamp);
    let latest_time = timestampToDate(item.latest_timestamp);
    let id = String(item.id).padStart(6, '0');
    let url = `/p/${id}`;
    gridItem.className = 'post_display';
    gridItem.innerHTML = `
        <h2><a href="${url}">${item.title}</a></h2>
        <p>posted at ${created_time}, replied at ${latest_time}</p>
    `;
    posts_generated++;
    return gridItem;
}
function callPostWindow(){
    document.styleSheets[0].insertRule(`*{overflow:hidden;}`);
    let postwindow = document.createElement('div');
    postwindow.id = 'postwindow';
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const screenCenterY = window.innerHeight / 2 + scrollTop;
    postwindow.style.top = `${screenCenterY}px`;
    postwindow.style.transform = 'translate(-50%, -50%)';
    postwindow.innerHTML = `
        <div id="postwindow-content">
            <div id="close_button" onclick = "closePostWindow()">x</div>
            <h2>Create a new post</h2>
                <div id = "title_label">Title</div>
                <input type="text" id="title" name="title">
                <div id = "content_label">Content</div>
                <textarea id="content" name="content"></textarea>
                <div id = "submit_button" onclick="createPost()">Create</div>
        </div>
    `;
    document.body.appendChild(postwindow);
    document.getElementById("create_post").style.display = "none";
}
function callUpAlert(message, isGood){
    const alert = document.getElementById('alert');
    const alertExisting = alert.style.visibility === 'visible';
    alert.innerHTML = `<p>${message}</p>`;
    alert.style.backgroundColor = isGood ? '#90ee90' : '#f8766d';
    alert.style.visibility = 'visible';
    alert.classList.add('scale-up-center');
    if (!alertExisting){
        setTimeout(function hidealert(){
            alert.classList.remove('scale-up-center');
            alert.style.visibility = 'hidden';
        }, 5000);
    }
}
async function createPost(){
    let title = document.getElementById("title").value;
    let content = document.getElementById("content").value;
    let data = {
        "title": title,
        "content": content
    };
    closePostWindow();
    let response;
    try {
        response = await fetch("/api/create_post", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    }).then(response => response.text());
    } catch (error) {
        callUpAlert('Failed while posting: ' + error.message, false);
        return;
    }
    if (response === "post success"){
        callUpAlert("post success, refreshing the page in 5s", true);
        setTimeout(function(){
            window.location.reload();
        }, 5000)
    }else{
        response = response || 'unknown error, please contact the admin';
        callUpAlert(response, false);
    }
}
function closePostWindow(){
    document.getElementById("postwindow").remove();
    document.styleSheets[0].deleteRule(0);
    document.getElementById("create_post").style.display = "block";
}
window.onload = async function(){
    data = await fetchData();
    data.sort((a, b) => b.latest_timestamp - a.latest_timestamp);
    for (let i = 0; i < 5 && i < data.length; i++){
        const item = data[i];
        const gridItem = generatepost(item);
        document.getElementById('grid-container').appendChild(gridItem);
    }
};
window.addEventListener('scroll', function(){
    if (window.scrollY + window.innerHeight >= document.body.offsetHeight - 50 ){
            if (posts_generated >= data.length){
                return;
            }else{
            const item = data[posts_generated];
            const gridItem = generatepost(item);
            document.getElementById('grid-container').appendChild(gridItem);
            }
        }
});
window.addEventListener('keydown', function(event){
    let postwindow_opened = Boolean(document.getElementById("postwindow"));
    if (event.key === "Escape" && postwindow_opened){ 
        closePostWindow();
    }else if (event.key === "Enter" && postwindow_opened){
        createPost();
    }
});