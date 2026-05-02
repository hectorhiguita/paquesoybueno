import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <LoginForm
      googleEnabled={!!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)}
    />
  );
}
