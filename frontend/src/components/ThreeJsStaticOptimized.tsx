// ThreeJsStaticOptimized.tsx
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type BoxDim = {
  length: string;
  width: string;
  height: string;
  weight: string;
  quantity: string;
  rotation: boolean;
  collapsed?: boolean;
  unit: string;
};

type ContainerDim = {
  length: string;
  width: string;
  height: string;
  unit?: string;
};

type PackedItemData = {
  name: string;
  position: any; // array [x,y,z]
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
};

type Props = {
  containerDimensions: ContainerDim;
  boxDimensions: BoxDim[];
  style?: React.CSSProperties;
  className?: string;
  maxInstances?: number;
  showGrid?: boolean;
  packedItemsData?: PackedItemData[];
};

const convertToMeters = (value: number, unit: string = "m"): number => {
  switch (unit) {
    case "cm":
      return value / 100;
    case "mm":
      return value / 1000;
    case "in":
      return value * 0.0254;
    case "m":
    default:
      return value;
  }
};

export default function ThreeJsStaticOptimized({
  containerDimensions,
  boxDimensions,
  style,
  className,
  maxInstances = 1200,
  showGrid = false,
  packedItemsData,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // cleanup previous renderer/scene/controls if any
    if (rendererRef.current) {
      try {
        rendererRef.current.forceContextLoss();
        const canvas = rendererRef.current.domElement;
        if (mountRef.current.contains(canvas)) mountRef.current.removeChild(canvas);
        rendererRef.current.dispose();
      } catch (e: unknown) {
        console.log(e);
      }
      rendererRef.current = null;
      sceneRef.current = null;
    }
    if (controlsRef.current) {
      try {
        controlsRef.current.dispose();
      } catch (e: unknown) {
        console.log(e);
      }
      controlsRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // --- scene / renderer / camera ---
    const mount = mountRef.current!;
    const width = mount.clientWidth || 600;
    const height = mount.clientHeight || 400;

    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 2000);
    camera.position.set(8, 8, 12);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(width, height);
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    // lights
    const hemi = new THREE.HemisphereLight(0xffffff, 0x666666, 0.9);
    hemi.position.set(0, 50, 0);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(10, 20, 10);
    scene.add(dir);

    // container dims (in meters)
    const unit = containerDimensions.unit ?? "m";
    const contL = convertToMeters(Number(containerDimensions.length) || 0, unit);
    const contW = convertToMeters(Number(containerDimensions.width) || 0, unit);
    const contH = convertToMeters(Number(containerDimensions.height) || 0, unit);

    const containerLength = contL > 0 ? contL : 2;
    const containerWidth = contW > 0 ? contW : 1.5;
    const containerHeight = contH > 0 ? contH : 1.5;

    const maxDim = Math.max(containerLength, containerWidth, containerHeight);
    const targetMax = 8;
    const sceneScale = maxDim > 0 ? targetMax / maxDim : 1;

    // container visual
    const contGeometry = new THREE.BoxGeometry(
      containerLength * sceneScale,
      containerHeight * sceneScale,
      containerWidth * sceneScale
    );
    const contMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#63ABF7"),
      transparent: true,
      opacity: 0.25,
      roughness: 0.1,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const contMesh = new THREE.Mesh(contGeometry, contMaterial);
    contMesh.position.y = (containerHeight * sceneScale) / 2;
    scene.add(contMesh);
    const wire = new THREE.LineSegments(
      new THREE.EdgesGeometry(contGeometry),
      new THREE.LineBasicMaterial({ color: "#B8D5F3", transparent: true, opacity: 0.6 })
    );
    wire.position.copy(contMesh.position);
    scene.add(wire);

    if (showGrid) {
      const gridSize = Math.max(containerLength, containerWidth) * sceneScale;
      const grid = new THREE.GridHelper(gridSize, 10);
      (grid.material as THREE.Material).transparent = true;
      (grid.material as unknown as THREE.Material).opacity = 0.1;
      grid.position.y = 0.001;
      scene.add(grid);
    }

    // helper to parse raw API pos into [x,y,z] numbers (assumes meters)
    const parsePositionRaw = (pos: any | undefined): [number, number, number] => {
      if (!pos) return [0, 0, 0];
      if (Array.isArray(pos) && pos.length >= 3) {
        return [Number(pos[0]) || 0, Number(pos[1]) || 0, Number(pos[2]) || 0];
      }
      if (typeof pos === "object") {
        const x = Number(pos.x ?? pos[0] ?? 0);
        const y = Number(pos.y ?? pos[1] ?? 0);
        const z = Number(pos.z ?? pos[2] ?? 0);
        return [x || 0, y || 0, z || 0];
      }
      return [0, 0, 0];
    };

    const validateInterpretation = (
      items: PackedItemData[],
      interpretationFn: (raw: [number, number, number], dims: { l: number; w: number; h: number }) => [number, number, number]
    ): { ok: boolean; overflowCount: number } => {
      let overflowCount = 0;
      for (const it of items) {
        const raw = parsePositionRaw(it.position);
        const l = Number(it.dimensions.length) || 0;
        const w = Number(it.dimensions.width) || 0;
        const h = Number(it.dimensions.height) || 0;
        const [px, py, pz] = interpretationFn(raw, { l, w, h });
        // min and max corners
        const minX = px;
        const minY = py;
        const minZ = pz;
        const maxX = px + l;
        const maxY = py + h;
        const maxZ = pz + w;
        // check inside [0, containerLength] and [0, containerWidth] and [0, containerHeight]
        if (
          minX < -1e-9 ||
          minY < -1e-9 ||
          minZ < -1e-9 ||
          maxX > containerLength + 1e-9 ||
          maxY > containerHeight + 1e-9 ||
          maxZ > containerWidth + 1e-9
        ) {
          overflowCount++;
        }
      }
      return { ok: overflowCount === 0, overflowCount };
    };

    const asMinCorner = (raw: [number, number, number], _dims: { l: number; w: number; h: number }): [number, number, number] => {
      return [raw[0], raw[1], raw[2]];
    };
    const asCenter = (raw: [number, number, number], dims: { l: number; w: number; h: number }): [number, number, number] => {
      return [raw[0] - dims.l / 2, raw[1] - dims.h / 2, raw[2] - dims.w / 2];
    };
    const asMinCornerSwapXZ = (raw: [number, number, number], _dims: { l: number; w: number; h: number }): [number, number, number] => {
      return [raw[2], raw[1], raw[0]];
    };
    const asCenterSwapXZ = (raw: [number, number, number], dims: { l: number; w: number; h: number }): [number, number, number] => {
      return [raw[2] - dims.l / 2, raw[1] - dims.h / 2, raw[0] - dims.w / 2];
    };

    if (packedItemsData && packedItemsData.length > 0) {
      const interpretations = [
        { fn: asMinCorner, name: "min-corner (x=length,z=width)" },
        { fn: asCenter, name: "center (x=length,z=width)" },
        { fn: asMinCornerSwapXZ, name: "min-corner swapped X/Z" },
        { fn: asCenterSwapXZ, name: "center swapped X/Z" },
      ];
      const results = interpretations.map((it) => {
        const res = validateInterpretation(packedItemsData, it.fn);
        return { name: it.name, fn: it.fn, ok: res.ok, overflowCount: res.overflowCount };
      });
      const okInterpretation = results.find((r) => r.ok);
      if (okInterpretation) {
        console.info(`[ThreeJS] Using API interpretation: ${okInterpretation.name}`);
        const group = new THREE.Group();
        const colorList = ["#58A6FF", "#6BCB77", "#FFD93D", "#FF6B6B", "#9D5CFF", "#F0A500", "#4D96FF"];
        packedItemsData.forEach((item, idx) => {
          const l = Number(item.dimensions.length) || 0.1;
          const w = Number(item.dimensions.width) || 0.1;
          const h = Number(item.dimensions.height) || 0.1;
          const raw = parsePositionRaw(item.position);
          const [px, py, pz] = okInterpretation.fn(raw, { l, w, h });

          const geom = new THREE.BoxGeometry(l * sceneScale, h * sceneScale, w * sceneScale);
          const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(colorList[idx % colorList.length]),
            roughness: 0.6,
            metalness: 0.05,
          });
          const mesh = new THREE.Mesh(geom, mat);

          // convert min-corner to center and center into scene coordinates:
          const centerX = (px + l / 2 - containerLength / 2) * sceneScale;
          const centerY = (py + h / 2) * sceneScale;
          const centerZ = (pz + w / 2 - containerWidth / 2) * sceneScale;

          mesh.position.set(centerX, centerY, centerZ);
          group.add(mesh);
        });
        scene.add(group);
      } else {
        // none interpretation fully fit -> render with first interpretation (min-corner) but warn and clamp
        console.warn("[ThreeJS] No interpretation placed all boxes inside container. Falling back to 'min-corner' and clamping overflowing boxes. Interpretation results:", results);
        const group = new THREE.Group();
        const colorList = ["#58A6FF", "#6BCB77", "#FFD93D", "#FF6B6B", "#9D5CFF", "#F0A500", "#4D96FF"];
        packedItemsData.forEach((item, idx) => {
          const l = Number(item.dimensions.length) || 0.1;
          const w = Number(item.dimensions.width) || 0.1;
          const h = Number(item.dimensions.height) || 0.1;
          const raw = parsePositionRaw(item.position);
          // use min-corner interpretation
          let px = raw[0];
          let py = raw[1];
          let pz = raw[2];
          // clamp min to 0
          px = Math.max(0, px);
          py = Math.max(0, py);
          pz = Math.max(0, pz);
          // clamp max to container max
          if (px + l > containerLength) px = Math.max(0, containerLength - l);
          if (py + h > containerHeight) py = Math.max(0, containerHeight - h);
          if (pz + w > containerWidth) pz = Math.max(0, containerWidth - w);

          const geom = new THREE.BoxGeometry(l * sceneScale, h * sceneScale, w * sceneScale);
          const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(colorList[idx % colorList.length]),
            roughness: 0.6,
            metalness: 0.05,
            transparent: true,
            opacity: 0.95,
          });
          const mesh = new THREE.Mesh(geom, mat);
          const centerX = (px + l / 2 - containerLength / 2) * sceneScale;
          const centerY = (py + h / 2) * sceneScale;
          const centerZ = (pz + w / 2 - containerWidth / 2) * sceneScale;
          mesh.position.set(centerX, centerY, centerZ);
          group.add(mesh);
        });
        scene.add(group);
      }
    } else {
      // fallback simple greedy placement (same as before)
      const instances: { l: number; w: number; h: number; idx: number }[] = [];
      boxDimensions.forEach((b, ix) => {
        const qty = Math.max(1, Math.floor(Number(b.quantity) || 1));
        const L = convertToMeters(Number(b.length) || 0.1, b.unit);
        const W = convertToMeters(Number(b.width) || 0.1, b.unit);
        const H = convertToMeters(Number(b.height) || 0.1, b.unit);
        for (let i = 0; i < qty; i++) instances.push({ l: L, w: W, h: H, idx: ix });
      });

      const group = new THREE.Group();
      let cursorX = 0;
      let cursorZ = 0;
      let layerHeight = 0;
      const padding = 0.01;
      for (const it of instances) {
        if (cursorX + it.l > containerLength) {
          cursorX = 0;
          cursorZ += layerHeight + padding;
          layerHeight = 0;
        }
        if (cursorZ + it.w > containerWidth) {
          break;
        }
        const geom = new THREE.BoxGeometry(it.l * sceneScale, it.h * sceneScale, it.w * sceneScale);
        const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color("#9DD3FF") });
        const mesh = new THREE.Mesh(geom, mat);
        const centerX = (cursorX + it.l / 2 - containerLength / 2) * sceneScale;
        const centerY = (it.h / 2) * sceneScale;
        const centerZ = (cursorZ + it.w / 2 - containerWidth / 2) * sceneScale;
        mesh.position.set(centerX, centerY, centerZ);
        group.add(mesh);
        cursorX += it.l + padding;
        layerHeight = Math.max(layerHeight, it.w);
      }
      scene.add(group);
    }

    // OrbitControls (drag to rotate)
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 4;
    controls.maxDistance = 50;
    controls.target.set(0, (containerHeight * sceneScale) / 2, 0);
    controls.update();

    // animate
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    rafRef.current = requestAnimationFrame(animate);

    // resize
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current) return;
      const w2 = mountRef.current.clientWidth || 600;
      const h2 = mountRef.current.clientHeight || 400;
      rendererRef.current.setSize(w2, h2);
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    // cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        controls.dispose();
      } catch (e: unknown) {
        console.log(e);
      }
      try {
        renderer.forceContextLoss();
        const canvas = renderer.domElement;
        if (mount.contains(canvas)) mount.removeChild(canvas);
        renderer.dispose();
      } catch (e: unknown) {
        console.log(e);
      }
      rendererRef.current = null;
      sceneRef.current = null;
      controlsRef.current = null;
      rafRef.current = null;
    };
  }, [
    containerDimensions.length,
    containerDimensions.width,
    containerDimensions.height,
    containerDimensions.unit,
    packedItemsData,
    boxDimensions,
    maxInstances,
    showGrid,
  ]);

  const handleExportPNG = () => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    if (!renderer || !scene) return;
    const controlCam = controlsRef.current?.object as unknown as THREE.Camera | undefined;
    const cam = controlCam ?? (scene.children.find((c) => (c as unknown as THREE.Camera).isCamera) as THREE.Camera | undefined);

    if (!cam) {
      console.warn("No camera available for export.");
      return;
    }

    // preserve previous clear color and alpha
    const prevClearColor = renderer.getClearColor(new THREE.Color());
    const prevAlpha = renderer.getClearAlpha();
    renderer.setClearColor(new THREE.Color("#ffffff"), 1);
    renderer.render(scene, cam);
    const dataURL = renderer.domElement.toDataURL("image/png");
    // restore
    renderer.setClearColor(prevClearColor, prevAlpha);

    const link = document.createElement("a");
    link.download = `container-${Date.now().toString()}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      ref={mountRef}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        background: "transparent",
        position: "relative",
        ...style,
      }}
    >
      {/* Export button inside same relatively-positioned container so absolute works */}
      <button
        onClick={handleExportPNG}
        style={{ position: "absolute", top: 16, right: 16 }}
        className="bg-blue-400 md:w-56 cursor-pointer hover:bg-blue-500 py-2 text-white rounded"
      >
        Export PNG
      </button>
    </div>
  );
}
