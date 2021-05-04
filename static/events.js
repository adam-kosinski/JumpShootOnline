document.addEventListener("keydown", handleKeydown);
document.addEventListener("keyup", handleKeyup);
document.getElementById("start_game_button").addEventListener("click", startGame);
document.getElementById("new_game_button").addEventListener("click", newGame);
document.getElementById("clear_game_button").addEventListener("click", clearGame);



function handleKeydown(e){
  if(!am_spectator) socket.emit("keydown", e.key);
}

function handleKeyup(e){
  if(!am_spectator) socket.emit("keyup", e.key);
}

function startGame(){ //from home screen
  let n_players = document.getElementById("player_display").children.length;
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
