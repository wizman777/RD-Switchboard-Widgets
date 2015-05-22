ICON_WIDTH = 24;
ICON_HEIGHT = 24;

var w = 550,
    h = 500;

var graph, gnodes, glinks;
var container = d3.select(".graphContainer");

d3.selection.prototype.moveToFront = function() {
    return this.each(function() {
        this.parentNode.appendChild(this);
    });
};

var force = d3.layout.force() 
    .size([w, h])
    .charge(-40) 
    .linkDistance(getLinkDistance)
    .gravity(0.01);

var drag = force.drag()
    .on("dragstart", onDragStart)
    .on("drag", onDrag)	
    .on("dragend", onDragEnd);

var tip = d3.tip()
  .attr('class', 'd3-tip')
  .offset([-10, 0])
  .html(function(d) {
    return "<span style='color:white'>" + d.key + "</span>"; //<strong>Name:</strong> 
  });

var svg = container.append("svg:svg")
    .attr("width", w)
    .attr("height", h)
    .call(tip);

function validate(x, a, b) {
    if (x < a) x = a;
    if (x > b) x = b;
    return x;
}

function onDragStart(d) {
    d.fixed = true;
}

function onDrag(d) {
  /* d.px += d3.event.dx;
   d.py += d3.event.dy;
   d.x += d3.event.dx;
   d.y += d3.event.dy;*/

   d.px = validate(d.px, 0, w);
   d.py = validate(d.py, 0, h);
   /*d.x = validate(d.x, 0, w);
   d.y = validate(d.y, 0, h);*/
}

function onDragEnd(d) {
    if (d.x < 16 || d.x > w-16 || d.y < 16 || d.y > h-16)
   	d.fixed = false;
}

function hasChildren(d) {
   return !d.collapsed && typeof(d.children)!=='undefined'; 
}

// charge for "branches" : charge for "leaves"
/*function getCharge(d) {
    return hasChildren(d) ? -800 : -30; 
}*/

// link distance for "branches" : link distance for "leaves";
function getLinkDistance(d) {
    return hasChildren(d.target) ? 160 : 60; 
}

function prepare(json) {
    var map = {}, id = 0;
    // reset graph array	
    graph = null;

    // collect all nodes
    for (var i=0;i<json.length;++i) {

	var node = { id: id++, key: json[i].key, type: json[i].type, properties: json[i].properties, collapsed: false };
	// store the node into map
	map[json[i].key] = node;
	if (json[i].extra=='root') {
            graph = node;    
	} 
    } 

    if (null != graph) {
        graph.fixed = true;
	graph.x = w/2;
	graph.y = h/2;
    } 

    // collect all links
    for (var i=0;i<json.length;++i) {
	// check if node has relationships	
	if (typeof(json[i].relationships)!=='undefined') {
	    // extract source node id	
	    var source = map[json[i].key]; 
	    // create childrens array	
	    source.children = [];
	    // process all relationships
	    for (var j=0;j<json[i].relationships.length;j++) {
		source.children.push(map[json[i].relationships[j].key]);
	    }
        }
    }
}

// Called each time graph data is changed
// Graph's HTML (svg) is built by this function
function update() {
    var nodes = [], links = [];

    function recurse(node) {

	if (hasChildren(node)) { 
	    for (var i=0;i<node.children.length;++i) {
		links.push({ source: node, target:node.children[i] });
		recurse(node.children[i]); 
	    }
        }

	if (node.fixed) {

	   /*node.px = validate(node.px, 0, w);
   	   node.py = validate(node.py, 0, h);
	   node.x = validate(node.x, 0, w);
	   node.y = validate(node.y, 0, h);*/
        
	   // alert("x:" + node.x + " y:" + node.y);	
	    
	  /*  if (node.x < 0)
		node.x = 0;
	    if (node.x > w)
		node.x = w;
	    if (node.y < 0)
		node.y = 0;
	    if (node.y > h)
		node.y = h;*/

	    if (node.x < 0 || node.x > w || node.y < 0 || node.y > h)
		node.fixed = false; 	
        }

	nodes.push(node);
    }

    recurse(graph);

    force
        .nodes(nodes)
        .links(links)
        .start();

    // Update the links…
    glinks = svg.selectAll(".link")
        .data(links, function(d) { return d.target.id; });

    // Enter any new links.
    glinks.enter().append("svg:line")
        .attr("class", "link")
	//.style("marker-end", "url(#suit)")
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    // Exit any old links.
    glinks.exit().remove();


    // Update the nodes…
    gnodes = svg.selectAll(".node")
        .data(nodes, function(d) { return d.id; }) // , function(d) { return d.id; }
  
    var newNodes = gnodes.enter().append("svg:g")
        .attr("class", "node")
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; }) 
        .call(drag)
	.on('mouseover', tip.show)
        .on('mouseout', tip.hide)
        .on("dblclick", onDblClick); 
    
    newNodes.append("svg:circle")
	.attr("x", 0)
	.attr("y", 0)
        .attr("r", getRadius)
        .style("fill", getColor);
    
    newNodes.append("svg:image")
        .attr("xlink:href", getImage)
        .attr("x", -ICON_WIDTH/2)
        .attr("y", -ICON_HEIGHT/2)
        .attr("width", ICON_WIDTH + "px")
        .attr("height", ICON_HEIGHT + "px"); 	

   /* newNodes.append("svg:text")
        .attr("dx", 18)
        .attr("dy", ".35em")
        .text(function(d) { if (d.type=='Researcher') {return d.properties.name} });*/

   // newNodes.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
  
    // Exit any old nodes.
    gnodes.exit().remove();

    gnodes.selectAll("circle")
	.attr("r", getRadius)
	.style("fill", getColor);

//    gnodes.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; }); 	

    /*gnodes.selectAll("circle.node")
	.attr("r", 16)
	.style("fill", color);*/

    force.on("tick", onTick);
}

function onTick(d) {
    glinks.attr("x1", function(d) { return d.source.x; })
         .attr("y1", function(d) { return d.source.y; })
         .attr("x2", function(d) { return d.target.x; })
         .attr("y2", function(d) { return d.target.y; });

    gnodes.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
}

/*node.attr("cx", function (d) {
        return d.x;
    })
        .attr("cy", function (d) {
        return d.y;
    });*/

function getRadius(d) {
   return (d.collapsed && typeof(d.children)!=='undefined') ? 24 : 16;	
}

// Color leaf nodes orange, and packages white or blue.
function getColor(d) {
    if (d.type==='researcher') {
	return "#dfe1e3";
    } else if (d.type==='grant') {
        return "#ae5ed0";
    } else if (d.type==='publication') {
        return "#24b6b0";
    } else if (d.type==='dataset') {
        return "#dfe1e3";
    } else 
	return "#545544";
}

function getImage(d) {
    if (d.type==='researcher') {
	return "images/researcher.png";
    } else if (d.type==='grant') {
	return "images/grant.png";
    } else if (d.type==='publication') {
	return "images/publication.png";
    } else if (d.type==='dataset') {
	return "images/dataset.png";
    }
}

// Toggle children on click.
function onDblClick(d) {
    if (d3.event.defaultPrevented) return;	

    d.collapsed = !d.collapsed; 
 	
    update();

    gnodes.moveToFront();
}

(function() {
   /* var parser = document.createElement('a');
    parser.href = window.location.href;
    var path = parser.pathname.split("/");
    if (path.length >= 3) {*/	
	//var jsonName = path[1] + "-" + path[2] + ".json";	
	var jsonName = "demo.json"
        d3.json(jsonName, function(json) {
            prepare(json);	
            update();
        });
  //  }
})();


