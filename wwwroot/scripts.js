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