"use client";

import { useState, useRef, useCallback } from 'react';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

export const usePrint = () => {
    const [isPrinting, setIsPrinting] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);

    const printComponent = useCallback((componentToPrint: React.ReactElement) => {
        setIsPrinting(true);

        // Remove o iframe antigo se existir
        if (iframeRef.current) {
            document.body.removeChild(iframeRef.current);
        }

        // Cria um novo iframe oculto
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        
        document.body.appendChild(iframe);
        iframeRef.current = iframe;

        const iframeDocument = iframe.contentWindow?.document;
        if (!iframeDocument) {
            setIsPrinting(false);
            return;
        }
        
        // Renderiza o componente para HTML estático
        const staticMarkup = renderToStaticMarkup(componentToPrint);
        
        // Escreve o HTML no documento do iframe
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
        
        // O evento onload garante que todo o conteúdo (incluindo imagens, se houver) foi carregado
        iframe.onload = () => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setIsPrinting(false);
        };
        
    }, []);

    return { printComponent, isPrinting };
};