import { useSphere, Triplet } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';
import { button, useControls } from 'leva';
import palettes from 'nice-color-palettes';
import { useMemo, useState } from 'react';
import { Mesh } from 'three';

const palette = palettes[Math.floor(Math.random() * (palettes.length - 1))];

interface BallInfo {
  position: Triplet;
  color: string;
  radius: number;
}

function generateRandomBall(): BallInfo {
  return {
    position: [(0.5 - Math.random()) * 50, 20 + (0.5 - Math.random()) * 50, (0.5 - Math.random()) * 50],
    color: palette[Math.floor(Math.random() * (palette.length - 1))],
    radius: Math.random() * 5,
  };
}

export function Balls() {
  const [balls, setBalls] = useState<BallInfo[]>(() => Array.from({ length: 3 }).map(generateRandomBall));
  const addRandomBall = () => setBalls((currBalls) => [...currBalls, generateRandomBall()]);
  const { flood } = useControls({ addBall: button(addRandomBall), flood: false });
  useFrame(({ clock }) => {
    const elapsedTime = clock.getElapsedTime();
    if (flood && Math.floor(elapsedTime * 10) % 2 === 0) addRandomBall();
  });
  return (
    <>
      {balls.map((ballInfo, i) => <Ball key={i} {...ballInfo} />)}
    </>
  );
}

interface BallProps {
  position?: Triplet;
  color: string;
  radius: number;
}

function Ball({ position = [0, 1, 0], color, radius }: BallProps) {
  const sound = useMemo(() => new Audio('/sounds/knock.wav'), []);
  const playAudio = (collision: { contact: { impactVelocity: number } }) => {
    if (collision.contact.impactVelocity > 1.5) {
      sound.volume = radius / 5;
      sound.play();
    }
  };
  const [ref] = useSphere<Mesh>(() => ({ mass: 1, args: [radius], position, friction: 0.1, onCollide: playAudio }));
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
