"use client";

import { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";

export default function RankingPage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "players"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      list.sort((a, b) => {
        const aLikes = Array.isArray(a.likedBy) ? a.likedBy.length : 0;
        const bLikes = Array.isArray(b.likedBy) ? b.likedBy.length : 0;
        return bLikes - aLikes;
      });

      setPlayers(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
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
      <h1 style={{ fontSize: "26px" }}>En Çok Beğenilen Oyuncular</h1>
      <p style={{ fontSize: "14px", opacity: 0.8 }}>
        GsScout topluluğunun en çok scoutladığı genç oyuncular
      </p>

      <div
        style={{
          background: "rgba(10,10,10,0.9)",
          padding: "20px",
          borderRadius: "12px",
          minWidth: "320px",
          maxWidth: "800px",
          width: "100%",
          boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(10px)",
        }}
      >
        {players.length === 0 && (
          <p style={{ fontSize: "14px" }}>
            Henüz listede oyuncu yok. Ana sayfadan oyuncu ekleyebilirsin.
          </p>
        )}

        {players.map((p, index) => {
          const likedBy = Array.isArray(p.likedBy) ? p.likedBy : [];
          const likeCount = likedBy.length;

          return (
            <div
              key={p.id}
              style={{
                borderBottom: "1px solid #333",
                padding: "10px 0",
                display: "flex",
                gap: "12px",
              }}
            >
              {/* Sıra numarası */}
              <div
                style={{
                  minWidth: "32px",
                  textAlign: "center",
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#ffc107",
                }}
              >
                #{index + 1}
              </div>

              {/* Oyuncu bilgileri */}
              <div style={{ flex: 1 }}>
                <a
                  href={`/player/${p.id}`}
                  style={{
                    fontSize: "16px",
                    fontWeight: "bold",
                    color: "#fff",
                    textDecoration: "none",
                  }}
                >
                  {p.name || "İsimsiz oyuncu"}
                </a>

                <div style={{ fontSize: "14px", opacity: 0.9 }}>
                  {p.position ? p.position : "Mevki yok"}{" "}
                  {p.birthYear ? `· ${p.birthYear} doğumlu` : ""}{" "}
                  {p.club ? `· ${p.club}` : ""}{" "}
                  {p.country ? `· ${p.country}` : ""}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    opacity: 0.6,
                    marginTop: "4px",
                  }}
                >
                  Ekleyen: {p.addedByName || p.addedByEmail || "Bilinmiyor"}
                </div>

                <a
                  href={`/player/${p.id}`}
                  style={{
                    fontSize: "12px",
                    marginTop: "4px",
                    display: "inline-block",
                    color: "#ffc107",
                    textDecoration: "underline",
                  }}
                >
                  Oyuncu detayını gör →
                </a>
              </div>

              {/* Beğeni sayısı */}
              <div
                style={{
                  minWidth: "80px",
                  textAlign: "right",
                  fontSize: "13px",
                }}
              >
                {likeCount === 0
                  ? "0 beğeni"
                  : likeCount === 1
                  ? "1 beğeni"
                  : `${likeCount} beğeni`}
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
