
var cs = 10
var rd = 5
var planetRadius = 250

var noise = new Noise(0.885643552331419)

var offs = []
for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
        for (let z = 0; z < 3; z++) {
            offs.push([x-1, y-1, z-1])
        }
    }
}

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
                
                let c = [0, 1]
                if (center > 0.6) {
                    c = [1, 1]
                }
                if (center > 0.75) {
                    c = [0, 0]
                }

                chunks[id].push([v, c])

            }
        }
    }
    return chunks[id]
}

function getMesh(chunk) {
    let pos = chunk.split(",").map(n => parseInt(n))
    let mesh = {vertices: [], faces: [], colours: [], uvs: [], normals: []}
    
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
                    
                    let wpos = [
                        [edges[triangles[i]][0]+pos[0]*cs, edges[triangles[i]][1]+pos[1]*cs, edges[triangles[i]][2]+pos[2]*cs], 
                        [edges[triangles[i+1]][0]+pos[0]*cs, edges[triangles[i+1]][1]+pos[1]*cs, edges[triangles[i+1]][2]+pos[2]*cs], 
                        [edges[triangles[i+2]][0]+pos[0]*cs, edges[triangles[i+2]][1]+pos[1]*cs, edges[triangles[i+2]][2]+pos[2]*cs]
                    ]

                    mesh.faces.push(mesh.vertices.length/3-3, mesh.vertices.length/3-2, mesh.vertices.length/3-1)

                    let ld = normalizeVector([-lightD.x, -lightD.y, -lightD.z])
                    
                    let n1 = normalizeVector(computeGradient(wpos[0][0], wpos[0][1], wpos[0][2]))
                    let n2 = normalizeVector(computeGradient(wpos[1][0], wpos[1][1], wpos[1][2]))
                    let n3 = normalizeVector(computeGradient(wpos[2][0], wpos[2][1], wpos[2][2]))
                    let l1 = dotProduct(n1, ld)
                    let l2 = dotProduct(n2, ld)
                    let l3 = dotProduct(n3, ld)

                    l1 = Math.tanh(l1)
                    l2 = Math.tanh(l2)
                    l3 = Math.tanh(l3)

                    if (l1 > 1) l1 = 1
                    if (l2 > 1) l2 = 1
                    if (l3 > 1) l3 = 1

                    let ns = [n1, n2, n3]
                    let cs2 = [getVT(wpos[0][0], wpos[0][1], wpos[0][2])[1], getVT(wpos[1][0], wpos[1][1], wpos[1][2])[1], getVT(wpos[2][0], wpos[2][1], wpos[2][2])[1]]
                    let c = [0, 0, 0]
                    for (let i in wpos) {
                        c = [...cs2[i]]
                        mesh.normals.push(
                            ns[i][0], ns[i][1], ns[i][2]
                        )
                        if (cs2[i][0] == 0 && cs2[i][1] == 1) {
                            let planetNormal = normalizeVector(wpos[i])
                            let dif = dotProduct(ns[i], [-planetNormal[0], -planetNormal[1], -planetNormal[2]])
                            if (dif < 0.25) {
                                c[0] = 1
                            }
                        }
                        mesh.uvs.push(c[0], c[1])
                    }

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

                    mesh.colours.push(l1, l1, l1)
                    mesh.colours.push(l2, l2, l2)
                    mesh.colours.push(l3, l3, l3)
                }
            }
        }
    }
    return mesh
}

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
    if (Math.floor(x/cs)+","+Math.floor(y/cs)+","+Math.floor(z/cs) in chunks) {
        return chunks[Math.floor(x/cs)+","+Math.floor(y/cs)+","+Math.floor(z/cs)][(x-Math.floor(x/cs)*cs)*cs*cs + (y-Math.floor(y/cs)*cs)*cs + (z-Math.floor(z/cs)*cs)][0]
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