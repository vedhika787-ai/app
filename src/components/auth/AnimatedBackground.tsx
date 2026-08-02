"use client";

import { useEffect, useRef } from "react";

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // There are 120 frames in public/bg-frames
    const totalFrames = 120;
    const images: HTMLImageElement[] = [];
    let loadedImages = 0;
    
    const loadImages = () => {
      for (let i = 1; i <= totalFrames; i++) {
        const img = new Image();
        const paddedIndex = i.toString().padStart(3, "0");
        img.src = `/bg-frames/ezgif-frame-${paddedIndex}.jpg`;
        img.onload = () => {
          loadedImages++;
          if (loadedImages === totalFrames) {
            startAnimation();
          }
        };
        images.push(img);
      }
    };
    
    let currentFrame = 0;
    let animationFrameId: number;
    let lastRenderTime = 0;
    const fps = 24;
    const interval = 1000 / fps;
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    // Initial resize map
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    
    const drawImageProp = (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
      const canvasAspectRatio = canvas.width / canvas.height;
      const imageAspectRatio = img.width / img.height;
      
      let renderableWidth, renderableHeight, xStart, yStart;
      
      // Cover effect
      if (imageAspectRatio < canvasAspectRatio) {
        renderableWidth = canvas.width;
        renderableHeight = img.height * (canvas.width / img.width);
        xStart = 0;
        yStart = (canvas.height - renderableHeight) / 2;
      } else {
        renderableWidth = img.width * (canvas.height / img.height);
        renderableHeight = canvas.height;
        xStart = (canvas.width - renderableWidth) / 2;
        yStart = 0;
      }
      
      ctx.drawImage(img, xStart, yStart, renderableWidth, renderableHeight);
    };
    
    const startAnimation = () => {
      const render = (currentTime: number) => {
        animationFrameId = requestAnimationFrame(render);
        
        const delta = currentTime - lastRenderTime;
        
        if (delta > interval) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawImageProp(ctx, images[currentFrame]);
          
          currentFrame = (currentFrame + 1) % totalFrames;
          lastRenderTime = currentTime - (delta % interval);
        }
      };
      
      animationFrameId = requestAnimationFrame(render);
    };
    
    loadImages();
    
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0">
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover"
      />
      {/* Dark overlay with soft gradient over the animation */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#030308]/90 via-[#030308]/60 to-[#030308]/30 mix-blend-multiply" />
      <div className="absolute inset-0 bg-primary/10 mix-blend-overlay" />
      <div className="absolute inset-0 backdrop-blur-[2px]" />
    </div>
  );
}
