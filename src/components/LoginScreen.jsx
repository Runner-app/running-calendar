import { useState } from "react";

import { supabase } from "../config/supabaseClient";

function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();

        setIsSubmitting(true);
        setErrorMessage("");

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (error) {
                setErrorMessage(error.message);
            }
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "An unexpected error occurred."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="loginScreen">
            <div className="loginScreenWidget">
                <h2 className="center">Log in to RunUp 🏃‍♂️</h2>

                <form onSubmit={handleLogin}>
                    <label>
                        Email:
                        <input
                            type="email"
                            name="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            required
                            disabled={isSubmitting}
                        />
                    </label>

                    <label>
                        Password:
                        <input
                            type="password"
                            name="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                            disabled={isSubmitting}
                        />
                    </label>

                    {errorMessage && (
                        <div className="loginError" role="alert">
                            {errorMessage}
                        </div>
                    )}

                    <button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Logging in..." : "Log in"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default LoginScreen;