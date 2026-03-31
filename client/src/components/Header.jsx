import React from 'react';
import { Menu, Languages } from 'lucide-react';
import logo from '../assets/logo.png';
import { useTranslation } from "react-i18next";

const Header = ({ toggleSidebar, onBackToHome }) => {
    const { i18n } = useTranslation();

    // 切換語言的邏輯
    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'zh' : 'en';
        i18n.changeLanguage(newLang);
    };

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

            <div className="flex items-center gap-2">
                <button 
                    onClick={toggleLanguage}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-600"
                >
                    <Languages size={18} />
                    <span>{i18n.language === 'en' ? 'English' : '繁體中文'}</span>
                </button>
            </div>
        </header>
    );
};

export default Header;