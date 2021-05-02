document.addEventListener("keydown", handleKeydown);
document.addEventListener("keyup", handleKeyup);
document.getElementById("start_game_button").addEventListener("click", startGame);
document.getElementById("new_game_button").addEventListener("click", newGame);
document.getElementById("clear_game_button").addEventListener("click", clearGame);



function handleKeydown(e){
  socket.emit("keydown", e.key);
}

function handleKeyup(e){
  socket.emit("keyup", e.key);
}

function startGame(){
  let n_players = document.getElementById("player_display").children.length;
  if(n_players != 2){
    alert("Game currently only supports exactly 2 players, but currently " + n_players + " players are connected.");
  }
  else {socket.emit("start_game");}
}

function newGame(){
  //prevent spectators from doing this
  socket.emit("get_state", function(player_statuses, game){
    if(!game.player_names.includes(my_name)) return;
    socket.emit("end_game", true); //true for immediate new game
    socket.emit("start_game", true); //same thing
  });
}

function clearGame(){
  //prevent spectators from doing this
  socket.emit("get_state", function(player_statuses, game){
    if(!game.player_names.includes(my_name)) return;
    socket.emit("end_game");
  });
}
