export const isValidCPF = (cpf: string | null | undefined): boolean => {
  if (!cpf) return false;

  const cleanCpf = cpf.replace(/[^\d]/g, '');

  if (cleanCpf.length !== 11 || /^(\d)\1{10}$/.test(cleanCpf)) {
    return false;
  }

  // Validação do 1º Dígito
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (10 - i);
  }
  
  let remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  
  if (remainder !== parseInt(cleanCpf.charAt(9))) {
    return false;
  }

  // Validação do 2º Dígito
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (11 - i);
  }
  
  remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  
  if (remainder !== parseInt(cleanCpf.charAt(10))) {
    return false;
  }

  return true;
};

export const isValidPhone = (phone: string | null | undefined): boolean => {
    if (!phone) return false;
    const cleanPhone = phone.replace(/[^\d]/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 11;
}