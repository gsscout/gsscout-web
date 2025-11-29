"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { auth, db } from "./firebase/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDocs,
  where,
} from "firebase/firestore";

const ADMIN_UID = "xKH1GOchlKafqE2eMA10YVusonj2";

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const provider = new GoogleAuthProvider();

  // GOOGLE LOGIN FONKSİYONU (POPUP + REDIRECT FALLBACK)
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      console.log("Popup login success");
    } catch (error) {
      console.error("Google login error:", error.code, error.message);

      // Popup engellenmişse redirect kullan
      if (
        error.code === "auth/popup-blocked" ||
        error.code === "auth/popup-closed-by-user"
      ) {
        console.log("Popup blocked → Redirecting...");
        await signInWithRedirect(auth, provider);
      } else {
        alert("Giriş hatası: " + error.code);
      }
    }
  };

  // Kullanıcı durumunu dinle
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  if (loading)
    return (
      <div className="w-full h-screen flex items-center justify-center text-white text-xl">
        Yükleniyor...
      </div>
    );

  if (!user)
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-black text-white">
        <Image
          src="/gs.png"
          width={120}
          height={120}
          alt="GS"
          className="mb-6"
        />

        <h1 className="text-4xl font-bold mb-4">GsScout</h1>
        <p className="text-gray-400 text-center mb-8 max-w-md">
          Galatasaray taraftarının keşfettiği genç yeteneklerin toplandığı
          topluluk platformu. Sen de beğendiğin oyuncuları ekle, hep birlikte
          scout’layalım.
        </p>

        <button
          onClick={handleGoogleLogin}
          className="px-6 py-3 rounded-lg bg-gradient-to-r from-yellow-500 to-red-600 text-black font-semibold"
        >
          Google ile Giriş Yap
        </button>
      </div>
    );

  // BURADAN SONRASI → GİRİŞ YAPAN KULLANICININ ANA SAYFASI
  return (
    <div className="w-full min-h-screen bg-black text-white p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">GsScout</h1>
        <button
          onClick={handleLogout}
          className="text-sm px-4 py-2 bg-red-600 rounded-lg"
        >
          Çıkış Yap
        </button>
      </div>

      <p className="text-gray-400">Merhaba {user.displayName}! 👋</p>
      <p className="mt-2">Burası kullanıcı ana sayfası. (Devamı sana kalmış!)</p>
    </div>
  );
}
