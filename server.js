//SERVER SETUP --------------------------------------------------------------------------------

// Dependencies
let express = require("express");
let http = require("http");
let path = require("path");
let socketIO = require("socket.io");


let Game = require("./Game").Game;

//app stuff
let app = express();
let server = http.Server(app);
let io = socketIO(server);

app.set("port", 5000);
app.use("/static", express.static(__dirname + "/static"));

// Routing
app.get("/", function(request, response) {
  response.sendFile(path.join(__dirname, "index.html"));
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


	//when a new player joins, check if player exists. If they don't, create new player. If they do, only allow join if that player was disconnected
	socket.on("new player", function(name, callback){

		if(!player_statuses.hasOwnProperty(name)){
			if(game != undefined){  //don't count spectators as player_statuses. If the game ends, they can refresh and join as a player
        callback(null); //null for spectators
        return;
      }

			//new player
			console.log("New player: " + name + " (id: " + socket.id + ")");
			player_statuses[name] = new PlayerStatus(name);
			id_to_name[socket.id] = name;
			callback(true); //successful
		}
		else if(player_statuses[name].connected){
			console.log(name + " is a duplicate name - asking them to try another");
			callback(false); //duplicate name, tell the client it's invalid
		}
		else {
			console.log(name + " reconnected (id: " + socket.id + ")");
			id_to_name[socket.id] = name; //add the new mapping
			player_statuses[name].connected = true;
			callback(true); //successful
		}
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
    if(game !== undefined){
      console.log("Tried to start a new game but game currently in session.");
      return;
    }

    console.log("Starting new game!");

    let player_names = for_new_game && game ? game.player_names : Object.keys(player_statuses);
    player_names = player_names.filter(name => player_statuses[name].connected);
    game = new Game(player_names);

    //start game loop - note this will run slightly slower than expected b/c of setInterval, but that's fine because we're using performance.now() for timings (see Game.update)
    game_interval = setInterval(function(){
      game.update.apply(game); //call .update() using the game as the 'this' object
      io.emit("update", game);
    }, 1000/game.LOOP_FREQ);

    io.emit("start_game", game); //let everyone know
  });


  socket.on("end_game", function(for_new_game=false){ //if for an immediate new game, don't need to tell the clients anything - they'll display the right thing on the next update
    console.log("Ending game");
    if(game_interval !== undefined) clearInterval(game_interval);
    game = undefined;
    game_interval = undefined;

    if(!for_new_game) io.emit("clear_game");
  });


  socket.on("keydown", function(key){
    if(!game) return;

    let player_name = id_to_name[socket.id];
    game.players.forEach(p => {
      if(p.name == player_name){
        p.handleKeydown(key);
      }
    });
    //notice that this logic essentially prevents spectators from doing anything
  });

  socket.on("keyup", function(key){
    if(!game) return;

    let player_name = id_to_name[socket.id];
    game.players.forEach(p => {
      if(p.name == player_name){
        p.handleKeyup(key);
      }
    });
  });

});



exports.getGame = function(){return game;}
