//SETUP ---------------------------------------------------

let socket = io();
let id; //id of the socket
let am_spectator;

// local copy of the game, so we can do prediction to compensate for latency
let local_game_state;
import { Game } from "./Game.js"

//preload the chuckle
let chuckle = new Audio("./static/chuckle.mp3");

//CONNECTION TO SERVER -----------------------------------

//send a new player message to the server, and pick name
async function registerName(name){
	// returns true if success, false if failure

	// check if no name or canceling the popup
	if(!name) return false;

	// try to register name with the server
	return await new Promise((resolve) => {
		socket.emit("new player", name, function(name_info_string){
			console.log("Name registration, server returned:", name_info_string);
	
			if(name_info_string == "duplicate"){
				//invalid connection, try again
				alert(`'${name}' is taken. Please choose another`);
				resolve(false);
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

			// return true from registerName()
			resolve(true);
		});
	});
}

// loop to get a valid name, save it in the URL so that reloading is nice
(async () => {
	// first try to use the URL
	const url = new URL(window.location);
	let name = url.searchParams.get("player");

	while(!(await registerName(name))){
		// ask the user for name input until they give a valid one
		name = prompt("Please enter a name (if reconnecting must match previous name):"); //TODO: make this a GUI thing not a prompt
	}
	// save to the url so we can use it next time
	url.search = new URLSearchParams(`player=${name}`)
	window.history.replaceState(null, "", url);
})();


//store the id of the connection
socket.on("connect", function(){
	console.log("My ID: "+socket.id);
	id = socket.id;
});


//if disconnect, don't try to reconnect - that would mess up the id_to_name database in the server
//we could connect back with the same name using some hack... but just ask user to reload
socket.on("disconnect", function(){
	console.warn("disconnect detected, preventing reconnection attempts");
	socket.disconnect();
	alert("You have disconnected from the server. If the server is up, reloading the page will reconnect you.");
});


//check if a game is going on
socket.emit("get_state", function(player_statuses, game){
	if(game){
		console.log("game already started");
		document.getElementById("home_screen").style.display = "none";
		initGameDisplay(game, am_spectator); //display.js
	}
});





//debug -----------------------------------------------
window.getState = function(){
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



socket.on("update", async function(game){

	// fake latency coming back from server
	await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY))

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
	initGameDisplay(game, am_spectator); //display.js
	console.log("starting game");
});

socket.on("clear_game", function(){
	document.getElementById("home_screen").style.display = "block";
	am_spectator = false;
});



// HTML event handlers

document.addEventListener("keydown", handleKeydown);
document.addEventListener("keyup", handleKeyup);
document.getElementById("start_game_button").addEventListener("click", startGame);
document.getElementById("new_game_button").addEventListener("click", newGame);
document.getElementById("clear_game_button").addEventListener("click", clearGame);


function handleKeydown(e){
  if(!am_spectator) setTimeout(() => socket.emit("keydown", e.key), FAKE_LATENCY);
}

function handleKeyup(e){
  if(!am_spectator) setTimeout(() => socket.emit("keyup", e.key), FAKE_LATENCY);
}

function startGame(){ //from home screen
  socket.emit("start_game");
}

function newGame(){ //from game screen
  if(!am_spectator){
    socket.emit("end_game", true); //true for immediate new game
    socket.emit("start_game", true); //same thing
  }
}

function clearGame(){
  if(!am_spectator) socket.emit("end_game");
}
