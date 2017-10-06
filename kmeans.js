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
var OFFSET = 120;
var bad_centroids = false;

var TOP_LEFT_CLUSTER_SIZE = 30;
var MIDDLE_RIGHT_CLUSTER_SIZE = 20;
var BOTTOM_CLUSTER_SIZE = 35;
var NUM_ADDITIONAL_POINTS = 50;
var NUM_CLUSTERS = 3;
var COLORS = ["#910b28", "#178250", "#1266ed", "#ff7b00", "#80aa03"]; // red, blue, green, orange, yellowish-green

function changeNumClusters(n) {
	NUM_CLUSTERS = n;
	resetCentroids();
}

function showNumberWithCommas(x) {
	var xAsString = "" + x;
	var decimalIndex = xAsString.indexOf(".");
	var integerPart = "", decimalPart = "";
	if(decimalIndex >= 0) {
		var integerPart = xAsString.substring(0, xAsString.indexOf("."));
		var decimalPart = xAsString.substring(xAsString.indexOf(".") + 1, xAsString.length);
	} else integerPart = xAsString;
	var rval = "";
	while(integerPart.length > 3) {
		rval = "," + integerPart.substring(integerPart.length - 3, integerPart.length) + rval;
		integerPart = integerPart.substring(0, integerPart.length - 3);
	}
	rval = integerPart + rval;
	if(decimalIndex >= 0){
		rval += "." + decimalPart;
	}
	return rval;
}

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
	bad_centroids = false;
	initPoints();
	numIters = 0;
	error = 0;
	converged = false;
	convergedText = "";
	for(var i = 0; i < centroids.length; i++) {
		centroids[i].size = 0;
	}
	initStats();
}

function resetCentroids() {
	d3.select("#svg").remove();
	undoBadPoints(points);
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

/* return true if there's an empty cluster */
function kmeansYieldsEmptyCluster(points, centroids) {
	var tempPoints = [];
	var tempCentroids = [];
	for(var i = 0; i < points.length; i++) {
		tempPoints.push({x: points[i].x, y: points[i].y, color: points[i].color});
	}
	for(var i = 0; i < centroids.length; i++) {
		tempCentroids.push({x: centroids[i].x, y: centroids[i].y, color: centroids[i].color});
	}

	var converged = false;
	var temp_error = -1;
	var temp_old_error = -2;
	var clusterSizeProduct = 0;
	while(!converged) {
		recluster(tempPoints, tempCentroids);
		clusterSizeProduct = computeCentroids(tempPoints, tempCentroids);
		temp_old_error = temp_error;
		temp_error = 0;
		for(var i = 0; i < tempPoints.length; i++) {
			error += dist(tempPoints[i], tempCentroids[COLORS.indexOf(tempPoints[i].color)]);
		}
		if(temp_error === temp_old_error) converged = true;
	}
	numIters = 0;
	return clusterSizeProduct === 0;
}

/* translate/compress points */
function badPoints(points) {
	if(!bad_centroids) {
		for(var i = 0; i < points.length; i++) {
			points[i].x = points[i].x * (WIDTH - OFFSET)/WIDTH + OFFSET;
			points[i].y = points[i].y * (HEIGHT - OFFSET)/HEIGHT + OFFSET;
		}
		bad_centroids = true;
	}
	for(var i = 0; i < points.length; i++) {
			points[i].color = "black";
	}
}

/* translate/scale points */
function undoBadPoints(points) {
	if(bad_centroids) {
		for(var i = 0; i < points.length; i++) {
			points[i].x = (points[i].x - OFFSET) * WIDTH/(WIDTH - OFFSET);
			points[i].y = (points[i].y - OFFSET) * HEIGHT/(HEIGHT - OFFSET);
		}
		bad_centroids = false;
	}
	for(var i = 0; i < points.length; i++) {
		points[i].color = "black";
	}
}

function badCentroids() { // assumes at least 3 clusters
	d3.select("#svg").remove();
	badPoints(points);
	numIters = 0;
	error = 0;
	converged = false;
	convergedText = "";

	var topLeftCorner = {
		x: Math.max(Math.floor(Math.random() * WIDTH) - 100, 0),
		y: 0
	};
	centroids = initCentroids();
	centroids[centroids.length-3].x = topLeftCorner.x + 25;
	centroids[centroids.length-3].y = RECT_HEIGHT/2 + 1;
	centroids[centroids.length-2].x = topLeftCorner.x + 25 - RECT_WIDTH;
	centroids[centroids.length-2].y = RECT_HEIGHT + 3;
	centroids[centroids.length-1].x = topLeftCorner.x + RECT_WIDTH + 25 + Math.random() * 100;
	centroids[centroids.length-1].y = RECT_HEIGHT + Math.random() * 50 + 50;

	for(var i = 0; i < centroids.length - 3; i++) {
		while(centroids[i].y <= centroids[centroids.length-1].y + 10) {
			centroids[i].y += 10;
		}
	}

	paintPointsAndCentroids();
	var stringToPrint = "These centroids will " + (kmeansYieldsEmptyCluster(points, centroids) ? "" : "not ") + "yield an empty cluster!";

	nextUpdateIsRecluster = true;
	initStats();

	d3.select("#svg")
	.append("text")
	.attr("id", "tempText")
	.attr("x", 100)
	.attr("y", 80)
	.style("font-size", "16px")
	.style("font-family", "Arial, Helvetica, sans-serif")
	.style("font-weight", "bold")
	.attr("fill", "#525252")
	.text(stringToPrint);

	d3.select("#tempText")
	.transition()
	.delay(TIME * 2.5)
	.remove();
}

function dist(p, q) {
	return (q.x - p.x)*(q.x - p.x) + (q.y - p.y)*(q.y - p.y);
}

function recluster(points, centroids) {
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

/*
Empty clusters considered to have average 0. Could also do NaN. This definition seems reasonable.
Let S = {x_1, ..., x_n}. Define A_0 = 0, A_i = ((i-1)A_{i-1} + x_i)/i. Then this agrees with both
an empty average being 0 and with A_n = average over S.
*/
function computeCentroids(points, centroids) {
	var centroidX = [], centroidY = [], clusterSize = [];
	for(var i = 0; i < NUM_CLUSTERS; i++) {
		centroidX.push(0);
		centroidY.push(0);
		clusterSize.push(0);
	}
	for(var i = 0; i < points.length; i++) {
		centroidX[COLORS.indexOf(points[i].color)] += points[i].x;
		centroidY[COLORS.indexOf(points[i].color)] += points[i].y;
		clusterSize[COLORS.indexOf(points[i].color)]++;
	}
	for(var i = 0; i < centroids.length; i++) {
		if(clusterSize[i] > 0) {
			centroids[i].x = centroidX[i] / clusterSize[i];
			centroids[i].y = centroidY[i] / clusterSize[i];
		} else {
			centroids[i].x = centroids[i].y = 0; // considering empty average to be 0, not some sort of NaN
		}
	}
	old_error = error;
	error = 0;
	for(var i = 0; i < points.length; i++) {
		error += dist(points[i], centroids[COLORS.indexOf(points[i].color)]);
	}

	numIters++;

	var rval = 1;
	for(var i = 0; i < clusterSize.length; i++) {
		rval *= clusterSize[i];
	}
	return rval; // returns product of cluster sizes to see if there's an empty cluster
}

function update() {
	if(nextUpdateIsRecluster) recluster(points, centroids);
	else computeCentroids(points, centroids);
	nextUpdateIsRecluster = !nextUpdateIsRecluster;
	initStats();
	if(!converged && error === old_error) {
		converged = true;
		convergedText = " (convergence complete -- needed " + numIters + " iterations)";
	}
	document.getElementById("error").innerHTML = "Error: " + showNumberWithCommas(error) + convergedText;
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
	.attr("x", d => pointLocForDisplaying(d.x, d.y).x - RECT_WIDTH/2)
	.attr("y", d => pointLocForDisplaying(d.x, d.y).y - RECT_HEIGHT/2)
	.attr("stroke-width", 1.5)
	.attr("stroke", "#000");
}

function pointLocForDisplaying(x, y) {
	var point = {x: -RECT_WIDTH, y: -RECT_HEIGHT};
	if(x === 0 && y === 0) {
		return point;
	}
	return {x: x, y: y};
}

initPoints();