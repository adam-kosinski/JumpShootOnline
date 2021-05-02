let server = require("./server");
function getBalls(){return server.getGame().balls;}
function getWalls(){return server.getGame().walls;}

class Player
{

  constructor(name, x, y, width, AY, n_lives, hat_name, hat_aspect_ratio){
    //x, y is initial position
    //width determines size of chungus
    //AY is gravitational acceleration
    //hat_src is name of image file
    //walls and balls are objects stored by the Game object

    this.name = name;

  	this.x = x; //of top-left corner
  	this.xi = x; //initial x position (reset when velocity is reset)
  	this.y = y; //of top-left corner
  	this.yi = y; //initial y position (reset when velocity is reset)
  	this.vx = 0;
  	this.vy = 0;

  	this.AY = AY;

  	this.VY_BOOST = 250; //extra vy to gain from pressing the down key
  	this.JUMP_SPEED = 450;
  	this.HORIZ_SPEED = 250;

  	this.time = 0; //time of most recent updatePosition call
  	this.ti_x = 0; //time of most recent x velocity reset
  	this.ti_y = 0; //time of most recent y velocity reset
  	this.t_hit = -1000; //time the player most recently got hit, used for making them red when hit and for invincibility period
      //since a player will be red if time_now - time_hit < RED_COLOR_TIMEOUT, make sure they're not red to start out by making this very negative
    this.t_died = undefined; //time when lost last life, used for fall-over animation

  	this.x_collision = 0; // -1 means wall to left, 0 means no collision, 1 means wall to right
  	this.y_collision = 0; // -1 means wall above, 0 means no collision, 1 means wall below
  	this.border_y_collision = false; //set to true if the y_collision is with a border wall

  	this.hat_name = hat_name;
    this.hat_aspect_ratio = hat_aspect_ratio; // width / height
  	this.rightChungus_src = "rightChungus.png";
  	this.leftChungus_src = "leftChungus.png";
  	this.width = width; //width of hitbox and of chungus image
  	this.chungus_height = (this.width/1442) * 2618; //image width is 1442, height 2618
  	this.height = 0.75 * this.chungus_height; //height of hitbox

  	this.health = n_lives;
  	this.t_threw_ball = 0; //time when the player last threw a ball; players are invincible for a certain timeout after throwing a ball
  	this.THROWER_INVINCIBLE_TIMEOUT = 0.5; //this is the timeout for invincibility after throwing a ball (so you don't get hit by the ball you threw)
    this.HIT_INVINCIBLE_TIMEOUT = 0.5; //this is the timeout for invincibility after getting hit
  	this.RED_COLOR_TIMEOUT = 0.5; //how long to make the player red after getting hit, in sec

    this.direction = "right"; //"left" or "right"; direction the player is facing
    //make sure this is consistent with the initialized shoot_angle
    this.death_ball_vx = undefined; //vx of the killing ball, at the instant it hit, used for fall-over animation

  	this.ball_index = undefined; //undefined if not holding a ball, otherwise the index in balls where to find the ball
  	this.shoot_angle_array = [0.05*Math.PI,0.25*Math.PI,0.75*Math.PI,0.95*Math.PI]; //stores possible shoot angles, from 0 to pi/2.  These are positive when shooting up as it appears on the canvas.
  	this.shoot_angle_index = 1; //index in shoot angle array to reference
  	this.shoot_angle = -this.shoot_angle_array[this.shoot_angle_index]; //in radians, actual angle of launch, in math coords, not canvas coords
  	this.SHOOT_VELOCITY = 500; //in px/s

    this.JUMP_KEY = "w";
    this.LEFT_KEY = "a";
    this.RIGHT_KEY = "d";
    this.DOWN_KEY = "s";
    this.ROTATE_LEFT_KEY = "i"; //for launch angle changing
    this.ROTATE_RIGHT_KEY = "p";
    this.BALL_KEY = "o";
    this.down_key_processed = false; //keeps track if we processed the first down key press, so that we don't process another one until after keyup
    this.ball_key_processed = false; //same reason as down key
    this.keys_down = []; //list of keys currently down, to continually process (since interactions of multiple keys mean a key held down from a long time ago might not still be sending rapid events)
      //key down an key up handling will maintain this list to be accurate
  }

	handleKeydown(key)
	{
    if(this.health <= 0) return; //dead players can't send inputs, or register a new keydown in the keys_down array

    //maintain this.keys_down
    if(!this.keys_down.includes(key)) this.keys_down.push(key);

    //process keys we only expect behavior from on the instant of keydown/up
    //keys we expect behavior from the duration of being pressed are processed in this.processContinuousKeys()

		if(key == this.DOWN_KEY && !this.down_key_processed) //only process down key once. This gets set to false when we release the down key
		{
				this.down_key_processed = true;
				if(this.y_collision == 1 && !this.border_y_collision) //then drop through the platform
				{
					this.y_collision = 0;
					this.y += 1;
				}
				else //add VY_BOOST to vy to accelerate downwards faster
				{
					this.setYVelocity(this.vy + this.AY*(this.time-this.ti_y) + this.VY_BOOST);
				}
		}
		else if(key == this.BALL_KEY && !this.ball_key_processed) //only process ball key once. This gets set to false when we release the ball key
		{
      this.ball_key_processed = true;
			if(this.ball_index === undefined) //try to grab a ball if we don't have one
			{
				//loop through available balls
				for(let i=0; i<getBalls().length; i++)
				{
          let b = getBalls()[i];
					if(b.isDangerous() || b.isHeld()){continue;} //can't pick up dangerous or held balls

					//if the center of the ball is within the player, we can pick it up
					if(b.x > this.x && b.x < this.x+this.width && b.y > this.y && b.y < this.y+this.height)
					{
						this.ball_index = i;
						b.pickup(this);
						break; //stop searching for balls
					}
				}
			}
			else //we have a ball, shoot it
			{
				this.shootBall();
			}
		}
    else if(key == this.ROTATE_LEFT_KEY)
    {
      if(this.shoot_angle_index < this.shoot_angle_array.length - 1)
      {
        this.shoot_angle_index++;
        this.shoot_angle = -this.shoot_angle_array[this.shoot_angle_index];
      }
    }
    else if(key == this.ROTATE_RIGHT_KEY)
    {
      if(this.shoot_angle_index > 0)
      {
        this.shoot_angle_index--;
        this.shoot_angle = -this.shoot_angle_array[this.shoot_angle_index];
      }
    }
	}

	handleKeyup(key)
	{
    //note: dead players can still register keyups, just not keydowns

    //maintain this.keys_down
    let idx = this.keys_down.indexOf(key);
    if(idx != -1) this.keys_down.splice(idx, 1);


		if(!this.keys_down.includes(this.LEFT_KEY) && !this.keys_down.includes(this.RIGHT_KEY))
		{
			this.setXVelocity(0); //since y velocity is governed by gravity, not resetting like with x velocity
		}
		if(key == this.DOWN_KEY)
		{
			this.down_key_processed = false;
		}
    if(key == this.BALL_KEY){
      this.ball_key_processed = false;
    }
	}


  processContinuousKeys(){
    //continuously process keys currently down regardless of if we're getting events from the client
    //this is called every frame from updatePosition()
    //keys processed here are those we expect behavior from for the duration of being pressed (as opposed to just the instant of keydown/keyup)
    //actions only on the instant of keyup/keydown are processed in handleKeydown/up

    if(this.health <= 0) return;

    this.keys_down.forEach(key => {

      if(key == this.JUMP_KEY && this.y_collision == 1) //can only jump if on a platform
  		{
  			this.setYVelocity(-this.JUMP_SPEED);
  		}
  		else if(key == this.LEFT_KEY)
  		{
  			this.setXVelocity(-this.HORIZ_SPEED);
  		}
  		else if(key == this.RIGHT_KEY)
  		{
  			this.setXVelocity(this.HORIZ_SPEED);
  		}
    });


  }


	//function to update player's position
	updatePosition(time) //time is the current time in seconds, from when the game started
	{
		this.time = time;

		//if velocity is in opposite direction to collision, no more collision
		if(this.x_collision == 1 && this.vx < 0 || this.x_collision == -1 && this.vx > 0)
		{
			this.x_collision = 0;
		}
		if(this.y_collision == 1 && this.vy < 0 || this.y_collision == -1 && this.vy > 0)
		{
			this.y_collision = 0;
		}
		//if no y_collision, no border_y_collision
		if(this.y_collision == 0)
		{
			this.border_y_collision = false;
		}

		//define t to be time since most recent velocity reset
		let t_x = time - this.ti_x;
		let t_y = time - this.ti_y;

		//store previous position
		let prev_x = this.x;
		let prev_y = this.y;

		//move player if no collisions preventing it
		if(this.x_collision == 0)
		{
			this.x = this.xi + this.vx*t_x;
		}
		if(this.y_collision != 1)
		{
			this.y = this.yi + this.vy*t_y + 0.5*this.AY*t_y*t_y;
		}

		//detect wall collision
		let foundXCollision = false;
		let foundYCollision = false;
		//loop through walls
		getWalls().forEach(w => {
			//y
			//test collision below
			if( (this.x+this.width > w.x && this.x < w.x+w.width) && (prev_y+this.height <= w.y && this.y+this.height >= w.y) ) //if in right x-range and collide vertically
			{
				foundYCollision = true;

				this.y = w.y - this.height;
				this.y_collision = 1;
				if(w.border_wall){this.border_y_collision = true;}
				this.setYVelocity(0);
			}
			//all other collision tests are dependent on if this is a border wall
			if(w.border_wall)
			{
				//test collision above
				if( (this.x+this.width > w.x && this.x < w.x+w.width) && (prev_y >= w.y+w.height && this.y <= w.y+w.height) ) //if in right x-range and collide vertically
				{
					foundYCollision = true;

					this.y = w.y+w.height;
					this.y_collision = -1;
					this.setYVelocity(0);
				}

				//x
				//test collision to right
				if( (this.y+this.height > w.y && this.y < w.y+w.height) && (prev_x+this.width <= w.x && this.x+this.width >= w.x) ) //if in right y-range and collide horizontally
				{
					foundXCollision = true;

					this.x = w.x - this.width;
					this.x_collision = 1;

					//do set velocity stuff without changing the stored velocity
					this.xi = this.x;
					this.ti_x = time;
				}
				//test collision to left
				if( (this.y+this.height > w.y && this.y < w.y+w.height) && (prev_x >= w.x+w.width && this.x <= w.x+w.width) ) //if in right y-range and collide horizontally
				{
					foundXCollision = true;

					this.x = w.x+w.width;
					this.x_collision = -1;

					//do set velocity stuff without changing the stored velocity
					this.xi = this.x;
					this.ti_x = time;
				}
			}
		}); //finish looping through walls
		if(!foundXCollision) {this.x_collision = 0;}
		if(!foundYCollision) {this.y_collision = 0;}

		//check if a dangerous ball hit this player
		getBalls().forEach(b => {
			if(!b.isDangerous()){return;}

			//if the center of the ball is within the player, and time since last hit is bigger than timeout, and time since last throw is bigger than timeout, and we're not already dead, it hit us
			if(b.x > this.x && b.x < this.x+this.width && b.y > this.y && b.y < this.y+this.height
        && time-this.t_hit > this.HIT_INVINCIBLE_TIMEOUT && time-this.t_threw_ball > this.THROWER_INVINCIBLE_TIMEOUT
        && this.health > 0)
			{
				this.health = Math.max(this.health - 1, 0);
				b.setNotDangerous();
				this.t_hit = time;

        //check if died
        if(this.health <= 0){
          this.t_died = time;
          this.death_ball_vx = b.vx;
          this.setXVelocity(0); //stop key input, y velocity should continue but can only be affected by gravity now
          this.dropBall();
        }
			}
		});


    this.processContinuousKeys();
	}

	setXVelocity(vx)//time is the current time in seconds, from when the main animation timer started
	{
		if(this.x_collision == 1 && vx > 0){return;}
		if(this.x_collision == -1 && vx < 0){return;}

		this.xi = this.x;
		this.vx = vx;

		this.ti_x = this.time;

		if(vx < 0){this.direction = "left";}
		if(vx > 0){this.direction = "right";}
	}

	setYVelocity(vy)//time is the current time in seconds, from when the main animation timer started
	{
		if(this.y_collision == 1 && vy > 0){return;}
		if(this.y_collision == -1 && vy < 0){return;}

		this.yi = this.y;
		this.vy = vy;

		this.ti_y = this.time;
	}

	shootBall()
	{
		if(this.ball_index === undefined){return;}

		let b = getBalls()[this.ball_index];
		b.release();
		b.setXVelocity(this.SHOOT_VELOCITY * Math.cos(this.shoot_angle));
		b.setYVelocity(this.SHOOT_VELOCITY * Math.sin(this.shoot_angle));
		//TODO consider adding player's velocity to shoot velocity

		this.t_threw_ball = this.time;

		this.ball_index = undefined;
	}

  dropBall(){
    //called when a player dies if holding a ball so they don't hoard a ball
    if(this.ball_index === undefined){return;}

    let b = getBalls()[this.ball_index];
    b.release();
    b.setNotDangerous();
    b.setXVelocity(0);
    b.setYVelocity(0);

    this.ball_index = undefined;
  }
}


exports.Player = Player;
