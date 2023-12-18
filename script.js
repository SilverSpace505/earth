
utils.setup()
utils.setStyles()

webgl.setup()
webgl.setStyles()

utils.setGlobals()

var noise = new Noise(0.885643552331419)

var lightD = {x: -0.75, y: 1, z: -0.5}

var su = 0
var delta = 0
var lastTime = 0

var gridSize = 10

var camera = {pos: {x: 0, y: 0, z: 0}, rot: {x: 0, y: 0, z: 0}}

var test = new webgl.Box(0, 0, -1, 1, 1, 1, [1, 1, 1, 1])

var sea = new webgl.Sphere(45, 45, 45, 37.5, [0, 0.5, 1])
sea.alpha = 0.7
sea.order = true

// var atmosphere = new webgl.Sphere(45, 45, 45, 60, [0, 0.5, 1])
// atmosphere.alpha = 0.1
// atmosphere.order = true

var toMesh = []

function setV(x, y, z, v) {
    x = Math.round(x); y = Math.round(y); z = Math.round(z)
    let cp = [Math.floor(x/cs), Math.floor(y/cs), Math.floor(z/cs)]
    let cip = [x-cp[0]*cs, y-cp[1]*cs, z-cp[2]*cs]
    let chunk = cp[0]+","+cp[1]+","+cp[2]
    if (chunk in chunks) {
        chunks[chunk][cip[0]*cs*cs + cip[1]*cs + cip[2]][0] = v
    }
}

function getV(x, y, z) {
    x = Math.round(x); y = Math.round(y); z = Math.round(z)
    let cp = [Math.floor(x/cs), Math.floor(y/cs), Math.floor(z/cs)]
    let cip = [x-cp[0]*cs, y-cp[1]*cs, z-cp[2]*cs]
    let chunk = cp[0]+","+cp[1]+","+cp[2]
    if (chunk in chunks) {
        return chunks[chunk][cip[0]*cs*cs + cip[1]*cs + cip[2]][0]
    } else {
        return 0
    }
}

function getVT(x, y, z) {
    x = Math.round(x); y = Math.round(y); z = Math.round(z)
    let cp = [Math.floor(x/cs), Math.floor(y/cs), Math.floor(z/cs)]
    let cip = [x-cp[0]*cs, y-cp[1]*cs, z-cp[2]*cs]
    let chunk = cp[0]+","+cp[1]+","+cp[2]
    if (chunk in chunks) {
        return chunks[chunk][cip[0]*cs*cs + cip[1]*cs + cip[2]]
    } else {
        return [0, [0, 0, 0]]
    }
}

function normalv3(vec) {
    let length = Math.sqrt(vec.x**2 + vec.y**2 + vec.z**2)
    return {x: vec.x/length, y: vec.y/length, z: vec.z/length}
}

function intWeights(v1, w1, v2, w2) {
    let t = (0.5 - w1) / (w2 - w1)
    return v1 + t * (v2 - v1)
}

let s = 1
let smoothing = true

var chunks = {}
var world = {}

var meshMaker = new Worker("constructor.js")

function genChunk(x, y, z) {
    let id = x+","+y+","+z
    chunks[id] = []
    let x3 = 0
    let y3 = 0
    let z3 = 0
    for (let x2 = 0; x2 < cs; x2++) {
        for (let y2 = 0; y2 < cs; y2++) {
            for (let z2 = 0; z2 < cs; z2++) {
                x3 = x*cs+x2
                y3 = y*cs+y2
                z3 = z*cs+z2
                let center = (Math.sin(x3/30)+1)/2 * ((Math.sin(y3/30)+1)/2) * ((Math.sin(z3/30)+1)/2)/1.25
                let v = center + noise.simplex3(x3/40, y3/40, z3/40)/10 + noise.simplex3(x3/10, y3/10, z3/10)/50

                if (noise.simplex3(x3/20, y3/20, z3/20) > 0.2) {
                    v = 0
                }
                
                let c = [0.5, 1, 0]
                if (center > 0.6) {
                    c = [1, 0.5, 0]
                }
                if (center > 0.75) {
                    c = [0.5, 0.5, 0.5]
                }

                chunks[id].push([v, c])

            }
        }
    }
    return chunks[id]
}

var offs = []
for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
        for (let z = 0; z < 3; z++) {
            offs.push([x-1, y-1, z-1])
        }
    }
}

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

    if (chunk in world) {
        world[chunk].delete()
        delete world[chunk]
    }
    let data = getMesh(chunk)
    world[chunk] = new webgl.Mesh(pos[0]*cs, pos[1]*cs, pos[2]*cs, 1, 1, 1, data[0].vertices, data[0].faces, data[0].colours)
    world[chunk].triangles = data[1]
    world[chunk].updateBuffers()
}

function ro(v, m=1) {
    return Math.round(v*m)/m
}

function getMesh(chunk) {
    let pos = chunk.split(",").map(n => parseInt(n))
    let mesh = {vertices: [], faces: [], colours: []}
    let cTriangles = []
    
    let x2 = 0
    let y2 = 0
    let z2 = 0
    let edges = []
    let id = 0
    let idv = 1
    let triangles = []
    let values = []

    for (let x = 0; x < cs; x++) {
        for (let y = 0; y < cs; y++) {
            for (let z = 0; z < cs; z++) {
                x2 = pos[0]*cs+x
                y2 = pos[1]*cs+y
                z2 = pos[2]*cs+z
                values = [getV(x2, y2, z2), getV(x2+1, y2, z2), getV(x2+1, y2, z2+1), getV(x2, y2, z2+1), getV(x2, y2+1, z2), getV(x2+1, y2+1, z2), getV(x2+1, y2+1, z2+1), getV(x2, y2+1, z2+1)]
                if (smoothing) {
                    edges = [
                        [x+intWeights(0, values[0], s, values[1]), y, z],
                        [x+s, y, z+intWeights(0, values[1], s, values[2])],
                        [x+intWeights(0, values[3], s, values[2]), y, z+s],
                        [x, y, z+intWeights(0, values[0], s, values[3])],
                        [x+intWeights(0, values[4], s, values[5]), y+s, z],
                        [x+s, y+s, z+intWeights(0, values[5], s, values[6])],
                        [x+intWeights(0, values[7], s, values[6]), y+s, z+s],
                        [x, y+s, z+intWeights(0, values[4], s, values[7])],
                        [x, y+intWeights(0, values[0], s, values[4]), z],
                        [x+s, y+intWeights(0, values[1], s, values[5]), z],
                        [x+s, y+intWeights(0, values[2], s, values[6]), z+s],
                        [x, y+intWeights(0, values[3], s, values[7]), z+s]
                    ]
                } else {
                    edges = [
                        [x+s/2, y, z],
                        [x+s, y, z+s/2],
                        [x+s/2, y, z+s],
                        [x, y, z+s/2],
                        [x+s/2, y+s, z],
                        [x+s, y+s, z+s/2],
                        [x+s/2, y+s, z+s],
                        [x, y+s, z+s/2],
                        [x, y+s/2, z],
                        [x+s, y+s/2, z],
                        [x+s, y+s/2, z+s],
                        [x, y+s/2, z+s]
                    ]
                }

                id = 0
                idv = 1
                for (let v of values) {
                    if (v > 0.5) {
                        id += idv
                    }
                    idv *= 2
                }
                triangles = triangleTable[id]
                for (let i = 0; i < triangles.length; i += 3) {
                    mesh.vertices.push(...edges[triangles[i]])
                    mesh.vertices.push(...edges[triangles[i+1]])
                    mesh.vertices.push(...edges[triangles[i+2]])
                    // mesh.colours.push(0, 0, 0, 0, 0, 0, 0, 0, 0)
                    
                    let wpos = [
                        [edges[triangles[i]][0]+pos[0]*cs, edges[triangles[i]][1]+pos[1]*cs, edges[triangles[i]][2]+pos[2]*cs], 
                        [edges[triangles[i+1]][0]+pos[0]*cs, edges[triangles[i+1]][1]+pos[1]*cs, edges[triangles[i+1]][2]+pos[2]*cs], 
                        [edges[triangles[i+2]][0]+pos[0]*cs, edges[triangles[i+2]][1]+pos[1]*cs, edges[triangles[i+2]][2]+pos[2]*cs]
                    ]
                    cTriangles.push([
                        [edges[triangles[i]][0]+pos[0]*cs, edges[triangles[i]][1]+pos[1]*cs, edges[triangles[i]][2]+pos[2]*cs], 
                        [edges[triangles[i+1]][0]+pos[0]*cs, edges[triangles[i+1]][1]+pos[1]*cs, edges[triangles[i+1]][2]+pos[2]*cs], 
                        [edges[triangles[i+2]][0]+pos[0]*cs, edges[triangles[i+2]][1]+pos[1]*cs, edges[triangles[i+2]][2]+pos[2]*cs]
                    ])

                    mesh.faces.push(mesh.vertices.length/3-3, mesh.vertices.length/3-2, mesh.vertices.length/3-1)

                    let ld = normalizeVector([-lightD.x, -lightD.y, -lightD.z])
                    // let ld2 = normalizeVector([-lightD.x, -lightD.y, -lightD.z])

                    // let fn = calculateFaceNormal([edges[triangles[i]], edges[triangles[i+1]], edges[triangles[i+2]]])
                    // let ns = interpolateNormals([edges[triangles[i]], edges[triangles[i+1]], edges[triangles[i+2]]])

                    // let m1 = 0.1
                    // let m2 = 0.9
                    // let l1 = dotProduct(ns[0], ld)//*m1 + dotProduct(normalizeVector(computeGradient(wpos[0][0], wpos[0][1], wpos[0][2])), ld2)*m2
                    // let l2 = dotProduct(ns[1], ld)//*m1 + dotProduct(normalizeVector(computeGradient(wpos[1][0], wpos[1][1], wpos[1][2])), ld2)*m2
                    // let l3 = dotProduct(ns[2], ld)//*m1 + dotProduct(normalizeVector(computeGradient(wpos[2][0], wpos[2][1], wpos[2][2])), ld2)*m2

                    let l1 = dotProduct(normalizeVector(computeGradient(wpos[0][0], wpos[0][1], wpos[0][2])), ld)
                    let l2 = dotProduct(normalizeVector(computeGradient(wpos[1][0], wpos[1][1], wpos[1][2])), ld)
                    let l3 = dotProduct(normalizeVector(computeGradient(wpos[2][0], wpos[2][1], wpos[2][2])), ld)

                    // let cr = 3
                    // l1 = Math.round(l1*cr)/cr
                    // l2 = Math.round(l2*cr)/cr
                    // l3 = Math.round(l3*cr)/cr

                    let div = 125
                    l1 *= Math.sqrt((wpos[0][0] - 50)**2 + (wpos[0][1] - 50)**2 + (wpos[0][2] - 50)**2)/div
                    l2 *= Math.sqrt((wpos[1][0] - 50)**2 + (wpos[1][1] - 50)**2 + (wpos[1][2] - 50)**2)/div
                    l3 *= Math.sqrt((wpos[2][0] - 50)**2 + (wpos[2][1] - 50)**2 + (wpos[2][2] - 50)**2)/div

                    let s = 3
                    l1 += (noise.simplex3(wpos[0][0]/s, wpos[0][1]/s, wpos[0][2]/s)+1)/2 / 15
                    l2 += (noise.simplex3(wpos[1][0]/s, wpos[1][1]/s, wpos[1][2]/s)+1)/2 / 15
                    l3 += (noise.simplex3(wpos[2][0]/s, wpos[2][1]/s, wpos[2][2]/s)+1)/2 / 15

                    if (l1 < 0 || !l1) l1 = 0
                    if (l2 < 0 || !l2) l2 = 0
                    if (l3 < 0 || !l3) l3 = 0

                    l1 += 0.25
                    l2 += 0.25
                    l3 += 0.25

                    if (l1 > 1) l1 = 1
                    if (l2 > 1) l2 = 1
                    if (l3 > 1) l3 = 1

                    let c1 = getVT(wpos[0][0], wpos[0][1], wpos[0][2])[1]
                    let c2 = getVT(wpos[1][0], wpos[1][1], wpos[1][2])[1]
                    let c3 = getVT(wpos[2][0], wpos[2][1], wpos[2][2])[1]

                    mesh.colours.push(c1[0]*l1, c1[1]*l1, c1[2]*l1)
                    mesh.colours.push(c2[0]*l2, c2[1]*l2, c2[2]*l2)
                    mesh.colours.push(c3[0]*l3, c3[1]*l3, c3[2]*l3)

                }
            }
        }
    }
    return [mesh, cTriangles]
}

var test2 = new webgl.Points([{x:50, y:50, z:50, c:[1,1,1]}])
var cool = new webgl.Mesh(0, 0, 0, 1, 1, 1, [], [], [])
cool.updateBuffers()
cool.oneSide = true

var vel = {x: 0, y: 0, z: 0}

var onfloor = false

function addToMesh(chunk, updateL) {
    if (toMesh.includes(chunk)) {
        let i = toMesh.indexOf(chunk)
        toMesh.splice(i, 1)
    }
    toMesh.splice(0, 0, chunk)
}

var poses = []

function update(timestamp) {
    requestAnimationFrame(update)

    utils.getDelta(timestamp)
    input.setGlobals()
    webgl.resizeCanvas()

    let pcp = {x: Math.floor(camera.pos.x / cs), y: Math.floor(camera.pos.y / cs), z: Math.floor(camera.pos.z / cs)}

    poses = []
    let x2 = 0
    let y2 = 0
    let z2 = 0
    let sortMesh = false
    for (let x = 0; x < rd*2+1; x++) {
        for (let y = 0; y < rd*2+1; y++) {
            for (let z = 0; z < rd*2+1; z++) {
                x2 = x-rd + pcp.x
                y2 = y-rd + pcp.y
                z2 = z-rd + pcp.z
                let chunk = x2+","+y2+","+z2
                poses.push(chunk)
                if (!(chunk in world) && !toMesh.includes(chunk)) {
                    toMesh.push(chunk)
                    sortMesh = true
                }
            }
        }
    }
    if (sortMesh) {
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
            delete world[chunk]
        }
    }


    let grav = {x: 50-camera.pos.x, y: 50-camera.pos.y, z: 50-camera.pos.z}
    let length = Math.sqrt(grav.x**2 + grav.y**2 + grav.z**2)
    grav.x /= length; grav.y /= length; grav.z /= length

    let speed = 25

    let move = {x: 0, y: 0, z: 0}
    if (keys["KeyW"]) {
        move = utils.subv3(move, utils.rotv3({x: 0, y: 0, z: speed*delta}, camera.rot))
    }
    if (keys["KeyS"]) {
        move = utils.addv3(move, utils.rotv3({x: 0, y: 0, z: speed*delta}, camera.rot))
    }
    if (keys["KeyA"]) {
        move = utils.subv3(move, utils.rotv3({x: speed*delta, y: 0, z: 0}, camera.rot))
    }
    if (keys["KeyD"]) {
        move = utils.addv3(move, utils.rotv3({x: speed*delta, y: 0, z: 0}, camera.rot))
    }
    // if (jKeys["Space"] && onfloor) {
    //     move = utils.addv3(move, utils.rotv3({x: 0, y: speed*25*delta, z: 0}, camera.rot))
    // }
    if (keys["Space"]) {
        move = utils.addv3(move, utils.rotv3({x: 0, y: speed*delta, z: 0}, camera.rot))
    }
    if (keys["ShiftLeft"]) {
        move = utils.subv3(move, utils.rotv3({x: 0, y: speed*delta, z: 0}, camera.rot))
    }

    camera.rot.y *= -1
    let r = raycast(camera.pos, rotv3({x: 0, y: 0, z: -1}, {x: camera.rot.x, y: -camera.rot.y, z: camera.rot.z}))
    camera.rot.y *= -1
    if (r) {
        test.pos = {x: r[0], y: r[1], z: r[2]}
        if (mouse.ldown) {
            setV(test.pos.x, test.pos.y, test.pos.z, 0)
            for (let off of offs) {
                addToMesh(Math.floor(test.pos.x/cs+off[0])+","+Math.floor(test.pos.y/cs+off[1])+","+Math.floor(test.pos.z/cs+off[2]))
            }
            addToMesh(Math.floor(test.pos.x/cs)+","+Math.floor(test.pos.y/cs)+","+Math.floor(test.pos.z/cs))
            
        }
        if (mouse.rdown) {
            setV(test.pos.x, test.pos.y, test.pos.z, 1)
            for (let off of offs) {
                addToMesh(Math.floor(test.pos.x/cs+off[0])+","+Math.floor(test.pos.y/cs+off[1])+","+Math.floor(test.pos.z/cs+off[2]))
            }
            addToMesh(Math.floor(test.pos.x/cs)+","+Math.floor(test.pos.y/cs)+","+Math.floor(test.pos.z/cs))
        }
    }

    // move.x += grav.x * delta / 15
    // move.y += grav.y * delta / 15
    // move.z += grav.z * delta / 15

    vel = utils.addv3(vel,  move)

    // vel.x = lerp(vel.x, 0, delta*10)
    // vel.y = lerp(vel.y, 0, delta*10)
    // vel.z = lerp(vel.z, 0, delta*10)
    onfloor = false
    camera.pos.x += vel.x
    if (isColliding()) {
        camera.pos.x -= vel.x
        vel.x = 0
        onfloor = true
    }
    camera.pos.y += vel.y
    if (isColliding()) {
        camera.pos.y -= vel.y
        vel.y = 0
        onfloor = true
    }
    camera.pos.z += vel.z
    if (isColliding()) {
        camera.pos.z -= vel.z
        vel.z = 0
        onfloor = true
    }

    vel.x = 0
    vel.y = 0
    vel.z = 0

    if (mouse.lclick) {
        input.lockMouse()
    }

    camera.rot = playerRot

    webgl.setView(camera)
    webgl.setupFrame()
    webgl.render()

    input.updateInput()
}

setInterval(() => {
    let start = new Date().getTime()
    if (window.keys && keys["KeyE"]) console.log("To Render:", toMesh.length)
    while (toMesh.length > 0 && new Date().getTime() - start < 1000/60) {
        if (poses.includes(toMesh[0])) {
            meshChunk(toMesh[0])
        }
        toMesh.splice(0, 1)
    }
}, 1000/10)

var sensitivity = 0.003
var playerRot = {x: 0, y: 0, z: 0}

input.mouseMove = (event) => {
    input.mouse.x = event.clientX
	input.mouse.y = event.clientY
    if (input.isMouseLocked()) {
        playerRot.x -= event.movementY*sensitivity
		if (playerRot.x > Math.PI/2*0.99) {
			playerRot.x = Math.PI/2*0.99
		}
		if (playerRot.x < -Math.PI/2*0.99) {
			playerRot.x = -Math.PI/2*0.99
		}
        playerRot.y -= event.movementX*sensitivity
    }
}

requestAnimationFrame(update)

function raycast(pos, dir) {
    let r
    let solves = []
    for (let chunk in world) {
        for (let triangle of world[chunk].triangles) {
            r = findIntersection(triangle, [pos.x, pos.y, pos.z], [pos.x+dir.x*1000, pos.y+dir.y*1000, pos.z+dir.z*1000])
            if (r) {
                solves.push([r, Math.sqrt((pos.x-r[0])**2 + (pos.y-r[1])**2 + (pos.z-r[2])**2)])
            }
        }
    }
    if (solves.length > 0) {
        solves.sort((a, b) => (a[1] - b[1]))
        return solves[0][0]
    }
    return false
}

function isColliding() {
    let collisions = 0
    for (let chunk in world) {
        for (let triangle of world[chunk].triangles) {
            let center = divv3(addv3(addv3({x:triangle[0][0], y:triangle[0][1], z:triangle[0][2]}, {x:triangle[1][0], y:triangle[1][1], z:triangle[1][2]}), {x:triangle[2][0], y:triangle[2][1], z:triangle[2][2]}), {x:3,y:3,z:3})
            if (Math.sqrt((camera.pos.x-center.x)**2 + (camera.pos.z-center.z)**2) < 5) {
                if (findIntersection(triangle, [camera.pos.x, camera.pos.y, camera.pos.z], [camera.pos.x, camera.pos.y+1000, camera.pos.z])) {
                    collisions++
                }
            }
        }
    }
    if (collisions % 2 == 1) return true
    return false
}

function subtractVectors(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function addVectors(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function crossProduct(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
}

function dotProduct(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function scaleVector(v, s) {
    return [v[0] * s, v[1] * s, v[2] * s];
}

function findIntersection(triangle, lineStart, lineEnd) {
    const [v0, v1, v2] = triangle;

    const e1 = subtractVectors(v1, v0);
    const e2 = subtractVectors(v2, v0);

    const h = crossProduct(subtractVectors(lineEnd, lineStart), e2);
    const a = dotProduct(e1, h);

    if (a > -1e-6 && a < 1e-6) {
        return null;
    }

    const f = 1.0 / a;
    const s = subtractVectors(lineStart, v0);
    const u = f * dotProduct(s, h);

    if (u < 0.0 || u > 1.0) {
        return null;
    }

    const q = crossProduct(s, e1);
    const v = f * dotProduct(subtractVectors(lineEnd, v0), q);

    if (v < 0.0 || u + v > 1.0) {
        return null;
    }

    const t = f * dotProduct(e2, q);

    if (t > 1e-6) {
        const intersectionPoint = addVectors(scaleVector(lineStart, 1 - t), scaleVector(lineEnd, t))
        return intersectionPoint;
    }

    return null;
}

meshMaker.onmessage = (event) => {
    cool.vertices = event.data[0].vertices
    cool.faces = event.data[0].faces
    cool.colours = event.data[0].colours
    cTriangles = event.data[1]
    cool.updateBuffers()
}

// Function to calculate the normal for a vertex
function calculateVertexNormal(vertex, faceNormal, faceCenter) {
    // Calculate the vector from the vertex to the face center
    let vertexToFaceCenter = [
        faceCenter[0] - vertex[0],
        faceCenter[1] - vertex[1],
        faceCenter[2] - vertex[2]
    ]
    // Project the vertex-to-face-center vector onto the face normal
    let projectedVector = projectVector(vertexToFaceCenter, faceNormal);

    // Subtract the projected vector from the vertex-to-face-center vector
    let normal = subtractVectors(vertexToFaceCenter, projectedVector);

    // Normalize the resulting vector to get the vertex normal
    return normalizeVector(normal);
}

// Function to project a vector onto another vector
function projectVector(v, onto) {
    let scalar = dotProduct(v, onto) / dotProduct(onto, onto);
    return multiplyVectorByScalar(onto, scalar);
}

// Function to subtract two vectors
function subtractVectors(v1, v2) {
    return [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]];
}

// Function to multiply a vector by a scalar
function multiplyVectorByScalar(v, scalar) {
    return [v[0] * scalar, v[1] * scalar, v[2] * scalar];
}

// Function to normalize a vector
function normalizeVector(v) {
    let length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return [v[0] / length, v[1] / length, v[2] / length];
}

// Function to calculate the normal of a face given its vertices
function calculateFaceNormal(vertices) {
    // Ensure there are at least three vertices to form a face
    if (vertices.length < 3) {
      throw new Error('At least three vertices are required to calculate a face normal.');
    }
  
    // Take the first three vertices to define the face
    const a = vertices[0];
    const b = vertices[1];
    const c = vertices[2];
  
    // Calculate two vectors on the face
    const vectorAB = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const vectorAC = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  
    // Calculate the cross product of the two vectors to get the face normal
    const faceNormal = crossProduct(vectorAB, vectorAC);
  
    // Normalize the face normal
    const length = Math.sqrt(
      faceNormal[0] ** 2 +
      faceNormal[1] ** 2 +
      faceNormal[2] ** 2
    );
  
    faceNormal[0] /= length;
    faceNormal[1] /= length;
    faceNormal[2] /= length;
  
    return faceNormal
}

// Function to calculate vertex normals
function calculateVertexNormals(vertices, faceNormal) {
    const vertexNormals = [];
  
    // Calculate the centroid of the face
    const centroid = [
      (vertices[0][0] + vertices[1][0] + vertices[2][0]) / 3,
      (vertices[0][1] + vertices[1][1] + vertices[2][1]) / 3,
      (vertices[0][2] + vertices[1][2] + vertices[2][2]) / 3,
    ];
  
    // Calculate the normal for each vertex
    for (let i = 0; i < vertices.length; i++) {
      const vertex = vertices[i];
  
      // Calculate the vector from the vertex to the centroid
      const vectorToCentroid = [
        centroid[0] - vertex[0],
        centroid[1] - vertex[1],
        centroid[2] - vertex[2],
      ];
  
      // Calculate the cross product of the face normal and the vector to the centroid
      const crossProduct = [
        faceNormal[1] * vectorToCentroid[2] - faceNormal[2] * vectorToCentroid[1],
        faceNormal[2] * vectorToCentroid[0] - faceNormal[0] * vectorToCentroid[2],
        faceNormal[0] * vectorToCentroid[1] - faceNormal[1] * vectorToCentroid[0],
      ];
  
      // Normalize the result and add it to the list of vertex normals
      const length = Math.sqrt(
        crossProduct[0] * crossProduct[0] +
        crossProduct[1] * crossProduct[1] +
        crossProduct[2] * crossProduct[2]
      );
  
      const normalizedNormal = [
        crossProduct[0] / length,
        crossProduct[1] / length,
        crossProduct[2] / length,
      ];
  
      vertexNormals.push(normalizedNormal);
    }
  
    return vertexNormals;
}

function computeGradient(x, y, z, epsilon=1) {
    const dx = (getV(x + epsilon, y, z) - getV(x - epsilon, y, z)) / (2 * epsilon);
    const dy = (getV(x, y + epsilon, z) - getV(x, y - epsilon, z)) / (2 * epsilon);
    const dz = (getV(x, y, z + epsilon) - getV(x, y, z - epsilon)) / (2 * epsilon);

    return [dx, dy, dz];
}

// Function to interpolate normals across the vertices of a face
function interpolateNormals(vertices) {
    const v0 = vertices[0];
    const v1 = vertices[1];
    const v2 = vertices[2];

    let mid = [
        (v0[0] + v1[0] + v2[0])/3,
        (v0[1] + v1[1] + v2[1])/3,
        (v0[2] + v1[2] + v2[2])/3
    ]

    // Calculate face normal
    const faceNormal = normalizeVector(crossProduct(subtractVectors(v1, v0), subtractVectors(v2, v0)));

    // Interpolate normals across the vertices
    const interpolatedNormals = vertices.map(vertex => {
        const weightedNormal = normalizeVector(addVectors(faceNormal, subtractVectors(vertex, mid)));
        return weightedNormal;
    });

    return interpolatedNormals;
}