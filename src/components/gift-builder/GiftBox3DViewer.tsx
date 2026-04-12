// src/components/gift-builder/GiftBox3DViewer.tsx
import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useTexture, Environment } from "@react-three/drei";
import * as THREE from "three";
import { Product } from "@/services/productsService";

const BOX_COLOR_HEX: Record<string, string> = {
  black: "#1a1a1a",
  gold: "#C9A84C",
  white: "#f0f0f0",
  rose_gold: "#B76E79",
};

const RIBBON_COLOR: Record<string, string> = {
  black: "#FFD700",
  gold: "#ffffff",
  white: "#C9A84C",
  rose_gold: "#ffffff",
};

const INTERIOR_COLOR = "#F5F0E8";

function getProductLayout(count: number) {
  const y = 0.15;
  switch (count) {
    case 1:
      return [{ pos: [0, y, 0] as [number, number, number], rot: [-0.1, 0, 0] as [number, number, number] }];
    case 2:
      return [
        { pos: [-0.45, y, 0] as [number, number, number], rot: [-0.1, 0.15, 0] as [number, number, number] },
        { pos: [0.45, y, 0] as [number, number, number], rot: [-0.1, -0.15, 0] as [number, number, number] },
      ];
    case 3:
      return [
        { pos: [-0.55, y, -0.15] as [number, number, number], rot: [-0.1, 0.2, 0] as [number, number, number] },
        { pos: [0, y, 0.2] as [number, number, number], rot: [-0.1, 0, 0] as [number, number, number] },
        { pos: [0.55, y, -0.15] as [number, number, number], rot: [-0.1, -0.2, 0] as [number, number, number] },
      ];
    default:
      return [
        { pos: [-0.45, y, -0.3] as [number, number, number], rot: [-0.1, 0.1, 0] as [number, number, number] },
        { pos: [0.45, y, -0.3] as [number, number, number], rot: [-0.1, -0.1, 0] as [number, number, number] },
        { pos: [-0.45, y, 0.3] as [number, number, number], rot: [-0.1, 0.15, 0] as [number, number, number] },
        { pos: [0.45, y, 0.3] as [number, number, number], rot: [-0.1, -0.15, 0] as [number, number, number] },
      ];
  }
}

function ProductCard({ imageUrl, position, rotation }: {
  imageUrl: string;
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  const texture = useTexture(imageUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[0.7, 0.9]} />
      <meshStandardMaterial map={texture} side={THREE.DoubleSide} roughness={0.5} />
    </mesh>
  );
}

function GiftBoxScene({
  products,
  boxColor,
  wrappingStyle,
  onFirstOpen,
}: {
  products: Product[];
  boxColor: string;
  wrappingStyle: string;
  onFirstOpen: () => void;
}) {
  const lidRef = useRef<THREE.Group>(null!);
  const [isOpen, setIsOpen] = useState(false);
  const targetRotation = isOpen ? -2.1 : 0;

  const boxHex = BOX_COLOR_HEX[boxColor] ?? BOX_COLOR_HEX.gold;
  const ribbonHex = RIBBON_COLOR[boxColor] ?? "#ffffff";
  const showRibbon = wrappingStyle === "ribbon";

  const boxMatProps = {
    color: boxHex,
    roughness: boxColor === "black" ? 0.7 : 0.15,
    metalness: boxColor === "gold" || boxColor === "rose_gold" ? 0.8 : boxColor === "black" ? 0.05 : 0.1,
    clearcoat: boxColor === "black" ? 0.2 : 1.0,
    clearcoatRoughness: boxColor === "black" ? 0.4 : 0.05,
    side: THREE.DoubleSide as THREE.Side,
  };

  const ribbonMatProps = {
    color: ribbonHex,
    roughness: 0.1,
    metalness: 0.5,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
  };

  useFrame(() => {
    if (!lidRef.current) return;
    lidRef.current.rotation.x +=
      (targetRotation - lidRef.current.rotation.x) * 0.06;
  });

  const handleClick = (e: THREE.Event) => {
    (e as unknown as { stopPropagation: () => void }).stopPropagation();
    setIsOpen((prev) => {
      if (!prev) onFirstOpen();
      return !prev;
    });
  };

  const layout = getProductLayout(Math.min(products.length, 4));
  const validProducts = products
    .slice(0, 4)
    .filter((p) => p.images?.[0]?.image_url);

  return (
    <group onClick={handleClick}>
      {/* ── Box body ── */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.5, 0.5, 2.5]} />
        <meshPhysicalMaterial {...boxMatProps} />
      </mesh>

      {/* Interior floor */}
      <mesh position={[0, -0.24, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.46, 2.46]} />
        <meshStandardMaterial color={INTERIOR_COLOR} roughness={0.85} />
      </mesh>

      {/* Tissue paper inside */}
      <mesh position={[-0.15, -0.18, 0.1]} rotation={[-Math.PI / 2 + 0.06, 0, 0.25]}>
        <planeGeometry args={[2.1, 2.1]} />
        <meshStandardMaterial
          color="#FFF8F0"
          roughness={0.9}
          side={THREE.DoubleSide}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* ── Products inside ── */}
      {validProducts.map((p, i) => {
        const l = layout[i];
        if (!l) return null;
        return (
          <Suspense key={p.id} fallback={null}>
            <ProductCard
              imageUrl={p.images![0].image_url}
              position={l.pos}
              rotation={l.rot}
            />
          </Suspense>
        );
      })}

      {/* ── Lid (hinged from back edge) ── */}
      <group ref={lidRef} position={[0, 0.25, -1.25]}>
        {/* Lid body — offset so back edge sits on pivot */}
        <mesh position={[0, 0.04, 1.25]} castShadow>
          <boxGeometry args={[2.5, 0.08, 2.5]} />
          <meshPhysicalMaterial {...boxMatProps} />
        </mesh>

        {/* Lid interior face */}
        <mesh position={[0, -0.001, 1.25]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.46, 2.46]} />
          <meshStandardMaterial color={INTERIOR_COLOR} roughness={0.85} />
        </mesh>

        {/* Ribbon on lid */}
        {showRibbon && (
          <>
            <mesh position={[0, 0.085, 1.25]}>
              <boxGeometry args={[2.52, 0.04, 0.15]} />
              <meshPhysicalMaterial {...ribbonMatProps} />
            </mesh>
            <mesh position={[0, 0.085, 1.25]}>
              <boxGeometry args={[0.15, 0.04, 2.52]} />
              <meshPhysicalMaterial {...ribbonMatProps} />
            </mesh>
            {/* Bow loops */}
            <mesh position={[-0.15, 0.12, 1.25]} rotation={[0, 0.5, 0]}>
              <torusGeometry args={[0.15, 0.035, 8, 16, Math.PI]} />
              <meshPhysicalMaterial {...ribbonMatProps} />
            </mesh>
            <mesh position={[0.15, 0.12, 1.25]} rotation={[0, -0.5, 0]}>
              <torusGeometry args={[0.15, 0.035, 8, 16, Math.PI]} />
              <meshPhysicalMaterial {...ribbonMatProps} />
            </mesh>
          </>
        )}
      </group>

      {/* Shadow floor */}
      <mesh position={[0, -0.26, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 8]} />
        <shadowMaterial opacity={0.2} />
      </mesh>
    </group>
  );
}

interface Props {
  products: Product[];
  boxColor: string;
  wrappingStyle: string;
  height?: number;
}

export default function GiftBox3DViewer({
  products,
  boxColor,
  wrappingStyle,
  height = 380,
}: Props) {
  const [hasOpened, setHasOpened] = useState(false);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{ height }}>
      <Canvas
        camera={{ position: [3.5, 3.0, 3.5], fov: 42 }}
        shadows
        gl={{ antialias: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-3, 4, -3]} intensity={0.4} />

        <Suspense fallback={null}>
          <GiftBoxScene
            products={products}
            boxColor={boxColor}
            wrappingStyle={wrappingStyle}
            onFirstOpen={() => setHasOpened(true)}
          />
          <Environment preset="studio" />
        </Suspense>

        <OrbitControls
          enableZoom
          enablePan
          enableRotate
          autoRotate
          autoRotateSpeed={1.0}
          minDistance={2.5}
          maxDistance={9}
          minPolarAngle={Math.PI / 8}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Canvas>

      {/* Tap hint */}
      {!hasOpened && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-4 py-1.5 rounded-full backdrop-blur-sm pointer-events-none animate-pulse">
          Tap the box to open
        </div>
      )}
    </div>
  );
}
