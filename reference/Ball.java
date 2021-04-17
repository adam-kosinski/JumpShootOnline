import java.util.Optional;
import java.util.ArrayList;

import javafx.scene.canvas.GraphicsContext;
import javafx.scene.paint.Color;

public class Ball
{
	private double x; // (x,y) of center
	private double y;
	private double r; //radius
	private Color color;
	
	private double xi; //initial x position (reset when velocity is reset)
	private double yi; //initial y position (reset when velocity is reset)
	private double vx;
	private double vy;
	private double ay;
	private double x_friction_scalar; //must be < 1. During collisions, multiply vx by this^t (t in seconds) to simulate friction
	private double x_bounce_scalar; //0-1, 0 means no bounce, 1 means perfectly elastic collision
	
	private double time; //time of most recent updatePosition call
	private double ti_x; //time of most recent x velocity reset
	private double ti_y; //time of most recent y velocity reset
	private double t_y_collision; //time when y-collision started, used for friction calculations
	private double t_release; //time when released, used for calculations if the ball is dangerous
	
	private int x_collision; // -1 means wall to left, 0 means no collision, 1 means wall to right
	private int y_collision; // -1 means wall above, 0 means no collision, 1 means wall below
	
	private boolean thrown = false; //balls are dangerous after a timeout after released, until stops moving
	private double safe_timeout; //timeout after a ball is released before it becomes dangerous
	private Optional<Player> holder;
	
	private ArrayList<Wall> walls;
	private ArrayList<Ball> balls;
	
	public Ball(double x, double y, double r, Color color, double ay)
	{
		this.x = x;
		this.y = y;
		this.r = r;
		this.color = color;
		
		this.xi = x;
		this.yi = y;
		this.vx = 0;
		this.vy = 0;
		this.ay = ay;
		this.x_friction_scalar = 0.8;
		this.x_bounce_scalar = 0.5;
		
		this.time = 0;
		this.ti_x = 0;
		this.ti_y = 0;
		this.t_y_collision = 0;
		this.t_release = 0;
		
		this.safe_timeout = 0.2;
		
		this.x_collision = 0;
		this.y_collision = 0;
		
		this.holder = Optional.empty();
	}
	public void giveObjects(ArrayList<Wall> walls, ArrayList<Ball> balls)
	{
		this.walls = walls;
		this.balls = balls;
	}
	
	public void draw(GraphicsContext ctx)
	{
		ctx.setFill(color);
		if(isDangerous()){
			ctx.setFill(Color.BLACK);
		}
		ctx.fillOval(x-r, y-r, r*2, r*2);
	}
	
	public void updatePosition(double time)
	{
		this.time = time;
		
		//if this ball is held, keep pace with the player holding it
		if(holder.isPresent())
		{
			x = holder.get().getX() + (holder.get().getWidth() / 2);
			y = holder.get().getY() + (holder.get().getHeight() * 0.65);
			x_collision = 0;
			y_collision = 0; //if this is not set, it can effect calculations involving friction and cause dud shots where the ball goes straight up
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
	
	public void setXVelocity(double vx)//time is the current time in seconds, from when the main animation timer started
	{
		if(x_collision == 1 && vx > 0){return;}
		if(x_collision == -1 && vx < 0){return;}
				
		xi = x;		
		this.vx = vx;
		
		ti_x = time;
	}
	
	public void setYVelocity(double vy)//time is the current time in seconds, from when the main animation timer started
	{
		if(y_collision == 1 && vy > 0){return;}
		if(y_collision == -1 && vy < 0){return;}
		
		yi = y;
		this.vy = vy;
		
		ti_y = time;
	}
	
	public void pickup(Player p)
	{
		holder = Optional.of(p);
	}
	public void release()
	{
		holder = Optional.empty();
		thrown = true;
		t_release = time;
	}
	
	public void setNotDangerous() //called if a ball hits a player, to avoid multiple life-loss
	{
		thrown = false;
	}
	
	public double getX()
	{
		return x;
	}
	public double getY()
	{
		return y;
	}
	public double getRadius()
	{
		return r;
	}
	public boolean isDangerous()
	{
		if(time - t_release > safe_timeout && thrown == true)
		{
			return true;
		}
		return false;
	}
	public boolean isHeld()
	{
		return holder.isPresent();
	}
}