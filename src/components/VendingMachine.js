import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Model } from './Model'; 
import ClipLoader from "react-spinners/ClipLoader";

const Modal = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 mt-[-50px]">
            <div className="bg-white p-6 rounded-lg shadow-lg relative flex flex-col items-center">
                {children}
                <button onClick={onClose} className="w-full mt-4 rounded-md bg-blue-600 p-2 font-bold text-white tracking-wide text-lg hover:bg-blue-400">Close</button>
            </div>
        </div>
    );
};

const VendingMachine = () => {
    const [selectedButton, setSelectedButton] = useState('');
    const [cursorStyle, setCursorStyle] = useState('auto');
    const [animationComplete, setAnimationComplete] = useState(false);
    const [resetPos, setResetPos] = useState(false);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const emojiName = {
        'smiley': 'Smiling Emoji',
        'heart_smiley': 'Smiling with Hearts Emoji',
        'sparkle_heart': 'Sparkling Heart Emoji',
        'sad_smiley': 'Crying Emoji',
        'three_hearts': 'Growing Heart Emoji'
    }

    const handleCloseModal = () => {
        setAnimationComplete(false);
        setSelectedButton('');
        setResetPos(true);
    };

    return (
        <>
            <div className="h-[50px] w-full flex items-end justify-center text-red-600 font-bold text-lg">
                {message}
            </div>
            {isLoading && (
                <div className="w-full h-full flex flex-col items-center justify-center mt-[-50px]">
                    <p className="mb-4">
                        Loading simulation....
                    </p>

                    <ClipLoader
                        color={'#34c'}
                        size={50}
                        aria-label="Loading Spinner"
                        data-testid="loader"
                    />
                </div>
            )}
            <Canvas
                camera={{ position: [35, 5.5, -9], fov: 16 }} 
                style={{ cursor: cursorStyle }} 
            >
                <ambientLight 
                    intensity={Math.PI * 0.3} 
                    color="#ffeede"
                />
                <directionalLight
                    position={[3, 5, 5]}
                    intensity={Math.PI * 0.8}
                    color="#fff"
                    castShadow
                />
                <directionalLight
                    position={[-10, 20, 10]}
                    intensity={Math.PI * 0.8}
                    color="#fff"
                    castShadow
                />
                <Model 
                    setIsLoading={setIsLoading}
                    setMessage={setMessage}
                    resetPos={resetPos}
                    setResetPos={setResetPos}
                    selectedButton={selectedButton} 
                    setSelectedButton={setSelectedButton} 
                    setCursorStyle={setCursorStyle} 
                    setAnimationComplete={setAnimationComplete}
                />
            </Canvas>
            <Modal isOpen={animationComplete} onClose={handleCloseModal}>
                <div className="h-[150px] w-[150px] md:h-[270px] md:w-[270px] bg-blue-100 rounded-lg">
                    <img src={`/vm-c/${selectedButton}.png`} className="object-cover w-full h-full" />
                </div>
                <p className="text-center mt-4 mb-4 text-xl">You just received <span className="text-pink-500 font-bold">{emojiName[selectedButton]}</span>!</p>
            </Modal>
        </>
    );
};

export default VendingMachine;
