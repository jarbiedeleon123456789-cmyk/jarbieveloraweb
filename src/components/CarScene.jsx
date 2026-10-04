import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Grid, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ACCENT_HEX,
  ASSEMBLY_STEPS,
  BRAKE_OUT,
  CAR_PARTS,
  explodeFactor,
  WHEEL_OUT,
} from '../lib/carParts';

const wheelSpots = [
  { x: -0.96, z: -1.58 },
  { x: 0.96, z: -1.58 },
  { x: -0.96, z: 1.52 },
  { x: 0.96, z: 1.52 },
];

const bodyStations = [
  [-2.5, 0.61, 0.68, 0.28],
  [-2.26, 0.7, 0.79, 0.4],
  [-1.74, 0.76, 0.88, 0.48],
  [-1.15, 0.76, 0.91, 0.4],
  [-0.5, 0.76, 0.87, 0.36],
  [0.34, 0.76, 0.84, 0.36],
  [1.02, 0.76, 0.9, 0.43],
  [1.72, 0.74, 0.88, 0.46],
  [2.25, 0.68, 0.78, 0.39],
  [2.48, 0.6, 0.66, 0.26],
];

const wheelPart = CAR_PARTS.find((part) => part.key === 'wheels');
const brakePart = CAR_PARTS.find((part) => part.key === 'brakes');
const modelHighlightColor = new THREE.Color(ACCENT_HEX);

function getModelPart(mesh) {
  const names = [];
  let wheel = null;
  for (let node = mesh; node; node = node.parent) {
    const name = node.name.toLowerCase().replace(/[_\-.]+/g, ' ');
    names.push(name);
    if (!wheel && /^tire\s*[1-4]$/i.test(name)) wheel = name;
  }
  const name = names.join(' ');
  const meshName = mesh.name.toLowerCase().replace(/[_\-.]+/g, ' ');
  if (wheel) {
    if (/tread/i.test(meshName)) return { key: 'wheels', id: `tire-${wheel}`, order: 2 };
    if (/disc|brake/i.test(meshName)) return { key: 'brakes', id: `brake-${wheel}`, order: 4 };
    return { key: 'wheels', id: `rim-${wheel}`, order: 3 };
  }
  const standaloneBrake = names.find((partName) => /^brake ?rear ?left/i.test(partName));
  if (standaloneBrake) return { key: 'brakes', id: `brake-${standaloneBrake}`, order: 4 };
  if (/side mirrors/i.test(name)) return { key: 'body', id: 'side-mirrors', order: 9 };
  if (/engine glass/i.test(name)) return { key: 'body', id: 'engine-cover', order: 10 };
  if (/glass|glasses|window|windscreen/i.test(name)) return { key: 'glass', id: 'glass', order: 11 };
  if (/head\s*lights|headlights|run lights/i.test(name)) return { key: 'headlights', id: 'headlights', order: 12 };
  if (/tail lights|taillights|break lights|rear headlights/i.test(name)) return { key: 'taillights', id: 'taillights', order: 13 };
  if (/interior|steering|seats|seets|seat belt/i.test(name)) return { key: 'interior', id: 'interior', order: 5 };
  if (/brake|disk/i.test(name)) return { key: 'brakes', id: 'brakes', order: 4 };
  if (/under.*carreage|undercarriage/i.test(name)) return { key: 'body', id: 'lower-body-panels', order: 6 };
  if (/under|chassis|axle/i.test(name)) return { key: 'chassis', id: 'lower-shell', order: 0 };
  if (/black 005|black 2/i.test(meshName)) return { key: 'grilles', id: 'grilles', order: 14 };
  if (/grill|mesh/i.test(name)) return { key: 'grilles', id: 'grilles', order: 14 };
  if (/hood/i.test(name)) return { key: 'body', id: 'hood', order: 8 };
  if (/body/i.test(meshName)) return { key: 'body', id: 'upper-shell', order: 7 };
  if (/carbon fiber|viper|black 0$/i.test(meshName)) return { key: 'body', id: 'upper-shell', order: 7 };
  if (/chrome|exhaust|logo/i.test(name)) return { key: 'chrome', id: 'chrome', order: 15 };
  return { key: 'body', id: `detail-${mesh.name}`, order: 8 };
}

function makeEngineAssembly() {
  const engine = new THREE.Group();
  const materials = [
    new THREE.MeshStandardMaterial({ color: '#555b61', metalness: 0.88, roughness: 0.32 }),
    new THREE.MeshStandardMaterial({ color: '#b9bec4', metalness: 0.94, roughness: 0.2 }),
    new THREE.MeshPhysicalMaterial({ color: '#9d1520', metalness: 0.35, roughness: 0.28, clearcoat: 0.9 }),
    new THREE.MeshStandardMaterial({ color: '#16191d', metalness: 0.55, roughness: 0.38 }),
    new THREE.MeshStandardMaterial({ color: '#e0a83a', metalness: 0.82, roughness: 0.24 }),
  ];
  const mesh = (geometry, material, position, rotation = [0, 0, 0]) => {
    const part = new THREE.Mesh(geometry, material);
    part.position.set(...position);
    part.rotation.set(...rotation);
    part.castShadow = true;
    part.receiveShadow = true;
    engine.add(part);
  };

  mesh(new THREE.BoxGeometry(0.66, 0.24, 0.82), materials[0], [0, 0.06, 0]);
  mesh(new THREE.BoxGeometry(0.5, 0.12, 0.65), materials[3], [0, 0.22, -0.01]);
  for (const side of [-1, 1]) {
    const bank = new THREE.Group();
    bank.position.set(side * 0.19, 0.2, 0);
    bank.rotation.z = side * 0.18;
    engine.add(bank);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.12, 0.72), materials[0]);
    head.position.y = 0.02;
    head.castShadow = true;
    bank.add(head);
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.045, 0.62), materials[2]);
    cover.position.y = 0.105;
    cover.castShadow = true;
    bank.add(cover);
    for (let index = 0; index < 4; index += 1) {
      const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.035, 10), materials[4]);
      plug.position.set(side * -0.035, 0.14, -0.22 + index * 0.145);
      bank.add(plug);
    }
  }
  mesh(new THREE.BoxGeometry(0.28, 0.1, 0.3), materials[1], [0, 0.34, -0.02]);
  for (const side of [-1, 1]) {
    mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.44, 20), materials[1], [side * 0.32, 0.12, 0.06], [0, 0, Math.PI / 2]);
    mesh(new THREE.TorusGeometry(0.09, 0.018, 8, 24), materials[1], [side * 0.12, 0.1, -0.33], [Math.PI / 2, 0, 0]);
  }
  engine.position.set(0, 0.32, 1.08);
  return { engine, materials };
}

function buildCarModel(scene) {
  const source = scene.clone(true);
  source.updateMatrixWorld(true);
  const root = new THREE.Group();
  const groups = new Map();
  const meshes = [];
  source.traverse((object) => {
    if (object.isMesh) meshes.push(object);
  });

  const assign = (mesh, part) => {
    let group = groups.get(part.id);
    if (!group) {
      group = new THREE.Group();
      group.userData.modelKey = part.key;
      group.userData.order = part.order;
      group.userData.partId = part.id;
      root.add(group);
      groups.set(part.id, group);
    }
    const originals = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const materials = originals.map((material) => material.clone());
    mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.attach(mesh);
  };

  meshes.forEach((mesh) => {
    const part = getModelPart(mesh);
    assign(mesh, part);
  });

  const engineAssembly = makeEngineAssembly();
  const engineGroup = new THREE.Group();
  engineGroup.userData.modelKey = 'engine';
  engineGroup.userData.order = 1;
  engineGroup.userData.partId = 'engine';
  engineGroup.add(engineAssembly.engine);
  root.add(engineGroup);
  groups.set('engine', engineGroup);

  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const center = bounds.getCenter(new THREE.Vector3());
  root.position.set(-center.x, -bounds.min.y, -center.z);

  const parts = [...groups.entries()].map(([id, group]) => {
    const partBounds = new THREE.Box3().setFromObject(group);
    const centerOfPart = partBounds.getCenter(new THREE.Vector3());
    const key = group.userData.modelKey;
    let offset;
    if (id.startsWith('tire-') || id.startsWith('rim-') || id.startsWith('brake-')) {
      const direction = Math.sign(centerOfPart.x) || 1;
      if (id.startsWith('tire-')) offset = new THREE.Vector3(direction * 2.8, 0.8, centerOfPart.z < 0 ? -0.42 : 0.42);
      else if (id.startsWith('rim-')) offset = new THREE.Vector3(direction * 2.2, 0.25, centerOfPart.z < 0 ? -0.28 : 0.28);
      else offset = new THREE.Vector3(direction * 1.4, 0.62, centerOfPart.z < 0 ? -0.24 : 0.24);
    } else if (id.startsWith('detail-')) {
      offset = new THREE.Vector3(centerOfPart.x, centerOfPart.y - 0.45, centerOfPart.z * 0.35);
      if (offset.lengthSq() < 0.04) offset.set(0.2, 0.4, 0.2);
      offset.normalize().multiplyScalar(1.65);
    } else {
      const offsets = {
        'lower-shell': [0, -2.3, 0],
        'lower-body-panels': [0, -2.05, 0],
        'upper-shell': [0, 2.35, 0],
        hood: [0, 2.65, -0.9],
        'side-mirrors': [0, 2.15, 0.38],
        'engine-cover': [0, 2.6, 0.65],
        glass: [0, 3.0, 0],
        headlights: [0, 1.8, -2.25],
        taillights: [0, 1.65, 2.25],
        interior: [0, 1.45, 0],
        brakes: [0, 1.35, 0],
        chassis: [0, -1.8, 0],
        grilles: [0, -0.75, -1.8],
        chrome: [0, -0.8, 1.8],
        engine: [0, 2.05, 0.45],
      };
      offset = new THREE.Vector3(...(offsets[id] ?? offsets[key] ?? [0, 1.5, 0]));
    }
    return { id, group, key, order: group.userData.order, offset };
  });
  return { root, parts, customMaterials: engineAssembly.materials };
}

function RealCarModel({ simRef, reduced, hovered, hoveredPart, selected, selectedPart, onHover, onPick, onReady }) {
  const { scene } = useGLTF('/models/nova-r9.glb');
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls);
  const previousExplode = useRef(0);
  const model = useMemo(() => buildCarModel(scene), [scene]);
  const materials = useMemo(() => model.parts.flatMap(({ group, key, id }) => {
    const result = [];
    group.traverse((object) => {
      if (!object.isMesh) return;
      const list = Array.isArray(object.material) ? object.material : [object.material];
      list.forEach((material) => {
        result.push({
          material,
          key,
          id: group.userData.partId,
          emissive: material.emissive?.clone() ?? new THREE.Color('#000000'),
          intensity: material.emissiveIntensity ?? 0,
        });
      });
    });
    return result;
  }), [model]);

  useEffect(() => {
    onReady();
  }, [materials, onReady]);
  useEffect(() => () => {
    model.customMaterials.forEach((material) => material.dispose());
  }, [model]);

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hovered]);

  const getPartKey = useCallback((object) => {
    let current = object;
    while (current && current !== model.root) {
      if (current.userData.modelKey) return current.userData.modelKey;
      current = current.parent;
    }
    return null;
  }, [model]);
  const getPartId = useCallback((object) => {
    let current = object;
    while (current && current !== model.root) {
      if (current.userData.partId) return current.userData.partId;
      current = current.parent;
    }
    return null;
  }, [model]);

  useFrame((_, delta) => {
    const now = performance.now();
    let explodeAmount = 0;
    model.parts.forEach(({ group, order, offset }) => {
      const factor = reduced && simRef.current.phase !== 'scrubbed'
        ? (simRef.current.phase === 'exploded' ? 1 : 0)
        : explodeFactor(simRef.current, order, now);
      explodeAmount += factor;
      group.position.copy(offset).multiplyScalar(factor);
    });
    explodeAmount /= ASSEMBLY_STEPS.length;
    if (controls && Math.abs(explodeAmount - previousExplode.current) > 0.0005) {
      const viewControls = controls;
      const zoom = Math.min(1, delta * 2.5);
      viewControls.target.y += (0.88 + explodeAmount * 0.26 - viewControls.target.y) * zoom;
      const cameraOffset = camera.position.clone().sub(viewControls.target);
      const targetDistance = 10.8 + explodeAmount * 3.5;
      cameraOffset.setLength(cameraOffset.length() + (targetDistance - cameraOffset.length()) * zoom);
      camera.position.copy(viewControls.target).add(cameraOffset);
      viewControls.update();
    }
    previousExplode.current = explodeAmount;
    materials.forEach(({ material, key, id, emissive, intensity }) => {
      if (!material.emissive) return;
      const isSelectedPart = selectedPart ? selectedPart === id : selected === key;
      const isHoveredPart = hoveredPart ? hoveredPart === id : hovered === key;
      const highlight = isSelectedPart ? (selectedPart ? 0.12 : 0.055) : isHoveredPart ? (hoveredPart ? 0.07 : 0.035) : 0;
      material.emissive.copy(highlight ? modelHighlightColor : emissive);
      material.emissiveIntensity = intensity + highlight;
    });
  });

  return (
    <primitive
      object={model.root}
      onPointerOver={(event) => {
        const key = getPartKey(event.object);
        if (!key) return;
        event.stopPropagation();
        onHover(key, getPartId(event.object));
      }}
      onPointerOut={(event) => {
        if (getPartKey(event.object)) onHover(null, null);
      }}
      onClick={(event) => {
        const key = getPartKey(event.object);
        if (!key) return;
        event.stopPropagation();
        onPick(key, getPartId(event.object));
      }}
    />
  );
}

function loftSurface(stations, acrossSegments = 32, lengthSegments = 96) {
  const positions = [];
  const indices = [];
  const interpolate = (station, property, t) => {
    const scaled = t * (stations.length - 1);
    const start = Math.min(Math.floor(scaled), stations.length - 2);
    const fraction = scaled - start;
    const p0 = stations[Math.max(0, start - 1)][property];
    const p1 = stations[start][property];
    const p2 = stations[start + 1][property];
    const p3 = stations[Math.min(stations.length - 1, start + 2)][property];
    const t2 = fraction * fraction;
    const t3 = t2 * fraction;
    return 0.5 * (
      2 * p1 +
      (-p0 + p2) * fraction +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    );
  };

  for (let length = 0; length <= lengthSegments; length += 1) {
    const along = length / lengthSegments;
    const z = interpolate(0, 0, along);
    const center = interpolate(0, 1, along);
    const width = Math.max(0.01, interpolate(0, 2, along));
    const crown = interpolate(0, 3, along);
    for (let across = 0; across <= acrossSegments; across += 1) {
      const side = across / acrossSegments * 2 - 1;
      const shoulder = Math.pow(Math.max(0, 1 - side * side), 0.67);
      positions.push(side * width, center + crown * shoulder, z);
    }
  }

  const row = acrossSegments + 1;
  for (let length = 0; length < lengthSegments; length += 1) {
    for (let across = 0; across < acrossSegments; across += 1) {
      const a = length * row + across;
      const b = a + row;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function GlassPanel({ points, material }) {
  const geometry = useMemo(() => {
    const shape = new THREE.BufferGeometry();
    shape.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    shape.setIndex([0, 1, 2, 0, 2, 3]);
    shape.computeVertexNormals();
    return shape;
  }, [points]);
  return <mesh geometry={geometry} material={material} castShadow />;
}

function FrameBar({ start, end, material, radius = 0.035 }) {
  const frame = useMemo(() => {
    const from = new THREE.Vector3(...start);
    const to = new THREE.Vector3(...end);
    const direction = to.clone().sub(from);
    return {
      midpoint: from.add(to).multiplyScalar(0.5),
      length: direction.length(),
      rotation: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()),
    };
  }, [end, start]);

  return (
    <mesh position={frame.midpoint} quaternion={frame.rotation} castShadow>
      <cylinderGeometry args={[radius, radius * 1.15, frame.length, 12]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function WheelAssembly({ spot, index, simRef, reduced, selected, hovered, onHover, onPick }) {
  const tireRef = useRef(null);
  const rotorRef = useRef(null);
  const partMaterials = useRef([]);
  const side = Math.sign(spot.x);
  const wheelOffset = [side * WHEEL_OUT, 0.2 + index % 2 * 0.12, spot.z > 0 ? 0.2 : -0.2];
  const rotorOffset = [side * BRAKE_OUT, 0.75, 0];
  const tireMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#111318', roughness: 0.72, metalness: 0.04 }), []);
  const alloyMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c8cdd3', metalness: 0.88, roughness: 0.24 }), []);
  const darkAlloy = useMemo(() => new THREE.MeshStandardMaterial({ color: '#30353d', metalness: 0.82, roughness: 0.3 }), []);
  const rotorMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8f969d', metalness: 0.84, roughness: 0.38 }), []);
  const caliperMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#cf2430', metalness: 0.4, roughness: 0.32 }), []);
  const lugMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e4e8ed', metalness: 0.9, roughness: 0.2 }), []);

  useEffect(() => {
    const entries = [];
    [rotorRef.current, tireRef.current].forEach((root, index) => {
      const part = index === 0 ? 'brakes' : 'wheels';
      root?.traverse((child) => {
        if (!child.isMesh) return;
        const original = child.material;
        const originals = Array.isArray(original) ? original : [original];
        const clones = originals.map((material) => {
          const clone = material.clone();
          entries.push({
            material: clone,
            part,
            baseEmissive: clone.emissive?.getHex() ?? 0,
            baseIntensity: clone.emissiveIntensity ?? 0,
          });
          return clone;
        });
        child.material = Array.isArray(original) ? clones : clones[0];
      });
    });
    partMaterials.current = entries;
    return () => entries.forEach(({ material }) => material.dispose());
  }, []);

  useFrame((_, delta) => {
    const factor = (order) => reduced && simRef.current.phase !== 'scrubbed'
      ? (simRef.current.phase === 'exploded' ? 1 : 0)
      : explodeFactor(simRef.current, order, performance.now());
    if (tireRef.current) {
      const amount = factor(wheelPart.order);
      tireRef.current.position.set(spot.x + wheelOffset[0] * amount, spot.y + wheelOffset[1] * amount, spot.z + wheelOffset[2] * amount);
      tireRef.current.rotation.x = amount * Math.PI * 3;
    }
    if (rotorRef.current) {
      const amount = factor(brakePart.order);
      rotorRef.current.position.set(spot.x + rotorOffset[0] * amount, spot.y + rotorOffset[1] * amount, spot.z + rotorOffset[2] * amount);
    }

    partMaterials.current.forEach(({ material, part, baseEmissive, baseIntensity }) => {
      if (!material.emissive) return;
      const target = selected === part ? 0.5 : hovered === part ? 0.22 : 0;
      material.emissive.setHex(target > 0.01 ? ACCENT_HEX : baseEmissive);
      material.emissiveIntensity += ((target > 0.01 ? baseIntensity + target : baseIntensity) - material.emissiveIntensity) * Math.min(1, delta * 10);
    });
  });

  return (
    <>
      <group
        ref={rotorRef}
        position={[spot.x, spot.y, spot.z]}
        onPointerOver={(event) => { event.stopPropagation(); onHover('brakes'); }}
        onPointerOut={() => onHover(null)}
        onClick={(event) => { event.stopPropagation(); onPick('brakes'); }}
      >
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.405, 0.405, 0.075, 56]} />
          <meshStandardMaterial color={rotorMaterial.color} metalness={rotorMaterial.metalness} roughness={rotorMaterial.roughness} emissive="#000000" />
        </mesh>
        <mesh position={[side * 0.035, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.205, 0.205, 0.12, 32]} />
          <primitive object={darkAlloy} attach="material" />
        </mesh>
        {Array.from({ length: 12 }, (_, hole) => {
          const angle = hole / 12 * Math.PI * 2;
          return (
            <mesh key={hole} position={[side * 0.044, Math.cos(angle) * 0.316, Math.sin(angle) * 0.316]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.018, 0.018, 0.008, 8]} />
              <meshBasicMaterial color="#353940" />
            </mesh>
          );
        })}
        <mesh position={[side * 0.12, 0.04, 0.14]}>
          <boxGeometry args={[0.2, 0.3, 0.15]} />
          <meshStandardMaterial color={caliperMaterial.color} metalness={0.4} roughness={0.32} emissive="#000000" />
        </mesh>
      </group>

      <group
        ref={tireRef}
        position={[spot.x, spot.y, spot.z]}
        onPointerOver={(event) => { event.stopPropagation(); onHover('wheels'); }}
        onPointerOut={() => onHover(null)}
        onClick={(event) => { event.stopPropagation(); onPick('wheels'); }}
      >
        <mesh rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
          <torusGeometry args={[0.455, 0.15, 24, 64]} />
          <meshPhysicalMaterial color={tireMaterial.color} roughness={0.76} metalness={0.04} />
        </mesh>
        {[0.38, 0.405, 0.43].map((radius) => (
          <mesh key={radius} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[radius, 0.006, 6, 56]} />
            <meshStandardMaterial color="#34373c" roughness={0.8} />
          </mesh>
        ))}
        <mesh rotation={[0, Math.PI / 2, 0]} castShadow>
          <torusGeometry args={[0.34, 0.035, 10, 56]} />
          <meshStandardMaterial color={alloyMaterial.color} metalness={0.88} roughness={0.24} emissive="#000000" />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.33, 0.33, 0.18, 48]} />
          <meshStandardMaterial color={darkAlloy.color} metalness={0.84} roughness={0.28} emissive="#000000" />
        </mesh>
        {Array.from({ length: 10 }, (_, spoke) => (
          <group key={spoke} rotation={[spoke * Math.PI / 5, 0, 0]}>
            <mesh position={[0, 0.17, 0]} rotation={[0, 0, -0.15]} castShadow>
              <boxGeometry args={[0.105, 0.34, 0.055]} />
              <meshStandardMaterial color={alloyMaterial.color} metalness={0.88} roughness={0.22} emissive="#000000" />
            </mesh>
            <mesh position={[0, 0.13, 0.032]}>
              <boxGeometry args={[0.027, 0.2, 0.01]} />
              <meshBasicMaterial color="#f2f4f7" />
            </mesh>
          </group>
        ))}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.115, 0.115, 0.21, 32]} />
          <meshStandardMaterial color="#aeb5be" metalness={0.9} roughness={0.2} emissive="#000000" />
        </mesh>
        {Array.from({ length: 5 }, (_, lug) => {
          const angle = lug / 5 * Math.PI * 2;
          return (
            <mesh key={lug} position={[side * 0.12, Math.cos(angle) * 0.075, Math.sin(angle) * 0.075]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.018, 0.018, 0.015, 8]} />
              <primitive object={lugMaterial} attach="material" />
            </mesh>
          );
        })}
      </group>
    </>
  );
}

function AssemblyPart({ part, simRef, reduced, selected, hovered, onHover, onPick, offset = [0, 0, 0], children }) {
  const ref = useRef(null);
  const base = useRef(new THREE.Vector3());
  const partMaterials = useRef([]);
  const offsetVector = useMemo(() => new THREE.Vector3(...offset), [offset]);
  const order = CAR_PARTS.find((item) => item.key === part).order;

  useEffect(() => {
    const object = ref.current;
    if (!object) return undefined;
    const replacements = [];
    object.traverse((child) => {
      if (!child.isMesh) return;
      const original = child.material;
      const originals = Array.isArray(original) ? original : [original];
      const clones = originals.map((material) => {
        const clone = material.clone();
        replacements.push({ material: clone, baseEmissive: clone.emissive?.getHex() ?? 0, baseIntensity: clone.emissiveIntensity ?? 0 });
        return clone;
      });
      child.material = Array.isArray(original) ? clones : clones[0];
    });
    partMaterials.current = replacements;
    return () => {
      replacements.forEach(({ material }) => material.dispose());
    };
  }, []);

  useFrame((_, delta) => {
    if (!ref.current) return;
    if (base.current.lengthSq() === 0) base.current.copy(ref.current.position);
    const factor = reduced && simRef.current.phase !== 'scrubbed'
      ? (simRef.current.phase === 'exploded' ? 1 : 0)
      : explodeFactor(simRef.current, order, performance.now());
    ref.current.position.copy(base.current).addScaledVector(offsetVector, factor);
    const target = selected === part ? 0.5 : hovered === part ? 0.22 : 0;
    partMaterials.current.forEach(({ material, baseEmissive, baseIntensity }) => {
      if (!material.emissive) return;
      material.emissive.setHex(target > 0.01 ? ACCENT_HEX : baseEmissive);
      material.emissiveIntensity += ((target > 0.01 ? baseIntensity + target : baseIntensity) - material.emissiveIntensity) * Math.min(1, delta * 10);
    });
  });

  return (
    <group
      ref={ref}
      onPointerOver={(event) => { event.stopPropagation(); onHover(part); }}
      onPointerOut={() => onHover(null)}
      onClick={(event) => { event.stopPropagation(); onPick(part); }}
    >
      {children}
    </group>
  );
}

function BodyShell({ material }) {
  const geometry = useMemo(() => loftSurface(bodyStations), []);
  return <mesh geometry={geometry} material={material} castShadow receiveShadow />;
}

function CarModel({ simRef, reduced, hovered, selected, onHover, onPick }) {
  const paint = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#b20d20',
    metalness: 0.72,
    roughness: 0.25,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    emissive: '#000000',
  }), []);
  const carbon = useMemo(() => new THREE.MeshStandardMaterial({ color: '#11151a', metalness: 0.42, roughness: 0.4, emissive: '#000000' }), []);
  const glass = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#142432', metalness: 0.46, roughness: 0.12, transparent: true, opacity: 0.82, clearcoat: 1, side: THREE.DoubleSide }), []);
  const chrome = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d9dee5', metalness: 0.94, roughness: 0.16, emissive: '#000000' }), []);
  const rubber = useMemo(() => new THREE.MeshStandardMaterial({ color: '#111216', roughness: 0.74 }), []);
  const redLight = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ee1729', emissive: '#9e0610', emissiveIntensity: 0.8 }), []);
  const headlight = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d9f0ff', emissive: '#91cfff', emissiveIntensity: 1.25 }), []);

  return (
    <group>
      <AssemblyPart part="chassis" simRef={simRef} reduced={reduced} selected={selected} hovered={hovered} onHover={onHover} onPick={onPick} offset={[0, -1.1, 0]}>
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.48, 0.3, 4.45]} />
          <primitive object={carbon} attach="material" />
        </mesh>
        <mesh position={[0, 0.8, 0.22]} castShadow>
          <boxGeometry args={[1.55, 0.16, 3.25]} />
          <primitive object={carbon} attach="material" />
        </mesh>
        {[-0.68, 0.68].map((x) => (
          <mesh key={x} position={[x, 0.68, 0.12]} castShadow>
            <boxGeometry args={[0.09, 0.28, 4.2]} />
            <primitive object={chrome} attach="material" />
          </mesh>
        ))}
        {[...wheelSpots].map((spot, index) => (
          <mesh key={index} position={[spot.x, 0.64, spot.z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.12, 0.12, 0.13, 16]} />
            <primitive object={chrome} attach="material" />
          </mesh>
        ))}
      </AssemblyPart>

      <AssemblyPart part="body" simRef={simRef} reduced={reduced} selected={selected} hovered={hovered} onHover={onHover} onPick={onPick} offset={[0, 1.2, 0]}>
        <BodyShell material={paint} />
        <mesh position={[0, 1.61, 0.05]} castShadow>
          <boxGeometry args={[0.91, 0.12, 0.9]} />
          <primitive object={paint} attach="material" />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side}>
            <FrameBar start={[side * 0.68, 1.02, -0.99]} end={[side * 0.48, 1.62, -0.35]} material={paint} radius={0.045} />
            <FrameBar start={[side * 0.48, 1.62, -0.35]} end={[side * 0.68, 1.19, 0.79]} material={paint} radius={0.045} />
            <FrameBar start={[side * 0.68, 1.19, 0.79]} end={[side * 0.78, 1.05, 1.02]} material={paint} radius={0.05} />
          </group>
        ))}
        <mesh position={[0, 0.69, -2.22]} castShadow>
          <boxGeometry args={[1.2, 0.1, 0.28]} />
          <primitive object={carbon} attach="material" />
        </mesh>
        <mesh position={[0, 0.66, -2.3]} castShadow>
          <boxGeometry args={[1.45, 0.07, 0.19]} />
          <primitive object={chrome} attach="material" />
        </mesh>
        {[-0.88, 0.88].map((x) => (
          <group key={x}>
            <mesh position={[x, 0.87, 0.08]} castShadow>
              <boxGeometry args={[0.11, 0.13, 3.05]} />
              <primitive object={paint} attach="material" />
            </mesh>
            <mesh position={[x * 1.08, 0.88, 0.02]} castShadow>
              <boxGeometry args={[0.14, 0.08, 2.4]} />
              <primitive object={carbon} attach="material" />
            </mesh>
          </group>
        ))}
        {wheelSpots.map((spot, index) => (
          <mesh key={index} position={[spot.x, 0.78, spot.z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.53, 0.13, 14, 48, Math.PI]} />
            <primitive object={paint} attach="material" />
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.94, 1.07, -0.16]} rotation={[0, side * 0.1, side * 0.12]}>
            <mesh castShadow><boxGeometry args={[0.1, 0.09, 0.3]} /><primitive object={carbon} attach="material" /></mesh>
            <mesh position={[side * 0.08, 0.06, -0.04]} castShadow><boxGeometry args={[0.2, 0.055, 0.16]} /><primitive object={paint} attach="material" /></mesh>
          </group>
        ))}
        <mesh position={[0, 0.57, 2.3]} castShadow>
          <boxGeometry args={[1.28, 0.09, 0.18]} />
          <primitive object={carbon} attach="material" />
        </mesh>
      </AssemblyPart>

      <AssemblyPart part="interior" simRef={simRef} reduced={reduced} selected={selected} hovered={hovered} onHover={onHover} onPick={onPick} offset={[0, 1.15, 0]}>
        {[-0.39, 0.39].map((x) => (
          <group key={x} position={[x, 0.91, 0.24]} rotation={[-0.1, 0, 0]}>
            <mesh position={[0, 0.18, 0.04]} castShadow>
              <boxGeometry args={[0.34, 0.36, 0.13]} />
              <meshStandardMaterial color="#27282b" roughness={0.58} />
            </mesh>
            <mesh position={[0, 0.37, 0.1]} rotation={[-0.16, 0, 0]} castShadow>
              <boxGeometry args={[0.34, 0.57, 0.12]} />
              <meshStandardMaterial color="#17181b" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.37, 0.164]}>
              <boxGeometry args={[0.024, 0.48, 0.008]} />
              <meshStandardMaterial color="#a92029" roughness={0.38} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 1.11, -0.47]} castShadow>
          <boxGeometry args={[1.15, 0.18, 0.24]} />
          <meshStandardMaterial color="#17191e" roughness={0.36} />
        </mesh>
        <mesh position={[-0.45, 1.25, -0.31]} rotation={[Math.PI / 2.3, 0, 0.2]}>
          <torusGeometry args={[0.19, 0.035, 10, 40]} />
          <primitive object={chrome} attach="material" />
        </mesh>
        <mesh position={[0, 1.02, 0.95]} castShadow>
          <boxGeometry args={[0.42, 0.17, 0.7]} />
          <primitive object={carbon} attach="material" />
        </mesh>
      </AssemblyPart>

      <AssemblyPart part="glass" simRef={simRef} reduced={reduced} selected={selected} hovered={hovered} onHover={onHover} onPick={onPick} offset={[0, 1.8, -0.15]}>
        <GlassPanel points={[[-0.68, 1.04, -0.99], [0.68, 1.04, -0.99], [0.48, 1.62, -0.35], [-0.48, 1.62, -0.35]]} material={glass} />
        <GlassPanel points={[[-0.48, 1.62, -0.31], [0.48, 1.62, -0.31], [0.68, 1.19, 0.79], [-0.68, 1.19, 0.79]]} material={glass} />
        <GlassPanel points={[[-0.7, 1.02, -0.9], [-0.5, 1.55, -0.32], [-0.7, 1.28, 0.62], [-0.85, 1.02, 0.4]]} material={glass} />
        <GlassPanel points={[[0.7, 1.02, -0.9], [0.5, 1.55, -0.32], [0.7, 1.28, 0.62], [0.85, 1.02, 0.4]]} material={glass} />
        <mesh position={[0, 1.64, -0.31]} castShadow>
          <boxGeometry args={[0.96, 0.11, 0.15]} />
          <primitive object={paint} attach="material" />
        </mesh>
        <mesh position={[0, 1.2, 0.79]} castShadow>
          <boxGeometry args={[1.37, 0.1, 0.12]} />
          <primitive object={paint} attach="material" />
        </mesh>
      </AssemblyPart>

      <AssemblyPart part="headlights" simRef={simRef} reduced={reduced} selected={selected} hovered={hovered} onHover={onHover} onPick={onPick} offset={[0, 0.7, -1.8]}>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.56, 0.84, -2.03]} rotation={[0.18, side * 0.12, 0]}>
            <mesh castShadow>
              <capsuleGeometry args={[0.092, 0.31, 6, 18]} />
              <primitive object={carbon} attach="material" />
            </mesh>
            <mesh position={[0, 0.02, -0.058]} rotation={[Math.PI / 2, 0, 0]}>
              <capsuleGeometry args={[0.051, 0.27, 5, 16]} />
              <primitive object={headlight} attach="material" />
            </mesh>
          </group>
        ))}
      </AssemblyPart>

      <AssemblyPart part="taillights" simRef={simRef} reduced={reduced} selected={selected} hovered={hovered} onHover={onHover} onPick={onPick} offset={[0, 0.65, 1.75]}>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.55, 0.82, 2.19]} rotation={[0, 0, side * 0.1]}>
            <mesh castShadow><cylinderGeometry args={[0.115, 0.115, 0.075, 32]} /><primitive object={carbon} attach="material" /></mesh>
            <mesh position={[0, 0, 0.045]}><cylinderGeometry args={[0.075, 0.075, 0.02, 32]} /><primitive object={redLight} attach="material" /></mesh>
          </group>
        ))}
      </AssemblyPart>

      <AssemblyPart part="grilles" simRef={simRef} reduced={reduced} selected={selected} hovered={hovered} onHover={onHover} onPick={onPick} offset={[0, -0.4, -1.55]}>
        <mesh position={[0, 0.55, -2.37]} castShadow>
          <boxGeometry args={[0.54, 0.16, 0.075]} />
          <primitive object={carbon} attach="material" />
        </mesh>
        {Array.from({ length: 6 }, (_, index) => (
          <mesh key={index} position={[-0.22 + index * 0.088, 0.55, -2.416]}>
            <boxGeometry args={[0.026, 0.125, 0.014]} />
            <meshStandardMaterial color="#53606d" metalness={0.5} roughness={0.5} />
          </mesh>
        ))}
      </AssemblyPart>

      <AssemblyPart part="chrome" simRef={simRef} reduced={reduced} selected={selected} hovered={hovered} onHover={onHover} onPick={onPick} offset={[0, -0.35, 1.65]}>
        {[-0.32, 0, 0.32].map((x) => (
          <mesh key={x} position={[x, 0.68, 2.39]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.085, 0.11, 0.2, 32, 1, true]} />
            <primitive object={chrome} attach="material" />
          </mesh>
        ))}
        <mesh position={[0, 0.93, 1.63]} castShadow>
          <boxGeometry args={[1.2, 0.035, 0.055]} />
          <primitive object={chrome} attach="material" />
        </mesh>
      </AssemblyPart>

      {wheelSpots.map((spot, index) => (
        <WheelAssembly
          key={index}
          spot={{ ...spot, y: 0.62 }}
          index={index}
          simRef={simRef}
          reduced={reduced}
          selected={selected}
          hovered={hovered}
          onHover={onHover}
          onPick={onPick}
        />
      ))}
    </group>
  );
}

export function CarScene({ simRef, reduced, hovered, hoveredPart, selected, selectedPart, onHover, onPick, onReady, autoRotate }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const environment = new RoomEnvironment();
    const target = pmrem.fromScene(environment, 0.04);
    scene.environment = target.texture;
    return () => {
      scene.environment = null;
      target.dispose();
      pmrem.dispose();
      environment.dispose();
    };
  }, [gl, scene]);

  return (
    <>
      <color attach="background" args={['#07090c']} />
      <fog attach="fog" args={['#07090c', 12, 26]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[6, 9, 5]} intensity={2} color="#fff2da" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-7, 5, -6]} intensity={0.95} color="#9fcde4" />
      <spotLight position={[0, 8, -8]} angle={0.58} penumbra={0.82} intensity={36} color="#ffd21f" distance={26} />
      <spotLight position={[5, 5, 7]} angle={0.7} penumbra={1} intensity={18} color="#c3d8ff" distance={22} />
      <Suspense fallback={null}>
        <RealCarModel
          simRef={simRef}
          reduced={reduced}
          hovered={hovered}
          hoveredPart={hoveredPart}
          selected={selected}
          selectedPart={selectedPart}
          onHover={onHover}
          onPick={onPick}
          onReady={onReady}
        />
      </Suspense>
      <ContactShadows position={[0, 0.01, 0]} opacity={0.72} scale={11} blur={2.6} far={3.2} resolution={256} color="#000000" />
      <Grid
        position={[0, 0, 0]}
        args={[30, 30]}
        cellSize={0.6}
        cellThickness={0.5}
        cellColor="#1b232d"
        sectionSize={3}
        sectionThickness={0.9}
        sectionColor="#2c3947"
        fadeDistance={17}
        fadeStrength={2.4}
        infiniteGrid
      />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={4}
        maxDistance={13}
        maxPolarAngle={1.48}
        target={[0, 0.9, 0]}
        autoRotate={autoRotate && !reduced}
        autoRotateSpeed={0.75}
      />
    </>
  );
}
