
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
var planetRadius = 100

var camera = {pos: {x: 0, y: planetRadius*(Math.PI/3) + 10, z: 0}, rot: {x: 0, y: 0, z: 0}}
var player = {pos: {x: 0, y: 0, z: 0}, vel: {x: 0, y: 0, z: 0}}

var test = new webgl.Sphere(0, 0, -1, 0.5, [1, 1, 1])
test.alpha = 0.5

var core = new webgl.Sphere(0, 0, 0, 2.5, [1, 1, 1])

var sea = new webgl.Sphere(0, 0, 0, planetRadius, [0, 0.5, 1])
sea.alpha = 0.7
sea.order = true

var atmosphere = new webgl.Sphere(0, 0, 0, planetRadius * (Math.PI/2), [0, 0.5, 1])
atmosphere.alpha = 0.1
atmosphere.order = true

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

function setVT(x, y, z, v) {
    x = Math.round(x); y = Math.round(y); z = Math.round(z)
    let cp = [Math.floor(x/cs), Math.floor(y/cs), Math.floor(z/cs)]
    let cip = [x-cp[0]*cs, y-cp[1]*cs, z-cp[2]*cs]
    let chunk = cp[0]+","+cp[1]+","+cp[2]
    if (chunk in chunks) {
        chunks[chunk][cip[0]*cs*cs + cip[1]*cs + cip[2]] = v
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

function getV2(x, y, z, pos) {
    if (
        x < 0 || x > cs ||
        y < 0 || y > cs ||
        z < 0 || z > cs
    ) return 0
    return getV(x+pos[0]*cs, y+pos[1]*cs, z+pos[2]*cs)
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
                let pi2 = Math.PI/2
                let amt = planetRadius * pi2
                let center = Math.sin(x3/planetRadius+pi2) * Math.sin(y3/planetRadius+pi2) * Math.sin(z3/planetRadius+pi2)
                let v = center + noise.perlin3(x3/40, y3/40, z3/40)/(amt/20) + noise.perlin3(x3/10, y3/10, z3/10)/amt
                
                // if (noise.perlin3(x3/20, y3/20, z3/20) > 0.2) {
                //     v = 0
                // }
                
                let c = [0.5, 1, 0]
                if (center > 0.6) {
                    c = [0.75, 0.55, 0]
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
                // values = [getV2(x, y, z, pos), getV2(x+1, y, z, pos), getV2(x+1, y, z+1, pos), getV2(x, y, z+1, pos), getV2(x, y+1, z, pos), getV2(x+1, y+1, z, pos), getV2(x+1, y+1, z+1, pos), getV2(x, y+1, z+1, pos)]
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
                    
                    let wpos = [
                        [edges[triangles[i]][0]+pos[0]*cs, edges[triangles[i]][1]+pos[1]*cs, edges[triangles[i]][2]+pos[2]*cs], 
                        [edges[triangles[i+1]][0]+pos[0]*cs, edges[triangles[i+1]][1]+pos[1]*cs, edges[triangles[i+1]][2]+pos[2]*cs], 
                        [edges[triangles[i+2]][0]+pos[0]*cs, edges[triangles[i+2]][1]+pos[1]*cs, edges[triangles[i+2]][2]+pos[2]*cs]
                    ]

                    mesh.faces.push(mesh.vertices.length/3-3, mesh.vertices.length/3-2, mesh.vertices.length/3-1)

                    let ld = normalizeVector([-lightD.x, -lightD.y, -lightD.z])
    
                    let l1 = dotProduct(normalizeVector(computeGradient(wpos[0][0], wpos[0][1], wpos[0][2])), ld)
                    let l2 = dotProduct(normalizeVector(computeGradient(wpos[1][0], wpos[1][1], wpos[1][2])), ld)
                    let l3 = dotProduct(normalizeVector(computeGradient(wpos[2][0], wpos[2][1], wpos[2][2])), ld)

                    l1 = Math.tanh(l1)
                    l2 = Math.tanh(l2)
                    l3 = Math.tanh(l3)

                    // let div = 125
                    // l1 *= Math.sqrt((wpos[0][0] - 50)**2 + (wpos[0][1] - 50)**2 + (wpos[0][2] - 50)**2)/div
                    // l2 *= Math.sqrt((wpos[1][0] - 50)**2 + (wpos[1][1] - 50)**2 + (wpos[1][2] - 50)**2)/div
                    // l3 *= Math.sqrt((wpos[2][0] - 50)**2 + (wpos[2][1] - 50)**2 + (wpos[2][2] - 50)**2)/div
                    // let s = 3

                    if (l1 < 0 || !l1) l1 = 0
                    if (l2 < 0 || !l2) l2 = 0
                    if (l3 < 0 || !l3) l3 = 0

                    l1 += 0.25
                    l2 += 0.25
                    l3 += 0.25

                    if (l1 > 1) l1 = 1
                    if (l2 > 1) l2 = 1
                    if (l3 > 1) l3 = 1

                    let s2 = 3
                    l1 += noise.perlin3(wpos[0][0]/s2, wpos[0][1]/s2, wpos[0][2]/s2) / 25
                    l2 += noise.perlin3(wpos[1][0]/s2, wpos[1][1]/s2, wpos[1][2]/s2) / 25
                    l3 += noise.perlin3(wpos[2][0]/s2, wpos[2][1]/s2, wpos[2][2]/s2) / 25

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

    let x = 0
    let y = 0
    let z = 0
    for (let xi = 0; xi < cs+2; xi++) {
        for (let yi = 0; yi < cs+2; yi++) {
            for (let zi = 0; zi < cs+2; zi++) {
                x = xi-1
                y = yi-1
                z = zi-1
                values = [getV2(x, y, z, pos), getV2(x+1, y, z, pos), getV2(x+1, y, z+1, pos), getV2(x, y, z+1, pos), getV2(x, y+1, z, pos), getV2(x+1, y+1, z, pos), getV2(x+1, y+1, z+1, pos), getV2(x, y+1, z+1, pos)]
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
                    cTriangles.push([
                        [edges[triangles[i]][0]+pos[0]*cs, edges[triangles[i]][1]+pos[1]*cs, edges[triangles[i]][2]+pos[2]*cs], 
                        [edges[triangles[i+1]][0]+pos[0]*cs, edges[triangles[i+1]][1]+pos[1]*cs, edges[triangles[i+1]][2]+pos[2]*cs], 
                        [edges[triangles[i+2]][0]+pos[0]*cs, edges[triangles[i+2]][1]+pos[1]*cs, edges[triangles[i+2]][2]+pos[2]*cs]
                    ])
                }
            }
        }
    }

    return [mesh, cTriangles]
}

var cool = new webgl.Mesh(0, 0, 0, 1, 1, 1, [], [], [])
cool.updateBuffers()
cool.oneSide = true

var vel = {x: 0, y: 0, z: 0}

var onfloor = false

function addToMesh(chunk) {
    if (toMesh.includes(chunk)) {
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

function update(timestamp) {
    requestAnimationFrame(update)

    utils.getDelta(timestamp)
    input.setGlobals()
    webgl.resizeCanvas()

    let pcp = {x: Math.floor(camera.pos.x / cs), y: Math.floor(camera.pos.y / cs), z: Math.floor(camera.pos.z / cs)}

    let start = new Date().getTime()

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

    lastGrav = {...grav}
    grav = {x: 0-camera.pos.x, y: 0-camera.pos.y, z: 0-camera.pos.z}
    if (Object.keys(lastGrav).length <= 0) lastGrav = {...grav}
    let length = Math.sqrt(grav.x**2 + grav.y**2 + grav.z**2)
    grav.x /= length; grav.y /= length; grav.z /= length
    grav.x *= -1
    grav.y *= -1
    grav.z *= -1

    let speed = 25

    let move = {x: 0, y: 0, z: 0}
    // if (keys["KeyW"]) {
    //     move = utils.subv3(move, utils.rotv3({x: 0, y: 0, z: speed*delta}, camera.rot))
    // }
    // if (keys["KeyS"]) {
    //     move = utils.addv3(move, utils.rotv3({x: 0, y: 0, z: speed*delta}, camera.rot))
    // }
    // if (keys["KeyA"]) {
    //     move = utils.subv3(move, utils.rotv3({x: speed*delta, y: 0, z: 0}, camera.rot))
    // }
    // if (keys["KeyD"]) {
    //     move = utils.addv3(move, utils.rotv3({x: speed*delta, y: 0, z: 0}, camera.rot))
    // }
    // if (jKeys["Space"] && onfloor) {
    //     move = utils.addv3(move, utils.rotv3({x: 0, y: speed*25*delta, z: 0}, camera.rot))
    // }
    // if (keys["Space"]) {
    //     move = utils.addv3(move, utils.rotv3({x: 0, y: speed*delta, z: 0}, camera.rot))
    // }
    // if (keys["ShiftLeft"]) {
    //     move = utils.subv3(move, utils.rotv3({x: 0, y: speed*delta, z: 0}, camera.rot))
    // }

    camera.rot.y *= -1
    let r = raycast(camera.pos, rotv3({x: 0, y: 0, z: -1}, {x: camera.rot.x, y: -camera.rot.y, z: camera.rot.z}))
    camera.rot.y *= -1
    test.visible = false
    if (r) {
        test.visible = true
        test.pos = {x: r[0], y: r[1], z: r[2]}
        if (mouse.ldown) {
            let changed = false
            for (let x = 0; x < 5; x++) {
                for (let y = 0; y < 5; y++) {
                    for (let z = 0; z < 5; z++) {
                        let v = Math.sqrt((x-2)**2 + (y-2)**2 + (z-2)**2) / 3
                        if (v < getV(test.pos.x+(x-2), test.pos.y+(y-2), test.pos.z+(z-2))) {
                            setV(test.pos.x+(x-2), test.pos.y+(y-2), test.pos.z+(z-2), v)
                            changed = true
                        }
                    }
                }
            }
            if (changed) {
                for (let off of offs) {
                    addToMesh(Math.floor(test.pos.x/cs+off[0])+","+Math.floor(test.pos.y/cs+off[1])+","+Math.floor(test.pos.z/cs+off[2]))
                }
                addToMesh(Math.floor(test.pos.x/cs)+","+Math.floor(test.pos.y/cs)+","+Math.floor(test.pos.z/cs))
            }
        }
        if (mouse.rdown) {
            let changed = false
            for (let x = 0; x < 5; x++) {
                for (let y = 0; y < 5; y++) {
                    for (let z = 0; z < 5; z++) {
                        let v = 1 - Math.sqrt((x-2)**2 + (y-2)**2 + (z-2)**2) / 3
                        if (v > getV(test.pos.x+(x-2), test.pos.y+(y-2), test.pos.z+(z-2))) {                
                            setV(test.pos.x+(x-2), test.pos.y+(y-2), test.pos.z+(z-2), v)
                            changed = true
                        }
                    }
                }
            }
            if (changed) {
                for (let off of offs) {
                    addToMesh(Math.floor(test.pos.x/cs+off[0])+","+Math.floor(test.pos.y/cs+off[1])+","+Math.floor(test.pos.z/cs+off[2]))
                }
                addToMesh(Math.floor(test.pos.x/cs)+","+Math.floor(test.pos.y/cs)+","+Math.floor(test.pos.z/cs))
            }
        }
    }

    // move.x += grav.x * delta / 15
    // move.y += grav.y * delta / 15
    // move.z += grav.z * delta / 15

    vel = utils.addv3(vel,  move)

    // if (isColliding()) {
    //     camera.pos = subv3(camera.pos, grav)
    // }

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

    // camera.rot.y = -Math.atan2(grav.z, grav.x)
    // let l = Math.sqrt(grav.x**2 + grav.z**2)
    // camera.rot.x = Math.atan2(grav.y, l)
    // camera.rot.z += Math.atan2(grav.z, grav.x)

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
        player.vel.x -= grav.x * delta / 10
        player.vel.y -= grav.y * delta / 10
        player.vel.z -= grav.z * delta / 10
    }
    
    if (true) {
        view = mat4Identity()
        view = mat4AxisAngle(view, [1, 0, 0], playerRot.x)

        let vmatrix = mat4EulerAngle(mat4Identity(), [camera.rot.x, camera.rot.y, camera.rot.z])
        vmatrix = mat4Translation(vmatrix, scaleVector([camera.pos.x, camera.pos.y, camera.pos.z], -1))
        let vplayerPos = vec3TranslationMat4(vmatrix)

        // console.log(vplayerPos, camera.rot)

        view = mat4Translation(view, vplayerPos)
        view = mat4EulerAngle(view, [camera.rot.x, camera.rot.y, camera.rot.z])

        let angle = vec3Angle(lastGravl, gravl)
        let axis = vec3Axis(lastGravl, gravl)

        let matrix = mat4Identity()
        let rotateVelocity = lastPlayerRotY - playerRot.y
        matrix = mat4AxisAngle(matrix, gravl, rotateVelocity)

        if (Math.abs(angle) > 1e-6 && !isNaN(angle)) {
            matrix = mat4AxisAngle(matrix, axis, angle)
        }
        forwardAxis = vec3Normalize(vec3TransformMat4(matrix, forwardAxis))
        let upAxis = vec3Normalize(gravl)
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

        let velocity = vec3TransformMat3(matrixAxes, [keyboardStrafeLeftRight, keyboardUpDown, keyboardForwardBackward])
        let playerPos = addVectors([camera.pos.x, camera.pos.y, camera.pos.z], scaleVector(velocity, delta))
        
        let lastCam = {...camera.pos}
        camera.pos.x += playerPos[0] - camera.pos.x
        camera.pos.x += player.vel.x
        if (isColliding()) {
            camera.pos.x = lastCam.x
            player.vel.x = 0
        }
        camera.pos.y += playerPos[1] - camera.pos.y
        camera.pos.y += player.vel.y
        if (isColliding()) {
            camera.pos.y = lastCam.y
            player.vel.y = 0
        }
        camera.pos.z += playerPos[2] - camera.pos.z
        camera.pos.z += player.vel.z
        if (isColliding()) {
            camera.pos.z = lastCam.z
            player.vel.z = 0
        }

        camera.rot.x = Math.atan2(matrixAxes[7], matrixAxes[8])
        camera.rot.y = Math.atan2(-matrixAxes[6], Math.sqrt(1 - matrixAxes[6] * matrixAxes[6]))
        camera.rot.z = Math.atan2(matrixAxes[3], matrixAxes[0])

        lastPlayerRotY = playerRot.y

        // camera rotation - for the player
        // mat4.translate(view, view, [0, 0, -10]) // distance from player 3rd person camera!
        // mat4.rotate(view, view, playerRot.x, [1, 0, 0])
        // mat4.rotate(vie, view, playerRot.y, [0, 1, 0])

        // let vmatrix = mat4.create()
        // mat4.rotate(vmatrix, vmatrix, camera.rot.x, [1, 0, 0])
        // mat4.rotate(vmatrix, vmatrix, camera.rot.y, [0, 1, 0])
        // mat4.rotate(vmatrix, vmatrix, camera.rot.z, [0, 0, 1])
        // mat4.translate(vmatrix, vmatrix, scaleVector([camera.pos.x, camera.pos.y, camera.pos.z],-1))
        // let vplayerPos = [vmatrix[12], vmatrix[13], vmatrix[14]]

        // mat4.translate(view, view, vplayerPos)
        // mat4.rotate(view, view, camera.rot.x, [1, 0, 0])
        // mat4.rotate(view, view, camera.rot.y, [0, 1, 0])
        // mat4.rotate(view, view, camera.rot.z, [0, 0, 1])

        // camera.pos.x -= grav.x*delta
        // camera.pos.y -= grav.y*delta
        // camera.pos.z -= grav.z*delta

        // let keyboardRotateLeftRight = 0
        // if (keys["KeyA"]) keyboardRotateLeftRight -= 1
        // if (keys["KeyD"]) keyboardRotateLeftRight += 1

        // let keyboardForwardBackward = 0
        // if (keys["KeyW"]) keyboardForwardBackward -= 1
        // if (keys["KeyS"]) keyboardForwardBackward += 1
        
        // let keyboardStrafeLeftRight = 0
        // if (keys["KeyQ"]) keyboardStrafeLeftRight -= 2
        // if (keys["KeyE"]) keyboardStrafeLeftRight += 2

        // let keyboardUpDown = 0
        // if (keys["Space"]) keyboardUpDown = 4

        // let angle = vec3Angle(lastGravl, gravl)
        // let axis = vec3Axis(lastGravl, gravl)

        // let matrix = mat4.create()

        // let shipRotateVelocity = keyboardRotateLeftRight * delta
        // let axis2 = vec3.fromValues(grav.x, grav.y, grav.z)
        // mat4.rotate(matrix, matrix, shipRotateVelocity, axis2)

        // if (Math.abs(angle) > 1e-6 && !isNaN(angle)) {
        //     let axis2 = vec3.fromValues(axis[0], axis[1], axis[2])
        //     mat4.rotate(matrix, matrix, angle, axis2)
        // }

        // forwardAxis = normalizeVector(vec3.transformMat4(vec3.create(), forwardAxis, matrix))
        // let upAxis = normalizeVector(gravl)
        // let rightAxis = crossProduct(upAxis, forwardAxis)

        // let matrixAxes = []
        // matrixAxes[0] = rightAxis[0]
        // matrixAxes[1] = rightAxis[1]
        // matrixAxes[2] = rightAxis[2]
        // matrixAxes[3] = upAxis[0]
        // matrixAxes[4] = upAxis[1]
        // matrixAxes[5] = upAxis[2]
        // matrixAxes[6] = forwardAxis[0]
        // matrixAxes[7] = forwardAxis[1]
        // matrixAxes[8] = forwardAxis[2]

        // let playerVel = vec3.transformMat3(vec3.create(), [keyboardStrafeLeftRight, keyboardUpDown, keyboardForwardBackward], matrixAxes)
        // let playerPos = addVectors([camera.pos.x, camera.pos.y, camera.pos.z], scaleVector(playerVel, delta))
        // camera.pos = {x: playerPos[0], y: playerPos[1], z: playerPos[2]}

        // camera.rot.x = Math.atan2(matrixAxes[7], matrixAxes[8])
        // camera.rot.y = Math.atan2(-matrixAxes[6], Math.sqrt(1 - matrixAxes[6] * matrixAxes[6]))
        // camera.rot.z = Math.atan2(matrixAxes[3], matrixAxes[0])

        // let matrix2 = mat4.create()
        // mat4.rotate(matrix2, matrix2, camera.rot.x, [1, 0, 0])
        // mat4.rotate(matrix2, matrix2, camera.rot.y, [0, 1, 0])
        // mat4.rotate(matrix2, matrix2, camera.rot.z, [0, 0, 1])
        // mat4.translate(matrix2, matrix2, scaleVector(playerPos, -1))

        // mat4.translate(view, view, [matrix2[12], matrix2[13], matrix2[14]])
        // mat4.rotate(view, view, camera.rot.x, [1, 0, 0])
        // mat4.rotate(view, view, camera.rot.y, [0, 1, 0])
        // mat4.rotate(view, view, camera.rot.z, [0, 0, 1])

        // mat4.translate(view, view, [0, 0, 10]) // also here too

        // actually making it work on the planet
        // mat4.translate(view, view, [camera.pos.x, camera.pos.y, camera.pos.z])
        // mat4.rotate(view, view, camera.rot.x, [1, 0, 0])
        // mat4.rotate(view, view, camera.rot.y, [0, 1, 0])
        // mat4.rotate(view, view, camera.rot.z, [0, 0, 1])

        // let planetModel = mat4.create()

        // var currentRotation = mat4.create();
        // mat4.rotationTo(currentRotation,
        //     vec3.normalize(vec3.create(), camera.oldPosition),
        //     vec3.normalize(vec3.create(), camera.position)
        // );

        // mat4.multiply(playerRotation, currentRotation, playerRotation);

        // mat4.copy(camera.rotation, playerRotation);
        // mat4.multiply(camera.rotation, camera.rotation, sensor.getState().orientation)
        // let planetPos = vec3.fromValues(50, 50, 50)
        // let playerPos = vec3.fromValues(camera.pos.x, camera.pos.y, camera.pos.z)
        // let relative = vec3.sub(vec3.create(), playerPos, planetPos)
        // let gravVec = vec3.normalize(vec3.create(), relative)
        // let cameraOrientation = mat4.create()
        // mat4.lookAt(cameraOrientation, relative, vec3.add(vec3.create(), relative, gravVec), [0, 1, 0])
        // view = mat4.create()
        // mat4.rotateY(view, view, playerRot.y)
        // mat4.rotateX(view, view, playerRot.x)
        
        // // mat4.multiply(view, view, cameraOrientation)
        // mat4.invert(view, view)
    }
        

    // webgl.setView(camera)
    // if (window.mat4) {
    //     mat4.rotateY(view, view, playerRot.y)
    //     mat4.rotateX(view, view, playerRot.x)
    // }
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
    return false
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
    return Math.sqrt(camera.pos.x**2 + camera.pos.y**2 + camera.pos.z**2) < 5 || collidingPoint(camera.pos.x, camera.pos.y, camera.pos.z, 0.4999)
}

function collidingPoint(x, y, z, cutoff=0.5) {
    let x0 = Math.floor(x)
    let y0 = Math.floor(y)
    let z0 = Math.floor(z)
    let x1 = x0+1
    let y1 = y0+1
    let z1 = z0+1

    let dx = x - x0
    let dy = y - y0
    let dz = z - z0

    let c00 = getV(x0, y0, z0) * (1 - dx) + getV(x1, y0, z0) * dx
    let c10 = getV(x0, y1, z0) * (1 - dx) + getV(x1, y1, z0) * dx
    let c01 = getV(x0, y0, z1) * (1 - dx) + getV(x1, y0, z1) * dx
    let c11 = getV(x0, y1, z1) * (1 - dx) + getV(x1, y1, z1) * dx

    let c0 = c00 * (1 - dy) + c10 * dy
    let c1 = c01 * (1 - dy) + c11 * dy

    return c0 * (1 - dz) + c1 * dz > cutoff
}

// function isColliding() {
//     let collisions = 0
//     let center = {}
//     for (let chunk in world) {
//         for (let triangle of world[chunk].triangles) {
//             center = divvl3(addvl3(addvl3(triangle[0], triangle[1]), triangle[2]), [3,3,3])
//             if (true /*Math.sqrt((camera.pos.x-center[0])**2 + (camera.pos.z-center[2])**2) < 5*/) {
//                 if (findIntersection(triangle, [camera.pos.x, camera.pos.y, camera.pos.z], [camera.pos.x, camera.pos.y+1000, camera.pos.z])) {
//                     collisions++
//                 }
//             }
//         }
//     }
//     console.log(collisions)
//     // if (collisions % 2 == 1) return true
//     return false
// }

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

function vec3Angle(vector1, vector2) {
	return Math.acos(dotProduct(normalizeVector(vector1), normalizeVector(vector2)))
}

function vec3Axis(vector1, vector2) {
	return normalizeVector(crossProduct(vector1, vector2))
}