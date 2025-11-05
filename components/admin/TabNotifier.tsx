// components/admin/TabNotifier.tsx

"use client";

import { useTabNotifier } from '@/hooks/useTabNotifier';

/**
 * Este componente não renderiza DOM.
 * Sua única finalidade é ativar o hook useTabNotifier
 * dentro do layout principal do admin.
 */
const TabNotifier = () => {
  useTabNotifier();
  return null;
};

// ## INÍCIO DA CORREÇÃO ##
// Alterado de 'export const TabNotifier' para 'export default'
export default TabNotifier;
// ## FIM DA CORREÇÃO ##