//SETUP ---------------------------------------------------

let socket = io();
let my_name;
let am_spectator;

let key_action_seq_num = 0;
let pending_key_actions = [];

// local copy of the game, so we can do prediction to compensate for latency
import { Game } from "./Game.js"
let local_game_state;


//CONNECTION TO SERVER -----------------------------------

//send a new player message to the server, and pick name
async function registerName(name) {
	// returns true if success, false if failure

	// check if no name or canceling the popup
	if (!name) return false;

	// try to register name with the server
	return await new Promise((resolve) => {
		socket.emit("new player", name, function (name_info_string) {
			console.log("Name registration, server returned:", name_info_string);

			if (name_info_string == "duplicate") {
				//invalid connection, try again
				alert(`'${name}' is taken. Please choose another`);
				resolve(false);
				return;
			}

			//we have a valid connection

			document.getElementById("load_screen").style.display = "none"; //get rid of black div covering the page

			if (name_info_string == "spectator") {
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



//if disconnect, don't try to reconnect - that would mess up the id_to_name database in the server
//we could connect back with the same name using some hack... but just ask user to reload
socket.on("disconnect", function () {
	console.warn("disconnect detected, preventing reconnection attempts");
	socket.disconnect();
	alert("You have disconnected from the server. If the server is up, reloading the page will reconnect you.");
});





//debug -----------------------------------------------
window.getState = function () {
	const t0 = performance.now();
	socket.emit("get_state", function (player_statuses, game) {
		console.log("Player Statuses", player_statuses);
		console.log("Game", game);
		console.log("Round trip latency (ms):", performance.now() - t0);
	});
}





// SOCKET EVENT HANDLERS ---------------------------------

socket.on("player_connection", function (player_statuses) {
	//update player display on home screen
	let player_display = document.getElementById("player_display");
	player_display.innerHTML = "";

	for (let name in player_statuses) {
		if (player_statuses[name].connected) {
			let div = document.createElement("div");
			div.id = name + "_home_screen";
			div.textContent = name;
			player_display.appendChild(div);
		}
	}

	//TODO: indicate disconnected in game GUI if game active TODO
});

socket.on("start_game", function (game) {
	console.log("starting game");

	document.getElementById("home_screen").style.display = "none";
	initGameDisplay(game, am_spectator); //display.js

	// reset local game state - will get reinitialized from game updates
	local_game_state = undefined;
});

socket.on("clear_game", function () {
	document.getElementById("home_screen").style.display = "block";
	am_spectator = false;
});



socket.on("update", async function (game) {
	// update pending key actions to figure out which ones haven't been processed by the server as part of this game state
	const new_pending_key_actions = [];
	for(let key_action of pending_key_actions){
		// if can't find this action in the game state, the server hasn't processed it
		if(!game.key_action_queue?.find(a => a.player_name === key_action.player_name && a.seq_num === key_action.seq_num)){
			new_pending_key_actions.push(key_action);
		}
	}
	pending_key_actions = new_pending_key_actions;

	// update local game state
	local_game_state = Game.loadFromJson(game);

	// updateGameDisplay(game);
});

const LOCAL_LOOP_FREQ = 40; // hz
setInterval(() => {
	if (!local_game_state) return;
	// add in any missing key actions that we know about but the server didn't
	local_game_state.key_action_queue = local_game_state.key_action_queue.concat(pending_key_actions);
	// update and draw
	local_game_state.update(Date.now());
	updateGameDisplay(local_game_state);
}, 1000 / LOCAL_LOOP_FREQ);




// HTML event handlers

document.addEventListener("keydown", handleKeyEvent);
document.addEventListener("keyup", handleKeyEvent);
document.getElementById("start_game_button").addEventListener("click", startGame);
document.getElementById("new_game_button").addEventListener("click", newGame);
document.getElementById("clear_game_button").addEventListener("click", clearGame);


function handleKeyEvent(e) {
	if (am_spectator) return;
	if (e.repeat) return;

	const key_action = {
		player_name: my_name,
		action: e.type,
		key: e.key,
		timestamp: Date.now(),
		seq_num: key_action_seq_num
	}

	socket.emit("key_action", key_action);
	pending_key_actions.push(key_action);
	key_action_seq_num++;
}

function startGame() { //from home screen
	socket.emit("start_game");
}

function newGame() { //from game screen
	if (!am_spectator) {
		socket.emit("end_game", true); //true for immediate new game
		socket.emit("start_game", true); //same thing
	}
}

function clearGame() {
	if (!am_spectator) socket.emit("end_game");
}







// INIT CODE

// loop to get a valid name, save it in the URL so that reloading is nice, and then initialize game display
(async () => {
	// first try to use the URL
	const url = new URL(window.location);
	let name = url.searchParams.get("player");

	while (!(await registerName(name))) {
		// ask the user for name input until they give a valid one
		name = prompt("Please enter a name (if reconnecting must match previous name):"); //TODO: make this a GUI thing not a prompt
	}
	// save to the url so we can use it next time
	url.search = new URLSearchParams(`player=${name}`)
	window.history.replaceState(null, "", url);

	// store my name as global var
	my_name = name;

	//check if a game is going on
	socket.emit("get_state", function (player_statuses, game) {
		if (game) {
			console.log("game already started");
			document.getElementById("home_screen").style.display = "none";
			initGameDisplay(game, am_spectator); //display.js
		}
	});
})();