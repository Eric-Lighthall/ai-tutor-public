import { useState, useRef, useEffect, useCallback } from 'react';
import { LAYOUT } from '../constants';

export const useDragResize = () => {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const { MIN_WIDTH, MAX_WIDTH, INITIAL_PERCENTAGE } = LAYOUT.SIDEBAR;
    return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, window.innerWidth * INITIAL_PERCENTAGE));
  });

  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWRef = useRef(0);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      if (!draggingRef.current) {
        const { MIN_WIDTH, MAX_WIDTH, INITIAL_PERCENTAGE } = LAYOUT.SIDEBAR;
        const screenWidth = window.innerWidth;
        const targetWidth = screenWidth * INITIAL_PERCENTAGE;
        const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, targetWidth));
        setSidebarWidth(clampedWidth);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!draggingRef.current || !sidebarRef.current) return;
    
    e.preventDefault();
    const deltaX = e.clientX - startXRef.current;
    const newWidth = startWRef.current + deltaX;
    const { MIN_WIDTH, MAX_WIDTH } = LAYOUT.SIDEBAR;
    const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
    
    sidebarRef.current.style.width = `${clampedWidth}px`;
  }, []);

  const stopDragging = useCallback(() => {
    if (!draggingRef.current || !sidebarRef.current) return;
    
    draggingRef.current = false;
    const finalWidth = parseInt(sidebarRef.current.style.width, 10);
    setSidebarWidth(finalWidth);
    
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', stopDragging);
    
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, [handleMouseMove]);

  const startDragging = useCallback((e) => {
    e.preventDefault();
    
    draggingRef.current = true;
    startXRef.current = e.clientX;
    startWRef.current = sidebarWidth;
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopDragging);
    
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
  }, [sidebarWidth, handleMouseMove, stopDragging]);

  return {
    sidebarWidth,
    sidebarRef,
    isDragging: draggingRef.current,
    startDragging,
  };
};