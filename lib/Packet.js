const Buffer = require('buffer').Buffer;
//const Parser = require('binary-parser').Parser;
const gmConvert = require('./gmConvert.js');

class Packet {

	/**
	 * Represents a packet
	 * @constructor
	 * @param {number} networkId 
	 */
	constructor(netId) {
		this.netId = netId;
		this.data = [];
	}

	/**
	 * Add data to the packet
	 * @param {{string|number|array}} data 
	 */
	add(newData) {
		if (Array.isArray(newData)) {
			this.data = this.data.concat(newData);
		} else {
			this.data.push(newData);
		}
	}

	/**
	 * Return the data at the index
	 * @param {number} index 
	 */
	get(index) {
		return this.data[index];
	}

	_load(dataBuffer) {
		//console.log(dataBuffer);

		//var netIdParse = new Parser().uint16le("id");
		this.netId = dataBuffer.readUInt16LE(0);

		if (dataBuffer.length > 2) {
			var index = 2;
			while (index < dataBuffer.length) {
				var conv = gmConvert.parse(dataBuffer, index);
				index += conv.size+1;
				this.data.push(conv.value);
			}
		}
		
	}

	_build() {

		var packetParts = [];
		var packetSize = 0;

		var idBuffer = Buffer.alloc(2);
		idBuffer.writeInt16LE(this.netId, 0);
		packetSize += idBuffer.length;
		packetParts.push(idBuffer);

		for (var i = 0; i < this.data.length; i++) {
			var selectedData = this.data[i];
			var buffer = gmConvert.createBuffer(selectedData);
			packetSize += buffer.length;
			packetParts.push(buffer);
		}

		var dataBuffer = Buffer.concat(packetParts, packetSize);
		var sizeBuffer = Buffer.alloc(2);
		sizeBuffer.writeUInt16LE(dataBuffer.length);

		var finalPacket = Buffer.concat([sizeBuffer, dataBuffer], sizeBuffer.length+dataBuffer.length);
		return finalPacket;

	}

}

module.exports = Packet;