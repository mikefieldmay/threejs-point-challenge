# Building a basketball game in three.js

## How to run
Open the index.html file in a web browser

****Basic Court Setup****

When it comes to building things in three.js it’s important to think about scale. Basketball is useful because there are regulation sizes for everything. A hoops height is 3 meters and the diameter is 52cm. The three point throw line is 6m away from the hoop etc. We’ll use 1 as 1m for our three.js scene.

Adding the floor:

```jsx
const floorGeometry = new THREE.BoxBufferGeometry(10, 10, 0.1);
const floorMaterial = new THREE.MeshBasicMaterial({ color: "brown" });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.position.set(0, 0, 4);
floor.rotateX(Math.PI * 0.5);

scene.add(floor);
```

Adding the Post:

```jsx
const postGeometry = new THREE.BoxBufferGeometry(0.3, 3, 0.3);
const postMaterial = new THREE.MeshLambertMaterial({ color: "blue" });
const post = new THREE.Mesh(postGeometry, postMaterial);
post.position.set(0, 1.5, -0.65);

scene.add(post);
```

Adding the Backboard (regulation width is 1.83m and height is 1.07m):

```jsx
const backBoardGeometry = new THREE.BoxGeometry(1.83, 1.07, 0.1);
const backBoardMaterial = new THREE.MeshBasicMaterial({
  color: "white"
});
const backBoard = new THREE.Mesh(backBoardGeometry, backBoardMaterial);
backBoard.position.set(0, 3.3, -0.45);

scene.add(backBoard);
```

Adding the Hoop:

```jsx
const hoopGeometry = new THREE.TorusGeometry(0.45, 0.05, 16, 100);
const hoopMaterial = new THREE.MeshLambertMaterial({ color: "orange" });
const hoop = new THREE.Mesh(hoopGeometry, hoopMaterial);
hoop.position.set(0, 3, 0);
hoop.rotateX(Math.PI * 0.5);

scene.add(hoop);
```

Now we’ve got a basic layout we need to add some physics to it. The way we do this is creating almost a duplicate scene that can experience physics, and then update our objects in our three js scene with the new positions. 
We’ll start by adding the cannon world:

```jsx
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
```

We also want to describe how our objects will interact in this world. For ease, we’ll treat everything as “concrete” except the basketball

```jsx
// Materials
const concreteMaterial = new CANNON.Material("concrete");
const ballMaterial = new CANNON.Material("ball");

const concreteBallContactMaterial = new CANNON.ContactMaterial(
  concreteMaterial,
  ballMaterial,
  {
    friction: 0.1,
    restitution: 0.7
  }
);

world.addContactMaterial(concreteBallContactMaterial);
world.defaultContactMaterial = concreteBallContactMaterial;
```

Let’s start by creating a physics version of the floor. When you create a geometry in CANNON you only put in half values for the size:

```jsx
const floorShape = new CANNON.Box(new CANNON.Vec3(10 * 0.5, 10 * 0.5, 0.1));
const floorBody = new CANNON.Body();

floorBody.position.copy(floor.position);
// Stop this object being affected by gravity
floorBody.mass = 0;
// Rotate
floorBody.quaternion.setFromAxisAngle(
  new CANNON.Vec3(-1, 0, 0),
  Math.PI * 0.5
);

floorBody.addShape(floorShape);

world.addBody(floorBody);
```

How can we tell this is working? Let’s add a ball to the scene.

```jsx
const sphereGeometry = new THREE.SphereBufferGeometry(0.14, 20, 20);
const sphereMaterial = new THREE.MeshLambertMaterial({
  roughness: 0.4,
  color: "#CF5300"
});
const ball = new THREE.Mesh(sphereGeometry, sphereMaterial);
ball.position.set(0, 3, 0);
scene.add(ball);

const shape = new CANNON.Sphere(0.14);
const ballBody = new CANNON.Body({
  mass: 1,
  position: new CANNON.Vec3(0, 10, 0),
  shape,
  material: ballMaterial
});
ballBody.position.copy(ball.position);
world.addBody(ballBody);
```

Now, in order to see anything happen we need to update 2 things in the tick function:

```jsx
const tick = () => {
	  ...
		// Update the World
	  world.step(1 / 60, deltaTime, 3);
	  //Update object
		ball.position.copy(ballBody.position)
		ball.quaternion.copy(ballBody.quaternion)
	  ...
  };
```

Now we can see movement let’s give this a slight refactor. We’ll want to be able to create multiple balls:

```jsx
const basketBalls = [];

const sphereGeometry = new THREE.SphereBufferGeometry(0.14, 20, 20);
const sphereMaterial = new THREE.MeshLambertMaterial({
  roughness: 0.4,
  color: "#CF5300"
});

const createBall = (position) => {
	const ball = new THREE.Mesh(sphereGeometry, sphereMaterial);
	ball.position.copy(position);
	scene.add(ball);
	
	const shape = new CANNON.Sphere(0.14);
	const ballBody = new CANNON.Body({
	  mass: 1,
	  position: new CANNON.Vec3(0, 10, 0),
	  shape,
	  material: ballMaterial
	});
	ballBody.position.copy(ball.position);
	world.addBody(ballBody);
	basketBalls.push({
      ball,
      ballBody
    });
}

createBall(new THREE.Vector3(0,0,0))
```

and in the tick function:

```jsx
const tick = () => {
  ...

    basketBalls.forEach(({ ball, ballBody }) => {
      ball.position.copy(ballBody.position);
      ball.quaternion.copy(ballBody.quaternion);
    });

   ...
  };
```

Now to `throw` a ball. In order for an object to move we need to apply a velocity along a vector. 

We can update our createBall function to handle this. We’ll also delete our call to create ball from earlier:

```jsx
const velocity = 12
const createBall = (position, vector) => {
	...

	ballBody.velocity = new CANNON.Vec3(
    vector.x * velocity,
    vector.y * velocity,
    vector.z * velocity
  );
	...
}
```

So, we can create a ball that moves. Lets add a basic control for when to do this. First, we need to add an event handler for the spacebar like so:

```jsx
document.addEventListener("keypress", (event) => {
    if (event.code === "Space") {
      // Throw the ball
    }
  });
```

In order to work out what vector the ball moves we need to work out which way the camera is looking in order to pass that to our createBall function. We can do this with the getWorldDirection function. The function takes a vector as an argument which it updates:

```jsx
document.addEventListener("keypress", (event) => {
    if (event.code === "Space") {
      let vector = new THREE.Vector3()
			camera.getWorldDirection(vector)
			createBall(new THREE.Vector3(...camera.position), vector)
    }
  });
```

We should now be firing balls everywhere. Finally, we need to add our physics bodies to the other  objects we have on screen.

```jsx
const hoopShape = new CANNON.Trimesh.createTorus(0.45, 0.05, 16, 100);
const hoopBody = new CANNON.Body({ mass: 0 });
hoopBody.addShape(hoopShape);
hoopBody.quaternion.setFromAxisAngle(
  new CANNON.Vec3(-1, 0, 0),
  Math.PI * 0.5
);
hoopBody.position.copy(torus.position);

world.addBody(hoopBody);

const backboardShape = new CANNON.Box(
  new CANNON.Vec3(1.83 * 0.5, 1.07 * 0.5, 0.15)
);
const backBoardBody = new CANNON.Body();

backBoardBody.position.copy(backBoard.position);
backBoardBody.mass = 0;
backBoardBody.addShape(backboardShape);
backBoardBody.material = concreteMaterial;

world.addBody(backBoardBody);

const postShape = new CANNON.Box(
  new CANNON.Vec3(0.3 * 0.5, 3 * 0.5, 0.3 * 0.5)
);
const postBody = new CANNON.Body();

postBody.position.copy(post.position);
postBody.mass = 0;
postBody.addShape(postShape);

world.addBody(postBody);
```

Let’s add a scoreboard. We want to know how many shots have gone in to the hoop so to start with, let’s add a score to the html file.

```html
<body>
	<div id="score-container"><h1 id="score">0</h1></div>
	....
</body>
```

We’ll also need some CSS so that it displays properly above the canvas

```css
#score-container {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 100;
    color: white;
}
```

We need to work out where we track the ball to say that we’ve scored. We can create a box geometry and add it’s position values to the gui. That way we can work out where our score needs to be

```jsx
const boxGeometry = new THREE.BoxBufferGeometry(0.8,0.1,0.8)
  const boxMaterial = new THREE.MeshBasicMaterial({
    color: "red"
  })
  const box = new THREE.Mesh(boxGeometry, boxMaterial)
  box.position.set(0,4,0)
  scene.add(box)
  gui.add(box.position, "x").step(0.1)
  gui.add(box.position, "y").step(0.1)
  gui.add(box.position, "z").step(0.1)
```

We can tweak the position in the gui to see get the values of the “scoring” position of the ball.

After finding the values we can create some helper functions that will return true if the ball is in the correct position. We can delete the box geometry we created.

```jsx
const isInXRange = (val) => val >= -0.4 && val <= 0.4
const isInYRange = (val) => val >= 2.75 && val <= 2.85
const isInZRange = (val) => val >= -0.4 && val <= 0.4

const isInScoringRange = (x, y, z) => {
  return isInXRange(x) && isInYRange(y) && isInZRange(z)
}
```

In our tick function, where we iterate through the balls we can test if a ball has scored:

```jsx
basketBalls.forEach(({ball, ballBody}) => {
      ball.position.copy(ballBody.position)
      ball.quaternion.copy(ballBody.quaternion)

      if(isInScoringRange(ball.position.x, ball.position.y, ball.position.z)) {
        console.log("Scored")
				// do the score stuff
      }
    })
```

We now want to increase the score number on the left of the screen. We need to access the value, convert it to a number and then increase it by 1

```jsx
// do the score stuff
const score = document.getElementById("score")
score.innerHTML = parseInt(score.innerHTML) + 1;
```

What you will notice now when you score is that the number increments a lot on a single score. That’s because the ball exists in the scoring space for more than one `tick` of our game. The easiest way to fix this is to add a new property to our ball called hasScored. We can assume our balls can only ever score once, so when a ball has scored, it can no longer score.

```jsx
if(isInScoringRange(ball.position.x, ball.position.y, ball.position.z)) {
    if(!ball.hasScored) {
      const score = document.getElementById("score")
      score.innerHTML = parseInt(score.innerHTML) + 1;
      ball.hasScored = true
    }
  }
})
```

We should have a fairly functional score tracker! Lets make it so that we can change the position of our shooter. We’ll want to move in an arc around our hoop point. This is mostly math so I created a few helper functions to deal with this

```jsx
const getNewZCoordinate = (angle, radius) => {
  return radius * Math.sin(angle)
}

const getNewXCoordinate = (angle, radius) => {
  return radius * Math.cos(angle)
}

const getNewCoords = (angle, radius) => {
  return {
    x: getNewXCoordinate(angle, radius),
    // y is avg height in meters
    y: 1.7,
    z: getNewZCoordinate(angle, radius)
  }
}
```

It uses GCSE level math to calculate points on a circle.

We now need to apply this. Lets add left and right movement on the keyboard

```jsx
window.addEventListener("keydown", (event) => {
    if(event.code === "Space") {
      let vector = new THREE.Vector3()
      const cameraVector = camera.getWorldDirection(vector)
      // Throw the ball
      createBall(camera.position, cameraVector)
    }
    if(event.code === "KeyA") {
      // Move left
    }
    if(event.code === "KeyD") {
      // Move Right
    }
  })
};
```

We’ll need an angle to track where we currently are. Javascript tends to use radians instead of degrees. Our starting angle is 90 degrees which is Math.Pi / 2 radians

```jsx
let angle = Math.PI / 2
window.addEventListener("keydown", (event) => {
    if(event.code === "KeyA") {
      angle += 0.1
			// We always use 6 as we want to be 6 meters away from the pole
      const {x, y, z} = getNewCoords(angle, 6)
      camera.position.set(x, y, z)
    }
    if(event.code === "KeyD") {
      angle -= 0.1
      const {x, y, z} = getNewCoords(angle, 6)
      camera.position.set(x, y, z)
    }
  })
};
```

Finally, let’s look back at the hoop whenever we move so we have an idea of where it is.

```jsx
if(event.code === "KeyA") {
      angle += 0.1
			// We always use 6 as we want to be 6 meters away from the pole
      const {x, y, z} = getNewCoords(angle, 6);
      camera.position.set(x, y, z);
			camera.lookAt( 0,3,0 );

    }
    if(event.code === "KeyD") {
      angle -= 0.1
      const {x, y, z} = getNewCoords(angle, 6);
      camera.position.set(x, y, z);
			camera.lookAt( 0,3,0 );

    }
```

Now that we can move around lets add an idea of throw strength to our game. We already have the velocity so let’s change how our spacebar works. Whilst we hold the spacebar down we increase the velocity and when we release we throw the ball.

```jsx

// In createBall function;
...
ballBody.velocity = new CANNON.Vec3(
    vector.x * velocity,
    vector.y * velocity,
    vector.z * velocity,
  )

...
window.addEventListener("keydown", (event) => {
    if(event.code === "Space") {
     velocity +=1
    }
...
})
```

```jsx
window.addEventListener("keyup", (event) => {
    if(event.code === "Space") {
      let vector = new THREE.Vector3()
      const cameraVector = camera.getWorldDirection(vector)
      // Throw the ball
      createBall(camera.position, cameraVector)
			// reset the velocity
      velocity = 0
    }
  })
```

Let’s add an upper limit to our velocity. The highest we want to reach is 20 so lets tweak our “keydown” function.

```jsx
let increment = 1
window.addEventListener("keydown", (event) => {
	  if(event.code === "Space") {
	    if(velocity === 0) {
	      increment = 1
	    }
	    if(velocity === 20) {
	      increment = -1
	    }
	    velocity += increment
	  }
	})
};
```

Finally, let’s add a bit to the frontend in order to display this:

```jsx
// In the HTML
<div id="power-bar"><div id="power-bar-fill"></div></div>

// In the CSS
#power-bar {
    position: absolute;
    height: 40px;
    width: 200px;
    top: 20px;
    left: 100px;
    z-index: 100;
    border: 1px solid white;
}

#power-bar-fill {
    width: 0%;
    height: 100%;
    background-color: red
}
```

And finally

```jsx
window.addEventListener("keyup", (event) => {
    if(event.code === "Space") {
      ...
      const powerBar = document.getElementById("power-bar-fill");
      powerBar.style.width = `${velocity/20 * 100}%`
    }
  })

  let increment = 1
  window.addEventListener("keydown", (event) => {
    if(event.code === "Space") {
      ...
      const powerBar = document.getElementById("power-bar-fill");
      powerBar.style.width = `${velocity/20 * 100}%`
    }
    ...
};
```