import java.util.ArrayList;
import java.util.Optional;
import java.io.File;

import javafx.scene.Scene;
import javafx.scene.canvas.GraphicsContext;
import javafx.scene.paint.Color;
import javafx.scene.effect.Light;
import javafx.scene.effect.Lighting;
import javafx.scene.input.KeyCode;
import javafx.scene.image.Image;
import javafx.scene.media.Media;
import javafx.scene.media.MediaPlayer;
import javafx.scene.media.AudioClip;

public class Player
{
	private double x; //of top-left corner
	private double xi; //initial x position (reset when velocity is reset)
	private double y; //of top-left corner
	private double yi; //initial y position (reset when velocity is reset)
	private double vx;
	private double vy;
	private double ay;
	
	private double vy_boost; //extra vy to gain from pressing the down key
	private double jump_speed;
	private double horiz_speed;
	
	private double time; //time of most recent updatePosition call
	private double ti_x; //time of most recent x velocity reset
	private double ti_y; //time of most recent y velocity reset
	private double t_hit; //time the player most recently got hit, used for making them red when hit
	
	private int x_collision; // -1 means wall to left, 0 means no collision, 1 means wall to right
	private int y_collision; // -1 means wall above, 0 means no collision, 1 means wall below
	private boolean border_y_collision; //set to true if the y_collision is with a border wall
	
	private Image hat;
	private Image rightChungus;
	private Image leftChungus;
	private double width; //width of hitbox and of chungus image
	private double chungus_height; //height of chungus image
	private double height; //height of hitbox
	
	private int health;
	private double t_threw_ball; //time when the player last threw a ball; players are invincible for a certain timeout after throwing a ball
	private double invincible_timeout; //this is that timeout, in sec
	private double red_color_timeout; //how long to make the player red after getting hit, in sec
	
	private KeyCode jumpKey;
	private KeyCode leftKey;
	private KeyCode rightKey;
	private KeyCode downKey;
	private KeyCode rotateLeftKey; //for launch angle changing
	private KeyCode ballKey;
	private KeyCode rotateRightKey;
	private boolean downKeyProcessed; //keeps track if we processed the first down key press, used so that we only process the first one
	
	private String direction; //"left" or "right"; direction the player is facing
	
	private Optional<Ball> myBall;
	private double[] shootAngleArray; //stores possible shoot angles, from 0 to pi/2.  These are positive when shooting up as it appears on the canvas.
	private int shootAngleIndex; //index in shoot angle array to reference
	private double shootAngle; //in radians, actual angle of launch, in math coords, not canvas coords
	private double shootVelocity; //in px/s
	
	private ArrayList<Wall> walls; //will be equal to the main array of these
	private ArrayList<Ball> balls;
	
	public Player(double x,double y,double width, Image hat, double ay)
	{
		this.x = x;
		this.xi = x;
		this.y = y;
		this.yi = y;
		this.vx = 0;
		this.vy = 0;
		this.ay = ay;
		
		this.vy_boost = 250;
		this.jump_speed = 450;
		this.horiz_speed = 250;
		
		this.time = 0;
		this.ti_x = 0;
		this.ti_y = 0;
		this.t_hit = -1000; //since a player will be red if time_now - time_hit < some number, make sure they're not red to start out by making this v. negative
		
		this.x_collision = 0;
		this.y_collision = 0;
		this.border_y_collision = false;
		
		this.hat = hat;
		this.rightChungus = new Image("rightChungus.png");
		this.leftChungus = new Image("leftChungus.png");
		this.width = width;
		this.chungus_height = (width/rightChungus.getWidth()) * rightChungus.getHeight();
		this.height = .75 * chungus_height; // 0.75 of the image height
		
		this.health = 5;
		this.t_threw_ball = 0;
		this.invincible_timeout = 0.5;
		this.red_color_timeout = 0.5;
		
		this.direction = "right"; //make sure this is consistent with the initialized shootAngle
		
		this.myBall = Optional.empty();
		
		this.shootAngleArray = new double[]{0.05*Math.PI,0.25*Math.PI,0.75*Math.PI,0.95*Math.PI};
		this.shootAngleIndex = 2;
		this.shootAngle = -shootAngleArray[shootAngleIndex];
		this.shootVelocity = 500;
	}
	
	public void bindKeys(KeyCode jumpKey, KeyCode leftKey, KeyCode downKey, KeyCode rightKey, KeyCode rotateLeftKey, KeyCode ballKey, KeyCode rotateRightKey)
	{
		this.jumpKey = jumpKey;
		this.leftKey = leftKey;
		this.downKey = downKey;
		this.rightKey = rightKey;
		this.rotateLeftKey = rotateLeftKey;
		this.ballKey = ballKey;
		this.rotateRightKey = rotateRightKey;
		this.downKeyProcessed = false;
	}
	
	public void giveObjects(ArrayList<Wall> walls, ArrayList<Ball> balls)
	{
		this.walls = walls;
		this.balls = balls;
	}
	
	public void handleKeyPress(KeyCode key)
	{
		//we assume that bindKeys() has been called already
				
		if(key == jumpKey && y_collision == 1) //can only jump if on a platform
		{
			setYVelocity(-jump_speed);
		}
		else if(key == leftKey)
		{
			setXVelocity(-horiz_speed);
		}
		else if(key == rightKey)
		{
			setXVelocity(horiz_speed);
		}
		else if(key == downKey)
		{
			if(!downKeyProcessed) //only process down key once. This gets set to false when we release the down key
			{
				downKeyProcessed = true;
				if(y_collision == 1 && !border_y_collision) //then drop through the platform
				{
					y_collision = 0;
					y += 1;
				}
				else //accelerate downwards
				{
					setYVelocity(vy + ay*(time-ti_y) + vy_boost);
				}
			}
		}
		else if(key == ballKey)
		{
			if(myBall.isEmpty()) //try to grab a ball if we don't have one
			{
				//loop through available balls
				for(Ball b : balls)
				{
					if(b.isDangerous() || b.isHeld()){continue;} //can't pick up dangerous or held balls
					
					//if the center of the ball is within the player, we can pick it up
					if(b.getX() > x && b.getX() < x+width && b.getY() > y && b.getY() < y+height)
					{
						myBall = Optional.of(b);
						b.pickup(this);
						break; //stop searching for balls
					}
				}
			}
			else //we have a ball, shoot it
			{
				shootBall();
			}
		}
		else if(key == rotateLeftKey)
		{
			if(shootAngleIndex < shootAngleArray.length - 1)
			{
				shootAngleIndex++;
				shootAngle = -shootAngleArray[shootAngleIndex];
			}
		}
		else if(key == rotateRightKey)
		{
			if(shootAngleIndex > 0)
			{
				shootAngleIndex--;
				shootAngle = -shootAngleArray[shootAngleIndex];
			}
		}
	}
	
	public void handleKeyRelease(KeyCode key)
	{
		if(key == leftKey || key == rightKey)
		{
			setXVelocity(0);
		}
		else if(key == downKey)
		{
			downKeyProcessed = false;
		}
	}
	
	public void draw(GraphicsContext ctx)
	{
		//make player red if got hit
		if(time - t_hit < red_color_timeout)
		{
			//hooray for copy-pasted code!
			Lighting lighting = new Lighting();
			lighting.setDiffuseConstant(1.0);
			lighting.setSpecularConstant(0.0);
			lighting.setSpecularExponent(0.0);
			lighting.setSurfaceScale(0.0);
			lighting.setLight(new Light.Distant(45, 45, Color.ORANGERED));
			
			ctx.setEffect(lighting);
		}
		
		//draw player
		Image chungus = direction=="left"? leftChungus : rightChungus;
		ctx.drawImage(chungus, x, y-.22*chungus_height, width, chungus_height); //y-.25*chungus_height would place the image perfectly on the platform, but I want to draw it a bit down
		double hat_width = 0.45*width;
		double hat_height = (hat_width/hat.getWidth()) * hat.getHeight();
		double hat_x = x + (direction=="right"? (width-hat_width)*0.6 : (width-hat_width)*0.4);
		ctx.drawImage(hat, hat_x, y-0.2*hat_height, hat_width, hat_height);
		
		//nothing else should be drawn red, reset the red effect
		ctx.setEffect(null);
		
		//draw trajectory direction
		if(myBall.isPresent())
		{
			ctx.setStroke(Color.GRAY);
			ctx.setLineDashes(width/5);
			double ball_x = myBall.get().getX();
			double ball_y = myBall.get().getY();
			ctx.strokeLine(ball_x, ball_y, ball_x + width*Math.cos(shootAngle), ball_y + width*Math.sin(shootAngle));
			
			//draw the ball
			myBall.get().draw(ctx);
		}
	}
	
	//function to update player's position
	public void updatePosition(double time) //time is the current time in seconds, from when the main animation timer started
	{
		this.time = time;
		
		//if velocity is in opposite direction to collision, no more collision
		if(x_collision == 1 && vx < 0 || x_collision == -1 && vx > 0)
		{
			x_collision = 0;
		}
		if(y_collision == 1 && vy < 0 || y_collision == -1 && vy > 0)
		{
			y_collision = 0;
		}
		//if no y_collision, no border_y_collision
		if(y_collision == 0)
		{
			border_y_collision = false;
		}
		
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
			if( (x+width > w.getX() && x < w.getX()+w.getWidth()) && (prev_y+height <= w.getY() && y+height >= w.getY()) ) //if in right x-range and collide vertically
			{
				foundYCollision = true;
				
				y = w.getY() - height;
				y_collision = 1;
				if(w.isBorderWall()){border_y_collision = true;}
				setYVelocity(0);
			}
			//all other collision tests are dependent on if this is a border wall
			if(w.isBorderWall())
			{
				//test collision above
				if( (x+width > w.getX() && x < w.getX()+w.getWidth()) && (prev_y >= w.getY()+w.getHeight() && y <= w.getY()+w.getHeight()) ) //if in right x-range and collide vertically
				{
					foundYCollision = true;
					
					y = w.getY()+w.getHeight();
					y_collision = -1;
					setYVelocity(0);
				}
				
				//x
				//test collision to right
				if( (y+height > w.getY() && y < w.getY()+w.getHeight()) && (prev_x+width <= w.getX() && x+width >= w.getX()) ) //if in right y-range and collide horizontally
				{
					foundXCollision = true;
					
					x = w.getX() - width;
					x_collision = 1;
					
					//do set velocity stuff without changing the stored velocity
					xi = x;
					ti_x = time;
				}
				//test collision to left
				if( (y+height > w.getY() && y < w.getY()+w.getHeight()) && (prev_x >= w.getX()+w.getWidth() && x <= w.getX()+w.getWidth()) ) //if in right y-range and collide horizontally
				{
					foundXCollision = true;
					
					x = w.getX()+w.getWidth();
					x_collision = -1;
					
					//do set velocity stuff without changing the stored velocity
					xi = x;
					ti_x = time;
				}
			}			
		} //finish looping through walls
		if(!foundXCollision) {x_collision = 0;}
		if(!foundYCollision) {y_collision = 0;}
		
		//check if a ball hit this player
		for(Ball b : balls)
		{
			if(!b.isDangerous()){continue;}
			
			//if the center of the ball is within the player, and time since last hit is bigger than timeout, it hit us
			if(b.getX() > x && b.getX() < x+width && b.getY() > y && b.getY() < y+height && time-t_threw_ball > invincible_timeout)
			{
				health--;
				b.setNotDangerous();
				t_hit = time;
				
				//play chungus chuckle sound
				AudioClip sound = new AudioClip(new File("chuckle.mp3").toURI().toString());
				sound.play();
			}
		}
	}
	
	public void setXVelocity(double vx)//time is the current time in seconds, from when the main animation timer started
	{
		if(x_collision == 1 && vx > 0){return;}
		if(x_collision == -1 && vx < 0){return;}
		
		xi = x;
		this.vx = vx;
		
		ti_x = time;
		
		if(vx < 0){direction = "left";}
		if(vx > 0){direction = "right";}
	}
	
	public void setYVelocity(double vy)//time is the current time in seconds, from when the main animation timer started
	{
		if(y_collision == 1 && vy > 0){return;}
		if(y_collision == -1 && vy < 0){return;}
		
		yi = y;
		this.vy = vy;
		
		ti_y = time;
	}
	
	public void shootBall()
	{
		if(myBall.isEmpty()){return;}
		
		Ball b = myBall.get();
		b.release();
		b.setXVelocity(shootVelocity * Math.cos(shootAngle));
		b.setYVelocity(shootVelocity * Math.sin(shootAngle));
		
		t_threw_ball = time;
		
		myBall = Optional.empty();
	}
	
	public double getX()
	{
		return x;
	}
	public double getY()
	{
		return y;
	}
	public double getWidth()
	{
		return width;
	}
	public double getHeight()
	{
		return height;
	}
	public double getHealth()
	{
		return health;
	}
	public Image getHat()
	{
		return hat;
	}
}