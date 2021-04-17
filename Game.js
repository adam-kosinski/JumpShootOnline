let Player = require("./Player").Player;
//let Ball = require("./Ball").Ball;
let Wall = require("./Wall").Wall;


class Game {
	constructor(player_names){
		this.player_names = player_names; //should be an array of two names
		if(player_names.length != 2){throw new Error("Not two players");} //TODO: support an arbitrary number of players

		this.players = [];
		this.walls = [];
		this.balls = [];

		//canvas size
		this.FIELD_WIDTH = 800;
		this.FIELD_HEIGHT = 600;

		//misc
		this.AY = 550; //gravitational acceleration, px/s^2
		this.N_LIVES = 5; //number of lives each player gets

		//update loop
		this.t_elapsed = 0;
		this.LOOP_FREQ = 10; //hz

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

		/*/create balls
		this.balls.push(new Ball(50, 100, 10, "blue", this.AY));
		this.balls.push(new Ball(150, 100, 10, "blue", this.AY));
		this.balls.push(new Ball(250, 100, 10, "blue", this.AY));
		*/

		//create players
		this.players.push(new Player(this.player_names[0], 100, 200, 50, this.AY, "bowlinghat.png"));
		this.players.push(new Player(this.player_names[1], 200, 200, 50, this.AY, "cowboyhat.png"));
	}

	update(){
		//update balls and players  NOTE: doing ball position before players will cause a lag in position when carrying balls... which looks cool!!!
		this.balls.forEach(b => b.updatePosition(this.t_elapsed));
		this.players.forEach(p => p.updatePosition(this.t_elapsed));
		this.t_elapsed += 1/this.LOOP_FREQ;
	}
}


exports.Game = Game;
