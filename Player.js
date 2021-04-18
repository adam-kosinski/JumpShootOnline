let server = require("./server");
function getBalls(){return server.getGame().balls;}
function getWalls(){return server.getGame().walls;}

class Player
{

  constructor(name, x, y, width, AY, hat_src){
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
  	this.t_hit = -1000; //time the player most recently got hit, used for making them red when hit
      //since a player will be red if time_now - time_hit < some number, make sure they're not red to start out by making this v. negative

  	this.x_collision = 0; // -1 means wall to left, 0 means no collision, 1 means wall to right
  	this.y_collision = 0; // -1 means wall above, 0 means no collision, 1 means wall below
  	this.border_y_collision = false; //set to true if the y_collision is with a border wall

  	this.hat_src = hat_src;
  	this.rightChungus_src = "rightChungus.png";
  	this.leftChungus_src = "leftChungus.png";
  	this.width = width; //width of hitbox and of chungus image
  	this.chungus_height = (this.width/1442) * 2618; //image width is 1442, height 2618
  	this.height = 0.75 * this.chungus_height; //height of hitbox

  	this.health = 5;
  	this.t_threw_ball = 0; //time when the player last threw a ball; players are invincible for a certain timeout after throwing a ball
  	this.INVINCIBLE_TIMEOUT = 0.5; //this is that timeout, in sec
  	this.RED_COLOR_TIMEOUT = 0.5; //how long to make the player red after getting hit, in sec

    this.direction = "right"; //"left" or "right"; direction the player is facing
    //make sure this is consistent with the initialized shoot_angle

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
    this.downKeyProcessed = false; //keeps track if we processed the first down key press, used so that we only process the first one
  }

	handleKeydown(key)
	{
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
		else if(key == this.DOWN_KEY)
		{
			if(!this.downKeyProcessed) //only process down key once. This gets set to false when we release the down key
			{
				this.downKeyProcessed = true;
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
		}
		else if(key == this.BALL_KEY)
		{
			if(!this.ball_index) //try to grab a ball if we don't have one
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

	handleKeyup(key, keys_down)
	{
		if(!keys_down.includes(this.LEFT_KEY) && !keys_down.includes(this.RIGHT_KEY))
		{
			this.setXVelocity(0); //since y velocity is governed by gravity, not resetting like with x velocity
		}
		if(key == this.DOWN_KEY)
		{
			this.downKeyProcessed = false;
		}
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

		//check if a ball hit this player
		getBalls().forEach(b => {
			if(!b.isDangerous()){return;}

			//if the center of the ball is within the player, and time since last hit is bigger than timeout, it hit us
			if(b.x > this.x && b.x < this.x+this.width && b.y > this.y && b.y < this.y+this.height && time-this.t_threw_ball > this.INVINCIBLE_TIMEOUT)
			{
				this.health = Math.max(this.health - 1, 0);
				b.setNotDangerous();
				this.t_hit = time;

				//play chungus chuckle sound
				// TODO
			}
		});
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
		if(!this.ball_index){return;}

		let b = getBalls()[this.ball_index];
		b.release();
		b.setXVelocity(this.SHOOT_VELOCITY * Math.cos(this.shoot_angle));
		b.setYVelocity(this.SHOOT_VELOCITY * Math.sin(this.shoot_angle));

		this.t_threw_ball = this.time;

		this.ball_index = undefined;
	}
}


exports.Player = Player;
