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
		this.start_timestamp = Date.now(); // only things labeled 'timestamp' are absolute times, all others in the code are relative to this, allows initializing times to 0

		this.init();

		this.initial_state = JSON.parse(JSON.stringify(this));
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

	
	isValidKeyAction(key_action) {
		if(typeof(key_action) !== "object") return false;
		if(!("player_name" in key_action) || !("action" in key_action) || !("key" in key_action) || !("timestamp" in key_action) || !("seq_num" in key_action)) return false;
		if(!this.players.find(p => p.name === key_action.player_name)) return false;
		if(!(key_action.action === "keydown" || key_action.action === "keyup")) return false;
		if(typeof(key_action.timestamp) !== "number" || key_action.timestamp < 0) return false;
		return true;
	}


	// update(target_timestamp) {
	// 	// process queued actions and update positions, so that the game is at the timestamp passed in

	// 	// make sure the key action queue is always in order
	// 	this.key_action_queue.sort((a, b) => a.timestamp - b.timestamp);

	// 	// start with initial state and then process all key actions up to the desired timestamp
	// 	// don't overwrite key action queue though
	// 	const key_action_queue = this.key_action_queue;
	// 	Game.loadFromJson(this.initial_state, this);
	// 	this.key_action_queue = key_action_queue;

	// 	console.log("x initial", this.players[0].x)

	// 	// go through queued actions
	// 	for(let key_action of this.key_action_queue) {

	// 		// if we reached the end of the relevant actions, stop
	// 		if(key_action.timestamp > target_timestamp) break;

	// 		// update positions up to this point
	// 		this.updatePositions(key_action.timestamp);

	// 		// process the action
	// 		const player = this.players.find(p => p.name === key_action.player_name);
	// 		if(player){
	// 			if(key_action.action === "keydown") player.handleKeydown(this, key_action.key);
	// 			if(key_action.action === "keyup") player.handleKeyup(this, key_action.key);
	// 		}

	// 		console.log(`t=${(key_action.timestamp - this.start_timestamp) / 1000} x=${this.players[0].x} ${key_action.action} ${key_action.key} [${this.players[0].keys_down}]`)
	// 	}

	// 	// update positions to the final timestamp
	// 	console.log(this.players[0].y_collision)
	// 	this.updatePositions(target_timestamp);
	// 	console.log(this.players[0].y_collision)

	// 	console.log(`t=${(target_timestamp - this.start_timestamp)/1000} x=${this.players[0].x}`)
	// 	console.log("-----")
	// }


	update(target_timestamp) {
		// process queued actions and update positions, so that the game is at the timestamp passed in

		// make sure the key action queue is always in order
		this.key_action_queue.sort((a, b) => a.timestamp - b.timestamp);

		// start with initial state and then process all key actions up to the desired timestamp
		// don't overwrite key action queue though
		const key_action_queue = this.key_action_queue;
		Game.loadFromJson(this.initial_state, this);
		this.key_action_queue = key_action_queue;

		// step through time in small increments
		let prev_t = 0;
		for (let t = this.start_timestamp; t <= target_timestamp; t += 1000 / 40) { // 40 steps per 1s = 1000 ms

			// go through queued actions, process the ones that belong to this increment of time
			for (let key_action of this.key_action_queue) {

				// ignore actions that aren't part of this time step
				if (key_action.timestamp <= prev_t || key_action.timestamp > t) continue;

				// process the action
				const player = this.players.find(p => p.name === key_action.player_name);
				if (player) {
					if (key_action.action === "keydown") player.handleKeydown(this, key_action.key);
					if (key_action.action === "keyup") player.handleKeyup(this, key_action.key);
				}
			}
			// update positions for this time step
			this.updatePositions(t);

			prev_t = t;
		}
	}


	updatePositions(timestamp) { // time is an argument, because we sometimes do updates in chunks to calculate position changes between player inputs
		const t_since_start = (timestamp - this.start_timestamp) / 1000;
		//update balls and players - do players before balls because carried ball position depends on player position
		this.players.forEach(p => p.updatePosition(this, t_since_start));
		this.balls.forEach(b => b.updatePosition(this, t_since_start));
	}


	static loadFromJson(json_game, target_game = undefined) {
		// returns a game object with players, balls etc. being instances of their respective classes
		// if target_game (of class Game) is passed, copies json_game into target_game as well

		// make sure no references are hanging around
		json_game = JSON.parse(JSON.stringify(json_game));

		// get a new object with the same methods, and copy over shallow properties
		const game = target_game ? target_game : Object.create(Game.prototype);
		Object.assign(game, json_game);

		// recreate players, walls, and balls which need specific prototypes
		// properties can be directly copied since their default prototypes are correct
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