# k-Means Visualization

k-means visualization (specifically 3-means) <br>
Last Updated: October 5, 2017 <br>
Author: Aaron Blumenfeld

## ABOUT:

Points are generated (semi-)randomly: 135 points are generated. A 30-point cluster in the top left is generated,
followed by a 20-point cluster in the middle right, followed by a 35-point cluster in the bottom. 50 points
are then randomly generated uniformly across the entire canvas. Initial centroids are generated randomly.
No special algorithms (like k-means++) are used here. You can also keep the same points and generate new
random initial centroids.

Some stats are also shown, demonstrating the speed of convergence and the fact that k-means
only converges to a local minimum, not necessarily an absolute minimum (try choosing with different
initial clusters and looking at the error term, and the cluster sizes). An iteration is defined to
be a cluster assignment and a re-computation of the centroids.

How does the bad initial centroids button work? It looks in the top for a 50x100 empty box
(no points inside) and sticks a centroid at the top middle of that box, then two other centroids
to the left and right, slightly below it. Since all of the points are guaranteed to be generated
with height at least 10, the highest centroid should be farther away from all points than every
other centroid.

Can be seen live at http://aaronblumenfeld.com/kmeans/