document.addEventListener("keydown", handleKeydown);
document.addEventListener("keyup", handleKeyup);


function handleKeydown(e){
  socket.emit("keydown", e.key);
}

function handleKeyup(e){
  socket.emit("keyup", e.key);
}
