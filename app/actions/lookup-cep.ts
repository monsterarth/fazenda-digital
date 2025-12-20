'use server'

interface CepResponse {
    cep: string;
    logradouro: string;
    complemento: string;
    bairro: string;
    localidade: string;
    uf: string;
    erro?: boolean;
}

export async function lookupCepAction(cep: string) {
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) {
        return { success: false, message: "Formato de CEP inválido." };
    }

    // TENTATIVA 1: ViaCEP
    try {
        console.log(`[LookupCEP] Tentando ViaCEP para: ${cleanCep}`);
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
            cache: 'no-store', // Evita cache de erros
            headers: { 'User-Agent': 'SynapseApp/1.0' }
        });

        if (!response.ok) throw new Error(`ViaCEP status: ${response.status}`);
        
        const data = await response.json();
        
        if (data.erro) {
            // Se o ViaCEP diz que não existe, provavelmente não existe mesmo
            return { success: false, message: "CEP não encontrado na base de dados." };
        }
        
        return { success: true, data: data as CepResponse };

    } catch (viacepError) {
        console.warn("[LookupCEP] ViaCEP falhou, tentando BrasilAPI...", viacepError);

        // TENTATIVA 2: BrasilAPI (Fallback)
        try {
            const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`, {
                cache: 'no-store'
            });

            if (!response.ok) throw new Error(`BrasilAPI status: ${response.status}`);

            const data = await response.json();

            // Mapeia BrasilAPI para o formato ViaCEP para manter compatibilidade
            const mappedData: CepResponse = {
                cep: data.cep,
                logradouro: data.street,
                complemento: '',
                bairro: data.neighborhood,
                localidade: data.city,
                uf: data.state
            };

            return { success: true, data: mappedData };

        } catch (brasilApiError) {
            console.error("[LookupCEP] Todas as APIs falharam.", brasilApiError);
            return { success: false, message: "Não foi possível consultar o CEP automaticamente. Por favor, preencha manualmente." };
        }
    }
}