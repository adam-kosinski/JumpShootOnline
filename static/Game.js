import { Player } from "./Player.js";
import { Ball } from "./Ball.js";
import { Wall } from "./Wall.js";


export class Game {
	constructor(player_names) {
		this.player_names = player_names; //array of strings

		this.players = [];
		this.walls = [];
		this.balls = [];

		this.key_action_queue = [];

		//canvas size
		this.FIELD_WIDTH = 800;
		this.FIELD_HEIGHT = 600;

		//misc
		this.AY = 550; //gravitational acceleration, px/s^2
		this.N_LIVES = 5; //number of lives each player gets
		this.n_balls_array = [3, 3, 4, 5]; //n balls in play for each player count (1,2,3,4), use the last one for larger player counts than 4
		this.hat_name_array = ["bowlinghat", "sombrero", "fedora", "cowboyhat"]; //when creating new players, loop through this to get hat, restart at beginning if run out
		this.hat_aspect_ratios = [346 / 194, 168 / 129, 200 / 137, 190 / 99];
		//note: hats required to be .png b/c of how display.js figures out the image src

		//time variables
		this.timestamp_start = Date.now() / 1000; // only things labeled 'timestamp' are absolute times, all others in the code are relative to this, allows initializing times to 0
		this.last_update_timestamp = 0;

		this.init();
	}

	init() {
		//create platforms
		this.walls.push(new Wall(20, 450, 100, 15, "brown"));
		this.walls.push(new Wall(300, 500, 150, 15, "brown"));
		this.walls.push(new Wall(200, 200, 150, 15, "brown"));
		this.walls.push(new Wall(100, 300, 150, 15, "brown"));
		this.walls.push(new Wall(400, 350, 150, 15, "brown"));
		this.walls.push(new Wall(500, 250, 250, 15, "brown"));

		//create border walls
		this.walls.push(new Wall(0, this.FIELD_HEIGHT - 30, this.FIELD_WIDTH, 30, "brown", true)); //floor
		this.walls.push(new Wall(-10, -500, 10, this.FIELD_HEIGHT + 500, "brown", true)); //left wall
		this.walls.push(new Wall(this.FIELD_WIDTH, -500, 10, this.FIELD_HEIGHT + 500, "brown", true)); //right wall

		//create balls
		let b_arr = this.n_balls_array;
		let n_balls = this.player_names.length > b_arr.length ? b_arr[b_arr.length - 1] : b_arr[this.player_names.length - 1];
		for (let i = 0; i < n_balls; i++) {
			let x = 50 + Math.random() * (this.FIELD_WIDTH - 100);
			let y = 50 + Math.random() * (this.FIELD_HEIGHT - 100);
			this.balls.push(new Ball(x, y, 10, "blue", this.AY));
		}


		//create players - name, x, y, width, AY, n_lives, hat_name, hat_aspect_ratio
		for (let i = 0; i < this.player_names.length; i++) {
			let name = this.player_names[i];
			let x = 100 + Math.random() * (this.FIELD_WIDTH - 200);
			let y = 100 + Math.random() * (this.FIELD_HEIGHT - 200);
			let width = 50;
			let ay = this.AY;
			let n_lives = this.N_LIVES;
			let hat_name = this.hat_name_array[i % this.hat_name_array.length];
			let hat_aspect_ratio = this.hat_aspect_ratios[i % this.hat_aspect_ratios.length];
			this.players.push(new Player(name, x, y, width, ay, n_lives, hat_name, hat_aspect_ratio));
		}
	}


	queueKeyAction(player_name, action, key, timestamp) {
		// action can be "keydown" or "keyup", timestamp is from the client's Date.now()
		this.key_action_queue.push({ player_name, action, key, timestamp })
	}


	update(up_to_timestamp) {
		// process queued actions and update positions, up to the timestamp given

		// go through queued actions
		while(this.key_action_queue[0]?.timestamp <= up_to_timestamp){
			const { player_name, action, key, timestamp } = this.key_action_queue.splice(0, 1)[0];
			// update positions up to this point
			this.updatePositions(timestamp);
			// process the action
			const player = this.players.find(p => p.name === player_name);
			if(player){
				if(action === "keydown") player.handleKeydown(this, key);
				if(action === "keyup") player.handleKeyup(this, key);
			}
		}
		// update positions to the final timestamp
		this.updatePositions(up_to_timestamp);

		this.last_update_timestamp = up_to_timestamp;
	}


	updatePositions(timestamp) { // time is an argument, because we sometimes do updates in chunks to calculate position changes between player inputs
		const t_since_start = timestamp / 1000 - this.timestamp_start;
		//update balls and players - do players before balls because carried ball position depends on player position
		this.players.forEach(p => p.updatePosition(this, t_since_start));
		this.balls.forEach(b => b.updatePosition(this, t_since_start));
	}


	static loadFromJson(json_game) {
		// returns a new game object with players, balls etc. being instances of their respective classes

		// get a new object with the same methods, and copy over shallow properties
		const game = Object.create(Game.prototype);
		Object.assign(game, json_game);

		// recreate players, walls, and balls which need specific prototypes
		// these only have shallow properties, so the properties can be directly copied
		game.players = [];
		for (let p of json_game.players) {
			const player_copy = Object.create(Player.prototype);
			Object.assign(player_copy, p);
			game.players.push(player_copy);
		}
		game.balls = [];
		for (let b of json_game.balls) {
			const ball_copy = Object.create(Ball.prototype);
			Object.assign(ball_copy, b);
			game.balls.push(ball_copy);
		}
		game.walls = [];
		for (let w of json_game.walls) {
			const wall_copy = Object.create(Wall.prototype);
			Object.assign(wall_copy, w);
			game.walls.push(w);
		}

		return game;
	}
}