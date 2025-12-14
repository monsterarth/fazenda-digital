"use client";

import { useEffect, useState } from "react";
import { CreateStayModal } from "@/components/admin/stays/create-stay-modal";
import { CreateStayDialog } from "@/components/admin/stays/create-stay-dialog";
import { EditStayDialog } from "@/components/admin/stays/edit-stay-dialog"; 

export const ModalProvider = () => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        console.log("ModalProvider Montado!");
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    return (
        <>
            <CreateStayModal />
            <CreateStayDialog cabins={[]} />
            <EditStayDialog cabins={[]} />
        </>
    );
};