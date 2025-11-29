"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  deleteDoc,
  getDocs,
  where,
} from "firebase/firestore";

const ADMIN_UID = "xKH1GOchlKafqE2eMA10YVusonj2"; // ⚠️ BURAYA KENDİ UID'İNİ YAZ

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [users, setUsers] = useState([]);
  const [players, setPlayers] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setCurrentUser(firebaseUser || null);
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // Kullanıcılar koleksiyonu
  useEffect(() => {
    if (!currentUser || currentUser.uid !== ADMIN_UID) return;

    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setUsers(list);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Oyuncular koleksiyonu
  useEffect(() => {
    if (!currentUser || currentUser.uid !== ADMIN_UID) return;

    const q = query(collection(db, "players"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setPlayers(list);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Tek bir oyuncuyu sil
  const deletePlayer = async (playerId, playerName) => {
    if (!currentUser || currentUser.uid !== ADMIN_UID) return;

    const ok = window.confirm(
      `"${playerName || "Bu oyuncu"}" kaydını silmek istediğine emin misin?`
    );
    if (!ok) return;

    try {
      setBusy(true);
      await deleteDoc(doc(db, "players", playerId));
      alert("Oyuncu silindi.");
    } catch (err) {
      console.error(err);
      alert("Oyuncu silinirken bir hata oluştu.");
    } finally {
      setBusy(false);
    }
  };

  // Bir kullanıcıyı ve onun eklediği tüm oyuncuları sil
  const deleteUserAndPlayers = async (userId, userNameOrEmail) => {
    if (!currentUser || currentUser.uid !== ADMIN_UID) return;

    const ok = window.confirm(
      `${userNameOrEmail} kullanıcısını ve eklediği tüm oyuncuları silmek istediğine emin misin?\n\nBu işlem geri alınamaz.`
    );
    if (!ok) return;

    try {
      setBusy(true);

      // Kullanıcının profil kaydını sil
      await deleteDoc(doc(db, "users", userId));

      // Kullanıcının eklediği tüm oyuncuları bul ve sil
      const playersRef = collection(db, "players");
      const q = query(playersRef, where("addedByUid", "==", userId));
      const snap = await getDocs(q);

      const batchDeletes = snap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(batchDeletes);

      alert("Kullanıcı ve eklediği oyuncular silindi.");
    } catch (err) {
      console.error(err);
      alert("Silme işlemi sırasında bir hata oluştu.");
    } finally {
      setBusy(false);
    }
  };

  if (checkingAuth) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Kontrol ediliyor...
      </main>
    );
  }

  // Giriş yoksa
  if (!currentUser) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <h1>Admin Paneli</h1>
        <p style={{ marginTop: "10px" }}>
          Bu sayfayı görmek için önce ana sayfadan giriş yapman gerekiyor.
        </p>
        <a
          href="/"
          style={{ marginTop: "10px", textDecoration: "underline", color: "#fff" }}
        >
          ← Ana sayfaya dön
        </a>
      </main>
    );
  }

  // Giriş var ama UID admin değilse
  if (currentUser.uid !== ADMIN_UID) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <h1>Yetkisiz Erişim</h1>
        <p style={{ marginTop: "10px" }}>
          Bu sayfayı sadece admin görüntüleyebilir.
        </p>
        <a
          href="/"
          style={{ marginTop: "10px", textDecoration: "underline", color: "#fff" }}
        >
          ← Ana sayfaya dön
        </a>
      </main>
    );
  }

  // Buraya geldiysek → SEN adminsindir 😎
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 20px",
        background:
          "radial-gradient(circle at top, #8a1538 0, #050008 45%, #000 100%)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px",
      }}
    >
      <h1 style={{ fontSize: "26px" }}>GsScout Admin Paneli</h1>
      <p style={{ fontSize: "14px", opacity: 0.8 }}>
        Troll kullanıcıları ve fake oyuncu kayıtlarını buradan temizleyebilirsin.
      </p>

      {busy && (
        <div
          style={{
            fontSize: "13px",
            color: "#ffc107",
          }}
        >
          İşlem yapılıyor, lütfen bekle...
        </div>
      )}

      {/* Kullanıcı listesi */}
      <div
        style={{
          background: "rgba(10,10,10,0.9)",
          padding: "20px",
          borderRadius: "12px",
          minWidth: "320px",
          maxWidth: "900px",
          width: "100%",
          boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(10px)",
        }}
      >
        <h2 style={{ marginBottom: "10px", fontSize: "20px" }}>Kullanıcılar</h2>
        <p style={{ fontSize: "12px", opacity: 0.7, marginBottom: "8px" }}>
          Fake / troll hesapları buradan silebilirsin. Kullanıcı silindiğinde,
          onun eklediği tüm oyuncular da kaldırılır.
        </p>

        {users.length === 0 && (
          <p style={{ fontSize: "14px" }}>Henüz kayıtlı kullanıcı yok.</p>
        )}

        {users.map((u) => {
          const label =
            (u.firstName || u.lastName) &&
            `${u.firstName || ""} ${u.lastName || ""}`.trim();
          const displayName = label || u.email || u.id;

          return (
            <div
              key={u.id}
              style={{
                borderBottom: "1px solid #333",
                padding: "8px 0",
                fontSize: "13px",
                display: "flex",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <div>
                <div>
                  <strong>{displayName}</strong>{" "}
                  {u.email && (
                    <span style={{ opacity: 0.8 }}>({u.email})</span>
                  )}
                </div>
                <div style={{ opacity: 0.8 }}>
                  Telefon: {u.phone || "-"} •{" "}
                  {u.phoneVerified ? "Doğrulandı" : "Doğrulanmadı"}
                </div>
                <div style={{ opacity: 0.6, fontSize: "12px" }}>UID: {u.id}</div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  alignItems: "flex-end",
                }}
              >
                <button
                  disabled={busy}
                  onClick={() =>
                    deleteUserAndPlayers(u.id, displayName || u.email || u.id)
                  }
                  style={{
                    padding: "4px 8px",
                    fontSize: "11px",
                    borderRadius: "999px",
                    border: "1px solid #ff5252",
                    background: "transparent",
                    color: "#ff8a80",
                    cursor: "pointer",
                  }}
                >
                  Kullanıcıyı & Oyuncularını Sil
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Oyuncu listesi */}
      <div
        style={{
          background: "rgba(10,10,10,0.9)",
          padding: "20px",
          borderRadius: "12px",
          minWidth: "320px",
          maxWidth: "900px",
          width: "100%",
          boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(10px)",
        }}
      >
        <h2 style={{ marginBottom: "10px", fontSize: "20px" }}>Oyuncular</h2>
        <p style={{ fontSize: "12px", opacity: 0.7, marginBottom: "8px" }}>
          Fake oyuncu isimlerini veya troll kayıtları buradan tek tek
          silebilirsin.
        </p>

        {players.length === 0 && (
          <p style={{ fontSize: "14px" }}>Henüz eklenen oyuncu yok.</p>
        )}

        {players.map((p) => {
          const likedBy = Array.isArray(p.likedBy) ? p.likedBy : [];
          const likeCount = likedBy.length;

          return (
            <div
              key={p.id}
              style={{
                borderBottom: "1px solid #333",
                padding: "8px 0",
                fontSize: "13px",
                display: "flex",
                justifyContent: "space-between",
                gap: "8px",
              }}
            >
              <div>
                <div>
                  <strong>{p.name}</strong> – {p.position || "Mevki yok"}{" "}
                  {p.birthYear ? `· ${p.birthYear} doğumlu` : ""}{" "}
                  {p.club ? `· ${p.club}` : ""}{" "}
                  {p.country ? `· ${p.country}` : ""}
                </div>
                <div style={{ opacity: 0.8 }}>
                  Ekleyen: {p.addedByName || p.addedByEmail} • {likeCount} beğeni
                </div>
                <div style={{ opacity: 0.6, fontSize: "12px" }}>ID: {p.id}</div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  alignItems: "flex-end",
                }}
              >
                <a
                  href={`/player/${p.id}`}
                  style={{
                    fontSize: "11px",
                    color: "#ffc107",
                    textDecoration: "underline",
                  }}
                >
                  Detaya git
                </a>
                <button
                  disabled={busy}
                  onClick={() => deletePlayer(p.id, p.name)}
                  style={{
                    padding: "4px 8px",
                    fontSize: "11px",
                    borderRadius: "999px",
                    border: "1px solid #ff5252",
                    background: "transparent",
                    color: "#ff8a80",
                    cursor: "pointer",
                  }}
                >
                  Oyuncuyu Sil
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <a
        href="/"
        style={{
          marginTop: "10px",
          fontSize: "14px",
          textDecoration: "underline",
          color: "#fff",
        }}
      >
        ← Ana sayfaya dön
      </a>
    </main>
  );
}
