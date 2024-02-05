
utils.setup()
utils.setStyles()

webgl.setup()
webgl.setStyles()

utils.setGlobals()

var lightD = {x: -0.75, y: 1, z: -0.5}

var su = 0
var delta = 0
var lastTime = 0

var gv = 0

var camera = {pos: {x: 0, y: planetRadius*(Math.PI/3) + 10, z: 0}, rot: {x: 0, y: 0, z: 0}}
var trueRot = {x: 0, y: 0, z: 0}
var player = {pos: {x: 0, y: 0, z: 0}, vel: {x: 0, y: 0, z: 0}}

var test = new webgl.Sphere(0, 0, -1, 0.5, [1, 1, 1])
test.alpha = 0.5
test.rOrder = 1
test.oneSide = true

var material = [0, 1]

var setting = {}
var sets = {}

var core = new webgl.Sphere(0, 0, 0, 2.5, [1, 1, 1])

var sea = new webgl.Sphere(0, 0, 0, planetRadius*1.045, [0, 0.5, 1], 100)
sea.alpha = 0.8
sea.order = true
sea.setVShader(`#version 300 es
    uniform mat4 uModel;
    uniform mat4 uView;
    uniform mat4 uProjection;
    uniform float time;

    layout(location = 0) in vec4 aPosition;
    layout(location = 1) in vec2 aUv;
    layout(location = 2) in vec4 aColour; 

    out vec2 vUv;
    out vec4 vColour;
    out vec4 vPos;
    out float height;
    void main() {
        vec4 pos = aPosition;
        vec4 colour = aColour;

        float spread = 10.0;
        height = sin(pos.x+time)*sin(pos.y+time)*sin(pos.z+time)*0.5+1.5;

        pos.y += height-0.5;

        vUv = aUv;
        vColour = colour;
        vPos = uModel * pos;
        gl_Position = uProjection * uView * uModel * pos;
        gl_PointSize = 5.0;
    }
`)
sea.setFShader(`#version 300 es
    precision mediump float;

    in vec2 vUv;
    in vec4 vColour;
    in vec4 vPos;
    in float height;

    uniform bool useTexture;
    uniform sampler2D uTexture;
    uniform bool useAlphaMap;
    uniform sampler2D uAlpha;

    uniform float uAlpha2;

    out vec4 fragColour;

    void main() {
        vec2 rUv = vec2(vUv.x - round(vUv.x-0.5), vUv.y - round(vUv.y-0.5));
        
        vec4 colour = vColour;
        if (useTexture) {
            colour = texture(uTexture, rUv);
            colour.r *= vColour.r;
            colour.g *= vColour.g;
            colour.b *= vColour.b;
        }
        colour *= height;
        float alpha = 1.0;
        if (useAlphaMap) {
            alpha = texture(uAlpha, rUv).r;
        }
        if (alpha <= 0.0) {
            discard;
        }
        fragColour = vec4(colour.r, colour.g, colour.b, alpha*uAlpha2);
    }
`)

sea.setProgram()
sea.addUniform("time", "time")

var atmosphere = new webgl.Sphere(0, 0, 0, planetRadius * (Math.PI/2), [0.5, 0.8, 1])
atmosphere.alpha = 0.5
atmosphere.order = true
var time = 0

var grassTexture = new webgl.Texture("texture.png", true)

var toMesh = []

let s = 1
let smoothing = true

var chunks = {}
var world = {}

// var generator = new Worker("constructor.js")
var setMesher = new Worker("setMesher.js")

function meshChunk(chunk) {
    let pos = chunk.split(",").map(n => parseInt(n))

    if (!(chunk in chunks)) {
        chunks[chunk] = genChunk(pos[0], pos[1], pos[2])
    }

    for (let off of offs) {
        let c = (pos[0]+off[0])+","+(pos[1]+off[1])+","+(pos[2]+off[2])
        if (!(c in chunks)) {
            chunks[c] = genChunk(pos[0]+off[0], pos[1]+off[1], pos[2]+off[2])
        }
    }

    createMesh(chunk, getMesh(chunk))
}

function createMesh(chunk, data) {
    if (chunk in world) {
        world[chunk].delete()
        delete world[chunk]
    }

    let pos = chunk.split(",").map(n => parseInt(n))

    world[chunk] = new webgl.Mesh(pos[0]*cs, pos[1]*cs, pos[2]*cs, 1, 1, 1, data.vertices, data.faces, data.colours)
    world[chunk].uvs = data.uvs
    world[chunk].uvD = 2
    world[chunk].texture = grassTexture
    world[chunk].useTexture = true
    world[chunk].setVShader(`#version 300 es
        uniform mat4 uModel;
        uniform mat4 uView;
        uniform mat4 uProjection;
        
        layout(location = 0) in vec4 aPosition;
        layout(location = 1) in vec2 aUv;
        layout(location = 2) in vec4 aColour; 
        layout(location = 3) in vec3 aNormal;
        
        out vec2 vUv;
        out vec4 vColour;
        out vec4 vPos;
        out vec3 vNormal;
        void main() {
            vUv = aUv;
            vColour = aColour;
            vNormal = aNormal;
            vPos = uModel * aPosition;
            gl_Position = uProjection * uView * uModel * aPosition;
            gl_PointSize = 5.0;
        }
    `)
    world[chunk].setFShader(`#version 300 es
        precision mediump float;

        in vec2 vUv;
        in vec4 vColour;
        in vec4 vPos;
        in vec3 vNormal;

        uniform bool useTexture;
        uniform sampler2D uTexture;
        uniform bool useAlphaMap;
        uniform sampler2D uAlpha;

        uniform float uAlpha2;
        
        out vec4 fragColour;
        
        void main() {
            vec2 textureSize = vec2(2.0, 2.0);
            vec2 tex = round(vUv);
            float scale = 1.0/3.0;
            vec3 rUv = vec3((vPos.x*scale) - round((vPos.x*scale)-0.5), (vPos.y*scale) - round((vPos.y*scale)-0.5), (vPos.z*scale) - round((vPos.z*scale)-0.5));
            vec3 normal = vNormal;
            if (normal == vec3(1.0, 1.0, 1.0)) {
                normal = vec3(1.0, 0.0, 0.0);
            }
            if (normal == vec3(0.0, 0.0, 0.0)) {
                normal = vec3(1.0, 0.0, 0.0);
            }
            
            vec4 colour = vColour;
            if (useTexture) {
                vec4 colourX = texture(uTexture, (rUv.yz*0.98+0.01)/textureSize + tex*(1.0/textureSize));
                vec4 colourY = texture(uTexture, (rUv.xz*0.98+0.01)/textureSize + tex*(1.0/textureSize));
                vec4 colourZ = texture(uTexture, (rUv.xy*0.98+0.01)/textureSize + tex*(1.0/textureSize));
                vec4 finalColour = colourX * abs(vNormal.x) + colourY * abs(vNormal.y) + colourZ * abs(vNormal.z);
                colour = finalColour;
                colour.r *= vColour.r;
                colour.g *= vColour.g;
                colour.b *= vColour.b;
            }
            float alpha = 1.0;
            if (useAlphaMap) {
                alpha = texture(uAlpha, rUv.xy).r;
            }
            if (alpha <= 0.0) {
                discard;
            }
            fragColour = vec4(colour.r, colour.g, colour.b, alpha*uAlpha2);
        }
    `)
    world[chunk].setProgram()
    world[chunk].createBuffer("normals", "normals", 3)
    world[chunk].setBuffer("normals", data.normals)
    world[chunk].addAttribute("normals", "aNormal")
    world[chunk].updateBuffers()
}

function ro(v, m=1) {
    return Math.round(v*m)/m
}

function addSet(x, y, z, v, send=true) {
    x = Math.round(x); y = Math.round(y); z = Math.round(z)
    setV(x, y, z, v)

    let c = Math.floor(x/cs)+","+Math.floor(y/cs)+","+Math.floor(z/cs)
    if (c in sets) {
        let poses = []
        for (let set of sets[c]) poses.push(set[0]+","+set[1]+","+set[2])
        if (poses.includes(x+","+y+","+z)) {
            sets[c][poses.indexOf(x+","+y+","+z)][3] = v
        } else {
            sets[c].push([x, y, z, v, getVT(x, y, z)[1]])
        }
    } else {
        sets[c] = [[x, y, z, v, getVT(x, y, z)[1]]]
    }

    if (c in setting) {
        let poses = []
        for (let set of setting[c]) poses.push(set[0]+","+set[1]+","+set[2])
        if (poses.includes(x+","+y+","+z)) {
            setting[c][poses.indexOf(x+","+y+","+z)][3] = v
        } else {
            setting[c].push([x, y, z, v, getVT(x, y, z)[1]])
        }
    } else {
        setting[c] = [[x, y, z, v, getVT(x, y, z)[1]]]
    }

    if (send) sendMsg({set: [x, y, z, v, getVT(x, y, z)[1]]})
}

function addSetT(x, y, z, v, send=true) {
    x = Math.round(x); y = Math.round(y); z = Math.round(z)
    setVT(x, y, z, v)

    let c = Math.floor(x/cs)+","+Math.floor(y/cs)+","+Math.floor(z/cs)
    if (c in sets) {
        let poses = []
        for (let set of sets[c]) poses.push(set[0]+","+set[1]+","+set[2])
        if (poses.includes(x+","+y+","+z)) {
            sets[c][poses.indexOf(x+","+y+","+z)] = [x, y, z, v[0], v[1]]
        } else {
            sets[c].push([x, y, z, v[0], v[1]])
        }
    } else {
        sets[c] = [[x, y, z, v[0], v[1]]]
    }

    if (c in setting) {
        let poses = []
        for (let set of setting[c]) poses.push(set[0]+","+set[1]+","+set[2])
        if (poses.includes(x+","+y+","+z)) {
            setting[c][poses.indexOf(x+","+y+","+z)][3] = v
        } else {
            setting[c].push([x, y, z, v[0], v[1]])
        }
    } else {
        setting[c] = [[x, y, z, v[0], [1]]]
    }

    if (send) sendMsg({set: [x, y, z, v[0], v[1]]})
}

var vel = {x: 0, y: 0, z: 0}

var onfloor = false
var sortMesh = false

function addToMesh(chunk, reorder=true) {
    if (toMesh.includes(chunk)) {
        if (!reorder) return
        let i = toMesh.indexOf(chunk)
        toMesh.splice(i, 1)
    }
    toMesh.splice(0, 0, chunk)
}

var poses = []
var lastGrav = {x: 0, y: 1, z: 0}
var grav = {x: 0, y: 1, z: 0}

var forwardAxis = [0, 0, 1]
var lastPlayerRotY = 0

var players = {}

var cooldown = 0

function update(timestamp) {
    requestAnimationFrame(update)

    utils.getDelta(timestamp)
    input.setGlobals()
    webgl.resizeCanvas()

    if (wConnect && !document.hidden) {
        connectToServer()
        wConnect = false
    }

    time += delta
    sea.setUniform("time", "1f", time)

    let pcp = {x: Math.floor(camera.pos.x / cs), y: Math.floor(camera.pos.y / cs), z: Math.floor(camera.pos.z / cs)}

    let start = new Date().getTime()

    for (let player in playerData) {
        if (!(player in players) && player != id) {
            players[player] = new webgl.Sphere(0, 0, 0, 0.5, [1, 0, 0])
        }
    }
    for (let player in players) {
        if (player == id || !(player in playerData)) {
            players[player].delete()
            delete players[player]
        }
    }

    for (let player in players) {
        players[player].pos.x = lerp(players[player].pos.x, playerData[player].x, delta*10)
        players[player].pos.y = lerp(players[player].pos.y, playerData[player].y, delta*10)
        players[player].pos.z = lerp(players[player].pos.z, playerData[player].z, delta*10)
    }


    poses = []
    let x2 = 0
    let y2 = 0
    let z2 = 0
    for (let x = 0; x < rd*2+1; x++) {
        for (let y = 0; y < rd*2+1; y++) {
            for (let z = 0; z < rd*2+1; z++) {
                x2 = x-rd + pcp.x
                y2 = y-rd + pcp.y
                z2 = z-rd + pcp.z
                let chunk = x2+","+y2+","+z2
                poses.push(chunk)
                if (window.mat4 && connected && !(chunk in world) && !toMesh.includes(chunk)) {
                    toMesh.push(chunk)
                    // sendMsg({chunk: chunk})
                    sortMesh = true
                }
            }
        }
    }
    if (sortMesh) {
        sortMesh = false
        let ds = []
        for (let i = 0; i < toMesh.length; i++) {
            if (poses.includes(toMesh[i])) {
                let pos = toMesh[i].split(",").map(n => parseInt(n))
                ds.push([toMesh[i], Math.sqrt((pos[0]-pcp.x)**2 + (pos[1]-pcp.y)**2 + (pos[2]-pcp.z)**2)])
            } else {
                toMesh.splice(i, 1)
                i--
            }
        }
        ds.sort((a, b) => (a[1] - b[1]))
        toMesh = []
        for (let chunk of ds) {
            toMesh.push(chunk[0])
        }
    }

    for (let chunk in world) {
        if (!poses.includes(chunk)) {
            world[chunk].delete()
            delete chunks[chunk]
            delete world[chunk]
        } else {
            world[chunk].customFShader = !keys["KeyT"]
        }
    }

    lastGrav = {...grav}
    grav = {x: 0-camera.pos.x, y: 0-camera.pos.y, z: 0-camera.pos.z}
    if (Object.keys(lastGrav).length <= 0) lastGrav = {...grav}
    let length = Math.sqrt(grav.x**2 + grav.y**2 + grav.z**2)
    grav.x /= length; grav.y /= length; grav.z /= length
    grav.x *= -1
    grav.y *= -1
    grav.z *= -1

    if (jKeys["Digit1"]) {
        material = [0, 1]
    }
    if (jKeys["Digit2"]) {
        material = [1, 1]
    }
    if (jKeys["Digit3"]) {
        material = [0, 0]
    }
    if (jKeys["Digit4"]) {
        material = [1, 0]
    }

    cooldown -= delta

    camera.rot.y *= -1
    let r
    if (cooldown <= 0) {
        r = raycast(camera.pos, moveInDirection({x: trueRot.x, y: trueRot.y, z: trueRot.z}, -1))
    }
    camera.rot.y *= -1
    test.visible = false
    let changeSize = 5
    if (r) {
        test.visible = true
        test.pos = r
        if (mouse.ldown) {
            let changed = false
            var bSpeed = -0.01
            for (let x = 0; x < changeSize; x++) {
                for (let y = 0; y < changeSize; y++) {
                    for (let z = 0; z < changeSize; z++) {
                        let d = Math.sqrt((x-changeSize/2)**2 + (y-changeSize/2)**2 + (z-changeSize/2)**2)
                        let v = getV(test.pos.x+(x-changeSize/2), test.pos.y+(y-changeSize/2), test.pos.z+(z-changeSize/2))
                        if (d < changeSize/2) {
                            var weight = smoothstep(changeSize/2, changeSize/2*0.7, d)
                            addSet(test.pos.x+(x-changeSize/2), test.pos.y+(y-changeSize/2), test.pos.z+(z-changeSize/2), v+weight*bSpeed)
                            changed = true
                        }
                    }
                }
            }
            if (changed) {
                cooldown = 0.1
            }
        }
        if (mouse.rdown) {
            let changed = false
            var bSpeed = 0.01
            for (let x = 0; x < changeSize; x++) {
                for (let y = 0; y < changeSize; y++) {
                    for (let z = 0; z < changeSize; z++) {
                        let d = Math.sqrt((x-changeSize/2)**2 + (y-changeSize/2)**2 + (z-changeSize/2)**2)
                        let v = getV(test.pos.x+(x-changeSize/2), test.pos.y+(y-changeSize/2), test.pos.z+(z-changeSize/2))
                        if (d < changeSize/2) {
                            var weight = smoothstep(changeSize/2, changeSize/2*0.7, d)
                            addSetT(test.pos.x+(x-changeSize/2), test.pos.y+(y-changeSize/2), test.pos.z+(z-changeSize/2), [v+weight*bSpeed, material])
                            changed = true
                        }
                    }
                }
            }
            if (changed) {
                cooldown = 0.1
            }
        }
    }

    for (let chunk in setting) {
        setMesher.postMessage({chunk: chunk, sets: setting[chunk]})
        delete setting[chunk]
    }

    if (isColliding()) {
        camera.pos = addv3(camera.pos, {x: grav.x*10*delta, y: grav.y*10*delta, z: grav.z*10*delta})
    }

    if (mouse.lclick) {
        input.lockMouse()
    }

    let gravl = [grav.x, grav.y, grav.z]
    let lastGravl = [lastGrav.x, lastGrav.y, lastGrav.z]

    let keyboardRotateLeftRight = 0
    if (keys["KeyA"]) keyboardRotateLeftRight += 1
    if (keys["KeyD"]) keyboardRotateLeftRight -= 1

    let keyboardForwardBackward = 0
    if (keys["KeyW"]) keyboardForwardBackward -= 1 * 10
    if (keys["KeyS"]) keyboardForwardBackward += 1 * 10
    
    let keyboardStrafeLeftRight = 0
    if (keys["KeyA"]) keyboardStrafeLeftRight -= 1 * 10
    if (keys["KeyD"]) keyboardStrafeLeftRight += 1 * 10

    let keyboardUpDown = 0
    if (keys["Space"]) keyboardUpDown = 1 * 10
    if (keys["ShiftLeft"]) keyboardUpDown = -1 * 10

    if (!keys["KeyE"]) {
        gv -= delta * 25
    }
    
    if (true) {
        view = mat4Identity()
        view = mat4AxisAngle(view, [1, 0, 0], playerRot.x)

        let vmatrix = mat4EulerAngle(mat4Identity(), [camera.rot.x, camera.rot.y, camera.rot.z])
        vmatrix = mat4Translation(vmatrix, scaleVector([camera.pos.x, camera.pos.y, camera.pos.z], -1))
        let vplayerPos = vec3TranslationMat4(vmatrix)

        view = mat4Translation(view, vplayerPos)
        
        view = mat4EulerAngle(view, [camera.rot.x, camera.rot.y, camera.rot.z])
        trueRot = extractEulerAngles(view)

        let angle = vec3Angle(lastGravl, gravl)
        let axis = vec3Axis(lastGravl, gravl)

        let matrix = mat4Identity()
        let rotateVelocity = lastPlayerRotY - playerRot.y
        matrix = mat4AxisAngle(matrix, gravl, rotateVelocity)

        if (Math.abs(angle) > 1e-6 && !isNaN(angle)) {
            matrix = mat4AxisAngle(matrix, axis, angle)
        }
        forwardAxis = vec3Normalize(vec3TransformMat4(matrix, forwardAxis))

        let vel = [keyboardStrafeLeftRight * delta, gv * delta, keyboardForwardBackward * delta]
        let vx = moveAlgPlanetv(vel[0], 0, 0)
        let vy = moveAlgPlanetv(0, vel[1], 0)
        let vz = moveAlgPlanetv(0, 0, vel[2])

        let slopeAmount = 10
        let fallAmount = 0.004

        camera.pos = addv3(camera.pos, vx)
        if (isColliding()) {
            let t = 0
            while (t < slopeAmount && isColliding()) {
                camera.pos = addv3(camera.pos, moveAlgPlanetv(0, 0.01, 0))
                t += 1
            }
            if (t >= slopeAmount) {
                camera.pos = subv3(camera.pos, moveAlgPlanetv(0, 0.01*slopeAmount, 0))
                camera.pos = subv3(camera.pos, vx)
            }
        }

        camera.pos = addv3(camera.pos, vy)
        if (isColliding()) {
            let offs = [
                [1, 0, 0],
                [-1, 0, 0],
                [0, 0, 1],
                [0, 0, -1],
                normalizeVector([1, 0, 1]),
                normalizeVector([-1, 0, 1]),
                normalizeVector([1, 0, -1]),
                normalizeVector([-1, 0, -1])
            ]
            let isCol = true
            for (let off of offs) {
                camera.pos = addv3(camera.pos, moveAlgPlanetv(off[0]*fallAmount, off[1]*fallAmount, off[2]*fallAmount))
                if (isColliding()) {
                    camera.pos = subv3(camera.pos, moveAlgPlanetv(off[0]*fallAmount, off[1]*fallAmount, off[2]*fallAmount))
                } else {
                    isCol = false
                    break
                }
            }
            
            if (isCol) {
                camera.pos = subv3(camera.pos, vy)
                gv = 0
                if (keys["Space"]) {
                    gv = 10
                }
            }
        }

        camera.pos = addv3(camera.pos, vz)
        if (isColliding()) {
            let t = 0
            while (t < slopeAmount && isColliding()) {
                camera.pos = addv3(camera.pos, moveAlgPlanetv(0, 0.01, 0))
                t += 1
            }
            if (t >= slopeAmount) {
                camera.pos = subv3(camera.pos, moveAlgPlanetv(0, 0.01*slopeAmount, 0))
                camera.pos = subv3(camera.pos, vz)
            }
        }

        let matrixAxes = getPlanetAxis()
        camera.rot.x = Math.atan2(matrixAxes[7], matrixAxes[8])
        camera.rot.y = Math.atan2(-matrixAxes[6], Math.sqrt(1 - matrixAxes[6] * matrixAxes[6]))
        camera.rot.z = Math.atan2(matrixAxes[3], matrixAxes[0])

        lastPlayerRotY = playerRot.y
    }

    webgl.setupFrame()
    webgl.render()

    input.updateInput()

    if (window.keys && keys["KeyE"]) console.log("To Render:", toMesh.length)
    let did = false
    while (toMesh.length > 0 && (!did || new Date().getTime() - start < 1000/120)) {
        did = true
        if (poses.includes(toMesh[0])) {
            meshChunk(toMesh[0])
        }
        toMesh.splice(0, 1)
    }

    data = {
        x: Math.round(camera.pos.x*100)/100,
        y: Math.round(camera.pos.y*100)/100,
        z: Math.round(camera.pos.z*100)/100,
    }
}

function moveAlgPlanet(x, y, z, forwardAxis=null) {
    if (!forwardAxis) forwardAxis = window.forwardAxis
    let upAxis = vec3Normalize([grav.x, grav.y, grav.z])
    let rightAxis = crossProduct(upAxis, forwardAxis)

    let matrixAxes = []

    matrixAxes[0] = rightAxis[0]
    matrixAxes[1] = rightAxis[1]
    matrixAxes[2] = rightAxis[2]
    
    matrixAxes[3] = upAxis[0]
    matrixAxes[4] = upAxis[1]
    matrixAxes[5] = upAxis[2]
    
    matrixAxes[6] = forwardAxis[0]
    matrixAxes[7] = forwardAxis[1]
    matrixAxes[8] = forwardAxis[2]

    let velocity = vec3TransformMat3(matrixAxes, [x, y, z])
    return velocity
}

function moveAlgPlanetv(x, y, z, forwardAxis=null) {
    if (!forwardAxis) forwardAxis = window.forwardAxis
    let upAxis = vec3Normalize([grav.x, grav.y, grav.z])
    let rightAxis = crossProduct(upAxis, forwardAxis)

    let matrixAxes = []

    matrixAxes[0] = rightAxis[0]
    matrixAxes[1] = rightAxis[1]
    matrixAxes[2] = rightAxis[2]
    
    matrixAxes[3] = upAxis[0]
    matrixAxes[4] = upAxis[1]
    matrixAxes[5] = upAxis[2]
    
    matrixAxes[6] = forwardAxis[0]
    matrixAxes[7] = forwardAxis[1]
    matrixAxes[8] = forwardAxis[2]

    let velocity = vec3TransformMat3(matrixAxes, [x, y, z])
    return {x: velocity[0], y: velocity[1], z: velocity[2]}
}

function getPlanetAxis(forwardAxis=null) {
    if (!forwardAxis) forwardAxis = window.forwardAxis
    let upAxis = vec3Normalize([grav.x, grav.y, grav.z])
    let rightAxis = crossProduct(upAxis, forwardAxis)

    let matrixAxes = []

    matrixAxes[0] = rightAxis[0]
    matrixAxes[1] = rightAxis[1]
    matrixAxes[2] = rightAxis[2]
    
    matrixAxes[3] = upAxis[0]
    matrixAxes[4] = upAxis[1]
    matrixAxes[5] = upAxis[2]
    
    matrixAxes[6] = forwardAxis[0]
    matrixAxes[7] = forwardAxis[1]
    matrixAxes[8] = forwardAxis[2]
    return matrixAxes
}

var sensitivity = 0.003
var playerRot = {x: 0, y: 0, z: 0}

input.mouseMove = (event) => {
    input.mouse.x = event.clientX
	input.mouse.y = event.clientY
    if (input.isMouseLocked()) {
        playerRot.x += event.movementY*sensitivity
		if (playerRot.x > Math.PI/2*0.99) {
			playerRot.x = Math.PI/2*0.99
		}
		if (playerRot.x < -Math.PI/2*0.99) {
			playerRot.x = -Math.PI/2*0.99
		}
        playerRot.y += event.movementX*sensitivity
    }
}

requestAnimationFrame(update)

function raycast(pos, dir) {
    let r = {...pos}
    let d = 0
    while (!collidingPoint(r.x, r.y, r.z) && d < 100) {
        r.x += dir.x*0.01
        r.y += dir.y*0.01
        r.z += dir.z*0.01
        d += 0.01
    }
    if (d < 100) {
        return r
    }
}

function isColliding() {
    let offs = generateSpherePoints(0.5, 5)
    for (let off of offs) {
        if (Math.sqrt((camera.pos.x+off[0])**2 + (camera.pos.y+off[1])**2 + (camera.pos.z+off[2])**2) < 2.5 || collidingPoint(camera.pos.x+off[0], camera.pos.y+off[1], camera.pos.z+off[2], 0.5)) return true
    }
    return false
}

setMesher.onmessage = (event) => {
    for (let chunk in event.data) {
        console.log("ERIAUNFA")
        createMesh(chunk, event.data[chunk])
    }
}

// generator.onmessage = (event) => {
//     cool.vertices = event.data[0].vertices
//     cool.faces = event.data[0].faces
//     cool.colours = event.data[0].colours
//     cTriangles = event.data[1]
//     cool.updateBuffers()
// }