"use client";

import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { Nav } from "@/components/nav";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Header() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // After mounting, we have access to the theme
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <div className="flex items-center">
            {mounted && (
              <Image
                src={theme === 'dark'
                  ? "/images/BuildCo_Logo_Clear-White_Cropped.png"
                  : "/images/BuildCo_Logo_Clear-Black_Cropped.png"
                }
                alt="Build Co Logo"
                width={120}
                height={30}
                className="h-8 w-auto"
                priority
              />
            )}
          </div>
          <Nav />
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
