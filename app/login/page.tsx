import { Suspense } from "react";
import LoginClientPage from "./LoginClientPage";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F4F4F5]">
          <div className="w-8 h-8 border-4 border-[#6A0FAD] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginClientPage />
    </Suspense>
  );
}
