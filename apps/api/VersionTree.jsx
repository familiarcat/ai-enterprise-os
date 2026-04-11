import React, { useState } from 'react';

/**
 * TreeNode Component
 * Recursively renders the JSON hierarchy.
 */
const TreeNode = ({ name, data, depth = 0 }) => {
  const isFolder = data && typeof data === 'object' && Object.keys(data).length > 0;
  const [isOpen, setIsOpen] = useState(depth === 0); // Root versions open by default

  const toggle = (e) => {
    e.stopPropagation();
    if (isFolder) setIsOpen(!isOpen);
  };

  return (
    <div className="select-none">
      <div
        className={`flex items-center py-1.5 px-3 cursor-pointer hover:bg-blue-50/50 rounded-md transition-all duration-200 ${
          depth === 0 ? 'font-bold text-slate-900 mt-2' : 'text-slate-600'
        }`}
        style={{ paddingLeft: `${depth * 1.25 + 0.75}rem` }}
        onClick={toggle}
      >
        {isFolder ? (
          <span className={`mr-2 flex items-center justify-center w-4 h-4 text-[10px] transform transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
            ▶
          </span>
        ) : (
          <span className="mr-2 w-4 h-4" />
        )}
        
        <span className="mr-2 text-base">
          {isFolder ? (isOpen ? '📂' : '📁') : '📄'}
        </span>
        
        <span className="truncate text-sm tracking-tight">
          {name}
        </span>
      </div>

      {isFolder && isOpen && (
        <div className="relative">
          {/* Vertical line for visual nesting */}
          <div 
            className="absolute left-[0.9rem] top-0 bottom-0 w-px bg-slate-200"
            style={{ marginLeft: `${depth * 1.25}rem` }}
          />
          {Object.entries(data).map(([childName, childData]) => (
            <TreeNode
              key={childName}
              name={childName}
              data={childData}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const VersionTree = ({ hierarchy }) => {
  if (!hierarchy || Object.keys(hierarchy).length === 0) {
    return (
      <div className="p-8 text-center border-2 border-dashed rounded-xl text-slate-400">
        No version history detected in /versions
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm shadow-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <h3 className="font-semibold text-slate-800">Evolutionary Hierarchy</h3>
        <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
          {Object.keys(hierarchy).length} Versions
        </span>
      </div>
      <div className="p-4 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
        {Object.entries(hierarchy).map(([version, data]) => (
          <div key={version} className="mb-2 border-b border-slate-50 last:border-0 pb-2 last:pb-0">
            <TreeNode name={version} data={data} />
          </div>
        ))}
      </div>
    </div>
  );
};