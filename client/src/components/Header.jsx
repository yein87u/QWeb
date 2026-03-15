import React from 'react';
import { Menu, Zap } from 'lucide-react';
import logo from '../assets/logo.png';

const Header = ({ toggleSidebar, onBackToHome }) => {
    return (
        <header className="header-bar">
            <div className="flex items-center gap-4">
                <button 
                onClick={toggleSidebar}
                className="icon-button-round"
                >
                    <Menu size={20} />
                </button>
                <div 
                    className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                        onBackToHome();
                    }}
                    role="button"
                    tabIndex={0}
                >
                    {/* <img 
                        src={logo} 
                        alt="QuantumSolver Logo" 
                        style={{ width: 'auto', height: '40px', objectFit: 'contain' }}
                    /> */}
                    <h1 className="text-xl font-extrabold tracking-tight text-slate-800">
                        Quantum<span className="text-blue-600">Solver</span>
                    </h1>
                </div>
            </div>
        </header>
    );
};

export default Header;