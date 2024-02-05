
var ws
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

var wConnect = false

function connectToServer() {
    console.log("Connecting...")
    if (ws) {
        if (ws.readyState == WebSocket.OPEN) {
			ws.close()
		}
    }
    connected = false
    id = 0
    ws = new WebSocket("wss://server.silverspace.online:443")

    ws.addEventListener("open", (event) => {
        sendMsg({connect: "earth"}, true)
    })
    
    ws.addEventListener("message", (event) => {
        let msg = JSON.parse(event.data)
        if ("connected" in msg) {
            console.log("Connected!")
            connected = true
            id = msg.connected
            sendMsg({view: vid})
        }
        if ("ping" in msg && !document.hidden) {
            sendMsg({ping: true})
        }
        if ("views" in msg) {
            console.log(JSON.stringify(msg.views))
        }
        if ("data" in msg) {
            playerData = msg.data
        }
        if ("chunk" in msg) {
            if (msg.chunk[1]) {
                // for (let set of msg.chunk[1]) {
                //     addSetT(set[0], set[1], set[2], [set[3], set[4]])
                // }
                // let pos = msg.chunk[0].split(","); pos[0] = parseInt(pos[0]); pos[1] = parseInt(pos[1]); pos[2] = parseInt(pos[2])
                // for (let off of offs) {
                //     addToMesh((pos[0]+off[0])+","+(pos[1]+off[1])+","+(pos[2]+off[2]), false)
                // }
                // addToMesh(msg.chunk[0], false)
                // sortMesh = true
            }
        }
        if ("set" in msg) {
            addSetT(msg.set[0], msg.set[1], msg.set[2], [msg.set[3], msg.set[4]], false)
        }
    })

    ws.addEventListener("close", (event) => {
        console.log("Disconnected")
        wConnect = true
    })
}

connectToServer()

setInterval(() => {
    sendMsg({data: data})
}, 1000/10)