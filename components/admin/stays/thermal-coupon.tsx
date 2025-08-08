"use client";

import React from 'react';
import { Stay } from '@/types';
import { QRCodeSVG } from 'qrcode.react'; // Usando a versão SVG que você escolheu, ótima para impressão.

interface ThermalCouponProps {
    stay: Stay;
    qrUrl: string;
}

// Transformado em um componente funcional, pois a lógica de impressão agora é externa.
export const ThermalCoupon: React.FC<ThermalCouponProps> = ({ stay, qrUrl }) => {
    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Bem-vindo(a)!</h1>
            <p style={styles.text}>Hóspede: <strong>{stay.guestName}</strong></p>
            <p style={styles.text}>Cabana: <strong>{stay.cabinName}</strong></p>
            
            <div style={styles.accessCodeSection}>
                <p style={styles.label}>Seu Código de Acesso:</p>
                <p style={styles.accessCode}>{stay.token}</p>
            </div>

            <div style={styles.qrSection}>
                <QRCodeSVG value={qrUrl} size={160} includeMargin={true} />
                <p style={styles.qrLabel}>Aponte a câmera para acessar</p>
            </div>
            
            <p style={styles.footer}>Tenha uma ótima estadia!</p>
        </div>
    );
};

// Estilos embutidos para garantir a portabilidade para a nova janela de impressão
const styles: { [key: string]: React.CSSProperties } = {
    container: {
        fontFamily: 'monospace, sans-serif',
        width: '280px', // Aproximado para papel de 80mm
        padding: '10px',
        color: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
    },
    header: {
        fontSize: '1.5rem',
        fontWeight: 'bold',
        margin: '0 0 10px 0',
    },
    text: {
        fontSize: '1rem',
        margin: '2px 0',
    },
    accessCodeSection: {
        margin: '20px 0',
        padding: '10px',
        border: '2px dashed #000',
        width: '100%',
        boxSizing: 'border-box',
    },
    label: {
        fontSize: '1rem',
        margin: '0',
    },
    accessCode: {
        fontSize: '2.5rem',
        fontWeight: 'bold',
        letterSpacing: '0.5rem',
        margin: '5px 0 0 0',
    },
    qrSection: {
        margin: '15px 0',
    },
    qrLabel: {
        marginTop: '5px',
        fontSize: '0.9rem',
    },
    footer: {
        marginTop: '20px',
        fontSize: '0.9rem',
        borderTop: '1px solid #ccc',
        paddingTop: '10px',
        width: '100%',
        boxSizing: 'border-box',
    }
};