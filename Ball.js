let server = require("./server");
function getWalls() { return server.getGame().walls; }
function getPlayers() { return server.getGame().players; }


class Ball {

	constructor(x, y, r, color, AY) {
		this.x = x; // (x,y) of center
		this.y = y;
		this.r = r; //radius
		this.color = color;
		this.dangerous_color = "black";

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

		this.x_collision = 0; // -1 means wall to left, 0 means no collision, 1 means wall to right
		this.y_collision = 0; // -1 means wall above, 0 means no collision, 1 means wall below

		this.holder_index = undefined; //index of the current holding player (in the game's players array), or undefined if not held
		this.thrown = false; //balls are dangerous after a timeout after released, until stops moving
	}


	updatePosition(time) {
		this.time = time;

		//if this ball is held, keep pace with the player holding it
		if (this.holder_index !== undefined) {
			let holder = getPlayers()[this.holder_index];
			this.x = holder.x + (holder.width / 2);
			this.y = holder.y + (holder.height * 0.65);
			this.x_collision = 0;
			this.y_collision = 0; //if this is not set, it can affect calculations involving friction and cause dud shots where the ball goes straight up
			this.setXVelocity(0);
			this.setYVelocity(0);
			return;
		}

		//if not held, do normal physics

		// --- PRE-MOTION ACTIONS (may change initial position, velocity, or time variables) --------------------------------
		//if velocity is in opposite direction to collision, no more collision
		if (this.x_collision == 1 && this.vx < 0 || this.x_collision == -1 && this.vx > 0) {
			this.x_collision = 0;
		}
		if (this.y_collision == 1 && this.vy < 0 || this.y_collision == -1 && this.vy > 0) {
			this.y_collision = 0;
		}

		// --- MOTION ACTIONS (initial position, velocity, and time variables are fixed up until position calculation is done) --------------------------------

		//define t to be time since most recent velocity reset
		let t_x = time - this.ti_x;
		let t_y = time - this.ti_y;

		//store previous position
		let prev_x = this.x;
		let prev_y = this.y;

		//move ball if no collisions preventing it
		if (this.x_collision == 0) {
			this.x = this.xi + this.vx * t_x;
		}

		if (this.y_collision != 1) {
			this.y = this.yi + this.vy * t_y + 0.5 * this.AY * t_y * t_y;
		}

		//detect wall collision
		let foundXCollision = false;
		let foundYCollision = false;
		//loop through walls
		getWalls().forEach(w => {
			//y
			//test collision below
			if ((this.x + this.r > w.x && this.x - this.r < w.x + w.width) && (prev_y + this.r <= w.y && this.y + this.r >= w.y)) //if in right x-range and collide vertically
			{
				foundYCollision = true;
				if (this.y_collision == 0) //if the previous movement didn't have a y collision, this is the first y-collision
				{
					this.t_y_collision = time;
				}

				this.y = w.y - this.r;
				this.y_collision = 1;
				this.setYVelocity(0);
			}
			//all other collision tests are dependent on if this is a border wall
			if (w.border_wall) {
				//test collision above
				if ((this.x + this.r > w.x && this.x - this.r < w.x + w.width) && (prev_y - this.r >= w.y + w.height && this.y - this.r <= w.y + w.height)) //if in right x-range and collide vertically
				{
					foundYCollision = true;
					if (this.y_collision == 0) //if the previous movement didn't have a y collision, this is the first y-collision
					{
						this.t_y_collision = time;
					}
					this.y = w.y + w.height + this.r;
					this.y_collision = -1;
					this.setYVelocity(0);
				}

				//x
				//test collision to right
				if ((this.y + this.r > w.y && this.y - this.r < w.y + w.height) && (prev_x + this.r <= w.x && this.x + this.r >= w.x)) //if in right y-range and collide horizontally
				{
					foundXCollision = true;

					this.x = w.x - this.r;
					this.x_collision = 1;

					this.setXVelocity(-this.X_BOUNCE_SCALAR * this.vx);
				}
				//test collision to left
				if ((this.y + this.r > w.y && this.y - this.r < w.y + w.height) && (prev_x - this.r >= w.x + w.width && this.x - this.r <= w.x + w.width)) //if in right y-range and collide horizontally
				{
					foundXCollision = true;

					this.x = w.x + w.width + this.r;
					this.x_collision = -1;

					this.setXVelocity(-this.X_BOUNCE_SCALAR * this.vx);
				}
			}
		}); //finish looping through walls
		if (!foundXCollision) { this.x_collision = 0; }
		if (!foundYCollision) { this.y_collision = 0; }

		//apply friction for next update call if there's a y-collision
		if (this.y_collision != 0) //then we have x-friction
		{
			let new_vx = this.vx * Math.pow(this.X_FRICTION_SCALAR, time - this.t_y_collision); //apply friction
			if (Math.abs(new_vx) < 1) new_vx = 0; //round to zero if really small x velocity
			this.setXVelocity(new_vx);

			if (new_vx == 0) {
				this.thrown = false; //if a y-collision, and the horizontal velocity is zero, the ball stopped moving
			}
		}
	}


	setXVelocity(vx)//time is the current time in seconds, from when the main animation timer started
	{
		if (this.x_collision == 1 && vx > 0) { return; }
		if (this.x_collision == -1 && vx < 0) { return; }

		this.xi = this.x;
		this.vx = vx;

		this.ti_x = this.time;
	}

	setYVelocity(vy)//time is the current time in seconds, from when the main animation timer started
	{
		if (this.y_collision == 1 && vy > 0) { return; }
		if (this.y_collision == -1 && vy < 0) { return; }

		this.yi = this.y;
		this.vy = vy;

		this.ti_y = this.time;
	}

	pickup(player) {
		let player_index = getPlayers().indexOf(player);
		if (player_index < 0) throw new Error("Failed to get player index when determining ball holder, player not found in players array.");
		this.holder_index = player_index;
	}
	release() {
		this.holder_index = undefined;
		this.thrown = true;
		this.t_release = this.time;
	}

	setNotDangerous() //called if a ball hits a player, to avoid multiple life-loss
	{
		this.thrown = false;
	}

	isDangerous() {
		return this.thrown; //used to have a timeout but was made redundant by player invincibility
		//also best to not have a timeout for dangerous to prevent players staying on top of each other to be safe
	}
	isHeld() {
		return this.holder_index !== undefined;
	}
}



exports.Ball = Ball;
