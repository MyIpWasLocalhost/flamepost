//create variable for currentpage and total pages
var onpage = 0
var pages = 0
//check if there's sessionstorage from past browsing, if so, load it on to the current page
window.onload = function(){
    if (sessionStorage.getItem("onpage") != null){
        onpage = parseInt(sessionStorage.getItem("onpage"));
    }
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
    let serial = window.location.pathname.substring(3);
    return serial;
}
//get the data from the backend and generating the forum posts
async function fetchData() {
    const response = await fetch('/api/data/' + getSerial());
    const data = await response.json();
    const gridContainer = document.getElementById('grid-container');
    const replyAmount = Object.keys(data).length;
    pages = Math.floor(replyAmount / 10) ===0 ? 1 : Math.floor(replyAmount / 10);
    //implement the logic for generating the last page
    if (pages === onpage){
        for (let i = onpage * 10 ; i < replyAmount; i++){
            const item = data.find(function (item){
                return item.tier === i;
            });
            item.author = escapeHtml(item.author);
            item.content = escapeHtml(item.content);
            if (item && i <= replyAmount){
                const gridItem = document.createElement('div');
                gridItem.className = 'forum-category';
                gridItem.innerHTML = `
                    <h2>${item.author}</h2>
                    <p>${item.content}</p>
                    <p id="serial">#${item.tier+1}</p>
                `;
                gridContainer.appendChild(gridItem);
            }
            else{
                break;
            }
        }
    }
    //implement the logic for generating the other pages
    else{
        for (let i = onpage * 10 ; i < (onpage + 1) * 10; i++){
            const item = data.find(function (item){
                return item.tier === i;
            });
                item.author = escapeHtml(item.author);
                item.content = escapeHtml(item.content);
                const gridItem = document.createElement('div');
                gridItem.className = 'forum-category';
                gridItem.innerHTML = `
                    <h2>${item.author}</h2>
                    <p>${item.content}</p>
                    <p id="serial">#${item.tier+1}</p>
                `;
                gridContainer.appendChild(gridItem);
        }
    }
    //handling the generation of the page switcher
    const pageContainer = document.getElementById('switchPageContainer');
    for (i = 0; i <= pages+2; i++){//+2 for prev and next
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
    const pageDisplayer = document.getElementById('onpage');
    pageDisplayer.innerHTML = `Now On Page ${onpage+1}`;
}

async function post(){
    //read the content of the post and send it to the backend
    let content = { "content" : document.getElementsByClassName('post_area')[0].value};
    const response = await fetch('/api/send/' + getSerial(),{
        method : 'POST',
        headers:{
            'Content-Type':  'application/json'
        },
        body: JSON.stringify(content)
    }).then(response => response.text());
    if (response === "post success"){
        callUpAlert("post success, page reload in 5 seconds", true);
        sessionStorage.setItem("onpage", onpage);
        setTimeout(function(){
        location.reload()
        }, 5000)
    }else{
        callUpAlert(response, false);
    }

}


//function for switching pages
function switchpage(toPage, direction = 'default'){
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
    sessionStorage.setItem("onpage", onpage);
    location.reload();
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
//initialize
fetchData();