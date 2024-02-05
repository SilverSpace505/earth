
function generateSpherePoints(radius, resolution) {
    const points = []

    for (let i = 0; i <= resolution; i++) {
        const theta = (i / resolution) * Math.PI
        for (let j = 0; j <= resolution; j++) {
            const phi = (j / resolution) * 2 * Math.PI

            const x = radius * Math.sin(theta) * Math.cos(phi)
            const y = radius * Math.sin(theta) * Math.sin(phi)
            const z = radius * Math.cos(theta)

            points.push([x, y, z])
        }
    }

    return points
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

    return c0 * (1 - dz) + c1 * dz >= cutoff
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


// Function to subtract two vectors
function subtractVectors(v1, v2) {
    return [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]];
}

// Function to normalize a vector
function normalizeVector(v) {
    let length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return [v[0] / length, v[1] / length, v[2] / length];
}

function computeGradient(x, y, z, epsilon=1) {
    const dx = (getV(x + epsilon, y, z) - getV(x - epsilon, y, z)) / (2 * epsilon);
    const dy = (getV(x, y + epsilon, z) - getV(x, y - epsilon, z)) / (2 * epsilon);
    const dz = (getV(x, y, z + epsilon) - getV(x, y, z - epsilon)) / (2 * epsilon);
    let amt = 0
    if (!dx) amt++
    if (!dy) amt++
    if (!dz) amt++
    if (amt >= 3) return [-lightD.x, -lightD.y, -lightD.z]
    return [dx, dy, dz];
}

function vec3Angle(vector1, vector2) {
	return Math.acos(dotProduct(normalizeVector(vector1), normalizeVector(vector2)))
}

function vec3Axis(vector1, vector2) {
	return normalizeVector(crossProduct(vector1, vector2))
}

function extractEulerAngles(matrix) {
    const sy = Math.sqrt(matrix[0] * matrix[0] + matrix[4] * matrix[4]);

    let x, y, z;

    if (sy > 0.0001) {
        x = Math.atan2(matrix[9], matrix[10]);
        y = Math.atan2(-matrix[8], sy);
        z = Math.atan2(matrix[4], matrix[0]);
    } else {
        x = Math.atan2(-matrix[6], matrix[5]);
        y = Math.atan2(-matrix[8], sy);
        z = 0;
    }

    // Convert radians to degrees
    // x = (x * 180) / Math.PI;
    // y = (y * 180) / Math.PI;
    // z = (z * 180) / Math.PI;

    return { x, y, z };
}

function moveInDirection(eulerAngles, distance) {
    // Convert Euler angles to radians
    const radX = (eulerAngles.x);
    const radY = (eulerAngles.y);
    const radZ = (eulerAngles.z);

    // Calculate the direction vector based on Euler angles
    const direction = {
        x: Math.sin(radY) * Math.cos(radX),
        y: -Math.sin(radX),
        z: Math.cos(radY) * Math.cos(radX)
    };

    // Rotate the direction vector around the Z-axis
    const rotatedX = direction.x * Math.cos(radZ) - direction.y * Math.sin(radZ);
    const rotatedY = direction.x * Math.sin(radZ) + direction.y * Math.cos(radZ);

    // Update the direction vector with the Z-axis rotation
    direction.x = rotatedX;
    direction.y = rotatedY;

    // Normalize the direction vector
    const length = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
    direction.x /= length;
    direction.y /= length;
    direction.z /= length;

    // Calculate the displacement in each axis
    const displacement = {
        x: distance * direction.x,
        y: distance * direction.y,
        z: distance * direction.z
    };

    return displacement;
}

function smoothstep(edge0, edge1, x) {
    // Scale, and clamp x to 0..1 range
    x = Math.max(0, Math.min((x - edge0) / (edge1 - edge0), 1));
    // Evaluate polynomial
    return x * x * (3 - 2 * x);
}

function normalv3(vec) {
    let length = Math.sqrt(vec.x**2 + vec.y**2 + vec.z**2)
    return {x: vec.x/length, y: vec.y/length, z: vec.z/length}
}

function intWeights(v1, w1, v2, w2) {
    let t = (0.5 - w1) / (w2 - w1)
    return v1 + t * (v2 - v1)
}