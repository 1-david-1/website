(function () {
  'use strict';

  if (typeof THREE === 'undefined') {
    console.error('Three.js is required for about-model.js');
    return;
  }

  document.addEventListener('DOMContentLoaded', () => {
    initAboutModel();
  });

  function initAboutModel() {
    const container = document.querySelector('.about-model-container');
    const canvas = document.getElementById('reliefCanvas');
    const loader = document.getElementById('model-loader');
    const percentText = loader ? loader.querySelector('.loader-percent') : null;

    if (!container || !canvas) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    
    // Deep dark night background (matching the website's dark tone #0b0e1a)
    const bgColor = new THREE.Color(0x060813);
    scene.background = bgColor;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 150);
    camera.position.set(0, 5, 8); // Elevated viewing position

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;

    // 4. Orbit Controls
    if (typeof THREE.OrbitControls !== 'undefined') {
      const controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera from going under ground level
      controls.minDistance = 2.5;
      controls.maxDistance = 20;
      controls.enablePan = true;
      
      window.reliefControls = controls;
    }

    // 5. Starry Sky Background (Particle System)
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 1200;
    const starPositions = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i += 3) {
      // Distribute stars on a large sphere far away
      const radius = 60 + Math.random() * 30;
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      
      starPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i+1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i+2] = radius * Math.cos(phi);
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.18,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true
    });
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);

    // 6. Lighting Scheme matching the house render
    // Ambient Light - Cool moonlight glow
    const ambientLight = new THREE.AmbientLight(0x0c0f2b, 0.45);
    scene.add(ambientLight);

    // Main Amber Spotlight (Sun/Key Light) - Warm yellow floodlights shining down
    const dirLight1 = new THREE.DirectionalLight(0xffb55c, 1.4);
    dirLight1.position.set(6, 10, 4);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 2048;
    dirLight1.shadow.mapSize.height = 2048;
    dirLight1.shadow.camera.near = 0.5;
    dirLight1.shadow.camera.far = 30;
    dirLight1.shadow.camera.left = -8;
    dirLight1.shadow.camera.right = 8;
    dirLight1.shadow.camera.top = 8;
    dirLight1.shadow.camera.bottom = -8;
    dirLight1.shadow.bias = -0.0005;
    scene.add(dirLight1);

    // Secondary Warm Fill Light from another angle
    const dirLight2 = new THREE.DirectionalLight(0xffd499, 0.65);
    dirLight2.position.set(-4, 7, 5);
    scene.add(dirLight2);

    // Red Accent Light - represent security lights/glowing rings
    const redLight = new THREE.DirectionalLight(0xff083b, 1.15);
    redLight.position.set(-6, 3, -4);
    scene.add(redLight);

    let reliefMesh = null;
    let autoRotate = true;

    const stopAutoRotate = () => { autoRotate = false; };
    canvas.addEventListener('pointerdown', stopAutoRotate);
    canvas.addEventListener('wheel', stopAutoRotate);

    // 7. GLTF Loader + DRACOLoader (für Draco-komprimiertes Modell)
    if (typeof THREE.GLTFLoader !== 'undefined') {
      const gltfLoader = new THREE.GLTFLoader();

      // DRACOLoader zum Dekomprimieren des Modells
      if (typeof THREE.DRACOLoader !== 'undefined') {
        const dracoLoader = new THREE.DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        gltfLoader.setDRACOLoader(dracoLoader);
      }

      gltfLoader.load(
        '/relief_model.glb',
        (gltf) => {
          reliefMesh = gltf.scene;

          reliefMesh.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              
              // If the mesh has textures/materials, keep them but tune them
              if (child.material) {
                child.material.roughness = 0.8;
                child.material.metalness = 0.15;
                // If it is a generic default white material, we make sure it responds nicely to lighting
                if (child.material.color && child.material.color.getHex() === 0xffffff) {
                  child.material.color.setHex(0xdddddd);
                }
              } else {
                child.material = new THREE.MeshStandardMaterial({
                  color: 0xdddddd,
                  roughness: 0.8,
                  metalness: 0.15,
                  flatShading: false
                });
              }
            }
          });

          // Center and scale the model automatically
          const box = new THREE.Box3().setFromObject(reliefMesh);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());

          // Move the center of the mesh to (0,0,0)
          reliefMesh.position.x += (reliefMesh.position.x - center.x);
          reliefMesh.position.y += (reliefMesh.position.y - center.y);
          reliefMesh.position.z += (reliefMesh.position.z - center.z);

          // Scale to fit target size
          const maxDim = Math.max(size.x, size.y, size.z);
          const targetSize = 4.2; // Target bounding size
          const scale = targetSize / maxDim;
          reliefMesh.scale.set(scale, scale, scale);

          scene.add(reliefMesh);

          // Set camera position based on bounding box
          camera.position.set(0, 4.0, 6.5);
          if (window.reliefControls) {
            window.reliefControls.target.set(0, 0, 0);
            window.reliefControls.update();
          }

          // Fade out loader and fade in canvas
          if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
              loader.style.display = 'none';
              canvas.style.opacity = '1';
            }, 500);
          }
        },
        // Progress callback
        (xhr) => {
          if (xhr.lengthComputable) {
            const percent = Math.round((xhr.loaded / xhr.total) * 100);
            if (percentText) {
              percentText.textContent = percent + '%';
            }
          }
        },
        // Error callback
        (error) => {
          console.error('An error happened while loading the model:', error);
          if (percentText) {
            percentText.textContent = 'Fehler beim Laden';
          }
        }
      );
    } else {
      console.error('GLTFLoader not found');
    }

    // 8. Render & Animation Loop
    const clock = new THREE.Clock();
    
    function animate() {
      requestAnimationFrame(animate);

      // Apply slowly rotating idle animation if no user dragging
      if (reliefMesh && autoRotate) {
        reliefMesh.rotation.y = clock.getElapsedTime() * 0.06;
      }

      if (window.reliefControls) {
        window.reliefControls.update();
      }

      renderer.render(scene, camera);
    }
    
    animate();

    // 9. Resize Handler
    function handleResize() {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      
      renderer.setSize(w, h);
    }

    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 100);
  }
})();
