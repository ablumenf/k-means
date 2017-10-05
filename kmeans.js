var points = [];
var centroids = [];
var nextUpdateIsRecluster = true;
var TIME = 1000;
var numIters = 0;
var converged = false;
var convergedText = "";
var error = 0;
var old_error = 0;

var WIDTH = 640;
var HEIGHT = 480;
var RADIUS = 5;
var RECT_WIDTH = 15;
var RECT_HEIGHT = 15;

var TOP_LEFT_CLUSTER_SIZE = 30;
var MIDDLE_RIGHT_CLUSTER_SIZE = 20;
var BOTTOM_CLUSTER_SIZE = 35;
var NUM_ADDITIONAL_POINTS = 50;
var NUM_CLUSTERS = 3;
var COLORS = ["red", "green", "blue"];

function initStats() {
	document.getElementById("iters").innerHTML = "Number of iterations: " + numIters;
	document.getElementById("error").innerHTML = "Error: TBD";
	var cSizes = "";
	for(var i = 0; i < centroids.length - 1; i++) {
		cSizes += centroids[i].size + ", ";
	}
	cSizes += centroids[centroids.length-1].size;
	document.getElementById("sizes").innerHTML = "Cluster sizes: " + cSizes;
}

function paintPointsAndCentroids() {
	d3.select("#kmeans").append("svg")
		.attr("width", WIDTH)
		.attr("height", HEIGHT)
		.attr("id", "svg");

	d3.select("#svg").selectAll("circle")
		.data(points)
		.enter()
		.append("circle")
		.attr("cx", d => d.x)
		.attr("cy", d => d.y)
		.attr("r", RADIUS)
		.attr("fill", d => d.color);

	d3.select("#svg").selectAll("rect")
		.data(centroids)
		.enter()
		.append("rect")
		.attr("x", d => d.x-RECT_WIDTH/2)
		.attr("y", d => d.y-RECT_HEIGHT/2)
		.attr("height", RECT_HEIGHT)
		.attr("width", RECT_WIDTH)
		.attr("fill", d => d.color)
		.attr("stroke-width", 1.5)
		.attr("stroke", "#000");
}

function initPoints() {
	points = [];
	for(var i = 0; i < TOP_LEFT_CLUSTER_SIZE; i++) {
		points.push({x: Math.random() * 80 + 20, y: Math.random() * HEIGHT / 2.4 + 20, color: "black"});
	}
	for(var i = 0; i < MIDDLE_RIGHT_CLUSTER_SIZE; i++) {
		points.push({x: Math.random() * WIDTH / 2 + WIDTH / 2, y: Math.random() * HEIGHT / 2.5 + HEIGHT / 3, color: "black"});
	}
	for(var i = 0; i < BOTTOM_CLUSTER_SIZE; i++) {
		points.push({x: Math.random() * WIDTH / 1.5 + 10, y: Math.random() * HEIGHT / 5 + HEIGHT / 1.4, color: "black"});
	}
	for(var i = 0; i < NUM_ADDITIONAL_POINTS; i++) {
		points.push({x: Math.random() * (WIDTH - 20) + 10, y: Math.random() * (HEIGHT - 20) + 10, color: "black"});
	}

	centroids = initCentroids();
	nextUpdateIsRecluster = true;
	initStats();
	paintPointsAndCentroids();
}

function initCentroids() {
	new_centroids = [];
	for(var i = 0; i < NUM_CLUSTERS; i++) {
		new_centroids.push({x: Math.random()*(WIDTH - 20) + 10, y: Math.random()*(HEIGHT - 20) + 10, size: 0, color: COLORS[i]});
	}
	return new_centroids;
}

function resetPoints() {
	d3.select("#svg").remove();
	initPoints();
	numIters = 0;
	error = 0;
	converged = false;
	convergedText = "";
	centroids[0].size = centroids[1].size = centroids[2].size = 0;
	initStats();
}

function resetCentroids() {
	d3.select("#svg").remove();
	for(var i = 0; i < points.length; i++) {
		points[i].color = "black";
	}
	numIters = 0;
	error = 0;
	converged = false;
	convergedText = "";

	centroids = initCentroids();
	nextUpdateIsRecluster = true;
	initStats();
	paintPointsAndCentroids();
}

function findSmallEmptySquare() {
	var point = {x: -1, y: -1};
	for(var i = 0; i < WIDTH; i += 50) {
		var okToReturn = true;
		for(var j = 0; j < points.length; j++) {
			if(points[j].x > i && points[j].x < i + 100 && points[j].y > 0 && points[j].y < 60) {
				okToReturn = false;
			}
		}
		if(okToReturn) {
			return {x: i, y: 0};
		}
	}
	return point;
}

function badCentroids() { // assumes at least 3 clusters
	d3.select("#svg").remove();
	for(var i = 0; i < points.length; i++) {
		points[i].color = "black";
	}
	numIters = 0;
	error = 0;
	converged = false;
	convergedText = "";

	var topLeftCorner = findSmallEmptySquare();
	centroids = initCentroids();
	centroids[centroids.length-3].x = topLeftCorner.x + 25;
	centroids[centroids.length-3].y = RECT_HEIGHT/2 + 1;
	centroids[centroids.length-2].x = topLeftCorner.x + 25 - RECT_WIDTH;
	centroids[centroids.length-2].y = RECT_HEIGHT + 3;
	centroids[centroids.length-1].x = topLeftCorner.x + 25 + RECT_WIDTH;
	centroids[centroids.length-1].y = RECT_HEIGHT + 3;

	nextUpdateIsRecluster = true;
	initStats();
	paintPointsAndCentroids();
}

function dist(p, q) {
	return (q.x - p.x)*(q.x - p.x) + (q.y - p.y)*(q.y - p.y);
}

function recluster() {
	var cluster_sizes = [];
	var distance_from_cluster = [];
	for(var i = 0; i < NUM_CLUSTERS; i++) {
		cluster_sizes.push(0);
		distance_from_cluster.push(0);
	}
	old_error = error;
	error = 0;
	for(var i = 0; i < points.length; i++) {
		for(var j = 0; j < distance_from_cluster.length; j++) {
			distance_from_cluster[j] = dist(points[i], centroids[j]);
		}
		var d = Math.min.apply(null, distance_from_cluster);
		var indexOfMin = distance_from_cluster.indexOf(d);
		error += d;
		points[i].color = COLORS[indexOfMin];
		cluster_sizes[indexOfMin]++;
	}
	for(var i = 0; i < cluster_sizes.length; i++) {
		centroids[i].size = cluster_sizes[i];
	}
}

function computeCentroids() {
	var centroidX = [], centroidY = [], centroidSize = [];
	for(var i = 0; i < NUM_CLUSTERS; i++) {
		centroidX.push(0);
		centroidY.push(0);
		centroidSize.push(0);
	}
	for(var i = 0; i < points.length; i++) {
		centroidX[COLORS.indexOf(points[i].color)] += points[i].x;
		centroidY[COLORS.indexOf(points[i].color)] += points[i].y;
		centroidSize[COLORS.indexOf(points[i].color)]++;
	}
	for(var i = 0; i < centroids.length; i++) {
		if(centroidSize[i] > 0) {
			centroids[i].x = centroidX[i] / centroidSize[i];
			centroids[i].y = centroidY[i] / centroidSize[i];
		} else { // hack to get centroid of empty cluster to not appear (should these centroids be moved to (0, 0)?)
			centroids[i].x = WIDTH * 5;
			centroids[i].y = HEIGHT * 5;
		}
	}
	numIters++;
}

function update() {
	if(nextUpdateIsRecluster) recluster();
	else computeCentroids();
	nextUpdateIsRecluster = !nextUpdateIsRecluster;
	initStats();
	if(!converged && error === old_error) {
		converged = true;
		convergedText = " (convergence complete -- needed " + numIters + " iterations)";
	}
	document.getElementById("error").innerHTML = "Error: " + error + convergedText;
}

function clickStep() {
	update();

	d3.select("#svg")
	.data(points)
	.enter()
	.selectAll("circle")
	.transition()
	.duration(TIME)
	.attr("fill", d => d.color);

	d3.select("#svg")
	.data(centroids)
	.enter()
	.selectAll("rect")
	.transition()
	.duration(TIME)
	.attr("x", d => d.x-7.5)
	.attr("y", d => d.y-7.5)
	.attr("stroke-width", 1.5)
	.attr("stroke", "#000");
}

initPoints();