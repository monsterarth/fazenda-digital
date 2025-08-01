"use client";

import React, { useState, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { useReactToPrint } from 'react-to-print';

export const usePrint = () => {
  const [isPrinting, setIsPrinting] = useState(false);
  const componentToPrintRef = useRef<HTMLDivElement>(null);

  const handleBeforePrint = useCallback(() => {
    setIsPrinting(true);
  }, []);

  const handleAfterPrint = useCallback(() => {
    setIsPrinting(false);
  }, []);

  const printTrigger = useReactToPrint({
    content: () => componentToPrintRef.current,
    onBeforeGetContent: handleBeforePrint,
    onAfterPrint: handleAfterPrint,
  });

  const printComponent = (component: React.ReactElement) => {
    const PrintWrapper = React.forwardRef<HTMLDivElement>((_props, ref) => (
      <div ref={ref}>{component}</div>
    ));
    PrintWrapper.displayName = 'PrintWrapper';
    
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    const root = createRoot(container);
    root.render(
        <PrintWrapper ref={componentToPrintRef} />
    );

    setTimeout(() => {
        printTrigger();
        root.unmount();
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
    }, 50);
  };

  return { printComponent, isPrinting };
};