let Player = require("./Player").Player;
let Ball = require("./Ball").Ball;
let Wall = require("./Wall").Wall;
const {performance} = require("perf_hooks");


class Game {
	constructor(player_names){
		this.player_names = player_names; //array of strings

		this.players = [];
		this.walls = [];
		this.balls = [];

		//canvas size
		this.FIELD_WIDTH = 800;
		this.FIELD_HEIGHT = 600;

		//misc
		this.AY = 550; //gravitational acceleration, px/s^2
		this.N_LIVES = 5; //number of lives each player gets
		this.n_balls_array = [3, 3, 4, 5]; //n balls in play for each player count (1,2,3,4), use the last one for larger player counts than 4
		this.hat_name_array = ["bowlinghat", "cowboyhat", "sombrero", "fedora"]; //when creating new players, loop through this to get hat, restart at beginning if run out
		this.hat_aspect_ratios = [346/194, 190/99, 168/129, 200/137];
			//note: hats required to be .png b/c of how display.js figures out the image src

		//update loop
		this.LOOP_FREQ = 40; //hz
		this.t_start = performance.now() / 1000;

		this.init();
	}

	init(){
		//create platforms
		this.walls.push(new Wall(20,450,100,15,"brown"));
		this.walls.push(new Wall(300,500,150,15,"brown"));
		this.walls.push(new Wall(200,200,150,15,"brown"));
		this.walls.push(new Wall(100,300,150,15,"brown"));
		this.walls.push(new Wall(400,350,150,15,"brown"));
		this.walls.push(new Wall(500,250,250,15,"brown"));

		//create border walls
		this.walls.push(new Wall(0, this.FIELD_HEIGHT-30, this.FIELD_WIDTH, 30, "brown", true)); //floor
		this.walls.push(new Wall(-10, -500, 10, this.FIELD_HEIGHT+500, "brown", true)); //left wall
		this.walls.push(new Wall(this.FIELD_WIDTH, -500, 10, this.FIELD_HEIGHT+500, "brown", true)); //right wall

		//create balls
		let b_arr = this.n_balls_array;
		let n_balls = this.player_names.length > b_arr.length ? b_arr[b_arr.length-1] : b_arr[this.player_names.length-1];
		for(let i=0; i<n_balls; i++){
			let x = 50 + Math.random()*(this.FIELD_WIDTH-100);
			let y = 50 + Math.random()*(this.FIELD_HEIGHT-100);
			this.balls.push(new Ball(x, y, 10, "blue", this.AY));
		}


		//create players - name, x, y, width, AY, n_lives, hat_name, hat_aspect_ratio
		for(let i=0; i<this.player_names.length; i++){
			let name = this.player_names[i];
			let x = 100 + Math.random()*(this.FIELD_WIDTH-200);
			let y = 100 + Math.random()*(this.FIELD_HEIGHT-200);
			let width = 50;
			let ay = this.AY;
			let n_lives = this.N_LIVES;
			let hat_name = this.hat_name_array[i % this.hat_name_array.length];
			let hat_aspect_ratio = this.hat_aspect_ratios[i % this.hat_aspect_ratios.length];
			this.players.push(new Player(name, x, y, width, ay, n_lives, hat_name, hat_aspect_ratio));
		}
	}

	update(){
		let t_elapsed = performance.now()/1000 - this.t_start;

		//update balls and players  NOTE: doing ball position before players will cause a lag in position when carrying balls... which looks cool!!!
		this.balls.forEach(b => b.updatePosition(t_elapsed));
		this.players.forEach(p => p.updatePosition(t_elapsed));
	}
}


exports.Game = Game;
