let canvas = document.getElementById("canvas");

let left_chungus = document.createElement("img");
let right_chungus = document.createElement("img");



function initCanvas(game){
  console.log("initting canvas");
  let width = game.FIELD_WIDTH;
  let height = game.FIELD_HEIGHT;
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
}



function initHealthBars(game){
  console.log("initting health bars");
  let container = document.getElementById("health_bars");
  container.innerHTML = "";

  for(let i=0; i<game.players.length; i++){
    let p = game.players[i];

    let health_bar = document.createElement("div");
    health_bar.className = "health_bar";
    container.appendChild(health_bar);

    let hat_img = document.createElement("img");
    hat_img.src = "./static/images/" + p.hat_name + "_left.png";
    health_bar.appendChild(hat_img);

    let hearts = document.createElement("div");
    hearts.id = "player" + i + "_hearts";
    health_bar.appendChild(hearts);

    for(let h=0; h<p.health; h++){
      let heart_img = document.createElement("img");
      heart_img.src = "./static/images/heart.png";
      heart_img.className = "heart";
      hearts.appendChild(heart_img);
    }
  }
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

      ctx.save();

      //red filtering if hurt
      if(p.time - p.t_hit < p.RED_COLOR_TIMEOUT){
        //this hacky mess makes the rabbit look red so we're going with it
        ctx.filter = "contrast(75%) brightness(55%) sepia(100%) hue-rotate(-60deg) saturate(300%)";
      }

      //rotation centers in px, where to rotate for the death animation - impacts transforms
      let r_x_center = p.width/2;
      let r_y_center = p.height - 0.5*r_x_center;
      let x_offset = p.x + r_x_center; //translation offsets
      let y_offset = p.y + r_y_center;

      //apply rotation/translation to accomodate death animation
      ctx.translate(x_offset, y_offset);
      if(p.health <= 0 && p.t_died !== undefined && p.death_ball_vx !== undefined){
        let rotation_angle = Math.min(3*(p.time-p.t_died), Math.PI/2);
        rotation_angle *= Math.sign(p.death_ball_vx);
        ctx.rotate(rotation_angle);
      }


      //draw chungus
      let img = p.direction == "left" ? left_chungus : right_chungus; //see top of file
      if(!img.src){
        img.src = "./static/images/" + (p.direction == "left" ? p.leftChungus_src : p.rightChungus_src);
      }
      ctx.drawImage(img, p.x-x_offset, p.y-y_offset-0.22*p.chungus_height, p.width, p.chungus_height); //y-.25*chungus_height would place the image perfectly on the platform, but I want to draw it a bit down
      //note: drawing at (-r_x_center, -r_y_center etc) b/c we translated the canvas ctx


      //draw hat
      let hat_img = document.createElement("img");
      hat_img.src = "./static/images/" + p.hat_name + "_" + p.direction + ".png";
      let hat_width = 0.45*p.width;
      if(p.hat_name == "sombrero") hat_width = 0.6*p.width; //hehe
      let hat_height = hat_width / p.hat_aspect_ratio;
      let hat_x = p.x + (p.direction=="right"? (p.width-hat_width)*0.6 : (p.width-hat_width)*0.4);
      let hat_y_offset = 0.75*(hat_height-12);
      ctx.drawImage(hat_img, hat_x-x_offset, p.y-y_offset-hat_y_offset, hat_width, hat_height);


      //draw trajectory direction
      if(p.ball_index !== undefined)
      {
        let ball = game.balls[p.ball_index];

        ctx.strokeStyle = "gray";
        ctx.lineWidth = 2;
        ctx.setLineDash([p.width/6, p.width/10]);

        ctx.beginPath();
        ctx.moveTo(ball.x-x_offset, ball.y-y_offset);
        ctx.lineTo(ball.x-x_offset + p.width*Math.cos(p.shoot_angle), ball.y-y_offset + p.width*Math.sin(p.shoot_angle));
        ctx.stroke();

        ctx.setLineDash([]); //reset to no dash

        //draw held ball - doing it with the player so the ball uses the same "z index" (based on array order) as the player
        drawBall(ball, ctx, x_offset, y_offset);
      }


      //reset red filter and ctx transform
      ctx.restore();
  });


  //draw non-held balls (held balls drawn alongside players previously)
  game.balls.forEach(b => {
    if(b.holder_index === undefined) drawBall(b, ctx); //see below
  });

}

function drawBall(b, ctx, x_offset=0, y_offset=0){
  //check if ball dangerous to determine color
  if((b.time - b.t_release > b.SAFE_TIMEOUT) && b.thrown){
    ctx.fillStyle = b.dangerous_color;
  }
  else {
    ctx.fillStyle = b.color;
  }

  ctx.beginPath();
  ctx.arc(b.x-x_offset, b.y-y_offset, b.r, 0, 2*Math.PI);
  ctx.closePath();
  ctx.fill();
}
