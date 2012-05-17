var PROTOCOL = { INFO: 0
				,MANAGE_CUBE: 1
				,DONT_MANAGE_CUBE: 2
				,REQUEST_CUBE_GENERATION: 3
				,RECEIVE_CUBE_GENERATION: 4
				,REQUEST_CUBE: 5
				,RECEIVE_CUBE: 6
				,UPDATED_STATE: 7
};

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

/*OLD_PASS_TIME
var nextState = new Array(state.length);
for (var xAxis = 0; xAxis < state.length; xAxis++){		
	nextState[xAxis] = new Array(state[xAxis].length);
	
	for (var yAxis = 0; yAxis < nextState[xAxis].length; yAxis++){			
		nextState[xAxis][yAxis] = new Array(state[xAxis][yAxis].length);
		
		for (var zAxis = 0; zAxis < nextState[xAxis][yAxis].length; zAxis++){
			nextState[xAxis][yAxis][zAxis] = 0;
		}			
	}
}
for(var xAxis = 0; xAxis < state.length; xAxis++){
	for(var yAxis = 0; yAxis < state[xAxis].length; yAxis++){
		if(state[xAxis][yAxis] > 0){
			if(xAxis >= 1){
				if (yAxis >= 1){
					nextState[xAxis-1][yAxis-1]++;
					nextState[xAxis][yAxis-1]++;			
				}
				nextState[xAxis-1][yAxis]++;
				if(nextState[xAxis-1].length > yAxis + 1){
					nextState[xAxis-1][yAxis+1]++;
				}
			}else{
				if(yAxis >= 1){
					nextState[xAxis][yAxis-1]++;
				}
			}
			if(nextState.length > xAxis + 1){
				if(nextState[xAxis].length > yAxis + 1){					
					nextState[xAxis+1][yAxis+1]++;						
					nextState[xAxis][yAxis+1]++;	
				}
				nextState[xAxis+1][yAxis]++;
				if(yAxis >= 1){
					nextState[xAxis+1][yAxis-1]++;
				}
			}else{
				if(nextState[xAxis].length > yAxis + 1){
					nextState[xAxis][yAxis+1]++;
				}
			}
		}
	}
	
	 // nextState[row-1][col-1]++;
	 // nextState[row][col-1]++;
	 // nextState[row+1][col-1]++;
	 // nextState[row-1][col]++;
	 // nextState[row+1][col]++;
	 // nextState[row-1][col+1]++;
	 // nextState[row][col+1]++;
	 // nextState[row+1][col+1]++;
	 
} */

/* PRINT_DEBUG
//printDebug(nextState);
for(var xAxis = 0; xAxis < nextState.length; xAxis++){
	for(var yAxis = 0; yAxis < nextState[xAxis].length; yAxis++){
		if(state[xAxis][yAxis] > 0){
			if(nextState[xAxis][yAxis] == 2 || nextState[xAxis][yAxis] == 3){
				nextState[xAxis][yAxis] = 1;
			}else{
				nextState[xAxis][yAxis] = 0;
			}
		}else{
			if(nextState[xAxis][yAxis] == 3){
				nextState[xAxis][yAxis] = 1;
			}else{
				nextState[xAxis][yAxis] = 0;
			}
		}
	}
} */
function passTime(cube){		
	var livingNeighbors = [];
	for (var i = -2; i < cube_size +2; i++){
		livingNeighbors[i] = [];
		for (var j = -2; j < cube_size +2; j++){			
			livingNeighbors[i][j] = [];
			for (var k = -1; k < cube_size; k++){
				livingNeighbors[i][j][k] = [];
				for (var m = -1; m < cube_size; m++){
					livingNeighbors[i][j][k][0] = 0;
					livingNeighbors[i][j][k][1] = 0;
				}
			}
		}		
	}
	for(var i in cube.state){
//		if(cell > 0){			
//			if(cell.x > startX){
//				if(cell.y > startY){
//					if(cell.z > startZ){
//						livingNeighbors[cell.x-1][cell.y-1][cell.z-1]++;
//					}					
//					livingNeighbors[cell.x-1][cell.y-1][cell.z]++;
//					if(cell.z < cube_size){
//						livingNeighbors[cell.x-1][cell.y-1][cell.z+1]++;
//					}
//				}
//				if(cell.z > startZ){
//					livingNeighbors[cell.x-1][cell.y][cell.z-1]++;
//				}
//				if(cell.z < cube_size){
//					livingNeighbors[cell.x-1][cell.y][cell.z+1]++;
//				}
//					livingNeighbors[cell.x-1][cell.y][cell.z]++;
//				if(cell.y < cube_size){
//					if(cell.z > startZ){
//						livingNeighbors[cell.x-1][cell.y+1][cell.z-1]++;
//					}
//					livingNeighbors[cell.x-1][cell.y+1][cell.z]++;
//					if(cell.z < cube_size){
//						livingNeighbors[cell.x-1][cell.y+1][cell.z+1]++;
//					}
//				}
//			}
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
		//}
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
				if (lived){
					if(neighbors == 5 || neighbors == 6 || neighbors == 7){
						alive = true;
					}
				}else{
					if(neighbors == 6){
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
	cube.state = nextState;
	cube.generation++;
	return cube;
	
	
}
/* NEXT_STATES
 * nextState[x-1][y-1][z-1]++;
 * nextState[x][y-1][z-1]++;
 * nextState[x+1][y-1][z-1]++;
 * nextState[x-1][y][z-1]++;
 * nextState[x+1][y][z-1]++;
 * nextState[x][y][z-1]++;
 * nextState[x-1][y+1][z-1]++;
 * nextState[x][y+1][z-1]++;
 * nextState[x+1][y+1][z-1]++;

 * nextState[x-1][y-1][z]++;
 * nextState[x][y-1][z]++;
 * nextState[x+1][y-1][z]++;
 * nextState[x-1][y][z]++;
 * nextState[x+1][y][z]++;
 * nextState[x-1][y+1][z]++;
 * nextState[x][y+1][z]++;
 * nextState[x+1][y+1][z]++;
  
 * nextState[x-1][y-1][z+1]++;
 * nextState[x][y-1][z+1]++;
 * nextState[x+1][y-1][z+1]++;
 * nextState[x-1][y][z+1]++;
 * nextState[x+1][y][z+1]++;
 * nextState[x][y][z+1]++;
 * nextState[x-1][y+1][z+1]++;
 * nextState[x][y+1][z+1]++;
 * nextState[x+1][y+1][z+1]++;

 */

/* GLIDER_GUN
	//glider gun start
	cube.state.push(new Cell(startRow + 5,startCol + 2, 0));
	cube.state.push(new Cell(startRow + 5,startCol + 3, 0));
	cube.state.push(new Cell(startRow + 6,startCol + 2, 0));	
	cube.state.push(new Cell(startRow + 6,startCol + 3, 0));
		
	cube.state.push(new Cell(startRow + 3,startCol + 36, 0));
	cube.state.push(new Cell(startRow + 3,startCol + 37, 0));
	cube.state.push(new Cell(startRow + 4,startCol + 36, 0));
	cube.state.push(new Cell(startRow + 4,startCol + 37, 0));	
	
	cube.state.push(new Cell(startRow + 1,startCol + 26, 0));
	cube.state.push(new Cell(startRow + 2,startCol + 26, 0));
	cube.state.push(new Cell(startRow + 2,startCol + 24, 0));
	cube.state.push(new Cell(startRow + 3,startCol + 23, 0));
	cube.state.push(new Cell(startRow + 4,startCol + 23, 0));
	cube.state.push(new Cell(startRow + 5,startCol + 23, 0));
	cube.state.push(new Cell(startRow + 3,startCol + 22, 0));
	cube.state.push(new Cell(startRow + 4,startCol + 22, 0));
	cube.state.push(new Cell(startRow + 5,startCol + 22, 0));
	cube.state.push(new Cell(startRow + 6,startCol + 24, 0));
	cube.state.push(new Cell(startRow + 6,startCol + 26, 0));
	cube.state.push(new Cell(startRow + 7,startCol + 26, 0));
		
	
	cube.state.push(new Cell(startRow + 3,startCol + 14, 0));	
	cube.state.push(new Cell(startRow + 3,startCol + 15, 0));
	cube.state.push(new Cell(startRow + 4,startCol + 13, 0));
	cube.state.push(new Cell(startRow + 4,startCol + 17, 0));
	cube.state.push(new Cell(startRow + 5,startCol + 12, 0));
	cube.state.push(new Cell(startRow + 5,startCol + 18, 0));
	cube.state.push(new Cell(startRow + 6,startCol + 12, 0));
	cube.state.push(new Cell(startRow + 6,startCol + 16, 0));
	cube.state.push(new Cell(startRow + 6,startCol + 18, 0));
	cube.state.push(new Cell(startRow + 6,startCol + 19, 0));
	cube.state.push(new Cell(startRow + 7,startCol + 12, 0));
	cube.state.push(new Cell(startRow + 7,startCol + 18, 0));
	cube.state.push(new Cell(startRow + 8,startCol + 13, 0));
	cube.state.push(new Cell(startRow + 8,startCol + 17, 0));
	cube.state.push(new Cell(startRow + 9,startCol + 15, 0));
	cube.state.push(new Cell(startRow + 9,startCol + 15, 0));	
	//glider gun stop
	*/

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
	buff.writeDoubleLE(cube.id, 1);
	console.log("sending cube generation " + cube.generation);
	buff.writeDoubleLE(cube.generation, 9);
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
	buff.writeDoubleLE(id, 1);
	buff.writeInt8(0, 9);
	
	client_visualisation.write(buff);	
	console.log('visualisation manage sent with id ' + id);
	}
}

function tick(){	
	console.log('Managing');
//	if(!initialized){
//		console.log("initializing");
//		initializeWorld(1);
//		initialized = true;
//	}
	//sendState(cubes[0]);
	for(var i in cubes){
		console.log("cube " + cubes[i].id);
		var ready = true;
		for(var j in cubes[i].neighbors){
			if(cubes[i].neighbors[j].generation < cubes[i].generation 
					|| cubes[i].neighbors[j].generation == -1
					|| cubes[i].generation == -1
					|| !cubes[i].loaded){
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
}

function askCubeData(id, generation){
//packet CHCI KOSTKU (javascript -> erlang)
//1 byte = 5 (ID packetu CHCI KOSTKU)
//8 byte = ID kostky
//8 byte = pozadovana generace
	console.log("Asking cube data for " + id + " generation " + generation);
	var buff = new Buffer(17);
	buff.writeInt8(5, 0);
	buff.writeDoubleLE(id, 1);
	buff.writeDoubleLE(generation, 9);	
	client.write(buff);
}

function askCubeGeneration(id){
//	packet CHCI GENERACI (javascript -> erlang)
//    - pokud javascript nezna generaci (po pridani kostky) 
//      nebo pokud se javascriptu zda, ze uz dlouho neprisel 
//      packet GENERACE (vlivem chyby serveru)
//		1 byte = 3 (ID packetu CHCI GENERACI)
//		8 byte = ID kostky
		console.log("Asking cube generation for " + id);
		var buff = new Buffer(9);
		buff.writeInt8(3, 0);
		buff.writeDoubleLE(id, 1);	
		client.write(buff);
	}
	
function initializeWorld(id){
	var startx = 3;
	var starty = 3;
	var startz = 3;
	var cube = new Cube(id);	
	cubes.push(cube);
	
	cube.state.push(new Cell(startx, starty, startz));
	cube.state.push(new Cell(startx + 1,starty, startz));
	cube.state.push(new Cell(startx + 2,starty , startz));
	cube.state.push(new Cell(startx + 2,starty + 1, startz));
	cube.state.push(new Cell(startx + 1,starty + 2, startz));
	
	cube.state.push(new Cell(startx, starty, startz + 1));
	cube.state.push(new Cell(startx + 1,starty, startz + 1));
	cube.state.push(new Cell(startx + 2,starty , startz + 1));
	cube.state.push(new Cell(startx + 2,starty + 1, startz + 1));
	cube.state.push(new Cell(startx + 1,starty + 2, startz + 1));
	
	console.log(cube.id);
	cube.generation = 1;
	cube.cells = cube.state.length;
	sendManage(cube.id);
	sendState(cube);	
}

function Cube(id){
	this.id = id;
	this.state = new Array();
	this.cells;
	this.generation = -1;
	this.neighbors = [];
	this.loaded = false;
}

function Cell(x,y,z){
	this.x = x;
	this.y = y;
	this.z = z;
}

var initialized = false;
var visualizationEnabled = true;
var cubes = new Array();
var cube_size = 4;
var receivedBytes = 0;
var totalBytes = 0;
var packet;
var net = require('net');
console.log('connecting to server');
var client = net.connect(4172, 'localhost', function(){
	console.log('Client connected');
	setInterval(function(){tick();}, 15000);
});

console.log('connecting to visualisation');
var client_visualisation = net.connect(1234, '147.251.208.129', function(){
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

client.on('data', function(data){
	console.log("received packet " + data[0]);
	console.log("receivedBytes " + receivedBytes);
	console.log("totalBytes " + totalBytes);
	determinePacketType(data);	
	var remainingBytes = 0;
	if(totalBytes > receivedBytes){
		if((totalBytes-receivedBytes) > data.length){
			data.copy(packet, receivedBytes, 0, data.length);
		}else{
			data.copy(packet, receivedBytes, 0, (totalBytes-receivedBytes));
			remainingBytes = data.length - (totalBytes - receivedBytes);
		}
	}else{
		data.copy(packet, receivedBytes, 0, totalB);
		remainingBytes = data.length - (totalBytes - receivedBytes);
	}
	receivedBytes += data.length;
	if(totalBytes <= receivedBytes){
		totalBytes = 0;
		receivedBytes = remainingBytes;		
		handlePacket(packet);
		if(remainingBytes != 0){
			console.log(remainingBytes + " bytes remained");
			packet = new Buffer(remainingBytes);
			data.copy(packet, 0, receivedBytes, data.length);
			determinePacketType(packet);
			data.copy(packet, 0, receivedBytes, data.length);
		}
	}	
});

client.on('end', function(){
	console.log('Client disconnected');
});
function determinePacketType(data){
	if(totalBytes == 0){
			switch(data[0]){	
				case PROTOCOL.INFO:
					totalBytes = 5;
					break;
				case PROTOCOL.MANAGE_CUBE:
					totalBytes = 10 + 8*data[9];
					break;
				case PROTOCOL.DONT_MANAGE_CUBE:
					totalBytes = 9;
					break;
				case PROTOCOL.RECEIVE_CUBE_GENERATION:
					totalBytes = 17;
					break;
				case PROTOCOL.RECEIVE_CUBE:
					totalBytes = 17 + Math.pow(cube_size+2, 4);
					break;
			}
		packet = new Buffer(totalBytes);
	}
}

function handlePacket(data){
	if (data[0] == PROTOCOL.INFO){
		//packet INFO (erlang -> javascript)
		//- prvni packet poslany ze serveru automaticky po otevreni spojeni
		//1 byte = 0 (ID packetu INFO)
		//4 byte = K = velikost kostky (delka strany)
		console.log("Received INFO packet with size " + data.readInt32LE(1));
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
		console.log("Received MANAGE_CUBE packet");
		var cube = new Cube(data.readDoubleLE(1));
		for(var i = 0; i < data.readInt8(9); i++){
			cube.neighbors.push(data.readDoubleLE(10 + (8*i)));			
		}
		cubes.push(cube);
		askCubeGeneration(cube.id);
		if(!initialized){
			console.log("initializing");
			initializeWorld(data.readDoubleLE(1));
			initialized = true;
		}
	}
	if (data[0] == PROTOCOL.DONT_MANAGE_CUBE){
		console.log("Received DONT_MANAGE_CUBE packet");
//		packet UZ NESPRAVUJ (erlang -> javascript)
//	    - pokud se kostka presune na jiny uzel
//		1 byte = 2 (ID packetu UZ NESPRAVUJ)
//		8 byte = ID kostky
		var index = -1;
		for(var i = 0; i < cubes.length; i++){
			if(cubes[i].id == data.readDoubleLE(1)){
				index = i;
			}
		}
		if(index != -1){
			cubes.splice(index,1);			
		}
	}	
	if (data[0] == PROTOCOL.RECEIVE_CUBE_GENERATION){
		console.log("Received RECEIVE_CUBE_GENERATION packet");	
//		packet GENERACE (erlang -> javascript)
//	    - posila se automaticky pri zmene okolni kostky, 
//	      ale i jako reakce na CHCI GENERACI
//		1 byte = 4 (ID packetu GENERACE)
//		8 byte = ID kostky
//		8 byte = generace
		console.log("generation " + data.readDoubleLE(9));
		for(var i = 0; i < cubes.length; i++){
			if(cubes[i].id == data.readDoubleLE(1)){
				cubes[i].generation = data.readDoubleLE(9);
				if(cubes[i].loaded == false){
					askCubeData(cubes[i].id, cubes[i].generation);
				}
			}
			for(var j in cubes[i].neighbors){
				if(cubes[i].neighbors[j].id == data.readDoubleLE(1)){
					cubes[i].neighbors[j].generation = data.readDoubleLE(9);
				}
			}
		}
	}	
	if (data[0] == PROTOCOL.RECEIVE_CUBE){
		console.log("Received RECEIVE_CUBE packet");
//		packet DATA KOSTKY (erlang -> javascript)
//		   - reakce na CHCI KOSTKU
//		1 byte = 6 (ID packetu DATA KOSTKY)
//		8 byte = ID kostky
//		8 byte = generace kostky
//		pro kazde z od -1 do K:
//		  pro kazde y od -1 do K:
//		    pro kazde x od -1 do K:
//		      4 byte: hodnota bunky (x,y,z)  (mimo mapu je vzdy 0xFFFFFFFF)
		console.log("buffer length" + data.length);
		console.log("id " + data.readDoubleLE(1));
		
		var cube;
		for(var i = 0; i < cubes.length; i++){			
			if(cubes[i].id == data.readDoubleLE(1)){
				cube = cubes[i];
				cube.generation = data.readDoubleLE(9);				
				for(var z = -1; z < cube_size+1; z++){
					for(var y = -1; y < cube_size+1; y++){
						for(var x = -1; x < cube_size+1; x++){
							console.log("reading buffer position " + (17 
									+ (z+1)*(cube_size+2)*(cube_size+2)*4 
									+ (y+1)*(cube_size+2)*4 
									+ (x+1)*4));
							if(data.readInt16LE(17 
									+ (z+1)*(cube_size+2)*(cube_size+2)*4 
									+ (y+1)*(cube_size+2)*4 
									+ (x+1)*4) != 0xFFFFFFFF && 
								data.readInt16LE(17 
									+ (z+1)*(cube_size+2)*(cube_size+2)*4 
									+ (y+1)*(cube_size+2)*4 
									+ (x+1)*4) != 0){
								cube.state.push(new Cell(x,y,z));
							}
						}
					}					
				}
			}
		}
		cube.loaded = true;		
	}
}


