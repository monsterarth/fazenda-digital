// fazenda-digital/components/admin/stays/thermal-coupon.tsx

"use client";

import React, { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Stay } from '@/types'; // Usando o tipo 'Stay' existente

interface ThermalCouponProps {
  stay: Stay;
  // A URL do QR Code e informações da propriedade são passadas como props separadas
  qrUrl: string; 
  propertyLogoUrl?: string;
  propertyName?: string;
}

export const ThermalCoupon = forwardRef<HTMLDivElement, ThermalCouponProps>((
  { stay, qrUrl, propertyLogoUrl, propertyName },
  ref
) => {
  return (
    <div ref={ref} style={styles.container}>
      
      {propertyName && (
        <h1 style={styles.headerTitle}>{propertyName}</h1>
      )}

      {/* Usando os campos corretos do tipo 'Stay' */}
      <p style={styles.text}>Hóspede: <strong>{stay.guestName}</strong></p>
      <p style={styles.text}>Cabana: <strong>{stay.cabinName}</strong></p>
      
      <p style={styles.label}>Seu Código de Acesso:</p>
      {/* Usando o campo 'token' do tipo 'Stay' */}
      <p style={styles.accessCode}>{stay.token}</p>
      
      <div style={styles.qrSection}>
        {/* A qrUrl agora é recebida via props, garantindo que a lógica da página principal a controle */}
        <QRCodeSVG value={qrUrl} size={128} />
        <p style={styles.qrLabel}>Aponte a câmera para acessar</p>
      </div>
      
      <p style={styles.footer}>Tenha uma ótima estadia!</p>
    </div>
  );
});

ThermalCoupon.displayName = 'ThermalCoupon';

// Estilos otimizados para um cupom compacto
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    fontFamily: "'Courier New', Courier, monospace",
    width: '280px',
    padding: '10px 12px',
    color: '#000',
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    boxSizing: 'border-box'
  },
  headerTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
  },
  text: {
    fontSize: '0.8rem',
    margin: '1px 0',
    alignSelf: 'flex-start'
  },
  label: {
    fontSize: '0.8rem',
    margin: '10px 0 2px 0',
  },
  accessCode: {
    fontSize: '2rem',
    fontWeight: 'bold',
    letterSpacing: '0.3rem',
    margin: '0 0 10px 0',
    padding: '4px',
    backgroundColor: '#f0f0f0',
    borderRadius: '4px',
    width: '100%',
    boxSizing: 'border-box'
  },
  qrSection: {
    margin: '5px 0',
  },
  qrLabel: {
    marginTop: '4px',
    fontSize: '0.75rem',
  },
  footer: {
    marginTop: '10px',
    fontSize: '0.8rem',
    borderTop: '1px dashed #ccc',
    paddingTop: '5px',
    width: '100%',
  }
};