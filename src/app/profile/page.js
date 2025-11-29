"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser || null);
      setLoadingAuth(false);

      if (firebaseUser) {
        const ref = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setFirstName(data.firstName || "");
          setLastName(data.lastName || "");
          setPhone(data.phone || "");
          setPhoneVerified(!!data.phoneVerified);
        }
      } else {
        setFirstName("");
        setLastName("");
        setPhone("");
        setPhoneVerified(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
      alert("Giriş hatası!");
    }
  };

  const saveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      alert("Lütfen isim ve soyisim gir.");
      return;
    }

    if (!user) return;

    try {
      setSavingProfile(true);

      const ref = doc(db, "users", user.uid);
      const verified = phone.trim().length > 0;

      await setDoc(
        ref,
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          phoneVerified: verified,
          email: user.email,
          updatedAt: new Date(),
          createdAt: new Date(),
        },
        { merge: true }
      );

      setPhoneVerified(verified);

      alert("Profil kaydedildi!");
    } catch (err) {
      console.error(err);
      alert("Profil kaydedilirken hata oluştu.");
    } finally {
      setSavingProfile(false);
    }
  };

  if (loadingAuth) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top, #8a1538 0, #050008 45%, #000 100%)",
          color: "#fff",
        }}
      >
        Yükleniyor...
      </main>
    );
  }

  // Giriş yoksa, burada da direkt login butonu gösterelim
  if (!user) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top, #8a1538 0, #050008 45%, #000 100%)",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "32px",
            marginBottom: "10px",
            fontWeight: "700",
          }}
        >
          Profil
        </h1>
        <p
          style={{
            maxWidth: "420px",
            fontSize: "15px",
            opacity: 0.9,
            marginBottom: "20px",
          }}
        >
          Profil bilgilerini düzenlemek için önce giriş yapman gerekiyor.
        </p>
        <button
          onClick={signInWithGoogle}
          style={{
            padding: "10px 20px",
            fontSize: "15px",
            cursor: "pointer",
            borderRadius: "999px",
            border: "none",
            background:
              "linear-gradient(135deg, #ffc107 0%, #ff6f00 50%, #b71c1c 100%)",
            color: "#000",
            fontWeight: "600",
          }}
        >
          Google ile Giriş Yap
        </button>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #8a1538 0, #050008 45%, #000 100%)",
        color: "#fff",
        padding: "24px 16px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <a
            href="/"
            style={{
              fontSize: "13px",
              color: "#fff",
              textDecoration: "none",
              opacity: 0.8,
            }}
          >
            ← Anasayfa
          </a>
        </header>

        <div
          style={{
            background: "rgba(10,10,10,0.9)",
            borderRadius: "16px",
            padding: "18px 18px 16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(10px)",
          }}
        >
          <h2
            style={{
              marginBottom: "12px",
              fontSize: "20px",
              fontWeight: "600",
            }}
          >
            Profil Bilgileri
          </h2>

          <p
            style={{
              fontSize: "12px",
              opacity: 0.7,
              marginBottom: "12px",
            }}
          >
            İsim–soyisim ve telefonun, troll hesapları engellemek için
            kullanılıyor. Sadece admin görür.
          </p>

          <div style={{ marginBottom: "10px" }}>
            <label style={{ fontSize: "13px" }}>İsim</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                marginTop: "4px",
                borderRadius: "8px",
                border: "1px solid #333",
                background: "#050505",
                color: "#fff",
                fontSize: "13px",
              }}
            />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label style={{ fontSize: "13px" }}>Soyisim</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                marginTop: "4px",
                borderRadius: "8px",
                border: "1px solid #333",
                background: "#050505",
                color: "#fff",
                fontSize: "13px",
              }}
            />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label style={{ fontSize: "13px" }}>
              Telefon (+90… formatında)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+905xxxxxxxxx"
              style={{
                width: "100%",
                padding: "6px 8px",
                marginTop: "4px",
                borderRadius: "8px",
                border: "1px solid #333",
                background: "#050505",
                color: "#fff",
                fontSize: "13px",
              }}
            />
          </div>

          <button
            onClick={saveProfile}
            disabled={savingProfile}
            style={{
              marginTop: "8px",
              padding: "8px 14px",
              cursor: "pointer",
              borderRadius: "999px",
              border: "none",
              width: "100%",
              fontSize: "14px",
              fontWeight: "500",
              background:
                "linear-gradient(135deg, #ffc107 0%, #ff6f00 50%, #b71c1c 100%)",
              color: "#000",
            }}
          >
            {savingProfile ? "Kaydediliyor..." : "Profili Kaydet"}
          </button>

          <div
            style={{
              marginTop: "12px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>Telefon Doğrulama:</span>
            {phoneVerified ? (
              <span style={{ color: "lightgreen", fontWeight: "500" }}>
                Doğrulandı
              </span>
            ) : (
              <span style={{ color: "#ffb74d", fontWeight: "500" }}>
                Doğrulanmadı
              </span>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
