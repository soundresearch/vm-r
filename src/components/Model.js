import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const sounds = {
    cancel: new Audio('/vm-r/gen_cancel.wav'),
    check: new Audio('/vm-r/gen_check.wav'),
    emoji: new Audio('/vm-r/gen_emoji.wav'),
};

export function Model({ setIsLoading, setMessage, resetPos, setResetPos, setAnimationComplete, selectedButton, setSelectedButton, setCursorStyle, ...props }) {
  const { nodes, materials } = useGLTF('/vm-r/vending-machine.glb');
  const [triggerAnimation, setTriggerAnimation] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [disableButtons, setDisableButtons] = useState(false);
  const [hoveredButton, setHoveredButton] = useState('');

  // Wait for vending machine to load
  useEffect(() => {
    setIsLoading(false);
  }, [setIsLoading]);

    useEffect(() => {
        // Preload audio files
        Object.values(sounds).forEach(sound => {
            sound.preload = 'auto';
        });
    }, []);

    const playSound = (soundKey) => {
        const sound = sounds[soundKey];
        if (sound) {
            sound.currentTime = 0; 
            sound.play().catch(error => {
                console.error('Playback error:', error);
            });
        }
    };

  // Store original positions
  const positions = useMemo(() => ({
    'smiley': [1.081, 6.138, 0.368],
    'sparkle_heart': [1.111, 4.965, 0.368],
    'heart_smiley': [1.139, 3.738, -0.643],
    'sad_smiley': [1.096, 2.564, 1.38],
    'three_hearts': [1.086, 3.756, 0.368]
  }), []);

  // References to the dispensable mesh
  const meshRefs = useRef({
    'smiley': null,
    'sparkle_heart': null,
    'heart_smiley': null,
    'sad_smiley': null,
    'three_hearts': null
  });

  // Animation offsets
  const offsets = {
    'smiley': { corner: [0.5, 0, 0], end: [0.5, -5.2, 0] },
    'sparkle_heart': { corner: [0.5, 0, 0], end: [0.5, -4, 0] },
    'heart_smiley': { corner: [0.5, 0, 0], end: [0.5, -2.8, 0] },
    'sad_smiley': { corner: [0.5, 0, 0], end: [0.5, -1.6, 0] },
    'three_hearts': { corner: [0.5, 0, 0], end: [0.5, -2.8, 0] }
  };

  // Duration of the second animation segment - dependent on how far the emoji is falling
  const segmentDurations = {
    'smiley': 1500,
    'sparkle_heart': 1200,
    'heart_smiley': 900,
    'sad_smiley': 600,
    'three_hearts': 900
  }

  // Check if it's time to reset the positions
  useEffect(() => {
    const resetPositions = () => {
      Object.keys(meshRefs.current).forEach(key => {
        const mesh = meshRefs.current[key];
        if (mesh) {
          mesh.position.set(...positions[key]);
        }
      });
    };

    if (resetPos) {
      resetPositions();
      setResetPos(false);
    }
  }, [resetPos, setResetPos, positions]);

  // Emoji animations
  useFrame((state, delta) => {
    if (triggerAnimation) {
      const offsetPositions = offsets[selectedButton];
      const group = meshRefs.current[selectedButton];
      const firstSegmentDuration = 500; // Duration for first segment (original to corner) in milliseconds
      const secondSegmentDuration = segmentDurations[selectedButton]; // Duration for second segment (corner to end) in milliseconds
  
      if (group) {
        const originalPosition = new THREE.Vector3(...positions[selectedButton]);
        const cornerPosition = originalPosition.clone().add(new THREE.Vector3(...offsetPositions.corner));
        const endPosition = originalPosition.clone().add(new THREE.Vector3(...offsetPositions.end));
  
        let targetPosition = new THREE.Vector3();
        const totalDuration = firstSegmentDuration + secondSegmentDuration;
  
        const progressIncrement = delta / (totalDuration / 1000);
        const newProgress = Math.min(animationProgress + progressIncrement, 1);
        setAnimationProgress(newProgress);
  
        if (newProgress < firstSegmentDuration / totalDuration) {
          // First half of the L shape: move to the corner
          const segmentProgress = newProgress / (firstSegmentDuration / totalDuration);
          targetPosition.lerpVectors(originalPosition, cornerPosition, segmentProgress);
        } else {
          // Second half of the L shape: move to the end position
          const segmentProgress = (newProgress - firstSegmentDuration / totalDuration) / (secondSegmentDuration / totalDuration);
          targetPosition.lerpVectors(cornerPosition, endPosition, segmentProgress);
        }
  
        group.position.copy(targetPosition);
  
        // Stop moving if close enough to end position and animation is complete
        if (newProgress >= 1) {
          group.position.copy(endPosition);
          setTriggerAnimation(false);
          setAnimationProgress(0); // Reset progress for next animation
          // Pause before opening popup
          setTimeout(() => {
            setAnimationComplete(true);
            setDisableButtons(false);
          }, 1500);
        }
      }
    }
  });

  // Function to handle hovering over a button
  const handleHoverIn = (buttonName) => {
    if (!disableButtons) {
      setCursorStyle('pointer');
      setHoveredButton(buttonName);
    }
  };

  // Function to handle hovering out of a button
  const handleHoverOut = () => {
    if (!disableButtons) {
      setCursorStyle('auto');
      setHoveredButton('');
    }
  };

  // Function to handle clicking on a button
  const handleClick = (buttonName) => {
    if (!disableButtons) {
      if (buttonName === 'cancel') {
        playSound('cancel');
        // Clear the selected button
        setSelectedButton('');
      } else if (buttonName === 'ok') {
        if (selectedButton === '') {
          setMessage('Please select one of the emoji buttons.');
          console.log('Please make a selection');
        } else {
            playSound('check');
          // trigger animation of selected button
          setCursorStyle('auto');
          setTriggerAnimation(true);
          setDisableButtons(true); // Don't allow button clicks when animation is running
        }
      } 
      else {
        setMessage('');
        playSound('emoji');
        // Set the selected button
        setSelectedButton(buttonName);
      }
    }
  };

  // Apply glow effect when selected
  const getMaterialWithGlow = (buttonName, materialName) => {
    const isActive = selectedButton === buttonName;
    const material = materials[materialName];
    if (material) {
      const newMaterial = material.clone();
      newMaterial.emissive = isActive ? new THREE.Color('#fae') : new THREE.Color('black');
      newMaterial.emissiveIntensity = isActive ? 0.25 : 0;
      return newMaterial;
    }
    return material;
  };

  return (
    <group {...props} dispose={null} position={[0, -3, 0]}>

        {/************/}
        {/************/}
        {/** BUTTONS */}
        {/************/}
        {/************/}

        {/** OKAY BUTTON */}
        <mesh
            onPointerOver={() => handleHoverIn('ok')}
            onPointerOut={handleHoverOut}
            onClick={() => handleClick('ok')}
            name="ok_button"
            castShadow
            receiveShadow
            geometry={nodes.ok_button.geometry}
            material={materials['ok button']}
            position={[hoveredButton === 'ok' ? 2 : 2.083, 3.28, -1.917]}>
            <mesh
            name="checkmark"
            castShadow
            receiveShadow
            geometry={nodes.checkmark.geometry}
            material={materials.checkmark}
            position={[0.026, 0.004, -0.007]}
            />
        </mesh>

        {/** CANCEL BUTTON */}
        <mesh
            onPointerOver={() => handleHoverIn('cancel')}
            onPointerOut={handleHoverOut}
            onClick={() => handleClick('cancel')}
            name="cancel_button"
            castShadow
            receiveShadow
            geometry={nodes.cancel_button.geometry}
            material={materials['cancel button bg']}
            position={[hoveredButton === 'cancel' ? 2 : 2.083, 2.413, -1.917]}>
            <mesh
            name="cancel_symbol"
            castShadow
            receiveShadow
            geometry={nodes.cancel_symbol.geometry}
            material={materials.x}
            position={[0.026, 0, 0]}
            />
        </mesh>

        {/** SMILEY BUTTON */}
        <group 
        onPointerOver={() => handleHoverIn('smiley')}
        onPointerOut={handleHoverOut}
        onClick={() => handleClick('smiley')}
        name="smiley_button" 
        position={[hoveredButton === 'smiley' || selectedButton === 'smiley' ? 1.95 : 2.051, 6.006, -1.913]}
        >
            <mesh
            name="Circle007"
            castShadow
            receiveShadow
            geometry={nodes.Circle007.geometry}
            material={getMaterialWithGlow('smiley', 'smiley bg')}
            />
            <mesh
            name="Circle007_1"
            castShadow
            receiveShadow
            geometry={nodes.Circle007_1.geometry}
            material={getMaterialWithGlow('smiley', 'smiley border')}
            />
            <mesh
            name="Circle007_2"
            castShadow
            receiveShadow
            geometry={nodes.Circle007_2.geometry}
            material={getMaterialWithGlow('smiley', 'smiley mouth + eyes')}
            />
            <mesh
            name="Circle007_3"
            castShadow
            receiveShadow
            geometry={nodes.Circle007_3.geometry}
            material={getMaterialWithGlow('smiley', 'smiley cheeks')}
            />
        </group>

        {/** SPARKLE HEART BUTTON */}
        <group 
        onPointerOver={() => handleHoverIn('sparkle_heart')}
        onPointerOut={handleHoverOut}
        onClick={() => handleClick('sparkle_heart')}
        name="sparkle_heart_button" 
        position={[hoveredButton === 'sparkle_heart' || selectedButton === 'sparkle_heart' ? 1.95 : 2.051, 5.419, -1.908]}
        >
            <mesh
            name="Plane017"
            castShadow
            receiveShadow
            geometry={nodes.Plane017.geometry}
            material={getMaterialWithGlow('sparkle_heart', 'heart')}
            />
            <mesh
            name="Plane017_1"
            castShadow
            receiveShadow
            geometry={nodes.Plane017_1.geometry}
            material={getMaterialWithGlow('sparkle_heart', 'heart border')}
            />
            <mesh
            name="Plane017_2"
            castShadow
            receiveShadow
            geometry={nodes.Plane017_2.geometry}
            material={getMaterialWithGlow('sparkle_heart', 'heart sparkle')}
            />
        </group>

        {/** HEART SMILEY BUTTON */}
        <group 
            onPointerOver={() => handleHoverIn('heart_smiley')}
            onPointerOut={handleHoverOut}
            onClick={() => handleClick('heart_smiley')}
            name="heart_smiley_button" 
            position={[hoveredButton === 'heart_smiley' || selectedButton === 'heart_smiley' ? 1.95 : 2.051, 6.565, -1.914]}
        >
            <mesh
            name="Circle008"
            castShadow
            receiveShadow
            geometry={nodes.Circle008.geometry}
            material={getMaterialWithGlow('heart_smiley', 'smiley bg')}
            />
            <mesh
            name="Circle008_1"
            castShadow
            receiveShadow
            geometry={nodes.Circle008_1.geometry}
            material={getMaterialWithGlow('heart_smiley', 'smiley border')}
            />
            <mesh
            name="Circle008_2"
            castShadow
            receiveShadow
            geometry={nodes.Circle008_2.geometry}
            material={getMaterialWithGlow('heart_smiley', 'smiley mouth + eyes')}
            />
            <mesh
            name="Circle008_3"
            castShadow
            receiveShadow
            geometry={nodes.Circle008_3.geometry}
            material={getMaterialWithGlow('heart_smiley', 'smiley heart')}
            />
            <mesh
            name="Circle008_4"
            castShadow
            receiveShadow
            geometry={nodes.Circle008_4.geometry}
            material={getMaterialWithGlow('heart_smiley', 'smiley heart border')}
            />
        </group>

        {/** SAD SMILEY BUTTON */}
        <group 
            onPointerOver={() => handleHoverIn('sad_smiley')}
            onPointerOut={handleHoverOut}
            onClick={() => handleClick('sad_smiley')}
            name="sad_smiley_button" 
            position={[hoveredButton === 'sad_smiley' || selectedButton === 'sad_smiley' ? 1.95 : 2.051, 4.848, -1.913]}
        >
            <mesh
            name="Plane023"
            castShadow
            receiveShadow
            geometry={nodes.Plane023.geometry}
            material={getMaterialWithGlow('sad_smiley', 'smiley mouth + eyes')}
            />
            <mesh
            name="Plane023_1"
            castShadow
            receiveShadow
            geometry={nodes.Plane023_1.geometry}
            material={getMaterialWithGlow('sad_smiley', 'smiley bg')}
            />
            <mesh
            name="Plane023_2"
            castShadow
            receiveShadow
            geometry={nodes.Plane023_2.geometry}
            material={getMaterialWithGlow('sad_smiley', 'smiley border')}
            />
            <mesh
            name="Plane023_3"
            castShadow
            receiveShadow
            geometry={nodes.Plane023_3.geometry}
            material={getMaterialWithGlow('sad_smiley', 'sad tear')}
            />
        </group>

        {/** THREE HEARTS BUTTON */}
        <group 
            onPointerOver={() => handleHoverIn('three_hearts')}
            onPointerOut={handleHoverOut}
            onClick={() => handleClick('three_hearts')}
            name="three_hearts_button" 
            position={[hoveredButton === 'three_hearts' || selectedButton === 'three_hearts' ? 1.95 : 2.051, 4.22, -1.913]}
        >
            <mesh
            name="Plane025"
            castShadow
            receiveShadow
            geometry={nodes.Plane025.geometry}
            material={getMaterialWithGlow('three_hearts', 'heart lightest')}
            />
            <mesh
            name="Plane025_1"
            castShadow
            receiveShadow
            geometry={nodes.Plane025_1.geometry}
            material={getMaterialWithGlow('three_hearts', 'heart lightest border')}
            />
            <mesh
            name="Plane025_2"
            castShadow
            receiveShadow
            geometry={nodes.Plane025_2.geometry}
            material={getMaterialWithGlow('three_hearts', 'heart light')}
            />
            <mesh
            name="Plane025_3"
            castShadow
            receiveShadow
            geometry={nodes.Plane025_3.geometry}
            material={getMaterialWithGlow('three_hearts', 'heart light border')}
            />
            <mesh
            name="Plane025_4"
            castShadow
            receiveShadow
            geometry={nodes.Plane025_4.geometry}
            material={getMaterialWithGlow('three_hearts', 'heart')}
            />
            <mesh
            name="Plane025_5"
            castShadow
            receiveShadow
            geometry={nodes.Plane025_5.geometry}
            material={getMaterialWithGlow('three_hearts', 'heart border')}
            />
        </group>

        {/*****************/}
        {/*****************/}
        {/** DISPENSABLES */}
        {/*****************/}
        {/*****************/}

        <group name="smiley_1" position={[1.081, 6.138, 1.38]}>
            <mesh
            name="Circle002"
            castShadow
            receiveShadow
            geometry={nodes.Circle002.geometry}
            material={materials['smiley bg']}
            />
            <mesh
            name="Circle002_1"
            castShadow
            receiveShadow
            geometry={nodes.Circle002_1.geometry}
            material={materials['smiley border']}
            />
            <mesh
            name="Circle002_2"
            castShadow
            receiveShadow
            geometry={nodes.Circle002_2.geometry}
            material={materials['smiley mouth + eyes']}
            />
            <mesh
            name="Circle002_3"
            castShadow
            receiveShadow
            geometry={nodes.Circle002_3.geometry}
            material={materials['smiley cheeks']}
            />
        </group>

        {/** SMILEY DISPENSABLE */}
        <group 
            name="smiley_2" 
            position={positions['smiley']}
            ref={(ref) => (meshRefs.current['smiley'] = ref)}
        >
            <mesh
            name="Circle003"
            castShadow
            receiveShadow
            geometry={nodes.Circle003.geometry}
            material={materials['smiley bg']}
            />
            <mesh
            name="Circle003_1"
            castShadow
            receiveShadow
            geometry={nodes.Circle003_1.geometry}
            material={materials['smiley border']}
            />
            <mesh
            name="Circle003_2"
            castShadow
            receiveShadow
            geometry={nodes.Circle003_2.geometry}
            material={materials['smiley mouth + eyes']}
            />
            <mesh
            name="Circle003_3"
            castShadow
            receiveShadow
            geometry={nodes.Circle003_3.geometry}
            material={materials['smiley cheeks']}
            />
        </group>

        <group name="smiley_3" position={[1.081, 6.138, -0.64]}>
            <mesh
            name="Circle004"
            castShadow
            receiveShadow
            geometry={nodes.Circle004.geometry}
            material={materials['smiley bg']}
            />
            <mesh
            name="Circle004_1"
            castShadow
            receiveShadow
            geometry={nodes.Circle004_1.geometry}
            material={materials['smiley border']}
            />
            <mesh
            name="Circle004_2"
            castShadow
            receiveShadow
            geometry={nodes.Circle004_2.geometry}
            material={materials['smiley mouth + eyes']}
            />
            <mesh
            name="Circle004_3"
            castShadow
            receiveShadow
            geometry={nodes.Circle004_3.geometry}
            material={materials['smiley cheeks']}
            />
        </group>
        <group name="sad_smiley_1" position={[1.096, 4.948, 1.38]}>
            <mesh
            name="Plane001"
            castShadow
            receiveShadow
            geometry={nodes.Plane001.geometry}
            material={materials['smiley mouth + eyes.001']}
            />
            <mesh
            name="Plane001_1"
            castShadow
            receiveShadow
            geometry={nodes.Plane001_1.geometry}
            material={materials['smiley bg.001']}
            />
            <mesh
            name="Plane001_2"
            castShadow
            receiveShadow
            geometry={nodes.Plane001_2.geometry}
            material={materials['smiley border.001']}
            />
            <mesh
            name="Plane001_3"
            castShadow
            receiveShadow
            geometry={nodes.Plane001_3.geometry}
            material={materials['sad tear.001']}
            />
        </group>

        {/** SPARKLE HEARTS DISPENSABLE */}
        <group 
            name="sparkle_hearts_1" 
            position={positions['sparkle_heart']}
            ref={(ref) => (meshRefs.current['sparkle_heart'] = ref)}
        >
            <mesh
            name="Plane002"
            castShadow
            receiveShadow
            geometry={nodes.Plane002.geometry}
            material={materials.heart}
            />
            <mesh
            name="Plane002_1"
            castShadow
            receiveShadow
            geometry={nodes.Plane002_1.geometry}
            material={materials['heart border']}
            />
            <mesh
            name="Plane002_2"
            castShadow
            receiveShadow
            geometry={nodes.Plane002_2.geometry}
            material={materials['heart sparkle']}
            />
        </group>
        <group name="sparkle_hearts_2" position={[1.111, 4.965, -0.64]}>
            <mesh
            name="Plane004"
            castShadow
            receiveShadow
            geometry={nodes.Plane004.geometry}
            material={materials.heart}
            />
            <mesh
            name="Plane004_1"
            castShadow
            receiveShadow
            geometry={nodes.Plane004_1.geometry}
            material={materials['heart border']}
            />
            <mesh
            name="Plane004_2"
            castShadow
            receiveShadow
            geometry={nodes.Plane004_2.geometry}
            material={materials['heart sparkle']}
            />
        </group>

        {/** HEART SMILEY DISPENSABLE */}
        <group 
          name="heart_smiley_1" 
          position={positions['heart_smiley']}
          ref={(ref) => (meshRefs.current['heart_smiley'] = ref)}
        >
            <mesh
            name="Circle005"
            castShadow
            receiveShadow
            geometry={nodes.Circle005.geometry}
            material={materials['smiley bg']}
            />
            <mesh
            name="Circle005_1"
            castShadow
            receiveShadow
            geometry={nodes.Circle005_1.geometry}
            material={materials['smiley border']}
            />
            <mesh
            name="Circle005_2"
            castShadow
            receiveShadow
            geometry={nodes.Circle005_2.geometry}
            material={materials['smiley mouth + eyes']}
            />
            <mesh
            name="Circle005_3"
            castShadow
            receiveShadow
            geometry={nodes.Circle005_3.geometry}
            material={materials['smiley heart']}
            />
            <mesh
            name="Circle005_4"
            castShadow
            receiveShadow
            geometry={nodes.Circle005_4.geometry}
            material={materials['smiley heart border']}
            />
        </group>
        <group name="heart_smiley_2" position={[1.115, 2.561, -0.643]}>
            <mesh
            name="Circle009"
            castShadow
            receiveShadow
            geometry={nodes.Circle009.geometry}
            material={materials['smiley bg']}
            />
            <mesh
            name="Circle009_1"
            castShadow
            receiveShadow
            geometry={nodes.Circle009_1.geometry}
            material={materials['smiley border']}
            />
            <mesh
            name="Circle009_2"
            castShadow
            receiveShadow
            geometry={nodes.Circle009_2.geometry}
            material={materials['smiley mouth + eyes']}
            />
            <mesh
            name="Circle009_3"
            castShadow
            receiveShadow
            geometry={nodes.Circle009_3.geometry}
            material={materials['smiley heart']}
            />
            <mesh
            name="Circle009_4"
            castShadow
            receiveShadow
            geometry={nodes.Circle009_4.geometry}
            material={materials['smiley heart border']}
            />
        </group>

        {/** THREE HEARTS DISPENSABLE */}
        <group 
          name="three_hearts_2" 
          position={positions['three_hearts']}
          ref={(ref) => (meshRefs.current['three_hearts'] = ref)}
        >
            <mesh
            name="Plane005"
            castShadow
            receiveShadow
            geometry={nodes.Plane005.geometry}
            material={materials['heart lightest']}
            />
            <mesh
            name="Plane005_1"
            castShadow
            receiveShadow
            geometry={nodes.Plane005_1.geometry}
            material={materials['heart lightest border']}
            />
            <mesh
            name="Plane005_2"
            castShadow
            receiveShadow
            geometry={nodes.Plane005_2.geometry}
            material={materials['heart light']}
            />
            <mesh
            name="Plane005_3"
            castShadow
            receiveShadow
            geometry={nodes.Plane005_3.geometry}
            material={materials['heart light border']}
            />
            <mesh
            name="Plane005_4"
            castShadow
            receiveShadow
            geometry={nodes.Plane005_4.geometry}
            material={materials.heart}
            />
            <mesh
            name="Plane005_5"
            castShadow
            receiveShadow
            geometry={nodes.Plane005_5.geometry}
            material={materials['heart border']}
            />
        </group>
        <group name="three_hearts_1" position={[1.094, 3.756, 1.38]}>
            <mesh
            name="Plane006"
            castShadow
            receiveShadow
            geometry={nodes.Plane006.geometry}
            material={materials['heart lightest']}
            />
            <mesh
            name="Plane006_1"
            castShadow
            receiveShadow
            geometry={nodes.Plane006_1.geometry}
            material={materials['heart lightest border']}
            />
            <mesh
            name="Plane006_2"
            castShadow
            receiveShadow
            geometry={nodes.Plane006_2.geometry}
            material={materials['heart light']}
            />
            <mesh
            name="Plane006_3"
            castShadow
            receiveShadow
            geometry={nodes.Plane006_3.geometry}
            material={materials['heart light border']}
            />
            <mesh
            name="Plane006_4"
            castShadow
            receiveShadow
            geometry={nodes.Plane006_4.geometry}
            material={materials.heart}
            />
            <mesh
            name="Plane006_5"
            castShadow
            receiveShadow
            geometry={nodes.Plane006_5.geometry}
            material={materials['heart border']}
            />
        </group>

        {/** SAD SMILEY DISPENSABLE */}
        <group 
          name="sad_smiley_2" 
          position={positions['sad_smiley']}
          ref={(ref) => (meshRefs.current['sad_smiley'] = ref)}
        >
            <mesh
            name="Plane007"
            castShadow
            receiveShadow
            geometry={nodes.Plane007.geometry}
            material={materials['smiley mouth + eyes']}
            />
            <mesh
            name="Plane007_1"
            castShadow
            receiveShadow
            geometry={nodes.Plane007_1.geometry}
            material={materials['smiley bg']}
            />
            <mesh
            name="Plane007_2"
            castShadow
            receiveShadow
            geometry={nodes.Plane007_2.geometry}
            material={materials['smiley border']}
            />
            <mesh
            name="Plane007_3"
            castShadow
            receiveShadow
            geometry={nodes.Plane007_3.geometry}
            material={materials['sad tear']}
            />
        </group>
        <group name="sad_smiley_3" position={[1.096, 2.564, 0.349]}>
            <mesh
            name="Plane011"
            castShadow
            receiveShadow
            geometry={nodes.Plane011.geometry}
            material={materials['smiley mouth + eyes']}
            />
            <mesh
            name="Plane011_1"
            castShadow
            receiveShadow
            geometry={nodes.Plane011_1.geometry}
            material={materials['smiley bg']}
            />
            <mesh
            name="Plane011_2"
            castShadow
            receiveShadow
            geometry={nodes.Plane011_2.geometry}
            material={materials['smiley border']}
            />
            <mesh
            name="Plane011_3"
            castShadow
            receiveShadow
            geometry={nodes.Plane011_3.geometry}
            material={materials['sad tear']}
            />
        </group>
        <group name="vending_machine" position={[0, 3.543, 0]}>
            <mesh
            name="Cube"
            castShadow
            receiveShadow
            geometry={nodes.Cube.geometry}
            material={materials['vending machine']}
            />
            <mesh
            name="Cube_1"
            castShadow
            receiveShadow
            geometry={nodes.Cube_1.geometry}
            material={materials['vending machine interior']}
            />
        </group>
        <group name="door" position={[1.918, 1.014, 0.391]}>
            <mesh
            name="Cube001"
            castShadow
            receiveShadow
            geometry={nodes.Cube001.geometry}
            material={materials.Glass}
            />
            <mesh
            name="Cube001_1"
            castShadow
            receiveShadow
            geometry={nodes.Cube001_1.geometry}
            material={materials.buttons}
            />
        </group>
        <mesh
            name="glass"
            castShadow
            receiveShadow
            geometry={nodes.glass.geometry}
            material={materials.Glass}
            position={[1.776, 4.523, 0.391]}
        />
        <group name="emojis" position={[0.22, 3.756, 0.368]}>
            <mesh
            name="Plane029"
            castShadow
            receiveShadow
            geometry={nodes.Plane029.geometry}
            material={materials['heart lightest']}
            />
            <mesh
            name="Plane029_1"
            castShadow
            receiveShadow
            geometry={nodes.Plane029_1.geometry}
            material={materials['heart lightest border']}
            />
            <mesh
            name="Plane029_2"
            castShadow
            receiveShadow
            geometry={nodes.Plane029_2.geometry}
            material={materials['heart light']}
            />
            <mesh
            name="Plane029_3"
            castShadow
            receiveShadow
            geometry={nodes.Plane029_3.geometry}
            material={materials['heart light border']}
            />
            <mesh
            name="Plane029_4"
            castShadow
            receiveShadow
            geometry={nodes.Plane029_4.geometry}
            material={materials.heart}
            />
            <mesh
            name="Plane029_5"
            castShadow
            receiveShadow
            geometry={nodes.Plane029_5.geometry}
            material={materials['heart border']}
            />
            <mesh
            name="Plane029_6"
            castShadow
            receiveShadow
            geometry={nodes.Plane029_6.geometry}
            material={materials['smiley bg']}
            />
            <mesh
            name="Plane029_7"
            castShadow
            receiveShadow
            geometry={nodes.Plane029_7.geometry}
            material={materials['smiley border']}
            />
            <mesh
            name="Plane029_8"
            castShadow
            receiveShadow
            geometry={nodes.Plane029_8.geometry}
            material={materials['smiley mouth + eyes']}
            />
            <mesh
            name="Plane029_9"
            castShadow
            receiveShadow
            geometry={nodes.Plane029_9.geometry}
            material={materials['smiley heart']}
            />
            <mesh
            name="Plane029_10"
            castShadow
            receiveShadow
            geometry={nodes.Plane029_10.geometry}
            material={materials['smiley heart border']}
            />
            <mesh
            name="Plane029_11"
            castShadow
            receiveShadow
            geometry={nodes.Plane029_11.geometry}
            material={materials['sad tear']}
            />
            <mesh
            name="Plane029_12"
            castShadow
            receiveShadow
            geometry={nodes.Plane029_12.geometry}
            material={materials['smiley cheeks']}
            />
            <mesh
            name="Plane029_13"
            castShadow
            receiveShadow
            geometry={nodes.Plane029_13.geometry}
            material={materials['heart sparkle']}
            />
        </group>
    </group>
  )
}

useGLTF.preload('/vending-machine.glb')
