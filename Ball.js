let server = require("./server");
function getWalls(){return server.getGame().walls;}
function getPlayers(){return server.getGame().players;}


class Ball
{

	constructor(x, y, r, color, AY)
	{
		this.x = x; // (x,y) of center
		this.y = y;
		this.r = r; //radius
		this.color = color;

		this.xi = x; //initial x position (reset when velocity is reset)
		this.yi = y; //initial y position (reset when velocity is reset)
		this.vx = 0; //time of most recent y velocity reset
		this.vy = 0;
		this.AY = AY;
		this.X_FRICTION_SCALAR = 0.8; //must be < 1. During collisions, multiply vx by this^t (t in seconds) to simulate friction
		this.X_BOUNCE_SCALAR = 0.5; //0-1, 0 means no bounce, 1 means perfectly elastic collision

		this.time = 0; //time of most recent updatePosition call
		this.ti_x = 0; //time of most recent x velocity reset
		this.ti_y = 0;
		this.t_y_collision = 0; //time when y-collision started, used for friction calculations
		this.t_release = 0; //time when released, used for calculations if the ball is dangerous

    this.SAFE_TIMEOUT = 0.2; //timeout after a ball is released before it becomes dangerous (more for aesthetics to reinforce the player invincibility mechanic)

		this.x_collision = 0; // -1 means wall to left, 0 means no collision, 1 means wall to right
		this.y_collision = 0; // -1 means wall above, 0 means no collision, 1 means wall below

		this.holder_index = undefined; //index of the current holding player (in the game's players array), or undefined if not held
    this.thrown = false; //balls are dangerous after a timeout after released, until stops moving
	}

/*
	public void updatePosition(double time)
	{
		this.time = time;

		//if this ball is held, keep pace with the player holding it
		if(holder.isPresent())
		{
			x = holder.get().getX() + (holder.get().getWidth() / 2);
			y = holder.get().getY() + (holder.get().getHeight() * 0.65);
			x_collision = 0;
			y_collision = 0; //if this is not set, it can affect calculations involving friction and cause dud shots where the ball goes straight up
			setXVelocity(0);
			setYVelocity(0);
			return;
		}

		//if not held, do normal physics

		// --- PRE-MOTION ACTIONS (may change initial position, velocity, or time variables) --------------------------------
		//if velocity is in opposite direction to collision, no more collision
		if(x_collision == 1 && vx < 0 || x_collision == -1 && vx > 0)
		{
			x_collision = 0;
		}
		if(y_collision == 1 && vy < 0 || y_collision == -1 && vy > 0)
		{
			y_collision = 0;
		}

		// --- MOTION ACTIONS (initial position, velocity, and time variables are fixed up until position calculation is done) --------------------------------

		//define t to be time since most recent velocity reset
		double t_x = time - ti_x;
		double t_y = time - ti_y;

		//store previous position
		double prev_x = x;
		double prev_y = y;

		//move player if no collisions preventing it
		if(x_collision == 0)
		{
			x = xi + vx*t_x;
		}

		if(y_collision != 1)
		{
			y = yi + vy*t_y + 0.5*ay*t_y*t_y;
		}

		//detect wall collision
		boolean foundXCollision = false;
		boolean foundYCollision = false;
		//loop through walls
		for(Wall w : walls)
		{
			//y
			//test collision below
			if( (x+r > w.getX() && x-r < w.getX()+w.getWidth()) && (prev_y+r <= w.getY() && y+r >= w.getY()) ) //if in right x-range and collide vertically
			{
				foundYCollision = true;
				if(y_collision == 0) //if the previous movement didn't have a y collision, this is the first y-collision
				{
					t_y_collision = time;
				}

				y = w.getY() - r;
				y_collision = 1;
				setYVelocity(0);
			}
			//all other collision tests are dependent on if this is a border wall
			if(w.isBorderWall())
			{
				//test collision above
				if( (x+r > w.getX() && x-r < w.getX()+w.getWidth()) && (prev_y-r >= w.getY()+w.getHeight() && y-r <= w.getY()+w.getHeight()) ) //if in right x-range and collide vertically
				{
					foundYCollision = true;
					if(y_collision == 0) //if the previous movement didn't have a y collision, this is the first y-collision
					{
						t_y_collision = time;
					}
					y = w.getY()+w.getHeight() + r;
					y_collision = -1;
					setYVelocity(0);
				}

				//x
				//test collision to right
				if( (y+r > w.getY() && y-r < w.getY()+w.getHeight()) && (prev_x+r <= w.getX() && x+r >= w.getX()) ) //if in right y-range and collide horizontally
				{
					foundXCollision = true;

					x = w.getX() - r;
					x_collision = 1;

					setXVelocity(-x_bounce_scalar * vx);
				}
				//test collision to left
				if( (y+r > w.getY() && y-r < w.getY()+w.getHeight()) && (prev_x-r >= w.getX()+w.getWidth() && x-r <= w.getX()+w.getWidth()) ) //if in right y-range and collide horizontally
				{
					foundXCollision = true;

					x = w.getX()+w.getWidth() + r;
					x_collision = -1;

					setXVelocity(vx * -x_bounce_scalar);
				}
			}
		} //finish looping through walls
		if(!foundXCollision) {x_collision = 0;}
		if(!foundYCollision) {y_collision = 0;}

		//apply friction for next update call if there's a y-collision
		if(y_collision != 0) //then we have x-friction
		{
			double new_vx = vx * Math.pow(x_friction_scalar, time-t_y_collision); //apply friction
			new_vx = Math.abs(new_vx) < 1 ? 0 : new_vx; //round to zero if really small x velocity
			setXVelocity(new_vx);

			if(new_vx == 0)
			{
				thrown = false; //if a y-collision, and the horizontal velocity is zero, the ball stopped moving
			}
		}
	}
*/
	setXVelocity(vx)//time is the current time in seconds, from when the main animation timer started
	{
		if(this.x_collision == 1 && this.vx > 0){return;}
		if(this.x_collision == -1 && this.vx < 0){return;}

		this.xi = this.x;
		this.vx = vx;

		this.ti_x = this.time;
	}

	setYVelocity(vy)//time is the current time in seconds, from when the main animation timer started
	{
		if(this.y_collision == 1 && this.vy > 0){return;}
		if(this.y_collision == -1 && this.vy < 0){return;}

		this.yi = this.y;
		this.vy = vy;

		this.ti_y = this.time;
	}

	pickup(player)
	{
    let player_index = getPlayers().indexOf(player);
    if(player_index < 0) throw new Error("Failed to get player index when determining ball holder, player not found in players array.");
		this.holder_index = player_index;
	}
	release()
	{
		this.holder_index = undefined;
		this.thrown = true;
		this.t_release = this.time;
	}

	setNotDangerous() //called if a ball hits a player, to avoid multiple life-loss
	{
		this.thrown = false;
	}

	isDangerous()
	{
		return (this.time - this.t_release > this.SAFE_TIMEOUT) && this.thrown;
	}
	isHeld()
	{
		return this.holder_index !== undefined;
	}
}



exports.Ball = Ball;
