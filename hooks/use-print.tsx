"use client";

import { useState, useRef, useCallback } from 'react';
import React from 'react';
import { createRoot } from 'react-dom/client';

export const usePrint = () => {
    const [isPrinting, setIsPrinting] = useState(false);
    const printFrameRef = useRef<HTMLIFrameElement | null>(null);

    const printComponent = useCallback((componentToPrint: React.ReactElement) => {
        setIsPrinting(true);

        const onIframeLoad = () => {
            if (printFrameRef.current) {
                const iframeDocument = printFrameRef.current.contentWindow?.document;
                if (iframeDocument) {
                    const printableElement = iframeDocument.createElement('div');
                    iframeDocument.body.appendChild(printableElement);
                    
                    const root = createRoot(printableElement);
                    root.render(componentToPrint);

                    // Pequeno atraso para garantir a renderização completa
                    setTimeout(() => {
                        printFrameRef.current?.contentWindow?.focus();
                        printFrameRef.current?.contentWindow?.print();
                        
                        // Limpeza após a impressão
                        document.body.removeChild(printFrameRef.current!);
                        printFrameRef.current = null;
                        setIsPrinting(false);
                    }, 500);
                }
            }
        };

        // Cria um iframe oculto
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.onload = onIframeLoad;
        document.body.appendChild(iframe);
        printFrameRef.current = iframe;
    }, []);

    return { printComponent, isPrinting };
};