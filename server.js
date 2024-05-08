//SERVER SETUP --------------------------------------------------------------------------------

import express from "express";
import { Server as SocketIOServer } from "socket.io";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { Game } from "./static/Game.js"

//app stuff
let app = express();
let server = createServer(app);
let io = new SocketIOServer(server);

app.set("port", 5000);
const __dirname = dirname(fileURLToPath(import.meta.url))
app.use('/static', express.static(join(__dirname, 'static')))

// Routing
app.get("/", function(request, response) {
  response.sendFile(__dirname + "/index.html");
});

// Starts the server.
let port = process.env.PORT;
if(port == null || port == ""){
	port = 5000;
}
server.listen(port, function() {
  console.log("Starting server on port "+port);
});

//CLASSES ------------------------------------------------------
class PlayerStatus {
  constructor(name){
    this.name = name;
    this.connected = true; //because when we make one of these, it's triggered by a connected player
  }
}


//STORAGE ------------------------------------------------------

let player_statuses = {}; //holds PlayerStatus objects (used for connect/disconnect), keys are player names (not socket ids, since socket ids change when you disconnect then reconnect)
let id_to_name = {}; //maps socket ids to names. If a name isn't in here, player is disconnected

let game = undefined; //undefined means no game currently going on
let game_interval = undefined; //stores the setInterval return value for the game loop


// WEBSOCKET HANDLERS --------------------------------------------------------------------------------------------------------------------
io.on("connection", function(socket) {


  // PLAYER CONNECTIONS ----------------------------------------------


	socket.on("new player", function(name, callback){
    //return: "success" or "duplicate" or "spectator"

    /* LOGIC:
    Check if player name exists in our register of player_statuses
      if not, make new player status (no return yet)
      if so, return "duplicate" if duplicate name (if player already connected)

      at this point the player status exists and we've filtered out duplicates - now need to decide if spectator or not

    if game going on and player not in the game, return "spectator"
    else (either no game going on, or player in the game), return "not spectator"
    */

    //check if this player exists
    if(!player_statuses.hasOwnProperty(name)){
      //make a player status for them
      console.log("New player status created for: " + name + " (id: " + socket.id + ")");
			player_statuses[name] = new PlayerStatus(name);
			id_to_name[socket.id] = name;
    }
    //if player exists, check if duplicate name
    else if(player_statuses[name].connected){
			console.log(name + " is a duplicate name - asking them to try another");
			callback("duplicate"); //duplicate name, tell the client it's invalid
      return; //stop right here, this doesn't count as a valid connection
		}
    else {
      console.log(name + " reconnected (id: " + socket.id + ")");
    }

    //now the player has a player status and isn't a duplicate connection - we have a valid connection, update socket data
    id_to_name[socket.id] = name; //add the new mapping
    player_statuses[name].connected = true;


    //figure out if spectator or not and tell client
    if(game != undefined && !game.player_names.includes(name)) callback("spectator");
    else callback("not spectator");

    io.emit("player_connection", player_statuses);

	});

	//mark player as disconnected when they leave
	socket.on("disconnect", function(){
		if(id_to_name.hasOwnProperty(socket.id)){
			console.log(id_to_name[socket.id]+" disconnected (id: " + socket.id + ")");

			let player = player_statuses[id_to_name[socket.id]];
			player.connected = false;
			delete id_to_name[socket.id];

		}
		io.emit("player_connection", player_statuses);
	});

	socket.on("get_state", function(callback){
		callback(player_statuses, game); //if game is undefined, tells them no game currently happening
	});




  socket.on("start_game", function(for_new_game=false){ //if for an immediate new game, keep same players

    console.log("Starting new game! - for_new_game: " + for_new_game);

    let player_names = (for_new_game && game) ? game.player_names : Object.keys(player_statuses);
    player_names = player_names.filter(name => player_statuses[name].connected);
    game = new Game(player_names);

    //start game loop - note this will run slightly slower than expected b/c of setInterval, but that's fine because we're using Date.now() for timings (see Game.update)
    game_interval = setInterval(function(){
      game.update(Date.now());
      io.emit("update", game);
    }, 1000 / 10);  // 1000ms divided by loop freq in hz

    io.emit("start_game", game); //let everyone know
  });


  socket.on("end_game", function(for_new_game=false){
    console.log("Ending game");
    if(game_interval !== undefined) clearInterval(game_interval);
    game_interval = undefined;

    if(!for_new_game){
      game = undefined; //to start an immediate new game, need to know what the previous game's players were, don't clear this in that case
      io.emit("clear_game");
    }
  });


  const FAKE_LATENCY = 0;

  socket.on("keydown", async function(key){
    if(!game) return;

    await new Promise(resolve => setTimeout(resolve, FAKE_LATENCY))

    // update what has happened between the last game loop update and now
    game.update(Date.now());

    let player_name = id_to_name[socket.id];
    game.players.forEach(p => {
      if(p.name == player_name){
        p.handleKeydown(game, key);
      }
    });
    //notice that this logic essentially prevents spectators from doing anything, an extra safety in addition to the checks in events.js
  });

  socket.on("keyup", async function(key){
    if(!game) return;

    await new Promise(resolve => setTimeout(resolve, FAKE_LATENCY))

    // update what has happened between the last game loop update and now
    game.update(Date.now());

    let player_name = id_to_name[socket.id];
    game.players.forEach(p => {
      if(p.name == player_name){
        p.handleKeyup(game, key);
      }
    });
  });

});



export function getGame(){
  return game;
}
