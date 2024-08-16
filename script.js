let svg = document.querySelector("svg");
let cursor = svg.createSVGPoint();
let arrows = document.querySelector(".arrows");
let randomAngle = 0;

// Center of target
let target = {
    x: 900,
    y: 249.5
};

// Target intersection line segment
let lineSegment = {
    x1: 875,
    y1: 280,
    x2: 925,
    y2: 220
};

// Bow rotation point
let pivot = {
    x: 100,
    y: 250
};

let score = 0;

// Set up start drag event
window.addEventListener("mousedown", draw);

function draw(e) {
    // Pull back arrow
    randomAngle = (Math.random() * Math.PI * 0.03) - 0.015;
    TweenMax.to(".arrow-angle use", 0.3, {
        opacity: 1
    });
    window.addEventListener("mousemove", aim);
    window.addEventListener("mouseup", loose);
    aim(e);
}

function aim(e) {
    // Get mouse position in relation to svg position and scale
    let point = getMouseSVG(e);
    point.x = Math.min(point.x, pivot.x - 7);
    point.y = Math.max(point.y, pivot.y + 7);
    let dx = point.x - pivot.x;
    let dy = point.y - pivot.y;
    // Make it more difficult by adding random angle each time
    let angle = Math.atan2(dy, dx) + randomAngle;
    let bowAngle = angle - Math.PI;
    let distance = Math.min(Math.sqrt((dx * dx) + (dy * dy)), 50);
    let scale = Math.min(Math.max(distance / 30, 1), 2);
    TweenMax.to("#bow", 0.3, {
        scaleX: scale,
        rotation: bowAngle + "rad",
        transformOrigin: "right center"
    });
    let arrowX = Math.min(pivot.x - ((1 / scale) * distance), 88);
    TweenMax.to(".arrow-angle", 0.3, {
        rotation: bowAngle + "rad",
        svgOrigin: "100 250"
    });
    TweenMax.to(".arrow-angle use", 0.3, {
        x: -distance
    });
    TweenMax.to("#bow polyline", 0.3, {
        attr: {
            points: "88,200 " + Math.min(pivot.x - ((1 / scale) * distance), 88) + ",250 88,300"
        }
    });

    let radius = distance * 9;
    let offset = {
        x: (Math.cos(bowAngle) * radius),
        y: (Math.sin(bowAngle) * radius)
    };
    let arcWidth = offset.x * 3;

    TweenMax.to("#arc", 0.3, {
        attr: {
            d: "M100,250c" + offset.x + "," + offset.y + "," + (arcWidth - offset.x) + "," + (offset.y + 50) + "," + arcWidth + ",50"
        },
        autoAlpha: distance / 60
    });
}

function loose() {
    // Release arrow
    window.removeEventListener("mousemove", aim);
    window.removeEventListener("mouseup", loose);

    TweenMax.to("#bow", 0.4, {
        scaleX: 1,
        transformOrigin: "right center",
        ease: Elastic.easeOut
    });
    TweenMax.to("#bow polyline", 0.4, {
        attr: {
            points: "88,200 88,250 88,300"
        },
        ease: Elastic.easeOut
    });
    // Duplicate arrow
    let newArrow = document.createElementNS("http://www.w3.org/2000/svg", "use");
    newArrow.setAttributeNS('http://www.w3.org/1999/xlink', 'href', "#arrow");
    arrows.appendChild(newArrow);

    // Animate arrow along path
    let path = MorphSVGPlugin.pathDataToBezier("#arc");
    TweenMax.to([newArrow], 0.5, {
        force3D: true,
        bezier: {
            type: "cubic",
            values: path,
            autoRotate: ["x", "y", "rotation"]
        },
        onUpdate: hitTest,
        onUpdateParams: ["{self}"],
        onComplete: onMiss,
        ease: Linear.easeNone
    });
    TweenMax.to("#arc", 0.3, {
        opacity: 0
    });
    // Hide previous arrow
    TweenMax.set(".arrow-angle use", {
        opacity: 0
    });
}

function hitTest(tween) {
    // Check for collisions with arrow and target
    let arrow = tween.target[0];
    let transform = arrow._gsTransform;
    let radians = transform.rotation * Math.PI / 180;
    let arrowSegment = {
        x1: transform.x,
        y1: transform.y,
        x2: (Math.cos(radians) * 60) + transform.x,
        y2: (Math.sin(radians) * 60) + transform.y
    };

    let intersection = getIntersection(arrowSegment, lineSegment);
    if (intersection && intersection.segment1 && intersection.segment2) {
        tween.pause();
        let dx = intersection.x - target.x;
        let dy = intersection.y - target.y;
        let distance = Math.sqrt((dx * dx) + (dy * dy));

        let points = 0;
        if (distance < 7) { // Bullseye
            points = 100;
            showMessage(".bullseye");
        } else if (distance < 15) { // Near Bullseye
            points = 50;
            showMessage(".hit");
        } else { // Hit but not close to the center
            points = 25;
            showMessage(".hit");
        }
        
        updateScore(points);
    }
}

function onMiss() {
    // Missed the target
    updateScore(-50); // Deduct 50 points for a miss
    showMessage(".miss");
}

function showMessage(selector) {
    // Handle all text animations by providing selector
    TweenMax.killTweensOf(selector);
    TweenMax.killChildTweensOf(selector);
    TweenMax.set(selector, {
        autoAlpha: 1
    });
    TweenMax.staggerFromTo(selector + " path", .5, {
        rotation: -5,
        scale: 0,
        transformOrigin: "center"
    }, {
        scale: 1,
        ease: Back.easeOut
    }, .05);
    TweenMax.staggerTo(selector + " path", .3, {
        delay: 2,
        rotation: 20,
        scale: 0,
        ease: Back.easeIn
    }, .03);
}

function updateScore(points) {
    score += points;
    document.getElementById("score").innerText = `Score: ${score}`;
}

function getMouseSVG(e) {
    // Normalize mouse position within svg coordinates
    cursor.x = e.clientX;
    cursor.y = e.clientY;
    return cursor.matrixTransform(svg.getScreenCTM().inverse());
}

function getIntersection(segment1, segment2) {
    // Find intersection point of two line segments and whether or not the point is on either line segment
    let dx1 = segment1.x2 - segment1.x1;
    let dy1 = segment1.y2 - segment1.y1;
    let dx2 = segment2.x2 - segment2.x1;
    let dy2 = segment2.y2 - segment2.y1;
    let cx = segment1.x1 - segment2.x1;
    let cy = segment1.y1 - segment2.y1;
    let denominator = dy2 * dx1 - dx2 * dy1;
    if (denominator === 0) {
        return null;
    }
    let ua = (dx2 * cy - dy2 * cx) / denominator;
    let ub = (dx1 * cy - dy1 * cx) / denominator;
    return {
        x: segment1.x1 + ua * dx1,
        y: segment1.y1 + ua * dy1,
        segment1: ua >= 0 && ua <= 1,
        segment2: ub >= 0 && ub <= 1
    };
}
function onMiss() {
    // Missed the target
    updateScore(-50); // Deduct 50 points for a miss
    showMessage(".miss");
}

function showMessage(selector) {
    // Handle all text animations by providing selector
    let message = document.getElementById("message");
    let text = "";
    let colorClass = "";

    switch (selector) {
        case ".bullseye":
            text = "Bullseye! +100 Points";
            colorClass = "green";
            break;
        case ".hit":
            text = "Hit! +50 Points";
            colorClass = "green";
            break;
        case ".miss":
            text = "Missed! -50 Points";
            colorClass = "red";
            break;
    }

    message.innerText = text;
    message.className = "message " + colorClass;
    message.style.display = "block";
    setTimeout(() => {
        message.style.display = "none";
    }, 2000); // Hide message after 2 seconds
}