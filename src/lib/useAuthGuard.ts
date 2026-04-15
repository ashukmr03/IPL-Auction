"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

export function useAuthGuard(allowedEmail: string) {
    const router = useRouter();

    useEffect(() => {
        const checkUser = async () => {
            const { data } = await supabase.auth.getUser();

            const user = data.user;

            // ❌ Not logged in
            if (!user) {
                router.push("/admin/login");
                return;
            }

            const email = user.email;

            // ❌ Wrong user
            if (email !== allowedEmail) {
                router.push("/admin/login");
            }
        };

        checkUser();
    }, [router, allowedEmail]);
}