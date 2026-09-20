import { getBackendApiUrl } from "@/lib/auth";
import { FcGoogle } from "react-icons/fc";

export default function Home() {
  const googleLoginUrl = getBackendApiUrl("/auth/google");

  return (
    <main className="grid min-h-screen place-items-center bg-gray-50 px-4">
      <section className="w-full max-w-[420px] rounded-lg border border-gray-200 bg-white p-10 shadow-sm">
        <h1 className="mb-8 text-center text-2xl font-semibold text-gray-900">
          Login
        </h1>

        <a
          href={googleLoginUrl}
          className="flex w-full items-center justify-center gap-3 rounded border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
        >
          <FcGoogle className="text-xl" />
          Login with Google
        </a>
      </section>
    </main>
  );
}