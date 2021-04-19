let left_chungus = document.createElement("img");
let right_chungus = document.createElement("img");



function initCanvas(game){
  let width = game.FIELD_WIDTH;
  let height = game.FIELD_HEIGHT;
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
}





function draw(game){
  let ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  //draw walls
  game.walls.forEach(w => {
    ctx.fillStyle = w.color;
    ctx.fillRect(w.x, w.y, w.width, w.height);
  });


  //draw players
  game.players.forEach(p => {

      //TODO: red filtering

      let img = p.direction == "left" ? left_chungus : right_chungus; //see top of file
      if(!img.src){
        img.src = "./static/images/" + (p.direction == "left" ? p.leftChungus_src : p.rightChungus_src);
      }
      ctx.drawImage(img, p.x, p.y-0.22*p.chungus_height, p.width, p.chungus_height); //y-.25*chungus_height would place the image perfectly on the platform, but I want to draw it a bit down

    /*
      double hat_width = 0.45*width;
      double hat_height = (hat_width/hat.getWidth()) * hat.getHeight();
      double hat_x = x + (direction=="right"? (width-hat_width)*0.6 : (width-hat_width)*0.4);
      ctx.drawImage(hat, hat_x, y-0.2*hat_height, hat_width, hat_height);
    */
      //nothing else should be drawn red, reset the red effect
      //ctx.setEffect(null);

      //draw trajectory direction
      if(p.ball_index !== undefined)
      {
        let ball = game.balls[p.ball_index];

        ctx.strokeStyle = "gray";
        ctx.setLineDash([p.width/5, p.width/5]);

        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(ball.x + p.width*Math.cos(p.shoot_angle), ball.y + p.width*Math.sin(p.shoot_angle));
        ctx.closePath();
        ctx.stroke();

        ctx.setLineDash([]); //reset to no dash

        //draw held ball - doing it with the player so the ball uses the same "z index" (based on array order) as the player
        drawBall(ball, ctx);
      }
  });


  //draw non-held balls (held balls drawn alongside players previously)
  game.balls.forEach(b => {
    if(b.holder_index === undefined) drawBall(b, ctx); //see below
  });

}

function drawBall(b, ctx){
  //check if ball dangerous to determine color
  if((b.time - b.t_release > b.SAFE_TIMEOUT) && b.thrown){
    ctx.fillStyle = b.dangerous_color;
  }
  else {
    ctx.fillStyle = b.color;
  }

  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, 2*Math.PI);
  ctx.closePath();
  ctx.fill();
}
