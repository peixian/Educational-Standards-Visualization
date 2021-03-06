var width = window.innerWidth-window.innerWidth*.05,
    height = window.innerHeight-window.innerHeight*.2,
    innerRadius = 20,
    outerRadius = 1000;

var typeAngle = {};
typeAngle["s1"] = 0;
typeAngle["t1"] = 1;
typeAngle["t2"] = 2;

var distFromCenter = {};
var t1Amount = t2Amount = s1Amount = 0;
var angle = d3.scale.ordinal().domain(d3.range(4)).rangePoints([0, 2 * Math.PI]),
    radius = d3.scale.linear().range([innerRadius, outerRadius]),
    color = d3.scale.category10().domain(d3.range(20));

//gets the data;
d3.json("revised-data/t1-s1.json", function(nodes) {
    var nodesByName = {},
        links = [],
        formatNumber = d3.format(",d"),
        defaultInfo, defaultDetails;

    // Construct an index by node name.
    nodes.forEach(function(d) {
        d.connectors = [];
        d.packageName = d.name.split(".")[1];
        nodesByName[d.name] = d;
    });

    // Convert the import lists into links with sources and targets.
    nodes.forEach(function(source) {
        source.imports.forEach(function(targetName) {
            var target = nodesByName[targetName];
            if (!source.source) source.connectors.push(source.source = {
                node: source,
                degree: 0
            });
            if (!target.target) target.connectors.push(target.target = {
                node: target,
                degree: 0
            });
            links.push({
                source: source.source,
                target: target.target
            });
        });
    });




    
    //sorts the nodes into their own lines
    // var nodesByType = d3.nest()
    //     .key(function(d) {
    //         return d.type;
    //     })
    //     .sortKeys(d3.ascending)
    //     .entries(nodes);
    //     console.log(nodesByType);
    //
    //
    var nodesByType = d3.nest()
        .key(function(d) {
            return d.type;
        })
        .key(function(d) {
            return d.id;
        })
        .sortKeys(d3.ascending)
        .entries(nodes);

    // nodesByType.forEach(function(type) {
    //     console.log(type);
    //     var tempValues = type.values.sort(function(a, b) {return b.id - a.id;})
    //     type.values = tempValues;
    //     console.log(tempValues);
    // });

    // console.log(nodesByType);
    // console.log(nodesByID);
    //should group the nodes (nonfunctional currently)
    nodesByType.forEach(function(type) {
        var lastName = type.values[0].id, count = 0;
        type.values.forEach(function(ID) {
            ID.values.forEach(function(d, i) {
                if (d.id != lastName) {
                    lastName = d.id, count += .01;
                } 
                d.index = count++;
            }); 
            type.count = count - 1;
        });
    });
        
    radius.domain(d3.extent(nodes, function(d) { return d.index; }));

     var info = d3.select("#info").text(defaultInfo = "Showing " + formatNumber(links.length) + " links among " + formatNumber(nodes.length) + " nodes.");
     

     var sourceInfo = d3.select("#source").text(defaultDetails = "Nothing selected.");
     var targetInfo = d3.select("#target").text(defaultDetails = "Nothing selected.")

    //create the base svg
    var svg = d3.select("#chart").append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
        
    //axis
    svg.selectAll(".axis")
        .data(d3.range(3))
        .enter().append("line")
        .attr("class", "axis")
        .attr("transform", function(d) {
            return "rotate(" + degrees(angle(d)) + ")";
        })
        .attr("x1", radius.range()[0])
        .attr("x2", radius.range()[1]);
        
    //links (loops through each one, calls the links function)
    svg.append("g")
        .attr("class", "link")
    .selectAll(".link")
        .data(links)
    .enter().append("path")
      .attr("class", "link")
        .attr("d", link()
        .angle(function(d) {  return angle(typeAngle[d.node.type]); })
        .radius(function(d) { return radius(d.node.index); }))
        .style("stroke", function(d) { return color(typeAngle[d.source.type]); })
        .on("mouseover", linkMouseover)
        .on("mouseout", mouseout)
    .append("text")
        .text(function (d) {return createTooltip(d)});


    svg.append("g")
        .attr("class", "nodes")
      .selectAll(".node")
        .data(nodesByID)
      .enter().append("g")
        .attr("class", "node")
        .style("fill", function(d) { return color(typeAngle[d.type]) })
      .selectAll("circle")
        .data(function(d) { return d.connectors; })
      .enter().append("circle")
        .attr("transform", function(d) {return "rotate(" + degrees(angle(typeAngle[d.node.type])) + ")"; })
        .attr("cx", function(d) { console.log(d); return radius(d.node.index); })
        .attr("r", 4)
        //.on("mouseover", nodeMouseover)
        .on("mouseout", mouseout);
        

    // Highlight the link and connected nodes on mouseover.
    function linkMouseover(d) {
      svg.selectAll(".link").classed("active", function(p) { currentLink = d; return p === d; });
      svg.selectAll(".node circle").classed("active", function(p) { return p === d.source || p === d.target; });
      info.text(d.source.node.name + " → " + d.target.node.name);
      sourceInfo.text(d.source.node.id + ": " + d.source.node.description);
      targetInfo.text(d.target.node.id + ": " + d.target.node.description);
    }

    // Highlight the node and connected links on mouseover.
    function nodeMouseover(d) {
      svg.selectAll(".link").classed("active", function(p) { console.log(p); return p.source === d || p.target === d; });
      d3.select(this).classed("active", true);
      info.text(d.node.name);
    }

    // Clear any highlighted nodes or links.
    function mouseout() {
      svg.selectAll(".active").classed("active", false);
       info.text(defaultInfo);
    }
});

//writes the tooltip for the hover
function createTooltip(d) {
    sourceInfo = d.source.id + ": " + d.source.description;
    targetInfo = d.target.id + ": " + d.target.description;
    connectionText = "\naligns to\n";
    return sourceInfo + connectionText + targetInfo;
}


function link() {
  var source = function(d) { return d.source; },
      target = function(d) { return d.target; },
      angle = function(d) { return d.angle; },
      startRadius = function(d) { return d.radius; },
      endRadius = startRadius,
      arcOffset = -Math.PI / 2;

  function link(d, i) {
    var s = node(source, this, d, i),
        t = node(target, this, d, i),
        x;
    if (t.a < s.a) x = t, t = s, s = x;
    if (t.a - s.a > Math.PI) s.a += 2 * Math.PI;
    var a1 = s.a + (t.a - s.a) / 3,
        a2 = t.a - (t.a - s.a) / 3;
    return s.r0 - s.r1 || t.r0 - t.r1
        ? "M" + Math.cos(s.a) * s.r0 + "," + Math.sin(s.a) * s.r0
        + "L" + Math.cos(s.a) * s.r1 + "," + Math.sin(s.a) * s.r1
        + "C" + Math.cos(a1) * s.r1 + "," + Math.sin(a1) * s.r1
        + " " + Math.cos(a2) * t.r1 + "," + Math.sin(a2) * t.r1
        + " " + Math.cos(t.a) * t.r1 + "," + Math.sin(t.a) * t.r1
        + "L" + Math.cos(t.a) * t.r0 + "," + Math.sin(t.a) * t.r0
        + "C" + Math.cos(a2) * t.r0 + "," + Math.sin(a2) * t.r0
        + " " + Math.cos(a1) * s.r0 + "," + Math.sin(a1) * s.r0
        + " " + Math.cos(s.a) * s.r0 + "," + Math.sin(s.a) * s.r0
        : "M" + Math.cos(s.a) * s.r0 + "," + Math.sin(s.a) * s.r0
        + "C" + Math.cos(a1) * s.r1 + "," + Math.sin(a1) * s.r1
        + " " + Math.cos(a2) * t.r1 + "," + Math.sin(a2) * t.r1
        + " " + Math.cos(t.a) * t.r1 + "," + Math.sin(t.a) * t.r1;
  }

  function node(method, thiz, d, i) {
    var node = method.call(thiz, d, i),
        a = +(typeof angle === "function" ? angle.call(thiz, node, i) : angle) + arcOffset,
        r0 = +(typeof startRadius === "function" ? startRadius.call(thiz, node, i) : startRadius),
        r1 = (startRadius === endRadius ? r0 : +(typeof endRadius === "function" ? endRadius.call(thiz, node, i) : endRadius));
    return {r0: r0, r1: r1, a: a};
  }

  link.source = function(_) {
    if (!arguments.length) return source;
    source = _;
    return link;
  };

  link.target = function(_) {
    if (!arguments.length) return target;
    target = _;
    return link;
  };

  link.angle = function(_) {
    if (!arguments.length) return angle;
    angle = _;
    return link;
  };

  link.radius = function(_) {
    if (!arguments.length) return startRadius;
    startRadius = endRadius = _;
    return link;
  };

  link.startRadius = function(_) {
    if (!arguments.length) return startRadius;
    startRadius = _;
    return link;
  };

  link.endRadius = function(_) {
    if (!arguments.length) return endRadius;
    endRadius = _;
    return link;
  };

  return link;
}

function degrees(radians) {
    return radians / Math.PI * 180 - 90;
}