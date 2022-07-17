window.onload = () => {
  /**
   * GUI
   */
  const parameters = {};
  const gui = new lil.GUI();

  parameters.clearColor = "#000";
  gui.addColor(parameters, "clearColor").onChange(() => {
    renderer.setClearColor(parameters.clearColor);
  });

  /**
   * Cannon
   */

  const world = new CANNON.World();
  world.gravity.set(0,-9.82,0);

  const concreteMaterial = new CANNON.Material("concrete")
  const ballMaterial =  new CANNON.Material("ball")

  const concreteBallContactMaterial = new CANNON.ContactMaterial(
    concreteMaterial,
    ballMaterial,
    {
      friction: 0.1,
      restition: 0.7
    }
  )

  world.addContactMaterial(concreteBallContactMaterial);
  world.defaultContactMaterial = concreteBallContactMaterial



  /**
   * Sizes
   */
  const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  /**
   * Scene
   */

  const scene = new THREE.Scene();

  /**
   * Lighting
   */

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
  scene.add(directionalLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  /**
   * Canvas
   */
  const canvas = document.getElementById("hoop-canvas");

  /**
   * Renderer
   */

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas
  });

  renderer.setSize(sizes.width, sizes.height);
  renderer.setClearColor(parameters.clearColor);

  /**
   * Camera
   */
  const camera = new THREE.PerspectiveCamera(
    75,
    sizes.width / sizes.height,
    0.1,
    1000
  );
  camera.position.set(0, 1.7, 6);


  /**
   * Stuff
   */

  // floor
  const floorGeometry = new THREE.BoxBufferGeometry(10, 0.1, 10);
  const floorMaterial = new THREE.MeshBasicMaterial({color: "brown"});
  const floor = new THREE.Mesh(floorGeometry, floorMaterial)
  floor.position.set(0,0,4);
  scene.add(floor)

  const floorShape = new CANNON.Box(new CANNON.Vec3(10 * 0.5, 10 * 0.5, 0.1))
  const floorBody = new CANNON.Body()

  floorBody.position.copy(floor.position)
  floorBody.mass = 0;
  floorBody.quaternion.setFromAxisAngle(
    new CANNON.Vec3(-1, 0,0 ), 
    Math.PI * 0.5
  )

  floorBody.addShape(floorShape)
  world.addBody(floorBody)

  //post
  const postGeometry = new THREE.BoxBufferGeometry(0.3, 3, 0.3);
  const postMaterial = new THREE.MeshBasicMaterial({color: "blue"});
  const post = new THREE.Mesh(postGeometry, postMaterial)
  post.position.set(0,1.5,-0.65);

  const postShape = new CANNON.Box(
    new CANNON.Vec3(0.3 * 0.5, 3 * 0.5, 0.3 * 0.5)
  );
  const postBody = new CANNON.Body();
  
  postBody.position.copy(post.position);
  postBody.mass = 0;
  postBody.addShape(postShape);
  
  world.addBody(postBody);

  scene.add(post)
    // backboard
  const backBoardGeometry = new THREE.BoxGeometry(1.83, 1.07, 0.1);
  const backBoardMaterial = new THREE.MeshBasicMaterial({
    color: "white"
  });
  const backBoard = new THREE.Mesh(backBoardGeometry, backBoardMaterial);
  backBoard.position.set(0, 3.3, -0.5);

  scene.add(backBoard);

  const backboardShape = new CANNON.Box(
    new CANNON.Vec3(1.83 * 0.5, 1.07 * 0.5, 0.15)
  );
  const backBoardBody = new CANNON.Body();
  
  backBoardBody.position.copy(backBoard.position);
  backBoardBody.mass = 0;
  backBoardBody.addShape(backboardShape);
  backBoardBody.material = concreteMaterial;
  
  world.addBody(backBoardBody);

  // Hoop

  const hoopGeometry = new THREE.TorusGeometry(0.45, 0.05, 16, 100);
  const hoopMaterial = new THREE.MeshLambertMaterial({color: "orange"})
  const hoop = new THREE.Mesh(hoopGeometry, hoopMaterial)
  hoop.position.set(0,3,0);
  hoop.rotateX(Math.PI * 0.5)

  scene.add(hoop)

  const hoopShape = new CANNON.Trimesh.createTorus(0.45, 0.05, 16, 100);
  const hoopBody = new CANNON.Body({ mass: 0 });
  hoopBody.addShape(hoopShape);
  hoopBody.quaternion.setFromAxisAngle(
    new CANNON.Vec3(-1, 0, 0),
    Math.PI * 0.5
  );
  hoopBody.position.copy(hoop.position);

  world.addBody(hoopBody);


  /**
   * Add Ball
   */

  const basketBalls = []
  const sphereGeometry = new THREE.SphereBufferGeometry(0.14, 20, 20);
  const sphereMaterial = new THREE.MeshLambertMaterial({
    roughness: 0.4,
    color: "#CF5300"
  })

  let velocity = 0;

  const createBall = (position, vector) => {
    const ball = new THREE.Mesh(sphereGeometry, sphereMaterial)
    ball.position.set(position.x, position.y, position.z)
    scene.add(ball)
  
    const ballShape = new CANNON.Sphere(0.14)
    const ballBody = new CANNON.Body({
      mass: 1,
      position: new CANNON.Vec3(0, 10, 0),
      shape: ballShape,
      material: ballMaterial
    })

  ballBody.velocity = new CANNON.Vec3(
    vector.x * velocity,
    vector.y * velocity,
    vector.z * velocity,
  )

    ballBody.position.copy(ball.position)
    world.addBody(ballBody)
    basketBalls.push({
      ball,
      ballBody
    })
  }

  /**
   * Controls
   */

  const controls = new THREE.PointerLockControls(camera, renderer.domElement);

  const clock = new THREE.Clock();
  let oldElapsedTime = 0;

  const tick = () => {
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - oldElapsedTime;
    oldElapsedTime = elapsedTime;

    world.step(1 / 60, deltaTime, 3);

    basketBalls.forEach(({ball, ballBody}) => {
      ball.position.copy(ballBody.position)
      ball.quaternion.copy(ballBody.quaternion)

      if(isInScoringRange(ball.position.x, ball.position.y, ball.position.z)) {
        if(!ball.hasScored) {
          const score = document.getElementById("score")
          score.innerText = parseInt(score.innerText) + 1
          ball.hasScored = true
        }
      }
    })

    // Render
    renderer.render(scene, camera);

    // Call tick again on the next frame
    window.requestAnimationFrame(tick);
  };

  tick();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  document.addEventListener("click", () => {
    if (!controls.isLocked) {
      controls.lock();
      return;
    }
  }, false);

  let angle = Math.PI / 2

  window.addEventListener("keyup", (event) => {
    if(event.code === "Space") {
      let vector = new THREE.Vector3()
      const cameraVector = camera.getWorldDirection(vector)
      // Throw the ball
      createBall(camera.position, cameraVector)
      velocity = 0
      const powerBar = document.getElementById("power-bar-fill")
      powerBar.style.width = "0%"
    }
  })

  let increment = 1

  window.addEventListener("keydown", (event) => {
    if(event.code === "Space") {
      if(velocity === 0) {
        increment = 1
      }
      if(velocity === 20) {
        increment = -1
      }
      const powerBar = document.getElementById("power-bar-fill")
      const powerPercentage = (velocity / 20) * 100
      powerBar.style.width = `${powerPercentage}%`
      velocity += increment
      // let vector = new THREE.Vector3()
      // const cameraVector = camera.getWorldDirection(vector)
      // // Throw the ball
      // createBall(camera.position, cameraVector)
    }
    if(event.code === "KeyA") {
      // move left
      angle += 0.1
      const {x, y, z} = getNewCoords(angle, 6)
      camera.position.set(x,y,z)
      camera.lookAt(hoop.position)

    }
    if(event.code === "KeyD") {
      // move right
      angle -= 0.1
      const {x, y, z} = getNewCoords(angle, 6)
      camera.position.set(x,y,z)
      camera.lookAt(hoop.position)

    }
  })

};

const isInXRange = (val) => val >= -0.4 && val <= 0.4
const isInYRange = (val) => val >= 2.75 && val <= 2.85
const isInZRange = (val) => val >= -0.4 && val <= 0.4

const isInScoringRange = (x, y, z) => {
  return isInXRange(x) && isInYRange(y) && isInZRange(z)
}

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

