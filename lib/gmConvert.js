const Buffer = require('buffer').Buffer;

var typeMap = ['u8','u16','u32','s8','s16','s32','f16','f32','f64','string','buffer','undefined'];
var sizeMap = {u8: 1, u16: 2, u32: 4, s8: 1, s16: 2, s32: 4, f16: 2, f32: 4, f64: 8, undefined: 0};
var endStringBuffer = Buffer.from('00', 'hex');

module.exports = {
	createBuffer(data) {
		// Type
		var dataType = this.determineType(data);
		var dataTypeName = typeMap[dataType];
		var typeBuffer = Buffer.alloc(1);
		typeBuffer.writeUInt8(dataType);

		// Write data
		var buffer;
		if (dataTypeName === 'string') {
			// String
			buffer = Buffer.from(data, 'utf8');
			// check buffer for null terminator
			if (buffer[buffer.length - 1] !== 0) {
				buffer = Buffer.concat([buffer, endStringBuffer]);
			}
			const strLen = buffer.length;
			sizeBuf = Buffer.alloc(1);
			sizeBuf.writeUInt8(strLen);
			buffer = Buffer.concat([sizeBuf, buffer]);
		} else if (dataTypeName === 'buffer') {
			// Buffer
			const bufLen = data.length;
			sizeBuf = Buffer.alloc(1);
			sizeBuf.writeUInt8(bufLen);
			buffer = Buffer.concat([sizeBuf, data], bufLen+1);
		} else {
			// Number
			buffer = Buffer.alloc(sizeMap[dataTypeName]);
			switch(dataTypeName) {
				case 'u8':
					buffer.writeUInt8(data, 0);
					break;
				case 'u16':
					buffer.writeUInt16LE(data, 0);
					break;
				case 'u32':
					buffer.writeUInt32LE(data, 0);
					break;
				case 's8':
					buffer.writeInt8(data, 0);
					break;
				case 's16':
					buffer.writeInt16LE(data, 0);
					break;
				case 's32':
					buffer.writeInt32LE(data, 0);
					break;
				case 'f16':
				case 'f32':
				case 'f64':
					buffer.writeFloatLE(data, 0);
					break;
				case 'undefined':
					break;
			}
		}

		return Buffer.concat([typeBuffer, buffer]);
	},
	determineType: function(val) {
		if (val === undefined) {
			return typeMap.indexOf('undefined');
		}
		else if (Buffer.isBuffer(val)) {
			return typeMap.indexOf('buffer');
		}
		else if (typeof val === 'string') {
			return typeMap.indexOf('string');
		}
		else if (typeof val === 'number' || typeof val === 'boolean') {
			if (Math.round(val) === val) {
				// Integer
				if (val < 0) {
					// Signed
					if (Math.abs(val) <= 127) {
						return typeMap.indexOf('s8');
					}
					if (Math.abs(val) <= 32767) {
						return typeMap.indexOf('s16');
					}
					return typeMap.indexOf('s32');
				} else {
					// Unsigned
					if (val <= 255) {
						return typeMap.indexOf('u8');
					}
					if (val <= 65535) {
						return typeMap.indexOf('u16');
					}
					return typeMap.indexOf('u32');
				}
			} else {
				// Float
				/* Not supported by GM yet
				if (val <= 65504) {
					return typeMap.indexOf('f16');
				}
				*/
				if (Math.abs(val) <= 16777216) {
					return typeMap.indexOf('f32');
				}
				return typeMap.indexOf('f64');
			}
		}
	},
	parse: function(buffer, index) {
		// Type
		var typeNum = buffer.readUInt8(index);
		var type = typeMap[typeNum];
		index++;

		if (type === 'undefined') {
			return {
				value: undefined,
				size: 0
			};
		}
	
		// Value
		let value;
		let size = 0;
		switch(type) {
			case "u8":
				value = buffer.readUInt8(index);
				break;
			case "u16":
				value = buffer.readUInt16LE(index);
				break;
			case "u32":
				value = buffer.readUInt32LE(index);
				break;
			case "s8":
				value = buffer.readInt8(index);
				break;
			case "s16":
				value = buffer.readInt16LE(index);
				break;
			case "s32":
				value = buffer.readInt32LE(index);
				break;
			case "f16":
			case "f32":
				value = buffer.readFloatLE(index);
				break;
			case "f64":
				value = buffer.readDoubleLE(index);
				break;
			case "string":
				var strLen = buffer.readUInt8(index);
				value = buffer.toString('utf8', index+1, index+1+strLen);
				size = strLen+1;
				break;
			case "buffer":
				var arrLen = buffer.readUInt8(index);
				value = buffer.slice(index+1, index+1+arrLen);
				size = arrLen+1;
				break;
		}

		if (type == "string") {
			//size = value.length+2;
		} else if (type == "buffer") {
			//size = value.length+1;
	 	} else {
			size = sizeMap[type];
		}
		if (type === "f16" || type === "f32" || type == "f64") {
			value = Math.round(value*100)/100;
		}
	
		return {value: value, size: size};
	}
}