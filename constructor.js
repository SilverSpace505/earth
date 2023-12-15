importScripts("marchingCubes.js")

var points = []
var gridSize = 100

var cTriangles = []
let s = 1
let smoothing = true

var lightD = {x: -0.75, y: 1, z: -0.5}

self.onmessage = function(event) {
    points = event.data
    self.postMessage(this.constructMesh())
}

function normalv3(vec) {
    let length = Math.sqrt(vec.x**2 + vec.y**2 + vec.z**2)
    return {x: vec.x/length, y: vec.y/length, z: vec.z/length}
}

function intWeights(v1, w1, v2, w2) {
    let t = (0.5 - w1) / (w2 - w1)
    return v1 + t * (v2 - v1)
}

function getV(x, y, z) {
    x = Math.round(x); y = Math.round(y); z = Math.round(z)
    if (x <= 0 || y <= 0 || z <= 0 || x > gridSize-2 || y > gridSize-2 || z > gridSize-2) return 0
    return points[x*gridSize*gridSize + y*gridSize + z].v
}

function getVT(x, y, z) {
    x = Math.round(x); y = Math.round(y); z = Math.round(z)
    if (x <= 0 || y <= 0 || z <= 0 || x > gridSize-2 || y > gridSize-2 || z > gridSize-2) return {x:0, y:0, z:0, v:0, c:[0, 0, 0]}
    return points[x*gridSize*gridSize + y*gridSize + z]
}

function constructMesh() {
    cTriangles = []
    let mesh = {vertices: [], faces: [], colours: []}
    let edges = []
    let values = []
    let id = 0
    let idv = 1
    let triangles = []
    for (let x = 0; x < gridSize-1; x++) {
        for (let y = 0; y < gridSize-1; y++) {
            for (let z = 0; z < gridSize-1; z++) {
                values = [getV(x, y, z), getV(x+1, y, z), getV(x+1, y, z+1), getV(x, y, z+1), getV(x, y+1, z), getV(x+1, y+1, z), getV(x+1, y+1, z+1), getV(x, y+1, z+1)]
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
    
                    let ld = normalv3(lightD)
                    let light = Math.max(0.1, Math.min(1, nv.x*ld.x+nv.y*ld.y+nv.z*ld.z))
                    let faceColour = getVT(x, y, z).c
                    for (let i2 = 0; i2 < 3; i2++) mesh.colours.push(faceColour[0]*light, faceColour[1]*light, faceColour[2]*light)
                    mesh.faces.push(mesh.vertices.length/3-3, mesh.vertices.length/3-2, mesh.vertices.length/3-1)
                }
                
            }
        }
    } 
    return [mesh, cTriangles]
}