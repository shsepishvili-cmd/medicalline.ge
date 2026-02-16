'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  // 1. ვახორციელებთ ავტორიზაციას
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert("შეცდომა: " + error.message);
    setLoading(false);
  } else {
    // 2. 👇 აი აქ უნდა ეწეროს /dashboard და არა /
    router.push('/dashboard'); 
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg shadow-md w-96 text-black">
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">Medical Line Login</h2>
        
        {errorMsg && (
          <div className="bg-red-100 text-red-600 p-2 rounded mb-4 text-sm text-center">
            {errorMsg}
          </div>
        )}

        <input 
          type="email" 
          placeholder="Email" 
          required
          className="w-full p-2 mb-4 border rounded bg-white text-black"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input 
          type="password" 
          placeholder="Password" 
          required
          className="w-full p-2 mb-6 border rounded bg-white text-black"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:bg-gray-400"
        >
          {loading ? 'მოწმდება...' : 'შესვლა'}
        </button>
      </form>
    </div>
  )
}