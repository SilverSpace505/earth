
utils.setup()
utils.setStyles()

webgl.setup()
webgl.setStyles()

utils.setGlobals()

var noise = new Noise(0.885643552331419)

var su = 0
var delta = 0
var lastTime = 0

var gridSize = 100

var camera = {pos: {x: 0, y: 0, z: 0}, rot: {x: 0, y: 0, z: 0}}

var test = new webgl.Box(0, 0, -1, 0.5, 0.5, 0.5, [1, 1, 1, 1])

let points = []
for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < gridSize; z++) {
            let v = (Math.sin(x/30)+1)/2 * ((Math.sin(y/30)+1)/2) * ((Math.sin(z/30)+1)/2)/1.25 + noise.simplex3(x/20, y/20, z/20)/15
            points.push({x:x, y:y, z:z, v:v, c:[v, v, v]})
            // if (v > 0.5) {
                
            // } else {
            //     points.push({x:x, y:y, z:z, v:v, c:[0, 0, 0]})
            // }
        }
    }
} 

function getV(x, y, z) {
    if (x <= 0 || y <= 0 || z <= 0 || x > gridSize-2 || y > gridSize-2 || z > gridSize-2) return 0
    return points[x*gridSize*gridSize + y*gridSize + z].v
}

function normalv3(vec) {
    let length = Math.sqrt(vec.x**2 + vec.y**2 + vec.z**2)
    return {x: vec.x/length, y: vec.y/length, z: vec.z/length}
}

function intWeights(v1, w1, v2, w2) {
    let t = (0.5 - w1) / (w2 - w1)
    return v1 + t * (v2 - v1)
}

var cTriangles = []
let s = 1
let smoothing = true
let mesh = {vertices: [], faces: [], colours: []}
for (let x = 0; x < gridSize-1; x++) {
    for (let y = 0; y < gridSize-1; y++) {
        for (let z = 0; z < gridSize-1; z++) {

            let values = [getV(x, y, z), getV(x+1, y, z), getV(x+1, y, z+1), getV(x, y, z+1), getV(x, y+1, z), getV(x+1, y+1, z), getV(x+1, y+1, z+1), getV(x, y+1, z+1)]

            let edges = []
            if (smoothing) {
                edges = [
                    [x+intWeights(0, values[0], s, values[1]), y, z],
                    [x+s, y+intWeights(0, values[1], s, values[3]), z],
                    [x+intWeights(0, values[2], s, values[3]), y+s, z],
                    [x, y+intWeights(0, values[0], s, values[2]), z],
                    [x+intWeights(0, values[4], s, values[5]), y, z+s],
                    [x+s, y+intWeights(0, values[5], s, values[7]), z+s],
                    [x+intWeights(0, values[6], s, values[7]), y+s, z+s],
                    [x, y+intWeights(0, values[4], s, values[6]), z+s],
                    [x, y, z+intWeights(0, values[0], s, values[4])],
                    [x+s, y, z+intWeights(0, values[1], s, values[5])],
                    [x+s, y+s, z+intWeights(0, values[3], s, values[7])],
                    [x, y+s, z+intWeights(0, values[2], s, values[6])]
                ]
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

            let id = 0
            let idv = 1
            for (let v of values) {
                if (v > 0.5) {
                    id += idv
                }
                idv *= 2
            }
            let triangles = triangleTable[id]
            for (let i = 0; i < triangles.length; i += 3) {
                mesh.vertices.push(...edges[triangles[i]])
                mesh.vertices.push(...edges[triangles[i+1]])
                mesh.vertices.push(...edges[triangles[i+2]])

                cTriangles.push([edges[triangles[i]], edges[triangles[i+1]], edges[triangles[i+2]]])

                let p1 = {x: edges[triangles[i]][0], y: edges[triangles[i]][1], z: edges[triangles[i]][2]}
                let p2 = {x: edges[triangles[i+1]][0], y: edges[triangles[i+1]][1], z: edges[triangles[i+1]][2]}
                let p3 = {x: edges[triangles[i+2]][0], y: edges[triangles[i+2]][1], z: edges[triangles[i+2]][2]}

                let v1 = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z }
                let v2 = { x: p3.x - p1.x, y: p3.y - p1.y, z: p3.z - p1.z }

                let nv = normalv3({
                    x: v1.y * v2.z - v1.z * v2.y,
                    y: v1.z * v2.x - v1.x * v2.z,
                    z: v1.x * v2.y - v1.y * v2.x
                })

                let ld = normalv3({x: -0.75, y: 1, z: -0.5})
                let light = Math.max(0.1, Math.min(1, nv.x*ld.x+nv.y*ld.y+nv.z*ld.z))
                for (let i2 = 0; i2 < 3; i2++) mesh.colours.push(0.5*light, 1*light, 0)
                mesh.faces.push(mesh.vertices.length/3-3, mesh.vertices.length/3-2, mesh.vertices.length/3-1)
            }
            
        }
    }
} 

// var gridV = new webgl.Points(points)
var test2 = new webgl.Points([{x:50, y:50, z:50, c:[1,1,1]}])
var cool = new webgl.Mesh(0, 0, 0, 1, 1, 1, mesh.vertices, mesh.faces, mesh.colours)
cool.updateBuffers()
cool.oneSide = true

var vel = {x: 0, y: 0, z: 0}

var onfloor = false

function update(timestamp) {
    requestAnimationFrame(update)

    utils.getDelta(timestamp)
    input.setGlobals()
    webgl.resizeCanvas()

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

var sensitivity = 0.003
var playerRot = {x: 0, y: 0, z: 0}

input.mouseMove = (event) => {
    input.mouse.x = event.clientX
	input.mouse.y = event.clientY
    if (input.isMouseLocked()) {
        playerRot.x -= event.movementY*sensitivity
		// if (playerRot.x > Math.PI/2*0.99) {
		// 	playerRot.x = Math.PI/2*0.99
		// }
		// if (playerRot.x < -Math.PI/2*0.99) {
		// 	playerRot.x = -Math.PI/2*0.99
		// }
        playerRot.y -= event.movementX*sensitivity
    }
}

requestAnimationFrame(update)

function isColliding() {
    let collisions = 0
    for (let triangle of cTriangles) {
        let center = divv3(addv3(addv3({x:triangle[0][0], y:triangle[0][1], z:triangle[0][2]}, {x:triangle[1][0], y:triangle[1][1], z:triangle[1][2]}), {x:triangle[2][0], y:triangle[2][1], z:triangle[2][2]}), {x:3,y:3,z:3})
        if (Math.sqrt((camera.pos.x-center.x)**2 + (camera.pos.z-center.z)**2) < 5) {
            if (intersectTriangleLine(triangle, [camera.pos.x, camera.pos.y, camera.pos.z], [camera.pos.x, camera.pos.y+1, camera.pos.z])) {
                collisions++
            }
        }
    }
    if (collisions % 2 == 1) return true
    return false
}

function subtractVectors(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
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

function intersectTriangleLine(triangle, lineStart, lineEnd) {
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
        const intersectionPoint = scaleVector(lineStart, 1 - t) + scaleVector(lineEnd, t);
        return intersectionPoint;
    }

    return null;
}