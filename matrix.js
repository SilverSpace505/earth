
function mat4Identity()
{
	return [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1];
}

function mat4Translation(matrix, position)
{
	return mat4Multiply(
	[
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		position[0], position[1], position[2], 1
	], matrix);
}

function mat4Multiply(matA, matB)
{
	return matMulitply(matA, 4, 4, matB, 4, 4);
}

function matMulitply(matA, aRows, aCols, matB, bRows, bCols)
{
	if (aCols !== bRows)
	{
		return null;
	}
	
	let matrix = [];
	
	for (let i = 0; i < aRows; i++)
	{
		for (let j = 0; j < bCols; j++)
		{
			matrix[bCols * i + j] = 0;
			
			for (let k = 0; k < bRows; k++)
			{
				matrix[bCols * i + j] += matA[aCols * i + k] * matB[bCols * k + j];
			}
		}
	}
	
	return matrix;
}

function mat4AxisAngle(matrix, axis, radians)
{
	let c = Math.cos(radians);
	let s = Math.sin(radians);
	let t = 1 - Math.cos(radians);
	
	let x = axis[0];
	let y = axis[1];
	let z = axis[2];
	
	if (magnitudeVec3Squared(axis) === 0)
	{
		return matrix;//mat4Identity();
	}
	
	let inverseLength = 1 / magnitudeVec3(axis);
	
	x *= inverseLength;
	y *= inverseLength;
	z *= inverseLength;
	
	return mat4Multiply(
	[
		t * (x * x) + c, t * x * y + s * z, t * x * z - s * y, 0,
		t * x * y - s * z, t * (y * y) + c, t * y * z + s * x, 0,
		t * x * z + s * y, t * y * z - s * x, t * (z * z) + c, 0,
		0, 0, 0, 1
	], matrix);
}

function magnitudeVec3(vector)
{
	return Math.sqrt(dotProductVec3(vector, vector));
}

function magnitudeVec3Squared(vector)
{
	return dotProductVec3(vector, vector);
}

function dotProductVec3(left, right)
{
	return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function mat4EulerAngle(oldMatrix, radians)
{
	let matrix = [];
	
	// XYZ coordinates below
	// X1
	let cos1 = Math.cos(-radians[0]);
	let sin1 = Math.sin(-radians[0]);
	// Y1
	let cos2 = Math.cos(-radians[1]);
	let sin2 = Math.sin(-radians[1]);
	// Z2
	let cos3 = Math.cos(-radians[2]);
	let sin3 = Math.sin(-radians[2]);
	
	// Matrix is cos/sin row Major aka Row|Column 
	matrix[0] = cos2 * cos3; // 11
	matrix[1] = -cos2 * sin3; // 12
	matrix[2] = sin2; // 13
	matrix[3] = 0;

	matrix[4] = cos1 * sin3 + cos3 * sin1 * sin2; // 21
	matrix[5] = cos1 * cos3 - sin1 * sin2 * sin3; // 22
	matrix[6] = -cos2 * sin1; // 23
	matrix[7] = 0;
	
	matrix[8] = sin1 * sin3 - cos1 * cos3 * sin2; // 31
	matrix[9] = cos3 * sin1 + cos1 * sin2 * sin3; // 32
	matrix[10] = cos1 * cos2; // 33
	matrix[11] = 0;
	
	matrix[12] = 0;
	matrix[13] = 0;
	matrix[14] = 0;
	matrix[15] = 1;

	return mat4Multiply(matrix, oldMatrix);
}

function vec3TranslationMat4(matrix)
{
	return [matrix[12], matrix[13], matrix[14]];
}

function vec3TransformMat4(matrix, vector)
{
	return [
		vector[0] * matrix[0] + vector[1] * matrix[4] + vector[2] * matrix[8] + 1 * matrix[12],
		vector[0] * matrix[1] + vector[1] * matrix[5] + vector[2] * matrix[9] + 1 * matrix[13],
		vector[0] * matrix[2] + vector[1] * matrix[6] + vector[2] * matrix[10] + 1 * matrix[14]
	];
}

function vec3TransformMat3(matrix, vector)
{
	return [
		vector[0] * matrix[0] + vector[1] * matrix[3] + vector[2] * matrix[6],
		vector[0] * matrix[1] + vector[1] * matrix[4] + vector[2] * matrix[7],
		vector[0] * matrix[2] + vector[1] * matrix[5] + vector[2] * matrix[8]
	];
}

function vec3Normalize(vector)
{
	let magnitude = magnitudeVec3(vector);
	
	if (magnitude === 0)
	{
		return [0, 0, 0];
	}
	
	let length = (1.0 / magnitude);
	return vec3MultiplyScalar(vector, length);
}

function vec3MultiplyScalar(vector, scalar)
{
	return [vector[0] * scalar, vector[1] * scalar, vector[2] * scalar];
}