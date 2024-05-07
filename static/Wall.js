export class Wall
{
	constructor(x, y, width, height, color, border_wall=false)
	{
		this.x = x; //(x,y) of top left corner
		this.y = y;
		this.width = width;
		this.height = height;
		this.color = color;
		this.border_wall = border_wall;  //if true, all sides of the wall will block objects, and it won't be possible to press down and fall through the wall
	}
}