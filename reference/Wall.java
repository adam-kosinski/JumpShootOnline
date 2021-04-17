import javafx.scene.canvas.GraphicsContext;
import javafx.scene.paint.Color;

public class Wall
{
	private double x; //x,y of top left coord
	private double y;
	private double width;
	private double height;
	private Color color;
	
	private boolean border_wall; //if true, all sides of the wall will block objects, and it won't be possible to press down and fall through the wall
	
	//constructors
	public Wall(double x, double y, double width, double height, Color color, boolean border_wall)
	{
		this.x = x; //(x,y) of top left corner
		this.y = y;
		this.width = width;
		this.height = height;
		this.color = color;
		this.border_wall = border_wall;
	}
	public Wall(double x, double y, double width, double height, Color color) //if border_wall not included, assume false
	{
		this(x,y,width,height,color,false);
	}
	
	//methods
	public void draw(GraphicsContext ctx)
	{
		ctx.setFill(color);
		ctx.fillRect(x,y,width,height);
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
	public boolean isBorderWall()
	{
		return border_wall;
	}
}