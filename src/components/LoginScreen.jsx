import { useState } from "react";
import { supabase } from "../config/supabaseClient";

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(`Błąd logowania: ${error.message}`);
    }
    setIsSubmitting(false);
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "#1a1a1a",
        fontFamily: "sans-serif",
        color: "#fff",
      }}
    >
      <div
        style={{
          background: "#2a2a2a",
          padding: "30px",
          borderRadius: "10px",
          width: "100%",
          maxWidth: "380px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          Logowanie do Biegalnika 🏃‍♂️
        </h2>
        <form
          onSubmit={handleLogin}
          style={{ display: "flex", flexDirection: "column", gap: "15px" }}
        >
          <label>
            Email:
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "5px",
                borderRadius: "5px",
                border: "1px solid #444",
                background: "#333",
                color: "#fff",
              }}
              required
              disabled={isSubmitting}
            />
          </label>
          <label>
            Hasło:
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "5px",
                borderRadius: "5px",
                border: "1px solid #444",
                background: "#333",
                color: "#fff",
              }}
              required
              disabled={isSubmitting}
            />
          </label>
          <button
            type="submit"
            style={{
              padding: "12px",
              background: isSubmitting ? "#444" : "#00c853",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              fontSize: "16px",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              fontWeight: "bold",
              marginTop: "10px",
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Logowanie..." : "Zaloguj się"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginScreen;
