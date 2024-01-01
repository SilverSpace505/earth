
console.log("Connecting...")
var ws = new WebSocket("wss://server.silverspace.online:443")
var connected = false

var data = {x: 0, y: 0, z: 0}
var playerData = {}
var id = 0

var vid = ""
var vidLoaded = localStorage.getItem("id")
var letters = "abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRS0123456789"
if (vidLoaded) {
	vid = vidLoaded
} else {
	for (let i = 0; i < 8; i++) {
		vid += letters[Math.round(Math.random()*(letters.length-1))]
	}
	localStorage.setItem("id", vid)
}

function getViews() {
	ws.send(JSON.stringify({getViews: true}))
}

function sendMsg(sendData, bypass=false) {
	if (ws.readyState == WebSocket.OPEN && (connected || bypass)) {
		ws.send(JSON.stringify(sendData))
	}
}

ws.addEventListener("open", (event) => {
    sendMsg({connect: "earth"}, true)
    ws.addEventListener("message", (event) => {
        let msg = JSON.parse(event.data)
        if ("connected" in msg) {
            console.log("Connected!")
            connected = true
            id = msg.connected
            sendMsg({view: vid})
        }
        if ("ping" in msg) {
            sendMsg({ping: true})
        }
        if ("views" in msg) {
            console.log(JSON.stringify(msg.views))
        }
        if ("data" in msg) {
            playerData = msg.data
        }
    })
})

setInterval(() => {
    sendMsg({data: data})
}, 1000/10)