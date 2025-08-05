"use client";
import React, { createContext, useContext, ReactNode } from 'react';

// Por enquanto, este contexto não precisa de lógica complexa,
// mas estabelece a base para quando você adicionar login de admin.
const AuthContext = createContext({});

export function AuthProvider({ children }: { children: ReactNode }) {
    // Aqui você adicionaria a lógica de login do admin no futuro
    const user = { loggedIn: true }; // Simula um usuário logado

    return (
        <AuthContext.Provider value={{ user }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);