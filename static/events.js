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
  socket.emit("start_game");
}

function newGame(){
  socket.emit("end_game", true); //true for immediate new game
  socket.emit("start_game", true); //same thing
}

function clearGame(){
  socket.emit("end_game");
}
