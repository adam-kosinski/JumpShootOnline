//SETUP ---------------------------------------------------

let socket = io();
let id; //id of the socket

//CONNECTION TO SERVER -----------------------------------

//send a new player message to the server, and pick name
function registerName(){
	my_name = prompt("Please enter a name (< 11 characters or display problems happen):"); //TODO: make this a GUI thing not a prompt

	//filter out no name or canceling the popup
	if(my_name===""){
		registerName(); //empty strings don't work, try again
		return;
	}
	if(!my_name){
		throw new Error("Name entry canceled, leaving webpage blank");
	}

	//check name
	socket.emit("new player", my_name, function(success){
		console.log("Name registration success:",success);
		if(success || success === null) document.getElementById("load_screen").style.display = "none";
		if(success === null) alert("You are viewing an ongoing game as a spectator. Once the game is cleared you will be able to join as a player.")

		if(success === false){
			alert("'"+my_name+"' is taken. Please choose another");
			my_name = undefined;
			registerName();
		}
	});
}

console.log(registerName());

//store the id of the connection
socket.on("connect", function(){
	console.log("My ID: "+socket.id);
	id = socket.id;
});


//check if a game is going on
socket.emit("get_state", function(player_statuses, game){
	if(game){
		game_active = true;
		console.log("game already started");
		initCanvas(game);
	}
	else {
		home_screen.style.display = "block";
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
	draw(game); //display.js
});


socket.on("start_game", function(game){
	home_screen.style.display = "none";
	initCanvas(game); //display.js
	console.log("starting game");
});

socket.on("clear_game", function(){
	home_screen.style.display = "block";
});
