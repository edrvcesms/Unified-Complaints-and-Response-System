import { loginUser } from "../../../services/authentication/Login";
import { useCurrentUser } from "../../../store/authStore";
import type { UserLoginData } from "../../../types/auth/Login";
import { useState } from "react";

export const UserLogin: React.FC = () => {

  const [formData, setFormData] = useState<UserLoginData | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value } as UserLoginData);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    try {
      const response = await loginUser(formData);
      useCurrentUser.getState().setAccessToken(response.access_token);
      const token = useCurrentUser.getState().accessToken;
      console.log("Current access token:", token);
      console.log("Login successful:", response);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
    </>
  );
};