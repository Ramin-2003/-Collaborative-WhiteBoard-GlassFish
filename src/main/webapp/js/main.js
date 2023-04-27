let ws;
let callURL = "http://localhost:8080/WSDrawServer-1.0-SNAPSHOT/draw-servlet";
let userName = null;
let userId = null;
let roomCode = null;
function createRoom(){
    roomCode = document.getElementById("roominput").value; // get user entered room input
    roomCode = roomCode.replace(/\s/g, ''); // removing spaces

    if (roomCode.length == 0) { // display error message if room code empty
        document.getElementById("error").innerHTML = "Please appropriately fill in both fields";
        return;
    }

    // making sure server doesnt already exist
    fetch(callURL + "/" + roomCode, { // get if room exists
        method: 'GET',
        headers: {
            'Accept': 'text/plain',
        },
    })
        .then(response => response.text())
        .then(response => {
            exists = response.substring(0, response.length-2); // remove invisible new line character
            if (exists == "false") { // room does not exist, continue creating room
                joinRoom(true)
            }
            else { // room already exists cannot create
                document.getElementById("error").innerHTML = "Room already exists, did you mean join?" // display error
                return;
            }
        })
}

function joinRoom(creating){
    // get user entered name and code
    userName = document.getElementById("nameinput").value;
    if (!creating) {
        roomCode = document.getElementById("roominput").value;
    }

    // remove spaces
    userName = userName.replace(/\s/g, '');
    roomCode = roomCode.replace(/\s/g, '');

    if (userName.length == 0 || roomCode.length == 0) {// display error message if room/name empty
        document.getElementById("error").innerHTML = "Please appropriately fill in both fields"
        return;
    }

    // check if room exists
    
    fetch(callURL + "/" + roomCode, { // get if room exists
        method: 'GET',
        headers: {
            'Accept': 'text/plain',
        },
    })
        .then(response => response.text())
        .then(response => {
            exists = response.substring(0, response.length-2); // remove invisible new line character
            if (exists == "false" && !creating) { // failed room doesnt exist, refuse join and return
                document.getElementById("error").innerHTML = "Room does not exist, did you mean create?";
                return;
            }
            else { // success continue with join process
                // hide room create/join menu
                document.getElementById("menu").id = "hide";
                document.getElementById("blur").id = "hide";


                // create the web socket
                ws = new WebSocket("ws://localhost:8080/WSDrawServer-1.0-SNAPSHOT/ws/"+roomCode);

                // message received from the server
                ws.onmessage = function (event) {
                    data = JSON.parse(event.data);
                    messageHandler(data);
                }
                document.getElementById("code").innerHTML += "\""+roomCode+"\""; // display room code
            }
        })
}


var canvas = document.querySelector(".whiteboard");
var context = canvas.getContext("2d");

function messageHandler(data) { // will handle all mesages received from server
    w = canvas.width;
    h = canvas.height;
    if (data.event == "draw") { // on draw event call drawline
        drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color, data.strokeSize, false);
    }
    else if (data.event == "erase") { // on erase event call eraseLine
        eraseLine(data.x * w, data.y * h, data.radius, false);
    }
    else if (data.event == "open") { // emitted from server when user first joins room
        userId = data.id;
        // post username to server
        payload = {
            name: userName,
            id: userId,
            room: roomCode 
        };
        
        fetch(callURL, {
            method: "POST",
            body: JSON.stringify(payload),
            headers: {
                "Content-Type": "application/json"
            }
        })
            .then(response => response.text())
            .then(response => {
                console.log(response);
                // emit join to alert room you have joined and user list must be updated
                ws.send(JSON.stringify({event: "join", room: roomCode, name: userName}));
            })
    }
    else if (data.event == "join") { // emitted from server after "open"
        // update users list
        let ul = document.getElementById("userlist");
        ul.innerHTML = "";
        data.names.forEach(name => {
            let li = document.createElement("li");
            li.innerText = name;
            ul.appendChild(li);
        });
    }
}

// whiteboard logic

// configuration 
var tool = "draw";
var idTempTool = "draw";
var idTempColor = "black";
var drawing = false;
var erasing = false;
var current = { color: "black", strokeSize: 10 };


function drawLine(x0, y0, x1, y1, color, strokeSize, send) { // line draw logic
    context.beginPath(); // begin a canvas path
    // take previous mouse postition to current and draw line
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    // line settings
    context.strokeStyle = color;
    context.lineCap = "round";
    context.lineWidth = strokeSize;

    context.stroke(); // draw the line onto canvas
    context.closePath(); // end path

    if (!send) { // end if not sending to server (avoids infinite loop)
        return;
    }

    var w = canvas.width;
    var h = canvas.height;
    // send draw data to server
    let payload = {
        room: roomCode,
        event: "draw",
        x0: x0 / w,
        y0: y0 / h,
        x1: x1 / w,
        y1: y1 / h,
        color,
        strokeSize
    };

    ws.send(JSON.stringify(payload));
}

function eraseLine(x, y, radius, send) { // erase line logic

    // defining circular path
    context.beginPath(); 
    context.arc(x, y, radius, 0, 2 * Math.PI, false); // user arc function to create circle
    context.closePath();
    // creating clipping mask out of path
    context.save();
    context.clip();
    // clearing canvas although only circle will be cleared due to mask
    context.clearRect(0, 0, canvas.width, canvas.height);
    // clear clipping mask
    context.restore();

    if (!send) { // end if not sending to server (avoids infinite loop)
        return;
    }
    
    var w = canvas.width;
    var h = canvas.height;
    // send erase data to server
    let payload = {
        room: roomCode,
        event: "erase",
        x: x / w,
        y: y / h,
        radius: radius
    };

    ws.send(JSON.stringify(payload));
}

// mouse events

function onMouseDown(e) { // called on mousedown event
    if (tool == "draw") {
        drawing = true;
        // get current mouse/touch position
        current.x = e.clientX || e.touches[0].clientX;
        current.y = e.clientY || e.touches[0].clientY;
    }
    else if (tool == "erase") {
        erasing = true;
        // no need to get current position
        // as erasing doesnt happen between two points
    }
}

function onMouseUp(e) { // called on mouseup event
    if (erasing) {
        erasing = false; // end erase
        // final erase for mouse stroke
        eraseLine(e.clientX, e.clientY, current.strokeSize, true);
    }
    else if(drawing) {
        drawing = false; // end draw 
        // final draw for mouse stroke
        drawLine(
            current.x,
            current.y,
            e.clientX || e.touches[0].clientX,
            e.clientY || e.touches[0].clientY,
            current.color,
            current.strokeSize,
            true
        );
    }
}

function onMouseMove(e) {
    if (erasing) {
        // erase at at current mouse position with radius of strokeSize
        eraseLine(e.clientX, e.clientY, current.strokeSize, true)
    }
    else if (drawing) {
        // draw line between mousedown position and new client position
        drawLine(
            current.x,
            current.y,
            e.clientX || e.touches[0].clientX,
            e.clientY || e.touches[0].clientY,
            current.color,
            current.strokeSize,
            true
        );
        // current position now client position
        current.x = e.clientX || e.touches[0].clientX;
        current.y = e.clientY || e.touches[0].clientY;
    }
}

// dekstop events
canvas.addEventListener("mousedown", onMouseDown, false);
canvas.addEventListener("mouseup", onMouseUp, false);
canvas.addEventListener("mouseout", onMouseUp, false);
// throttle mouse move to limit un-needed max polling rate
canvas.addEventListener("mousemove", throttle(onMouseMove, 10), false);


// mobile events
canvas.addEventListener("touchstart", onMouseDown, false);
canvas.addEventListener("touchend", onMouseUp, false);
canvas.addEventListener("touchcancel", onMouseUp, false);
// throttle mouse move to limit un-needed max polling rate
canvas.addEventListener("touchmove", throttle(onMouseMove, 10), false);

// create new canvas on window resize
function onResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener("resize", onResize, false);
onResize();


function toolCurrent(id) { // update selected tool (draw/erase)
    tool = id;
    document.getElementById(idTempTool).firstChild.className = "tool"
    document.getElementById(id).firstChild.className = "tool2"
    idTempTool = id
}

document.getElementById("slider").oninput = () => { // get stroke size through slider
    current.strokeSize = document.getElementById("slider").value;
}

function colorChange(id) { // update selected color
    current.color = id
    document.getElementById(idTempColor).className = "color"
    document.getElementById(id).className = "color2"
    idTempColor = id;
}

function throttle(callback, delay) { // throttle function to limit mouse polling rate
    var previousCall =  new Date().getTime();
    return function () {
        var time = new Date().getTime();

        if (time - previousCall >= delay) {
            previousCall = time;
            callback.apply(null, arguments);
        }
    };
}


function translation() { // css animation for hiding/showing username container
    if (document.getElementById("container").style.left == "-200px") {
        document.getElementById("container").style.left = "0px";

        document.getElementById("arrowR").innerHTML = "<strong><</strong>";
        document.getElementById("arrowR").id = "arrowL";
        return;
    }
    document.getElementById("container").style.left = "-200px";

    document.getElementById("arrowL").innerHTML = "<strong>></strong>";
    document.getElementById("arrowL").id = "arrowR";
}

