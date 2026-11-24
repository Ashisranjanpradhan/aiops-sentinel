"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sun, Moon, Laptop, Check } from "lucide-react";
import { useTheme, ThemeMode } from "@/context/ThemeContext";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const handleSelect = (mode: ThemeMode) => {
    setTheme(mode);
    setIsOpen(false);
  };

  const getActiveIcon = () => {
    if (theme === "system") {
      return <Laptop className="w-4 h-4 text-slate-600 dark:text-slate-300" />;
    }
    return resolvedTheme === "dark" ? (
      <Moon className="w-4 h-4 text-indigo-400" />
    ) : (
      <Sun className="w-4 h-4 text-amber-500" />
    );
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle display theme (Light, Dark, System)"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {getActiveIcon()}
        {showLabel && (
          <span className="ml-2 text-xs font-medium capitalize text-slate-700 dark:text-slate-300">
            {theme}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-36 rounded-lg bg-white dark:bg-slate-900 shadow-lg ring-1 ring-black/5 dark:ring-white/10 z-50 py-1 divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 focus:outline-none"
        >
          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => handleSelect("light")}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium transition-colors ${
                theme === "light"
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light</span>
              </div>
              {theme === "light" && <Check className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => handleSelect("dark")}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium transition-colors ${
                theme === "dark"
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Dark</span>
              </div>
              {theme === "dark" && <Check className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => handleSelect("system")}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium transition-colors ${
                theme === "system"
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Laptop className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>System</span>
              </div>
              {theme === "system" && <Check className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
