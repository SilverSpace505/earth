
console.log("Connecting...")
var ws = new WebSocket("wss://server.silverspace.online:443")
var connected = false

var data = {x: 0, y: 0, z: 0}

function sendMsg(sendData, bypass=false) {
	if (ws.readyState == WebSocket.OPEN && (connected || bypass)) {
		ws.send(JSON.stringify(sendData))
	}
}

ws.addEventListener("open", (event) => {
    console.log("Connected!")
    connected = true
    ws.addEventListener("message", (event) => {
        console.log(event.data)
    })
})

setInterval(() => {
    sendMsg({data: data})
}, 1000/10)