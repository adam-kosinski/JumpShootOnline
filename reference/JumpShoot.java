import java.util.ArrayList;

import javafx.application.Application;
import javafx.stage.Stage;
import javafx.scene.Scene;
import javafx.scene.layout.BorderPane;
import javafx.scene.paint.Color;
import javafx.scene.canvas.Canvas;
import javafx.scene.canvas.GraphicsContext;
import javafx.scene.image.Image;
import javafx.scene.input.KeyCode;

//animation stuff
import javafx.animation.AnimationTimer;
import javafx.util.Duration;

public class JumpShoot extends Application
{
	//variables to hold objects - players, bullets, surfaces
	private ArrayList<Player> players = new ArrayList<Player>();
	private ArrayList<Wall> walls = new ArrayList<Wall>();
	private ArrayList<Ball> balls = new ArrayList<Ball>();
	
	//references to GUI
	private Canvas canvas;
	private GraphicsContext ctx;
	private Canvas status_canvas;
	private double field_width = 800;
	private double field_height = 600;
	
	//misc
	private double ay = 550; //gravitational acceleration, px/s^2
	private double nLives = 5; //number of lives each player gets
	
	@Override
	public void init()
	{
	}
	
	@Override
	public void start(Stage primary)
	{
		//load GUI
		
		
		
		canvas = new Canvas(field_width,field_height);
		ctx = canvas.getGraphicsContext2D();
		
		status_canvas = new Canvas(field_width,50);
		
		BorderPane bp = new BorderPane();
		bp.setCenter(canvas);
		bp.setBottom(status_canvas);
		Scene s = new Scene(bp); //sceneWidth and sceneHeight are state variables of this class
		primary.setScene(s);
		primary.show();
		
		//create objects
		players.add(new Player(100,200,50,new Image("bowlinghat.png"),ay));
		players.get(0).bindKeys(KeyCode.R, KeyCode.D, KeyCode.F, KeyCode.G, KeyCode.DIGIT1, KeyCode.DIGIT2, KeyCode.DIGIT3);
		players.get(0).giveObjects(walls,balls);
		
		players.add(new Player(200,200,50,new Image("cowboyhat.png"),ay));
		players.get(1).bindKeys(KeyCode.UP, KeyCode.LEFT, KeyCode.DOWN, KeyCode.RIGHT, KeyCode.M, KeyCode.COMMA, KeyCode.PERIOD);
		players.get(1).giveObjects(walls,balls);
		
		//platforms
		walls.add(new Wall(20,450,100,15,Color.BROWN));
		walls.add(new Wall(300,500,150,15,Color.BROWN));
		walls.add(new Wall(200,200,150,15,Color.BROWN));
		walls.add(new Wall(100,300,150,15,Color.BROWN));
		walls.add(new Wall(400,350,150,15,Color.BROWN));
		walls.add(new Wall(500,250,250,15,Color.BROWN));
		
		walls.add(new Wall(0,field_height-30,field_width,30,Color.BROWN, true)); //floor
		walls.add(new Wall(-10,-500,10,field_height+500,Color.BROWN, true)); //left wall
		walls.add(new Wall(field_width,-500,10,field_height+500,Color.BROWN, true)); //right wall
		
		balls.add(new Ball(50, 100, 10, Color.BLUE,ay));
		balls.add(new Ball(150, 100, 10, Color.BLUE,ay));
		balls.add(new Ball(250, 100, 10, Color.BLUE,ay));
		
		for(Player p : players)
		{
			p.giveObjects(walls,balls);
		}
		for(Ball b : balls)
		{
			b.giveObjects(walls,balls);
		}
		
		//handle event listening
		s.setOnKeyPressed( e ->
		{
			KeyCode key = e.getCode();
			for(Player p : players)
			{
				p.handleKeyPress(key);
			}
		});
		s.setOnKeyReleased( e ->
		{
			KeyCode key = e.getCode();
			for(Player p : players)
			{
				p.handleKeyRelease(key);
			}
		});
		
		//start animation
		GameAnimation game_animation = new GameAnimation();
		game_animation.start();
	}
	
	@Override
	public void stop()
	{}
	
	public void updateStatusBar()
	{
		GraphicsContext s_ctx = status_canvas.getGraphicsContext2D();
		s_ctx.clearRect(0,0,status_canvas.getWidth(),status_canvas.getHeight());
		
		//draw background
		s_ctx.setFill(Color.BLACK);
		s_ctx.fillRect(0,0,status_canvas.getWidth(),8);
		s_ctx.setFill(Color.ORANGE);
		s_ctx.fillRect(0,8,status_canvas.getWidth(),status_canvas.getHeight()-8);
		
		//loop through players and display their info
		for(int i=0; i < players.size(); i++)
		{
			//reference point for drawing this player
			double base_x = 5 + i*(55 + nLives*25 + 20); //left padding plus hat plus hearts plus padding between players
			
			//draw the hat representing the player
			Image hat = players.get(i).getHat();
			double hat_width = 50;
			double hat_height = hat.getHeight() * (hat_width/hat.getWidth());
			s_ctx.drawImage(hat,base_x,15,hat_width,hat_height);
			
			//draw the player's lives - each heart will be 20 x 20 px, with 5px gaps
			Image heart = new Image("heart.png");
			for(int h=0; h < players.get(i).getHealth(); h++)
			{
				s_ctx.drawImage(heart,base_x+hat_width+5+h*25,20,20,20);
			}
		}
	}
	
	public class GameAnimation extends AnimationTimer
	{
		
		//physics variables
		private double t_i = -1.0; //inital time in s; handle will define it if it sees that this is -1
		
		public GameAnimation()
		{
			super();
		}
		
		@Override
		public void handle(long now) //now is the current timestamp in "nanoseconds"
		{				
			//if we just started the animation, set the initial time
			if(t_i < 0)
			{
				t_i = (double) now / 10e8;
			}
			
			//get time in seconds
			double t = (double) now / 10e8 - t_i;
			
			//clear canvas
			ctx.clearRect(0,0,canvas.getWidth(),canvas.getHeight());
			
			//loop through walls and draw them
			for(Wall w : walls)
			{
				w.draw(ctx);
			}
			
			//loop through balls and update them - NOTE: doing ball position before players will cause a lag in position when carrying balls... which looks cool!!!
			for(Ball b : balls)
			{
				b.updatePosition(t);
			}
			
			//loop through players and update their positions and draw them. Players also draw balls they hold
			for(Player p : players)
			{
				p.updatePosition(t);
				p.draw(ctx);
			}
			
			//draw non-held balls
			for(Ball b : balls)
			{
				if(!b.isHeld())
				{
					b.draw(ctx);
				}
			}
			
			//update status bar
			updateStatusBar();
		}
	}
}