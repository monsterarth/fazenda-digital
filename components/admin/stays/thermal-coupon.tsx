// fazenda-digital/components/admin/stays/thermal-coupon.tsx

"use client";

import React, { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Stay } from '@/types';

interface ThermalCouponProps {
  stay: Stay;
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

      <p style={styles.text}>Hóspede: <strong>{stay.guestName}</strong></p>
      <p style={styles.text}>Cabana: <strong>{stay.cabinName}</strong></p>
      
      <p style={styles.label}>Seu Código de Acesso:</p>
      <p style={styles.accessCode}>{stay.token}</p>
      
      <div style={styles.qrSection}>
        <QRCodeSVG value={qrUrl} size={128} />
        <p style={styles.qrLabel}>Aponte a câmera para acessar</p>
      </div>
      
      <p style={styles.footer}>Tenha uma ótima estadia!</p>
    </div>
  );
});

ThermalCoupon.displayName = 'ThermalCoupon';

// Estilos ajustados para melhor legibilidade na impressão
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    fontFamily: "'Courier New', Courier, monospace",
    width: '280px', // Aproximadamente 75mm, bom para papel de 80mm
    padding: '10px 0px', // Reduzido padding lateral
    color: '#000',
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    boxSizing: 'content-box'
  },
  headerTitle: {
    fontSize: '14pt', // Tamanho aumentado
    fontWeight: 'bold',
    margin: '0 0 10px 0',
  },
  text: {
    fontSize: '11pt', // Tamanho aumentado
    margin: '2px 0',
    alignSelf: 'flex-start',
    paddingLeft: '12px'
  },
  label: {
    fontSize: '11pt', // Tamanho aumentado
    margin: '12px 0 4px 0',
  },
  accessCode: {
    fontSize: '24pt', // Tamanho aumentado
    fontWeight: 'bold',
    letterSpacing: '0.2rem',
    margin: '0 0 12px 0',
    padding: '5px',
    backgroundColor: '#f0f0f0',
    borderRadius: '4px',
    width: 'calc(100% - 24px)', // Ajustado para padding
    boxSizing: 'border-box'
  },
  qrSection: {
    margin: '5px 0',
  },
  qrLabel: {
    marginTop: '4px',
    fontSize: '10pt', // Tamanho aumentado
  },
  footer: {
    marginTop: '12px',
    fontSize: '10pt', // Tamanho aumentado
    borderTop: '1px dashed #ccc',
    paddingTop: '8px',
    width: 'calc(100% - 24px)', // Ajustado para padding
    boxSizing: 'content-box'
  }
};