import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { navigationConfig } from '../config/navigation';
import type { SidebarItemData, SidebarGroupData } from '../types/navigation';

interface SidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isExpanded, onToggle }) => {
  return (
    <nav
      style={{ width: isExpanded ? 260 : 68 }}
      className="h-full bg-white border-r border-gray-100 flex flex-col font-sans shrink-0 relative transition-[width] duration-300 ease-in-out overflow-hidden z-20"
    >
      <SidebarHeader isExpanded={isExpanded} onToggle={onToggle} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 no-scrollbar">
        {navigationConfig.sections.map((section, idx) => (
          <SidebarSection
            key={section.id}
            section={section}
            isExpanded={isExpanded}
            showDivider={idx > 0}
            onToggle={onToggle}
          />
        ))}
      </div>

      <SidebarFooter items={navigationConfig.footer} isExpanded={isExpanded} />
    </nav>
  );
};

// --- Header Component ---
const SidebarHeader: React.FC<{ isExpanded: boolean; onToggle: () => void }> = ({ isExpanded, onToggle }) => {
  return (
    <div className={`flex items-center shrink-0 h-[72px] transition-all duration-300 ${isExpanded ? 'px-5' : 'px-0 justify-center'}`}>
      <div
        onClick={!isExpanded ? onToggle : undefined}
        className={`
          w-10 h-10 bg-brand text-white rounded-xl flex items-center justify-center font-bold text-lg shrink-0 cursor-pointer
          shadow-lg shadow-brand/20 transition-transform hover:scale-105 active:scale-95
        `}
      >
        HR
      </div>

      <div className={`
        flex flex-col overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ml-3
        ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 ml-0'}
      `}>
        <span className="font-bold text-black text-base tracking-tight">ReviewHub</span>
        <span className="text-[11px] text-gray-400 font-medium">Grand Hotel NYC</span>
      </div>

      {isExpanded && (
        <button
          onClick={onToggle}
          className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand hover:bg-brand/5 transition-all duration-200"
        >
          <ChevronLeft size={18} />
        </button>
      )}
    </div>
  );
};

// --- Section Component ---
const SidebarSection: React.FC<{
  section: SidebarGroupData;
  isExpanded: boolean;
  showDivider: boolean;
  onToggle: () => void;
}> = ({ section, isExpanded, showDivider, onToggle }) => {
  return (
    <div className="mb-1">
      {showDivider && <div className="h-px bg-gray-50 my-2 mx-2" />}
      {section.label && (
        <div className={`
          text-[10px] font-bold text-gray-400 px-3 py-1.5 tracking-[1px] uppercase overflow-hidden whitespace-nowrap transition-all duration-300
          ${isExpanded ? 'opacity-100' : 'opacity-0 h-0 py-0'}
        `}>
          {section.label}
        </div>
      )}
      <div className="space-y-0.5">
        {section.items.map(item => (
          <SidebarItem key={item.id} item={item} isExpanded={isExpanded} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
};

// --- Item Component ---
const SidebarItem: React.FC<{
  item: SidebarItemData;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ item, isExpanded, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = item.path ? location.pathname === item.path : false;

  const handleClick = () => {
    if (!item.path) return;
    if (isActive) {
      onToggle();
    } else {
      navigate(item.path);
    }
  };

  return (
    <div
      onClick={handleClick}
      title={!isExpanded ? item.label : undefined}
      className={`
        group flex items-center h-10 rounded-xl cursor-pointer relative transition-all duration-200
        ${isActive
          ? 'bg-brand text-white shadow-md shadow-brand/20'
          : item.isDanger
            ? 'text-red-500 hover:bg-red-50'
            : 'text-gray-500 hover:bg-gray-50 hover:text-black'}
        ${isExpanded ? 'px-3 gap-3' : 'justify-center mx-1'}
      `}
    >
      <span className={`shrink-0 transition-transform duration-200 ${!isActive && 'group-hover:scale-110'}`}>
        {item.icon}
      </span>

      <span className={`
        text-[14px] font-semibold whitespace-nowrap overflow-hidden transition-all duration-300
        ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}
      `}>
        {item.label}
      </span>

      {item.badge && isExpanded && (
        <span className={`
          ml-auto text-[10px] px-1.5 py-0.5 rounded-lg font-bold shrink-0
          ${isActive ? 'bg-white text-brand' : 'bg-brand text-white'}
        `}>
          {item.badge}
        </span>
      )}

      {item.badge && !isExpanded && (
        <span className="absolute top-2 right-2 w-2 h-2 bg-brand rounded-full border-2 border-white" />
      )}
    </div>
  );
};

// --- Footer Component ---
const SidebarFooter: React.FC<{ items: SidebarItemData[]; isExpanded: boolean }> = ({ items, isExpanded }) => {
  return (
    <div className="mt-auto px-3 pb-3 pt-6 border-t border-gray-50">
      <div className="space-y-0.5">
        {items.map(item => (
          <SidebarItem key={item.id} item={item} isExpanded={isExpanded} onToggle={() => { }} />
        ))}
      </div>
      <div className={`
        text-center text-[10px] text-gray-300 mt-4 transition-opacity duration-300 font-medium
        ${isExpanded ? 'opacity-100' : 'opacity-0'}
      `}>
        VERSION 2.4.1
      </div>
    </div>
  );
};

export default Sidebar;