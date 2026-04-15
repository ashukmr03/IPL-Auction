"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

export function useAuthGuard(allowedEmails: string | readonly string[]) {
    const router = useRouter();

    useEffect(() => {
        const checkUser = async () => {
            const normalizedAllowed = (Array.isArray(allowedEmails) ? allowedEmails : [allowedEmails]).map((email) =>
                email.toLowerCase(),
            );

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user?.email) {
                router.push("/admin/login");
                return;
            }

            const normalizedUserEmail = user.email.toLowerCase();
            if (!normalizedAllowed.includes(normalizedUserEmail)) {
                await supabase.auth.signOut();
                router.push("/admin/login");
            }
        };

        void checkUser();
    }, [router, allowedEmails]);
}