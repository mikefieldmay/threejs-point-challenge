window.onload = () => {
  /**
   * GUI
   */
  const parameters = {};
  const gui = new lil.GUI();

  parameters.clearColor = "#fff";
  gui.addColor(parameters, "clearColor").onChange(() => {
    renderer.setClearColor(parameters.clearColor);
  });

  /**
   * Cannon World
   */

  const world = new CANNON.World();
  world.gravity.set(0, -9.82, 0);

  // Materials
  const concreteMaterial = new CANNON.Material("concrete");
  const ballMaterial = new CANNON.Material("plastic");

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
   * Controls
   */

  const controls = new THREE.PointerLockControls(camera, renderer.domElement);

  const clock = new THREE.Clock();
  let oldElapsedTime = 0;

  const tick = () => {
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - oldElapsedTime;
    oldElapsedTime = elapsedTime;

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
};