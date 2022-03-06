const net = require('net');
const EventEmitter = require('events').EventEmitter;
const Connection = require('./Connection.js');
const Packet = require('./Packet.js');
const Buffer = require('buffer').Buffer;

/* EVENTS
	ready: when the server is started and listening
	connect: when the server recieves a connection
	discount: when a connection disconnects
	packet: when a packet is recieved
*/

function handleData(server, connection, data) {
	const dataSize = data.length;
	let availableData = dataSize;
	while (availableData > 0) {
		if (connection.pBuffer === undefined) {
			var packetSize = data.readUInt16LE();
			availableData -= 2;
			connection.pBuffer = Buffer.alloc(packetSize);
			connection.pIdx = 0;
		}

		var copySize = Math.min(availableData, connection.pBuffer.length - connection.pIdx);
		var copyIdx = dataSize - availableData;
		data.copy(connection.pBuffer, connection.pIdx, copyIdx, copyIdx + copySize);
		connection.pIdx += copySize;
		availableData -= copySize;
		if (connection.pIdx === connection.pBuffer.length) {
			var recievedPacket = new Packet;
			recievedPacket._load(connection.pBuffer);
			server.emit('packet', connection, recievedPacket);
			connection.emit('packet', recievedPacket);
			connection.pBuffer = undefined;
		}
	}
}

function handleConnect(server, connection) {
	connection._socket.setNoDelay(true);
	server.connections.push(connection);
	connection._socket.on('data', function(buffer) {
		try {
			handleData(server, connection, buffer);
		} catch (err) {
			server.emit('error', err, connection);
		}
	});
	connection._socket.on('close', function() {
		connection.kick(server, connection);
	});
	connection._socket.on('error', function(err) {
		// Needs to handled otherwise an error is thrown
		server.emit('error', err, connection);
	});
	server.emit('connect', connection);
}

class Server extends EventEmitter {

	/**
	 * Represents a server
	 * @consturctor
	 */
	constructor() {
		super();
		this.nextId = 0;
		this.connections = [];
		this._net = null;
		this.port = null;
	}

	/**
	 * Makes the server listen on a port
	 * @param {number} port 
	 */
	listen(port) {
		var self = this;
		this.port = port;
		this._net = net.createServer();
		this._net.on('connection', function(socket) {
			var newConnection = new Connection(socket, self.nextId, self);
			self.nextId += 1;
			handleConnect(self, newConnection);
		});
		this._net.listen(port, '0.0.0.0', function(e) {
			if (!e) {
				self.emit('ready');
			} else {
				console.log(e);
			}
		});
	}

	/**
	 * Stop listening and close the server
	 */
	close() {
		this._net.removeAllListeners();
		this._net.close();
	}

	/**
	 * Sends a packet to all connections
	 * @param {Packet} packet
	 */
	broadcast(packet) {
		for (var i = 0; i < this.connections.length; i++) {
			var connection = this.connections[i];
			connection._socket.write(packet._build());
		}
	}

}

module.exports = Server;