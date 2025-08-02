"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface FetchResult<T> {
    data: T | null;
    isLoading: boolean;
    error: Error | null;
}

export function useFetchData<T>(url: string | null): FetchResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!url) {
            setData(null);
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                const result = await response.json();
                setData(result);
            } catch (err: any) {
                setError(err);
                toast.error("Falha ao buscar dados", { description: err.message });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [url]);

    return { data, isLoading, error };
}