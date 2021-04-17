document.addEventListener("keydown", handleKeydown);
document.addEventListener("keyup", handleKeyup);
document.getElementById("start_game_button").addEventListener("click", startGame);
document.getElementById("new_game_button").addEventListener("click", newGame);
document.getElementById("clear_game_button").addEventListener("click", clearGame);


let keys_down = []; //we can have multiple keys down at a time, and the player movement should reflect this

function handleKeydown(e){
  if(!keys_down.includes(e.key)) keys_down.push(e.key); //later keys get priority, so by pushing we ensure the most recently pressed key gets priority
  console.log(keys_down);
  socket.emit("keydown", keys_down);
}

function handleKeyup(e){
  let idx = keys_down.indexOf(e.key);
  if(idx != -1) keys_down.splice(idx, 1);
  console.log(keys_down);
  socket.emit("keyup", e.key, keys_down);
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
