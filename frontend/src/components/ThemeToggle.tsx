"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title="Toggle theme"
      aria-label="Toggle theme"
      className="p-2 rounded-lg border glass transition hover:opacity-80 cursor-pointer flex items-center justify-center"
      style={{ color: "var(--color-primary)", borderColor: "var(--color-border)" }}
    >
      {mounted ? (
        isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />
      ) : (
        <span className="w-4 h-4 block" aria-hidden="true" />
      )}
    </button>
  );
}