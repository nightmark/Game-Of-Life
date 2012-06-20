var PROTOCOL = { INFO: 0
				,MANAGE_CUBE: 1
				,DONT_MANAGE_CUBE: 2
				,REQUEST_CUBE_GENERATION: 3
				,RECEIVE_CUBE_GENERATION: 4
				,REQUEST_CUBE: 5
				,RECEIVE_CUBE: 6
				,UPDATED_STATE: 7
};
//setting global variables
var initialize = false;
var visualizationEnabled = false;
var testingEnabled = true;
var rule = [5, 7, 6, 6];
var cube_size = 4;
var tickPeriod = 1;
var gameServerAddress = 'localhost';
var visualizationAddress = 'localhost';
var visualizationPort = 1234;



//computation variables
var sentManage = false;
var cubes = new Array();
var receivedBytes = 0;
var totalBytes = 0;
var processing = false;
var dataBuffer;
var tickInterval;
var time;

/*PROTOCOL                                             
vse je LITTLE endian


packet INFO (erlang -> javascript)
    - prvni packet poslany ze serveru automaticky po otevreni spojeni
1 byte = 0 (ID packetu INFO)
4 byte = K = velikost kostky (delka strany)


packet SPRAVUJ (erlang -> javascript)
    - posle se automaticky po odeslani packetu INFO pro vsechny kostky 
      a take pri pridani nejake kostky na uzel
1 byte = 1 (ID packetu spravuj)
8 byte = ID kostky
1 byte = pocet sousednich kostek (tech, co nejsou mimo mapu)
pro kazdou ze sousednich kostek:
  8 byte = ID sousedni kostky


packet UZ NESPRAVUJ (erlang -> javascript)
    - pokud se kostka presune na jiny uzel
1 byte = 2 (ID packetu UZ NESPRAVUJ)
8 byte = ID kostky


packet CHCI GENERACI (javascript -> erlang)
    - pokud javascript nezna generaci (po pridani kostky) 
      nebo pokud se javascriptu zda, ze uz dlouho neprisel 
      packet GENERACE (vlivem chyby serveru)
1 byte = 3 (ID packetu CHCI GENERACI)
8 byte = ID kostky


packet GENERACE (erlang -> javascript)
    - posila se automaticky pri zmene okolni kostky, 
      ale i jako reakce na CHCI GENERACI
1 byte = 4 (ID packetu GENERACE)
8 byte = ID kostky
8 byte = generace


packet CHCI KOSTKU (javascript -> erlang)
1 byte = 5 (ID packetu CHCI KOSTKU)
8 byte = ID kostky
8 byte = pozadovana generace


packet DATA KOSTKY (erlang -> javascript)
   - reakce na CHCI KOSTKU
1 byte = 6 (ID packetu DATA KOSTKY)
8 byte = ID kostky
8 byte = generace kostky
pro kazde z od -1 do K:
  pro kazde y od -1 do K:
    pro kazde x od -1 do K:
      4 byte: hodnota bunky (x,y,z)  (mimo mapu je vzdy 0xFFFFFFFF)


packet UPRAVENA DATA (javascript -> erlang)
    - neobsahuje okraje - pouze upraveny vnitrek kostky
1 byte = 7 (ID packetu UPRAVENA DATA)
8 byte = ID kostky
8 byte = nova generace
pro kazde z od 0 do K-1:
  pro kazde y od 0 do K-1:
    pro kazde x od 0 do K-1:
      4 byte: hodnota bunky (x,y,z)
*/


function passTime(cube){		
	var livingNeighbors = [];
	for (var i = -2; i < cube_size +2; i++){
		livingNeighbors[i] = [];
		for (var j = -2; j < cube_size +2; j++){			
			livingNeighbors[i][j] = [];
			for (var k = -2; k < cube_size +2; k++){
				livingNeighbors[i][j][k] = [0,0];				
			}
		}		
	}
	for(var i in cube.state){
			livingNeighbors[cube.state[i].x][cube.state[i].y][cube.state[i].z][1] = 1;
		
			livingNeighbors[cube.state[i].x-1][cube.state[i].y-1][cube.state[i].z-1][0]++;
			livingNeighbors[cube.state[i].x-1][cube.state[i].y-1][cube.state[i].z][0]++; 
			livingNeighbors[cube.state[i].x-1][cube.state[i].y-1][cube.state[i].z+1][0]++; 
			livingNeighbors[cube.state[i].x-1][cube.state[i].y][cube.state[i].z-1][0]++;
			livingNeighbors[cube.state[i].x-1][cube.state[i].y][cube.state[i].z+1][0]++;
			livingNeighbors[cube.state[i].x-1][cube.state[i].y][cube.state[i].z][0]++; 
			livingNeighbors[cube.state[i].x-1][cube.state[i].y+1][cube.state[i].z-1][0]++;
			livingNeighbors[cube.state[i].x-1][cube.state[i].y+1][cube.state[i].z][0]++;
			livingNeighbors[cube.state[i].x-1][cube.state[i].y+1][cube.state[i].z+1][0]++;			
			
			
			livingNeighbors[cube.state[i].x][cube.state[i].y-1][cube.state[i].z-1][0]++; 
			livingNeighbors[cube.state[i].x][cube.state[i].y][cube.state[i].z-1][0]++;		
			livingNeighbors[cube.state[i].x][cube.state[i].y+1][cube.state[i].z-1][0]++; 
			livingNeighbors[cube.state[i].x][cube.state[i].y-1][cube.state[i].z][0]++;
			livingNeighbors[cube.state[i].x][cube.state[i].y+1][cube.state[i].z][0]++;
			livingNeighbors[cube.state[i].x][cube.state[i].y-1][cube.state[i].z+1][0]++; 
			livingNeighbors[cube.state[i].x][cube.state[i].y+1][cube.state[i].z+1][0]++; 
			livingNeighbors[cube.state[i].x][cube.state[i].y][cube.state[i].z+1][0]++; 
						
			livingNeighbors[cube.state[i].x+1][cube.state[i].y-1][cube.state[i].z-1][0]++;		
			livingNeighbors[cube.state[i].x+1][cube.state[i].y][cube.state[i].z-1][0]++; 
			livingNeighbors[cube.state[i].x+1][cube.state[i].y+1][cube.state[i].z-1][0]++;					
			livingNeighbors[cube.state[i].x+1][cube.state[i].y-1][cube.state[i].z][0]++;		
			livingNeighbors[cube.state[i].x+1][cube.state[i].y][cube.state[i].z][0]++;		
			livingNeighbors[cube.state[i].x+1][cube.state[i].y+1][cube.state[i].z][0]++; 						
			livingNeighbors[cube.state[i].x+1][cube.state[i].y-1][cube.state[i].z+1][0]++;		
			livingNeighbors[cube.state[i].x+1][cube.state[i].y][cube.state[i].z+1][0]++;						
			livingNeighbors[cube.state[i].x+1][cube.state[i].y+1][cube.state[i].z+1][0]++;			
	}
	
	var nextState = new Array();
	var neighbors = 0;
	cube.cells = 0;
	for (var x = 0; x < cube_size; x++){
		for (var y = 0; y < cube_size; y++){
			for (var z = 0; z < cube_size; z++){
				neighbors = livingNeighbors[x][y][z][0];
				var alive = false;
				var lived = livingNeighbors[x][y][z][1];
				if(neighbors){
				}
				if (lived){
					if(neighbors >= rule[0] && neighbors <= rule[1]){						
						alive = true;
					}
				}else{
					if(neighbors >= rule[2] && neighbors <= rule[3]){
						alive = true;
					}									
				}
				if(alive){
					var cell = new Cell(x,y,z);
					nextState.push(cell);
					cube.cells++;
				}
			}
		}
	}
	console.log();
	cube.state = nextState;
	cube.generation++;
	cube.loaded = false;
	return cube;
}

function sendState(cube){
//	packet UPRAVENA DATA (javascript -> erlang)
//    - neobsahuje okraje - pouze upraveny vnitrek kostky
//1 byte = 7 (ID packetu UPRAVENA DATA)
//8 byte = ID kostky
//8 byte = nova generace
//pro kazde z od 0 do K-1:
//  pro kazde y od 0 do K-1:
//    pro kazde x od 0 do K-1:
//      4 byte: hodnota bunky (x,y,z)
	
	//construct cube array
	
	console.log("sent state id " + cube.id);
	var cube_array = [];
	for (var i = 0; i < cube_size; i++){
		cube_array[i] = [];
		for (var j = 0; j < cube_size; j++){
			cube_array[i][j] = [];
		}
	}
	for(var z = 0; z < cube_size; z++){
		for(var y = 0; y < cube_size; y++){
			for(var x = 0; x < cube_size; x++){
				cube_array[x][y][z] = 0;
			}
		}
	}	
	for(var i = 0; i < cube.cells; i++){		
		var cell = cube.state[i];
		cube_array[cell.x][cell.y][cell.z] = 1;
	}
	
	
	var buff = new Buffer(17 + Math.pow(cube_size, 3)*4);
	buff.writeInt8(7, 0);
	writeInt64LE(cube.id, buff, 1);
	console.log("sending cube generation " + cube.generation);
	writeInt64LE(cube.generation, buff, 9);
	for(var z = 0; z < cube_size; z++){
		for(var y = 0; y < cube_size; y++){
			for(var x = 0; x < cube_size; x++){				
				buff.writeInt32LE(cube_array[x][y][z], 17
						+ z*cube_size*cube_size*4
						+ y*cube_size*4
						+ x*4);
			}
		}
	}
	
	client.write(buff);
	if(visualizationEnabled){
		client_visualisation.write(buff);
		console.log('visualisation state sent');
	}
}

function sendManage(id){
//	packet SPRAVUJ (erlang -> javascript)
//    - posle se automaticky po odeslani packetu INFO pro vsechny kostky 
//      a take pri pridani nejake kostky na uzel
//	1 byte = 1 (ID packetu spravuj)
//	8 byte = ID kostky
//	1 byte = pocet sousednich kostek (tech, co nejsou mimo mapu)
//	pro kazdou ze sousednich kostek:
//	  8 byte = ID sousedni kostky
	if(visualizationEnabled){
	var buff = new Buffer(10);
	buff.writeInt8(1, 0);
	writeInt64LE(id, buff, 1);
	buff.writeInt8(0, 9);
	
	client_visualisation.write(buff);	
	console.log('visualisation manage sent with id ' + id);
	}
}

function tick(){
	if (testingEnabled){
		if(iteration == 0 ){
			time = new Date.getTime();
		}else{
			iteration++;
		}
	}
	console.log('Ticking');
	for(var i in cubes){
		console.log("cube " + cubes[i].id);
		var ready = true;
		console.log("cube " + cubes[i].id + " has neighbors with generations:");
//		console.log(cubes[i].neighbors);
		for(var j in cubes[i].neighbors){
			console.log(cubes[i].neighbors[j].id + " with gen " + cubes[i].neighbors[j].generation);
			if(cubes[i].neighbors[j].generation < cubes[i].generation ){
				askCubeGeneration(cubes[i].neighbors[j]);
//				console.log("false for " + cubes[i].id + " because " + cubes[i].neighbors[j].id + " gen " + cubes[i].neighbors[j].generation + " < " + cubes[i].id + " gen " + cubes[i].generation);
				ready = false;				
			}
			if(cubes[i].neighbors[j].generation == -1){
//				console.log("false for " + cubes[i].id + " because " + cubes[i].neighbors[j].id + " == -1 ");
				askCubeGeneration(cubes[i].neighbors[j]);
				ready = false;
			}
			if(cubes[i].generation == -1){
//				console.log("false for " + cubes[i].id + " because " + cubes[i].id + " gen  == -1");
				askCubeGeneration(cubes[i]);
				ready = false;				
			}			
			if(!cubes[i].loaded){
//				console.log("false for " + cubes[i].id + " because it's not loaded");
				ready = false;				
			}						
		}
		if(ready){
			console.log("ready is true for " + cubes[i].id);
			cubes[i] = passTime(cubes[i]);			
			sendState(cubes[i]);
		}else{
			console.log("ready is false for" + cubes[i].id);
		}
	}
	if(iteration == 100 && testingEnabled){
		var newTime = new Date().getTime();
		console.log("Game of Life ran for " + (newTime - time) + " miliseconds");
		clearInterval(tickInterval);
	}
}

function askCubeData(id, generation){
//packet CHCI KOSTKU (javascript -> erlang)
//1 byte = 5 (ID packetu CHCI KOSTKU)
//8 byte = ID kostky
//8 byte = pozadovana generace
	console.log("Asking cube data for " + id + " generation " + generation);
	var buff = new Buffer(17);
	buff.writeInt8(5, 0);
	writeInt64LE(id, buff, 1);
	writeInt64LE(generation, buff, 9);	
	client.write(buff);
}

function askCubeGeneration(cube){
//	packet CHCI GENERACI (javascript -> erlang)
//    - pokud javascript nezna generaci (po pridani kostky) 
//      nebo pokud se javascriptu zda, ze uz dlouho neprisel 
//      packet GENERACE (vlivem chyby serveru)
//		1 byte = 3 (ID packetu CHCI GENERACI)
//		8 byte = ID kostky
		if(!cube.askedGen || genPending > 3){
			console.log("Asking cube generation for " + cube.id);
			var buff = new Buffer(9);
			buff.writeInt8(3, 0);
			writeInt64LE(cube.id, buff, 1);	
			client.write(buff);
		}else{
			cube.genPending++;
		}
	}
	
function initializeWorld(cube){
	console.log("Initializing cube.id " + cube.id);
	var startx = 2;
	var starty = 2;
	var startz = 2;	
	//glider
//	cube.state.push(new Cell(startx, starty, startz));
//	cube.state.push(new Cell(startx + 1,starty, startz));
//	cube.state.push(new Cell(startx + 2,starty , startz));
//	cube.state.push(new Cell(startx + 2,starty + 1, startz));
//	cube.state.push(new Cell(startx + 1,starty + 2, startz));
//	
//	cube.state.push(new Cell(startx, starty, startz + 1));
//	cube.state.push(new Cell(startx + 1,starty, startz + 1));
//	cube.state.push(new Cell(startx + 2,starty , startz + 1));
//	cube.state.push(new Cell(startx + 2,starty + 1, startz + 1));
//	cube.state.push(new Cell(startx + 1,starty + 2, startz + 1));
	
	//oscillator field
	var x;
	var y;
	var z;
	for (var i = 0; i < 6; i++){
		for (var j = 0; j < 6; j++){
			for (var k = 0; k < 6; k++){
				x = i*5+startx;
				y = j*5+starty;
				z = k*5+startz;
				cube.state.push(new Cell(x + 1,y - 1, z));
				cube.state.push(new Cell(x + 1,y, z));
				cube.state.push(new Cell(x + 1,y + 1, z));
				
				cube.state.push(new Cell(x + 1,y - 1, z+1));
				cube.state.push(new Cell(x + 1,y, z+1));
				cube.state.push(new Cell(x + 1,y + 1, z+1));
			}
		}
	}	
	
	cube.generation = 1;
	cube.cells = cube.state.length;
	cube.loaded = true;
	cube.askedGen = true;
	sendState(cube);
}

function Cube(id){
	this.id = id;
	this.state = new Array();
	this.cells;
	this.generation = -1;
	this.neighbors = [];
	this.loaded = false;
	this.askedGen = false;
	this.askedData = false;
	this.genPending = 0;
}

function Cell(x,y,z){
	this.x = x;
	this.y = y;
	this.z = z;
}

var net = require('net');

var client = net.connect(4172, gameServerAddress, function(){
	console.log('connected to server');
	tickInterval = setInterval(function(){tick();}, tickPeriod);
});

if(visualizationEnabled){
	console.log('connecting to visualisation');
	var client_visualisation = net.connect(visualizationPort, visualizationAddress, function(){
		console.log('Visualization client connected');	
	});
	client_visualisation.on('error', function(){
		console.log('Visualisation crashed');
		visualizationEnabled = false;
	});
	client_visualisation.on('error', function(){
		console.log('Visualisation shutdown');
		visualizationEnabled = false;
	});
}

client.on('data', function onData(data){
	if(!(receivedBytes > 0)){
		dataBuffer = new Buffer((data.length));	
	}
	if(dataBuffer.length < (receivedBytes+data.length)){
		var temp = new Buffer((data.length + receivedBytes));
		dataBuffer.copy(temp, 0, 0, dataBuffer.length);
		dataBuffer = temp;
	}
	data.copy(dataBuffer, receivedBytes, 0, data.length);
	receivedBytes += data.length;	
	if(totalBytes == 0){
		if(dataBuffer.length >= 10){
			totalBytes = determinePacketType(dataBuffer);
		}else{
			return;
		}
	}
	if(totalBytes <= receivedBytes){
		var packet = new Buffer(totalBytes);
		dataBuffer.copy(packet, 0, 0, totalBytes);
		handlePacket(packet);
		receivedBytes = receivedBytes - totalBytes;
		totalBytes = 0;
		if(receivedBytes > 0){
			var remainingData = new Buffer(dataBuffer.length - packet.length);
			dataBuffer.copy(remainingData, 0, packet.length, dataBuffer.length);
			receivedBytes = 0;			
			onData(remainingData);
		}
	}
});

client.on('end', function(){
	console.log('Client disconnected');
});
function determinePacketType(data){
		switch(data[0]){	
			case PROTOCOL.INFO:
//				console.log("Received INFO packet");
				return 5;
			case PROTOCOL.MANAGE_CUBE:
//				console.log("Received MANAGE_CUBE packet");
				return 10 + 8*data[9];
			case PROTOCOL.DONT_MANAGE_CUBE:
//				console.log("Received DONT_MANAGE_CUBE packet");
				return 9;
			case PROTOCOL.RECEIVE_CUBE_GENERATION:
//				console.log("Received RECEIVE_CUBE_GENERATION packet");
				return 17;
			case PROTOCOL.RECEIVE_CUBE:
//				console.log("Received RECEIVE_CUBE packet");
				return 17 + Math.pow(cube_size+2, 3)*4;
		}
		console.log("Unrecognized packet id " + data[0]);
		return -1;
}

function handlePacket(data){
	if (data[0] == PROTOCOL.INFO){
		//packet INFO (erlang -> javascript)
		//- prvni packet poslany ze serveru automaticky po otevreni spojeni
		//1 byte = 0 (ID packetu INFO)
		//4 byte = K = velikost kostky (delka strany)
		console.log("Processing INFO packet with size " + data.readInt32LE(1));
		if(data.readInt32LE(1) != 0){
			cube_size = data.readInt32LE(1);
		}
	}
	if (data[0] == PROTOCOL.MANAGE_CUBE){
//		packet SPRAVUJ (erlang -> javascript)
//	    - posle se automaticky po odeslani packetu INFO pro vsechny kostky 
//	      a take pri pridani nejake kostky na uzel
//	      1 byte = 1 (ID packetu spravuj)
//		8 byte = ID kostky
//		1 byte = pocet sousednich kostek (tech, co nejsou mimo mapu)
//		pro kazdou ze sousednich kostek:
//		8 byte = ID sousedni kostky
		console.log("Processing MANAGE_CUBE packet");
		var cube = new Cube(readInt64LE(data,1));
		for(var i = 0; i < data.readInt8(9); i++){
			neighbor = new Cube(readInt64LE(data,10 + (8*i)));
			cube.neighbors.push(neighbor);
			askCubeGeneration(neighbor);
		}
		cubes.push(cube);		
		if(initialize){
			if(visualizationEnabled && !sentManage){
				sendManage(cube.id);
				sentManage = true;
			}
			initializeWorld(cube);
		}else{			
			askCubeGeneration(cube);			
		}
	}		
	if (data[0] == PROTOCOL.DONT_MANAGE_CUBE){
		console.log("Processing DONT_MANAGE_CUBE packet");
//		packet UZ NESPRAVUJ (erlang -> javascript)
//	    - pokud se kostka presune na jiny uzel
//		1 byte = 2 (ID packetu UZ NESPRAVUJ)
//		8 byte = ID kostky
		var index = -1;
		for(var i = 0; i < cubes.length; i++){
			if(cubes[i].id == readInt64LE(data,1)){
				index = i;
			}
		}
		if(index != -1){
			cubes.splice(index,1);			
		}
	}	
	if (data[0] == PROTOCOL.RECEIVE_CUBE_GENERATION){
		console.log("Processing RECEIVE_CUBE_GENERATION packet got " + readInt64LE(data,9) + " for " + readInt64LE(data,1));	
//		packet GENERACE (erlang -> javascript)
//	    - posila se automaticky pri zmene okolni kostky, 
//	      ale i jako reakce na CHCI GENERACI
//		1 byte = 4 (ID packetu GENERACE)
//		8 byte = ID kostky
//		8 byte = generace
		for(var i = 0; i < cubes.length; i++){
			if(cubes[i].id == readInt64LE(data,1)){
				cubes[i].generation = readInt64LE(data,9);
				cubes[i].askedGen = false;
				if(cubes[i].loaded == false && !cubes[i].askedData){
					console.log("asking cube " + cubes[i].id + " loaded is " + cubes[i].loaded);
					askCubeData(cubes[i].id, cubes[i].generation);
					cubes[i].askedData = true;
				}
			}
			for(var j in cubes[i].neighbors){
				if(cubes[i].neighbors[j].id == readInt64LE(data,1)){
					cubes[i].neighbors[j].generation = readInt64LE(data,9);
				}
			}
		}
	}	
	if (data[0] == PROTOCOL.RECEIVE_CUBE){
		console.log("Processing RECEIVE_CUBE packet for " + readInt64LE(data,1));
//		packet DATA KOSTKY (erlang -> javascript)
//		   - reakce na CHCI KOSTKU
//		1 byte = 6 (ID packetu DATA KOSTKY)
//		8 byte = ID kostky
//		8 byte = generace kostky
//		pro kazde z od -1 do K:
//		  pro kazde y od -1 do K:
//		    pro kazde x od -1 do K:
//		      4 byte: hodnota bunky (x,y,z)  (mimo mapu je vzdy 0xFFFFFFFF)
		var cube;
		for(var i = 0; i < cubes.length; i++){			
			if(cubes[i].id == readInt64LE(data,1)){
				console.log("hadling cube with id " + cubes[i].id);
				cube = cubes[i];
				cube.state = new Array();
				cube.generation = readInt64LE(data,9);				
				for(var z = -1; z < cube_size+1; z++){
					for(var y = -1; y < cube_size+1; y++){
						for(var x = -1; x < cube_size+1; x++){
							if(data.readInt32LE(17 
									+ (z+1)*(cube_size+2)*(cube_size+2)*4 
									+ (y+1)*(cube_size+2)*4 
									+ (x+1)*4) != -1 && 
								data.readInt32LE(17 
									+ (z+1)*(cube_size+2)*(cube_size+2)*4 
									+ (y+1)*(cube_size+2)*4 
									+ (x+1)*4) != 0){
								cube.state.push(new Cell(x,y,z));
//								console.log("live cell " + "[" + x + "][" + y + "][" + z + "] =" + data.readInt32LE(17 
//										+ (z+1)*(cube_size+2)*(cube_size+2)*4 
//										+ (y+1)*(cube_size+2)*4 
//										+ (x+1)*4));
							}
						}
					}					
				}
			}
		}
		cube.askedData = false;
		cube.loaded = true;		
	}
	if (data[0] > 6){
		console.log("Unrecognized packet " + data[0]);
	}
}

function readInt64LE(data, pos){
	return (data.readInt32LE(pos +4 ) * Math.pow(2,32)) + data.readInt32LE(pos);
}

function writeInt64LE(value,data, pos){
	var half1 = Math.floor(value/Math.pow(2,32));
	var half2 = value - (half1*Math.pow(2,32));
	data.writeInt32LE(half2, pos);
	data.writeInt32LE(half1, pos+4);
}


