//SETUP ---------------------------------------------------

let socket = io();
let id; //id of the socket
let my_name;
let am_spectator;

//preload the chuckle
let chuckle = new Audio("./static/chuckle.mp3");

//CONNECTION TO SERVER -----------------------------------

//send a new player message to the server, and pick name
function registerName(){
	my_name = prompt("Please enter a name (if reconnecting must match previous name):"); //TODO: make this a GUI thing not a prompt

	//filter out no name or canceling the popup
	if(my_name===""){
		registerName(); //empty strings don't work, try again
		return;
	}
	if(!my_name){
		socket.disconnect();
		throw new Error("Name entry canceled, disconnecting client and leaving webpage blank"); //TODO can they still send stuff to the server and crash it b/c it can't find me in player_statuses?
	}

	//check name
	socket.emit("new player", my_name, function(name_info_string){
		console.log("Name registration, server returned:", name_info_string);

		if(name_info_string == "duplicate"){
			//invalid connection, try again
			alert("'"+my_name+"' is taken. Please choose another");
			my_name = undefined;
			registerName();
			return;
		}

		//we have a valid connection

		document.getElementById("load_screen").style.display = "none"; //get rid of black div covering the page

		if(name_info_string == "spectator"){
			alert("You are viewing an ongoing game as a spectator.");
			am_spectator = true;
		}
		else {
			am_spectator = false;
		}
	});
}

registerName();


//store the id of the connection
socket.on("connect", function(){
	console.log("My ID: "+socket.id);
	id = socket.id;
});


//check if a game is going on
socket.emit("get_state", function(player_statuses, game){
	if(game){
		console.log("game already started");
		initGameDisplay(game); //display.js
	}
	else {
		document.getElementById("home_screen").style.display = "block";
	}
});





//debug -----------------------------------------------
function getState(){
	socket.emit("get_state", function(player_statuses, game){
		console.log("Player Statuses", player_statuses);
		console.log("Game", game);
	});
}





// SOCKET EVENT HANDLERS ---------------------------------

socket.on("player_connection", function(player_statuses){
	//update player display on home screen
	let player_display = document.getElementById("player_display");
	player_display.innerHTML = "";

	for(let name in player_statuses){
		if(player_statuses[name].connected){
			let div = document.createElement("div");
			div.id = name + "_home_screen";
			div.textContent = name;
			player_display.appendChild(div);
		}
	}

	//TODO: indicate disconnected in game GUI if game active TODO
});



socket.on("update", function(game){
	if(game.players[0].y_collision === 1){
		//console.log("y");
	}

	//play chungus chuckle for each rabbit that just got hurt and update health display
	for(let i=0; i<game.players.length; i++){
		let p = game.players[i];
		if(p.time == p.t_hit){
			chuckle.play(); //loaded at the top of this file

			let hearts_div = document.getElementById("player" + i + "_hearts");
			if(hearts_div.lastElementChild){
				hearts_div.removeChild(hearts_div.lastElementChild);
			}
		}
	};

	draw(game); //display.js
});


socket.on("start_game", function(game){
	document.getElementById("home_screen").style.display = "none";
	initGameDisplay(game); //display.js
	console.log("starting game");
});

socket.on("clear_game", function(){
	document.getElementById("home_screen").style.display = "block";
	am_spectator = false;
});
