//create variable for currentpage and total pages
var onpage = 0
var pages = 0
var data, replyAmount, md;

window.onload = function(){
    //initialize the markdown parser
    md = window.markdownit();
    //get the current page from the url
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('page')){
    onpage = parseInt(urlParams.get('page')) - 1;
    window.history.replaceState({}, document.title, "/p/" + getSerial());
    }
    fetchData();
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

function createPostDisplay(item){
    const gridItem = document.createElement('div');
    let time = timestampToDate(item.timestamp);
    let content = md.render(item.content);
    gridItem.className = 'forum-category';
    gridItem.innerHTML = `
        <h2>${item.author}</h2>
        <p>${content}</p>
        <p id="serial">#${item.tier+1}, posted at ${time}</p>
    `;
    return gridItem;
}

//escape html to prevent xss injection
//copied from stackoverflow
function escapeHtml(html){
    var text = document.createTextNode(html);
    var p = document.createElement('p');
    p.appendChild(text);
    return p.innerHTML;
}

//get the serial id of current post from the url
function getSerial(){
    let serial = window.location.pathname.substring(3,9);
    return serial;
}

function generatePage(){
    const gridContainer = document.getElementById('grid-container');
    gridContainer.innerHTML = '';

    if (pages === onpage){
        for (let i = onpage * 10 ; i < replyAmount; i++){
            const item = data.find(function (item){
                return item.tier === i;
            });
                const gridItem = createPostDisplay(item);
                gridContainer.appendChild(gridItem);
        }
    }
    //implement the logic for generating the other pages
    else
    {
        for (let i = onpage * 10 ; i < (onpage + 1) * 10; i++){
            const item = data.find(function (item){
                return item.tier === i;
            });
                const gridItem = createPostDisplay(item);
                gridContainer.appendChild(gridItem);
        }
    }

    const pageContainer = document.getElementById('switchPageContainer');
    pageContainer.innerHTML = '';
    //+2 for prev and next button
    if (pages > 4){
        for (i = onpage-2; i <= onpage + 2; i++){
            const page = document.createElement('button');
            page.className = 'switchPage';
            switch (i){
                case onpage-2:
                    page.innerHTML = '<';
                    page.onclick = function(){
                        switchpage(0, 'left');
                    }
                    break;
                case onpage:
                    page.innerHTML = '<input id=jump_page></input>';
                    page.onclick = function(){
                        let topage = document.getElementById('jump_page').value;
                        if (topage === '' || isNaN(topage)){
                            return;
                        }
                        switchpage(topage-1);
                    }
                    break;
                case onpage+2:
                    page.innerHTML = '>';
                    page.onclick = function(){
                        switchpage(0, 'right');
                    }
                    break;
                default:
                    if (i<0 || i>=onpage+2 || i>pages){
                        continue;
                    }
                    page.innerHTML = i + 1;
                    page.onclick = function(){
                        switchpage(page.innerHTML-1);
                    }
            }
            pageContainer.appendChild(page);
        }
    }else{
        for (i = 0; i <= pages+2; i++){
            const page = document.createElement('button');
            page.className = 'switchPage';
            switch (i){
                case 0:
                    page.innerHTML = '<';
                    page.onclick = function(){
                        switchpage(0, 'left');
                    }
                    break;
                case pages+2:
                    page.innerHTML = '>';
                    page.onclick = function(){
                        switchpage(0, 'right');
                    }
                    break;
                default:
                    page.innerHTML = i;
                    page.onclick = function(){
                        switchpage(page.innerHTML-1);
                    }
            }
            pageContainer.appendChild(page);
        }
    }
}

//get the data from the backend and generating the forum posts
async function fetchData() {
    const response = await fetch('/api/data/' + getSerial());
    data = await response.json();
    data.forEach(function(item){
        if (item.content || item.author){
        item.content = escapeHtml(item.content);
        item.author = escapeHtml(item.author);
        }
    });
    document.title = `WebPost - ${escapeHtml(data[0].title)}`;
    replyAmount = Object.keys(data).length -1;
    pages = Math.floor( (replyAmount -1 ) / 10 );
    if (onpage > pages){
        callUpAlert('Page not found, redirecting to the first page in 5 seconds.', false);
        setTimeout(function(){
            window.location.href = `/p/${getSerial()}`;
        }, 5000);
    }
    //call function to generate the page
    generatePage(data, replyAmount);
    //handling the generation of the page switcher

    const titleHolder = document.getElementById('title');
    let title = escapeHtml(data[0].title);
    let created_time = timestampToDate(data[0].created_timestamp);
    let latest_timestamp_time = timestampToDate(data[0].latest_timestamp);
    titleHolder.innerHTML = `${title}`;
    const pageDisplayer = document.getElementById('onpage');
    pageDisplayer.innerHTML = `Now On Page ${onpage+1}/${pages+1}`;
    const postInfoHolder = document.getElementById('post_info');
    postInfoHolder.innerHTML = `Created at ${created_time}, last replied at ${latest_timestamp_time}`;
}

async function post(){
    //read the content of the post and send it to the backend
    const content = { "content" : document.getElementsByClassName('post_area')[0].value};
    let response;
    if (content.content == ""){
        callUpAlert('Content cannot be empty', false);
        return;
    }
    try {
        response = await fetch('/api/send/' + getSerial(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(content)
        }).then(response => response.text());
    } catch (error) {
        callUpAlert('Failed while posting: ' + error.message, false);
        return;
    }
    if (response === "post success"){
        callUpAlert("post success, page reload in 5 seconds", true);
        document.getElementsByClassName('post_area')[0].value = '';
        setTimeout(function(){
            window.location.href = `/p/${getSerial()}?page=${onpage+1}`;
        }, 5000)
    }else{
        response = response || 'unknown error, please contact the admin';
        callUpAlert(response, false);
    }

}


//function for switching pages
function switchpage(toPage, direction = 'default'){
    if (toPage > pages || toPage < 0){
        callUpAlert('Page not found', false);
        return;
    }
    switch (direction){
        case 'right':
            if (onpage < pages){
                onpage = onpage + 1;
            }else{
                callUpAlert('You are already on the last page', false);
                return;
            }
            break;
        case 'left':
            if (onpage >= 1){
                onpage = onpage - 1;
            }else{
                callUpAlert('You are already on the first page', false);
                return;
            }
            break;
        default:
            onpage = toPage;
            break;
    }
    const pageDisplayer = document.getElementById('onpage');
    pageDisplayer.innerHTML = `Now On Page ${onpage+1}/${pages+1}`;
    generatePage();
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
window.addEventListener('keydown', function(e){
    switch (e.key){
        case 'ArrowLeft':
            switchpage(0, 'left');
            break;
        case 'ArrowRight':
            switchpage(0, 'right');
            break;
    }
});