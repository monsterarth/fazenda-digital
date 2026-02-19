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
  { stay, qrUrl, propertyName },
  ref
) => {
  // A tag <style> foi removida daqui, pois a lógica agora está na função de impressão.
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
        <QRCodeSVG value={qrUrl} size={140} />
        <p style={styles.qrLabel}>Aponte a câmera para acessar</p>
      </div>
      <p style={styles.footer}>Tenha uma ótima estadia!</p>
    </div>
  );
});

ThermalCoupon.displayName = 'ThermalCoupon';

// Estilos mantidos para boa legibilidade
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    fontFamily: "'Courier New', Courier, monospace",
    width: '283px',
    padding: '15px 12px',
    color: '#000',
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    boxSizing: 'border-box'
  },
  headerTitle: {
    fontSize: '1.4rem',
    fontWeight: 'bold',
    margin: '0 0 12px 0',
  },
  text: {
    fontSize: '1rem',
    margin: '2px 0',
    alignSelf: 'flex-start'
  },
  label: {
    fontSize: '1rem',
    margin: '12px 0 4px 0',
  },
  accessCode: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    letterSpacing: '0.4rem',
    margin: '0 0 15px 0',
    padding: '5px',
    backgroundColor: '#f0f0f0',
    borderRadius: '4px',
    width: '100%',
    boxSizing: 'border-box'
  },
  qrSection: {
    margin: '5px 0',
  },
  qrLabel: {
    marginTop: '5px',
    fontSize: '0.9rem',
  },
  footer: {
    marginTop: '15px',
    fontSize: '1rem',
    borderTop: '1px dashed #ccc',
    paddingTop: '8px',
    width: '100%',
  }
};