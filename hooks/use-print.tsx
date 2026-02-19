"use client";

import { useState, useRef, useCallback } from 'react';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { toast } from 'sonner';

export const usePrint = () => {
    const [isPrinting, setIsPrinting] = useState(false);
    const isPrintingRef = useRef(false);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);

    const printComponent = useCallback((componentToPrint: React.ReactElement) => {
        if (isPrintingRef.current) {
            toast.info("Impressão já em andamento.", { description: "Por favor, feche ou conclua a impressão anterior." });
            return;
        }

        isPrintingRef.current = true;
        setIsPrinting(true);

        if (iframeRef.current) {
            document.body.removeChild(iframeRef.current);
        }

        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        
        document.body.appendChild(iframe);
        iframeRef.current = iframe;

        const iframeDocument = iframe.contentWindow?.document;
        if (!iframeDocument) {
            isPrintingRef.current = false;
            setIsPrinting(false);
            return;
        }
        
        const staticMarkup = renderToStaticMarkup(componentToPrint);
        
        iframeDocument.open();
        iframeDocument.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Impressão</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                </head>
                <body>
                    ${staticMarkup}
                </body>
            </html>
        `);
        iframeDocument.close();
        
        const iframeWindow = iframe.contentWindow;
        if (iframeWindow) {
            const cleanup = () => {
                if (iframeRef.current) {
                    document.body.removeChild(iframeRef.current);
                    iframeRef.current = null;
                }
                isPrintingRef.current = false;
                setIsPrinting(false);
                iframeWindow.removeEventListener('afterprint', cleanup);
            };

            iframeWindow.addEventListener('afterprint', cleanup);
            
            // A MÁGICA: Damos um pequeno tempo para o browser processar o HTML
            // antes de chamar a impressão, em vez de depender do 'onload'.
            setTimeout(() => {
                iframeWindow.focus();
                iframeWindow.print();
            }, 50); // 50ms é um valor seguro.

        } else {
            isPrintingRef.current = false;
            setIsPrinting(false);
        }
    }, []);

    return { printComponent, isPrinting };
};