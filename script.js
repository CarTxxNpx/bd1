window.requestAnimFrame = (function () {
	return window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		function (callback) {
			window.setTimeout(callback, 1000 / 60);
		};
})();

// now we will setup our basic variables for the demo
var canvas = document.getElementById('canvas'),
	ctx = canvas.getContext('2d'),
	// full screen dimensions
	cw = window.innerWidth,
	ch = window.innerHeight,
	// firework collection
	fireworks = [],
	// particle collection
	particles = [],
	// starting hue
	hue = 120,
	// when launching fireworks with a click, too many get launched at once without a limiter, one launch per 5 loop ticks
	limiterTotal = 5,
	limiterTick = 0,
	// this will time the auto launches of fireworks, one launch per 80 loop ticks
	timerTotal = 80,
	timerTick = 0,
	mousedown = false,
	// mouse x coordinate,
	mx,
	// mouse y coordinate
	my;

// set canvas dimensions
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// now we are going to setup our function placeholders for the entire demo

// get a random number within a range
function random(min, max) {
	return Math.random() * (max - min) + min;
}

// calculate the distance between two points
function calculateDistance(p1x, p1y, p2x, p2y) {
	var xDistance = p1x - p2x,
		yDistance = p1y - p2y;
	return Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2));
}

// create firework
function Firework(sx, sy, tx, ty) {
	// actual coordinates
	this.x = sx;
	this.y = sy;
	// starting coordinates
	this.sx = sx;
	this.sy = sy;
	// target coordinates
	this.tx = tx;
	this.ty = ty;
	// distance from starting point to target
	this.distanceToTarget = calculateDistance(sx, sy, tx, ty);
	this.distanceTraveled = 0;
	// track the past coordinates of each firework to create a trail effect, increase the coordinate count to create more prominent trails
	this.coordinates = [];
	this.coordinateCount = 3;
	// populate initial coordinate collection with the current coordinates
	while (this.coordinateCount--) {
		this.coordinates.push([this.x, this.y]);
	}
	this.angle = Math.atan2(ty - sy, tx - sx);
	this.speed = 2;
	this.acceleration = 1.05;
	this.brightness = random(50, 70);
	// circle target indicator radius
	this.targetRadius = 1;
}

// update firework
Firework.prototype.update = function (index) {
	// remove last item in coordinates array
	this.coordinates.pop();
	// add current coordinates to the start of the array
	this.coordinates.unshift([this.x, this.y]);

	// cycle the circle target indicator radius
	if (this.targetRadius < 8) {
		this.targetRadius += 0.3;
	} else {
		this.targetRadius = 1;
	}

	// speed up the firework
	this.speed *= this.acceleration;

	// get the current velocities based on angle and speed
	var vx = Math.cos(this.angle) * this.speed,
		vy = Math.sin(this.angle) * this.speed;
	// how far will the firework have traveled with velocities applied?
	this.distanceTraveled = calculateDistance(this.sx, this.sy, this.x + vx, this.y + vy);

	// if the distance traveled, including velocities, is greater than the initial distance to the target, then the target has been reached
	if (this.distanceTraveled >= this.distanceToTarget) {
		createParticles(this.tx, this.ty);
		// remove the firework, use the index passed into the update function to determine which to remove
		fireworks.splice(index, 1);
	} else {
		// target not reached, keep traveling
		this.x += vx;
		this.y += vy;
	}
}

// draw firework
Firework.prototype.draw = function () {
	ctx.beginPath();
	// move to the last tracked coordinate in the set, then draw a line to the current x and y
	ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
	ctx.lineTo(this.x, this.y);
	ctx.strokeStyle = 'hsl(' + hue + ', 100%, ' + this.brightness + '%)';
	ctx.stroke();

	ctx.beginPath();
	// draw the target for this firework with a pulsing circle
	ctx.arc(this.tx, this.ty, this.targetRadius, 0, Math.PI * 2);
	ctx.stroke();
}

// create particle
function Particle(x, y) {
	this.x = x;
	this.y = y;
	// track the past coordinates of each particle to create a trail effect, increase the coordinate count to create more prominent trails
	this.coordinates = [];
	this.coordinateCount = 5;
	while (this.coordinateCount--) {
		this.coordinates.push([this.x, this.y]);
	}
	// set a random angle in all possible directions, in radians
	this.angle = random(0, Math.PI * 2);
	this.speed = random(1, 10);
	// friction will slow the particle down
	this.friction = 0.95;
	// gravity will be applied and pull the particle down
	this.gravity = 1;
	// set the hue to a random number +-50 of the overall hue variable
	this.hue = random(hue - 50, hue + 50);
	this.brightness = random(50, 80);
	this.alpha = 1;
	// set how fast the particle fades out
	this.decay = random(0.015, 0.03);
}

// update particle
Particle.prototype.update = function (index) {
	// remove last item in coordinates array
	this.coordinates.pop();
	// add current coordinates to the start of the array
	this.coordinates.unshift([this.x, this.y]);
	// slow down the particle
	this.speed *= this.friction;
	// apply velocity
	this.x += Math.cos(this.angle) * this.speed;
	this.y += Math.sin(this.angle) * this.speed + this.gravity;
	// fade out the particle
	this.alpha -= this.decay;

	// remove the particle once the alpha is low enough, based on the passed in index
	if (this.alpha <= this.decay) {
		particles.splice(index, 1);
	}
}

// draw particle
Particle.prototype.draw = function () {
	ctx.beginPath();
	// move to the last tracked coordinates in the set, then draw a line to the current x and y
	ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
	ctx.lineTo(this.x, this.y);
	ctx.strokeStyle = 'hsla(' + this.hue + ', 100%, ' + this.brightness + '%, ' + this.alpha + ')';
	ctx.stroke();
}

// create particle group/explosion
function createParticles(x, y) {
	// increase the particle count for a bigger explosion, beware of the canvas performance hit with the increased particles though
	var particleCount = 30;
	while (particleCount--) {
		particles.push(new Particle(x, y));
	}
}

// main demo loop
function loop() {
	// this function will run endlessly with requestAnimationFrame
	requestAnimFrame(loop);

	// increase the hue to get different colored fireworks over time
	//hue += 0.5;

	// create random color
	hue = random(0, 360);

	// normally, clearRect() would be used to clear the canvas
	// we want to create a trailing effect though
	// setting the composite operation to destination-out will allow us to clear the canvas at a specific opacity, rather than wiping it entirely
	ctx.globalCompositeOperation = 'destination-out';
	// decrease the alpha property to create more prominent trails
	ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
	ctx.fillRect(0, 0, cw, ch);
	// change the composite operation back to our main mode
	// lighter creates bright highlight points as the fireworks and particles overlap each other
	ctx.globalCompositeOperation = 'lighter';

	// loop over each firework, draw it, update it
	var i = fireworks.length;
	while (i--) {
		fireworks[i].draw();
		fireworks[i].update(i);
	}

	// loop over each particle, draw it, update it
	var i = particles.length;
	while (i--) {
		particles[i].draw();
		particles[i].update(i);
	}

	// launch fireworks automatically to random coordinates, when the mouse isn't down
	if (timerTick >= timerTotal) {
		if (!mousedown) {
			// start the firework at the bottom middle of the screen, then set the random target coordinates, the random y coordinates will be set within the range of the top half of the screen
			fireworks.push(new Firework(cw / 2, ch, random(0, cw), random(0, ch / 2)));
			timerTick = 0;
		}
	} else {
		timerTick++;
	}

	// limit the rate at which fireworks get launched when mouse is down
	if (limiterTick >= limiterTotal) {
		if (mousedown) {
			// start the firework at the bottom middle of the screen, then set the current mouse coordinates as the target
			fireworks.push(new Firework(cw / 2, ch, mx, my));
			limiterTick = 0;
		}
	} else {
		limiterTick++;
	}
}

// mouse event bindings
// update the mouse coordinates on mousemove
canvas.addEventListener('mousemove', function (e) {
	mx = e.pageX - canvas.offsetLeft;
	my = e.pageY - canvas.offsetTop;
});

// toggle mousedown state and prevent canvas from being selected
canvas.addEventListener('mousedown', function (e) {
	e.preventDefault();
	mousedown = true;
});

canvas.addEventListener('mouseup', function (e) {
	e.preventDefault();
	mousedown = false;
});
function showSurprise() {
	const message = document.getElementById("surpriseMessage");
	message.classList.toggle("hidden");
}


/* Adapted from a pen by Yusuke Nakaya: codepen.io/YusukeNakaya/pen/zYvWGwb */

/* how does the browser add and remove events on an HTML element? 
		   Does the browser add events with the W3C 'addEventListener' or
		   is the browser Internet Explorer 9 or older and maybe use
		   'attachEvent'? */

var tceW3C = 0; //#BCON
var tceIE = 1; //#BCON
var tceOther = 2; //#BCON

var myChangeEvent = (function () {

	var mtypeOfChangeEventThatBrowserSupports;

	function initialise() {
		var sampleHTMLElement = document.body;

		if (sampleHTMLElement.addEventListener) { // W3C DOM

			mtypeOfChangeEventThatBrowserSupports = tceW3C;

		} else if (sampleHTMLElement.attachEvent) { // IE DOM

			mtypeOfChangeEventThatBrowserSupports = tceIE;
		}
		else {

			mtypeOfChangeEventThatBrowserSupports = tceOther;
		}

	}

	function add(event, HTMLElement, func) {
		switch (mtypeOfChangeEventThatBrowserSupports) {

			case tceW3C:
				HTMLElement.addEventListener(event, func, false);
				break;
			case tceIE:
				HTMLElement.attachEvent('on' + event, func);
				break;
			default:
				HTMLElement['on' + event] = func;
				break;
		}
	}

	function remove(event, HTMLElement, func) {
		switch (mtypeOfChangeEventThatBrowserSupports) {

			case tceW3C:
				HTMLElement.removeEventListener(event, func, false);
				break;
			case tceIE:
				HTMLElement.detachEvent('on' + event, func);
				break;
			default:
				HTMLElement['on' + event] = null;
				break;
		}
	}

	initialise();

	return {
		add: add,
		remove: remove
	};

})();

function SessIon() {
}
var session = new SessIon();

var _Session_prototype = SessIon.prototype;

/* is there a black on white color scheme ? */

var defaultIsMoreContrast = false; //#BCON

var ismorecontrast = defaultIsMoreContrast;
//var ismorecontrast = true;

/* is there a black background? */

var defaultDarkBackground = false; //#BCON

var isdarkbackground = defaultDarkBackground;
var isdarkbackground = true;

/* is 'dark mode' implemented by using an 'invert' filter or
   are all the colours changed one-by-one? */

var dmCustom = 0; //#BCON
//var dmInvert = 1; //#BCON

//TODO:bernardo
var gDefaultTypeOfDarkMode = dmCustom;
//var gDefaultTypeOfDarkMode = dmInvert;

/* is 'dark mode' implemented by using an 'invert' filter or
   are all the colours changed one-by-one? */

var dmCustom = 0; //#BCON
//var dmInvert = 1; //#BCON

//TODO:bernardo
var gDefaultTypeOfDarkMode = dmCustom;
//var gDefaultTypeOfDarkMode = dmInvert;

var gTypeOfDarkMode = gDefaultTypeOfDarkMode;

_Session_prototype.setupFireworkDoodle = function (headelement)

		   /* The code below, for the fireworks animation, has an 'MIT' license.
			  The MIT license is at the top of this source code. 
			  Copyright (c) 2024 by Yusuke Nakaya (https://codepen.io/YusukeNakaya/pen/zYvWGwb) */ {
	var fireworkDoodle;

	//            if (!gDoesBrowserSupportPaperbirdDoodle) {
	//                //TODO: rm
	//                //alert('firework:!supp');
	//                return;
	//            }

	this.FireworkDoodle =

		fireworkDoodle = (function (tSession) {

			var mMyChangeevent;
			var mHeadElement;

			var mFireworkStylesheet;
			var mContainer;
			var mDoc;


			function initialise(myChangeevent, headElement) {
				mMyChangeevent = myChangeevent;

				mHeadElement = headElement;

				mDoc = document;
			}

			function start() {
				var doc = mDoc;

				function getRandomColorBlue() {
					return 'rgb(' + (Math.round(Math.random() * 100) + 50) +
						',' +
						(Math.round(Math.random() * 100) + 50) +
						',' +
						(Math.round(Math.random() * 55) + 150) +
						')';
				}
				function getRandomColorGreenBlue() {
					return 'rgb(' + (Math.round(Math.random() * 100) + 50) +
						',' +
						(Math.round(Math.random() * 55) + 150) +
						',' +
						(Math.round(Math.random() * 55) + 150) +
						')';
				}
				function getRandomColorRed() {
					return 'rgb(' + (Math.round(Math.random() * 55) + 150) +
						',' +
						(Math.round(Math.random() * 100) + 50) +
						',' +
						(Math.round(Math.random() * 100) + 50) +
						')';
				}
				function getRandomColorRedBlue() {
					return 'rgb(' + (Math.round(Math.random() * 55) + 150) +
						',' +
						(Math.round(Math.random() * 100) + 50) +
						',' +
						(Math.round(Math.random() * 55) + 150) +
						')';
				}
				function getRandomColorRedGreen() {
					return 'rgb(' + (Math.round(Math.random() * 55) + 150) +
						',' +
						(Math.round(Math.random() * 55) + 150) +
						',' +
						(Math.round(Math.random() * 100) + 50) +
						')';
				}
				function getRandomColorGreen() {
					return 'rgb(' + (Math.round(Math.random() * 100) + 50) +
						',' +
						(Math.round(Math.random() * 55) + 150) +
						',' +
						(Math.round(Math.random() * 100) + 50) +
						')';
				}

				function getRandomColorBlueDM() {
					return 'rgb(' + (Math.round(Math.random() * 100) + 100) +
						',' +
						(Math.round(Math.random() * 100) + 100) +
						',' +
						(Math.round(Math.random() * 55) + 200) +
						')';
				}
				function getRandomColorGreenBlueDM() {
					return 'rgb(' + (Math.round(Math.random() * 100) + 100) +
						',' +
						(Math.round(Math.random() * 55) + 200) +
						',' +
						(Math.round(Math.random() * 55) + 200) +
						')';
				}
				function getRandomColorRedDM() {
					return 'rgb(' + (Math.round(Math.random() * 55) + 200) +
						',' +
						(Math.round(Math.random() * 100) + 100) +
						',' +
						(Math.round(Math.random() * 100) + 100) +
						')';
				}
				function getRandomColorRedBlueDM() {
					return 'rgb(' + (Math.round(Math.random() * 55) + 200) +
						',' +
						(Math.round(Math.random() * 100) + 100) +
						',' +
						(Math.round(Math.random() * 55) + 200) +
						')';
				}
				function getRandomColorRedGreenDM() {
					return 'rgb(' + (Math.round(Math.random() * 55) + 200) +
						',' +
						(Math.round(Math.random() * 55) + 200) +
						',' +
						(Math.round(Math.random() * 100) + 100) +
						')';
				}
				function getRandomColorGreenDM() {
					return 'rgb(' + (Math.round(Math.random() * 100) + 100) +
						',' +
						(Math.round(Math.random() * 55) + 200) +
						',' +
						(Math.round(Math.random() * 100) + 100) +
						')';
				}

				function getRandomColorDM() {

					var randColorValue = Math.random();
					var randColor;
					var randColor2;

					if (randColorValue < 0.166666) {
						randColor = getRandomColorRedDM();
						randColor2 = getRandomColorRedDM();
					} else if (randColorValue < 0.33333) {
						randColor = getRandomColorBlueDM();
						randColor2 = getRandomColorBlueDM();
					} else if (randColorValue < 0.5) {
						randColor = getRandomColorGreenDM();
						randColor2 = getRandomColorGreenDM();
					} else if (randColorValue < .66666) {
						randColor = getRandomColorGreenBlueDM();
						randColor2 = getRandomColorGreenBlueDM();
					} else if (randColorValue < .83333) {
						randColor = getRandomColorRedBlueDM();
						randColor2 = getRandomColorRedBlueDM();
					} else {
						randColor = getRandomColorRedGreenDM();
						randColor2 = getRandomColorRedGreenDM();
					}

					return [randColor, randColor2];
				}


				function getRandomColorNormal() {

					var randColorValue = Math.random();
					var randColor;
					var randColor2;

					if (randColorValue < 0.166666) {
						randColor = getRandomColorRed();
						randColor2 = getRandomColorRed();
					} else if (randColorValue < 0.33333) {
						randColor = getRandomColorBlue();
						randColor2 = getRandomColorBlue();
					} else if (randColorValue < 0.5) {
						randColor = getRandomColorGreen();
						randColor2 = getRandomColorGreen();
					} else if (randColorValue < .66666) {
						randColor = getRandomColorGreenBlue();
						randColor2 = getRandomColorGreenBlue();
					} else if (randColorValue < .83333) {
						randColor = getRandomColorRedBlue();
						randColor2 = getRandomColorRedBlue();
					} else {
						randColor = getRandomColorRedGreen();
						randColor2 = getRandomColorRedGreen();
					}

					return [randColor, randColor2];
				}

				function getRandomColor() {

					var colors;

					if (isWhiteOnBlack) {
						colors = ['white', 'white'];
					} else if (isBlackOnWhite) {
						colors = ['black', 'black'];
					} else if (isDarkMode) {
						colors = getRandomColorDM();
					} else {
						colors = getRandomColorNormal();
					}

					return colors;
				}

				var isDarkMode;
				var isWhiteOnBlack;
				var isBlackOnWhite;

				if (ismorecontrast) {
					if (isdarkbackground) {
						isWhiteOnBlack = true;
					} else {
						isBlackOnWhite = true;
					}
				} else {
					isDarkMode =
						(isdarkbackground &&
							gTypeOfDarkMode === dmCustom);
				}

				var countFireworks = 3 + Math.round(Math.random() * 4);
				var countLinesPerFirework;
				var linesPerFirework = [];

				var s = '';
				var fx;
				var fy;
				var fz;
				var fc;
				var lc;
				var lRotY;
				var sparkDeg;
				var sparkRotYDeg;
				var sparkKeyFrame0TranslateY;
				var sparkKeyFrame100TranslateX;
				var fireDuration;
				var fireDelay;
				var fireWidth;
				var fireHeight;
				var fireLeft;
				var sparkAnimDuration;
				var sparkAnimDelay = 0;
				var fireColors;
				var fireForeColor;
				var fireBackColor;
				var fireworkDuration;
				var fireRotateX;
				var fireRotateY;
				var fireRotateZ;
				var fireTransform;
				var maxFireworkDuration = 0;
				var fireworkIndexOfMaxDuration;
				var upFadeInOpacityPercent;
				var upFadeOutOpacityPercent;
				var outFadeInOpacityPercent;
				var outFadeOutOpacityPercent;
				var fcs;

				var perspective = 400 + Math.round(Math.random() * 400);
				var perspectiveWithPx = perspective + 'px';

				s +=
					' .frwdStage { ' +
					'   perspective: ' + perspectiveWithPx + '; ' +
					' } ';

				for (fc = 1; fc <= countFireworks; fc++) {

					fx = -15 + Math.random() * 30;
					fy = -Math.random() * 20;
					fz = -15 + Math.random() * 30;

					s +=
						' .frwdFireworks:nth-child(' + fc + ') { ' +
						'     transform: translate3d(' + fx + 'vw, ' + fy +
						'vh, ' + fz + 'vmin); ' +
						' } ';

					if (fc > 1) {

						//nopainnogain
						sparkAnimDelay = -Math.random();

						s +=
							' .frwdFireworks:nth-child(' + fc +
							') .frwdLine .frwdSpark { ' +
							'          animation-delay: ' +
							sparkAnimDelay + 's; ' +
							' } ';
					}

					fireColors = getRandomColor();
					fireForeColor = fireColors[0];
					fireBackColor = fireColors[1];;

					s +=
						' .frwdFireworks:nth-child(' + fc +
						') .frwdLine .frwdSpark .frwdFire { ' +
						'    background: ' + fireForeColor + '; ' +
						' } ' +
						' .frwdFireworks:nth-child(' + fc +
						') .frwdLine .frwdSpark .frwdFire::before { ' +
						'    background: ' + fireBackColor + '; ' +
						' } ';

					sparkAnimDuration = 3.5 + Math.random() * 3;

					fireworkDuration = sparkAnimDuration + sparkAnimDelay;

					if (fireworkDuration > maxFireworkDuration) {
						maxFireworkDuration = fireworkDuration;
						fireworkIndexOfMaxDuration = fc;
					}

					fcs = '.frwdFireworks:nth-child(' + fc + ') ';

					countLinesPerFirework = 50 +
						Math.round(Math.random() * 50);
					//TODO:rm
					//countLinesPerFirework = 1;
					linesPerFirework[fc] = countLinesPerFirework;

					for (lc = 1; lc <= countLinesPerFirework; lc++) {

						lRotY = Math.random() * 360;

						s +=
							fcs + ' .frwdLine:nth-child(' + lc + ') { ' +
							' transform: rotate3d(0,1,0,' + lRotY + 'deg);' +
							' } ';

						s +=
							fcs + ' .frwdLine:nth-child(' + lc +
							') .frwdSpark { ' +
							'     animation: frwdSpark-' + fc + '-'
							+ lc + ' ' + sparkAnimDuration +
							's cubic-bezier(0.39, 0.575, 0.565, 1) ' +
							'forwards, frwdOpacity-' + fc + '-' + lc +
							' ' + sparkAnimDuration +
							's ease-out forwards; ' +
							' } ';

						sparkDeg = (Math.random() * 360) + 'deg';
						sparkRotYDeg = (Math.random() * 360) + 'deg';
						sparkKeyFrame0TranslateY =
							Math.round(Math.random() * 150 + 500) + 'px';
						sparkKeyFrame100TranslateX =
							Math.round(Math.random() * 200 + 100) + 'px';

						s +=
							' @keyframes frwdSpark-' + fc + '-' + lc +
							' { ' +
							'  0% { ' +
							'     transform: translate3d(0,' +
							sparkKeyFrame0TranslateY + ',0); ' +
							'  } ' +

							'  50% { ' +
							'    transform: translate3d(0,0,0); ' +
							'  } ' +

							'  100% { ' +
							'    transform: rotate3d(0,0,1,' + sparkDeg +
							') rotate3d(0,1,0,' + sparkRotYDeg +
							') translate3d(' + sparkKeyFrame100TranslateX +
							',0,0); ' +
							'  } ' +
							' } ';

						upFadeInOpacityPercent = 10 + Math.random() * 20;
						upFadeOutOpacityPercent = 40 + Math.random() * 5;
						outFadeInOpacityPercent = 55 + Math.random() * 10;
						outFadeOutOpacityPercent = 85 + Math.random() * 10;

						s +=
							' @keyframes frwdOpacity-' + fc + '-' + lc +
							' { ' +
							'   0% { ' +
							'     opacity: 0; ' +
							'   } ' +
							'    ' +
							'   ' + upFadeInOpacityPercent + '% { ' +
							'     opacity: 1; ' +
							'   } ' +
							'    ' +
							'   ' + upFadeOutOpacityPercent + '% { ' +
							'     opacity: 0; ' +
							'   } ' +
							'    ' +
							'   50% { ' +
							'     opacity: 0; ' +
							'   } ' +
							'    ' +
							'   ' + outFadeInOpacityPercent + '% { ' +
							'     opacity: 1; ' +
							'   } ' +
							'    ' +
							'   ' + outFadeOutOpacityPercent + '% { ' +
							'     opacity: 1; ' +
							'   } ' +
							'    ' +
							'   100% { ' +
							'     opacity: 0; ' +
							'   } ' +
							' } ';

						fireDuration = Math.random() * 1000 + 1000;
						fireDelay = Math.random() * fireDuration;

						fireWidth = 0.25 + Math.random() * 0.15;
						fireHeight = 0.25 + Math.random() * 0.15;
						fireLeft = fireWidth / 2;

						s +=
							fcs + ' .frwdLine:nth-child(' + lc +
							') .frwdFire { ' +
							'     animation: frwdFire-' + fc + '-' + lc +
							' ' + fireDuration + 'ms -' + fireDelay +
							'ms linear infinite; ' +
							' left: -' + fireLeft + 'em; ' +
							' width: ' + fireWidth + 'em; ' +
							' height: ' + fireHeight + 'em; ' +
							' } ';

						fireRotateX = Math.ceil(Math.random() * 3) * 360;
						fireRotateY = Math.ceil(Math.random() * 3) * 360;
						fireRotateZ = Math.ceil(Math.random() * 3) * 360;

						fireTransform =
							'rotate3d(1,0,0,' + fireRotateX +
							'deg) rotate3d(0,1,0,' + fireRotateY +
							'deg) rotate3d(0,0,1,' + fireRotateZ + 'deg)';

						s +=
							' @keyframes frwdFire-' + fc + '-' + lc +
							' { ' +
							'  0% { ' +
							'    transform: rotate3d(1,0,0,0deg) ' +
							'rotate3d(0,1,0,0deg) ' +
							'rotate3d(0,0,1,0deg); ' +
							'  } ' +
							'   ' +
							'  100% { ' +
							'    transform: ' + fireTransform + '; ' +
							'  } ' +
							' } ';

					} // each line

				} // each firework 

				var fireworkStylesheet = doc.createElement('style');
				mFireworkStylesheet = fireworkStylesheet;
				fireworkStylesheet.innerHTML = s;

				mHeadElement.appendChild(fireworkStylesheet);

				var fwe;
				var le;
				var se;
				var fre;
				var container = doc.createElement('div');
				container.className = 'frwdStage';
				mContainer = container;

				for (fc = 1; fc <= countFireworks; fc++) {

					fwe = doc.createElement('div');
					fwe.className = 'frwdFireworks';

					countLinesPerFirework = linesPerFirework[fc];

					for (lc = 1; lc <= countLinesPerFirework; lc++) {

						fre = doc.createElement('div');
						fre.className = 'frwdFire';
						se = doc.createElement('div');
						se.className = 'frwdSpark';
						le = doc.createElement('div');
						le.className = 'frwdLine';

						if (lc === 1 && fc === fireworkIndexOfMaxDuration) {
							mMyChangeevent.add('animationend', se, end);
						}

						se.appendChild(fre);
						le.appendChild(se);
						fwe.appendChild(le);
					}

					container.appendChild(fwe);

				}

				doc.body.appendChild(container);

			} // end function start()

			function clear() {
				if (!mContainer) {
					session.doodle = null;
					//TODO: rm
					//alert('firew:noContainer');
					return;
				}

				mDoc.body.removeChild(mContainer);

				mHeadElement.removeChild(mFireworkStylesheet);

				mContainer = null;
				mFireworkStylesheet = null;

				tSession.doodle = null;
			}

			function end(e) {
				//TODO: rm
				//alert('end');

				var startOfAnimName = e.animationName.substr(0, 11);

				if (startOfAnimName === 'frwdOpacity') {
					//TODO: rm
					//alert('end:clear');
					clear();
				}
			}

			function stop() {
				clear();
			}

			function hide() {
				mContainer.style.top = '-9999px';
			}

			function showAfterHide() {
				mContainer.style.top = '';
			}

			return {
				initialise: initialise,
				start: start,
				stop: stop,
				hide: hide,
				showAfterHide: showAfterHide
			};

		})(this);

	fireworkDoodle.initialise(
		myChangeEvent,
		headelement
	);

	//            var doodles = this.doodles;
	//            doodles[doodles.length] = fireworkDoodle; 

}; // end of Session setupFireworkDoodle function

var gHeadElement = document.getElementsByTagName('head')[0];
session.setupFireworkDoodle(gHeadElement);
session.FireworkDoodle.start();
// once the window loads, we are ready for some fireworks!
window.onload = loop;



