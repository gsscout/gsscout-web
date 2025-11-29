"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { auth, db } from "./firebase/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
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

// ⚠ BURAYA KENDİ UID'İNİ YAZ (admin panelde kullandığınla aynı olacak)
const ADMIN_UID = "xKH1GOchlKafqE2eMA10YVusonj2";

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profil bilgileri
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Oyuncu ekleme
  const [playerName, setPlayerName] = useState("");
  const [playerPosition, setPlayerPosition] = useState("");
  const [playerBirthYear, setPlayerBirthYear] = useState("");
  const [playerClub, setPlayerClub] = useState("");
  const [playerCountry, setPlayerCountry] = useState("");
  const [playerNote, setPlayerNote] = useState("");
  const [savingPlayer, setSavingPlayer] = useState(false);

  // Oyuncu listesi
  const [players, setPlayers] = useState([]);

  // Arama
  const [searchTerm, setSearchTerm] = useState("");

  // Benim oyuncularım / toplam like
  const myPlayers = players.filter((p) => p.addedByUid === (user?.uid || ""));
  const myPlayerCount = myPlayers.length;
  const myTotalLikes = myPlayers.reduce((sum, p) => {
    const likedBy = Array.isArray(p.likedBy) ? p.likedBy : [];
    return sum + likedBy.length;
  }, 0);

  // Kullanıcıyı ve profil bilgisini dinle
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser || null);
      setLoading(false);

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

  // Oyuncu listesine canlı abonelik
  useEffect(() => {
    const q = query(collection(db, "players"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setPlayers(list);
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

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Oyuncu ekle – aynı isim daha önce eklenmişse uyar
  const addPlayer = async () => {
    if (!user) return;

    if (!phoneVerified) {
      alert("Oyuncu eklemek için önce telefonunu girip profilde kaydetmelisin.");
      return;
    }

    if (!playerName.trim() || !playerPosition.trim()) {
      alert("En azından oyuncu adı ve mevki girmen lazım.");
      return;
    }

    const nameNormalized = playerName.trim().toLowerCase();
    const birthYearNum = playerBirthYear.trim()
      ? Number(playerBirthYear.trim())
      : null;

    try {
      setSavingPlayer(true);

      // Aynı isimde oyuncu var mı kontrol et
      const playersRef = collection(db, "players");
      const q = query(playersRef, where("nameNormalized", "==", nameNormalized));
      const existingSnap = await getDocs(q);

      if (!existingSnap.empty) {
        alert(
          "Bu oyuncu zaten listeye eklenmiş. Arama kutusundan ismini yazarak oyuncunun profiline gidebilirsin."
        );
        setSavingPlayer(false);
        return;
      }

      // Yeni oyuncu ekle
      await addDoc(collection(db, "players"), {
        name: playerName.trim(),
        nameNormalized,
        position: playerPosition.trim(),
        birthYear: birthYearNum,
        club: playerClub.trim(),
        country: playerCountry.trim(),
        note: playerNote.trim(),
        youtubeLink: "",
        transfermarktLink: "",
        imageUrl: "",
        addedByUid: user.uid,
        addedByEmail: user.email,
        addedByName: `${firstName} ${lastName}`.trim(),
        likedBy: [],
        createdAt: new Date(),
      });

      setPlayerName("");
      setPlayerPosition("");
      setPlayerBirthYear("");
      setPlayerClub("");
      setPlayerCountry("");
      setPlayerNote("");

      alert("Oyuncu listeye eklendi. 💛❤️");
    } catch (err) {
      console.error(err);
      alert("Oyuncu eklenirken bir hata oluştu.");
    } finally {
      setSavingPlayer(false);
    }
  };

  // Oyuncuyu beğen / beğenmekten vazgeç
  const toggleLike = async (player) => {
    if (!user) {
      alert("Beğenmek için giriş yapmalısın.");
      return;
    }

    if (!phoneVerified) {
      alert(
        "Beğenmek için önce telefonunu girip profilde kaydetmen gerekiyor."
      );
      return;
    }

    const likedBy = Array.isArray(player.likedBy) ? player.likedBy : [];
    const alreadyLiked = likedBy.includes(user.uid);

    const ref = doc(db, "players", player.id);

    try {
      await updateDoc(ref, {
        likedBy: alreadyLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
      });
    } catch (err) {
      console.error(err);
      alert("Beğeni güncellenirken bir hata oluştu.");
    }
  };

  // Arama sonuçları
  const filteredPlayers = players.filter((p) => {
    if (!searchTerm.trim()) return true;
    if (!p.name) return false;
    return p.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const isAdmin = user && user.uid === ADMIN_UID;

  // -------------------- UI --------------------

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

  // Giriş yoksa: landing sayfası
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
        {/* LOGO + BAŞLIK */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            marginBottom: "10px",
          }}
        >
          <Image
            src="/gsscout-logo.png"
            alt="GsScout Logo"
            width={70}
            height={70}
            style={{ borderRadius: "16px", objectFit: "cover" }}
          />
          <h1
            style={{
              fontSize: "40px",
              fontWeight: "700",
              letterSpacing: "0.08em",
            }}
          >
            GsScout
          </h1>
        </div>

        <p
          style={{
            maxWidth: "420px",
            fontSize: "15px",
            opacity: 0.9,
            marginBottom: "24px",
          }}
        >
          Galatasaray taraftarının keşfettiği genç yeteneklerin toplandığı
          topluluk platformu. Sen de beğendiğin oyuncuları ekle, hep birlikte
          scout’layalım.
        </p>

        <button
          onClick={signInWithGoogle}
          style={{
            padding: "12px 22px",
            fontSize: "16px",
            cursor: "pointer",
            borderRadius: "999px",
            border: "none",
            background:
              "linear-gradient(135deg, #ffc107 0%, #ff6f00 50%, #b71c1c 100%)",
            color: "#000",
            fontWeight: "600",
            boxShadow: "0 0 20px rgba(0,0,0,0.5)",
          }}
        >
          Google ile Giriş Yap
        </button>
      </main>
    );
  }

  // Giriş varsa: ana dashboard
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #8a1538 0, #050008 45%, #000 100%)",
        color: "#fff",
      }}
    >
      {/* Üst bar - LOGOLU NAVBAR */}
      <header
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          padding: "14px 24px",
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(10px)",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: "24px",
          }}
        >
          {/* SOL: LOGO */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexShrink: 0,
            }}
          >
            <Image
              src="/gsscout-logo.png"
              alt="GsScout logo"
              width={64}
              height={64}
              style={{
                borderRadius: "16px",
                objectFit: "cover",
              }}
            />
            <span
              style={{
                fontWeight: "700",
                letterSpacing: "0.08em",
                fontSize: "20px",
              }}
            >
              GsScout
            </span>
          </div>

          {/* ORTA: MENÜ */}
          <nav
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "18px",
              fontSize: "14px",
            }}
          >
            <a
              href="/"
              style={{
                textDecoration: "none",
                color: "#fff",
                opacity: 0.85,
              }}
            >
              Anasayfa
            </a>
            <a
              href="/ranking"
              style={{
                textDecoration: "none",
                color: "#fff",
                opacity: 0.85,
              }}
            >
              Sıralama
            </a>
            <a
              href="/profile"
              style={{
                textDecoration: "none",
                color: "#fff",
                opacity: 0.85,
              }}
            >
              Profil
            </a>

            {/* Admin linki sadece admin olan kullanıcıda gözüksün */}
            {isAdmin && (
              <a
                href="/admin"
                style={{
                  textDecoration: "none",
                  color: "#fff",
                  opacity: 0.85,
                }}
              >
                Admin
              </a>
            )}
          </nav>

          {/* SAĞ: ÇIKIŞ BUTONU */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              flexShrink: 0,
            }}
          >
            <button
              onClick={handleLogout}
              style={{
                marginLeft: "8px",
                padding: "6px 16px",
                fontSize: "12px",
                cursor: "pointer",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.4)",
                background:
                  "linear-gradient(135deg, rgba(255,193,7,0.1), rgba(183,28,28,0.2))",
                color: "#fff",
              }}
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </header>

      {/* İçerik */}
      <section
        style={{
          maxWidth: "900px",
          margin: "24px auto 40px",
          padding: "0 16px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Oyuncu ekleme kartı ORTADA tek başına */}
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
              marginBottom: "10px",
              fontSize: "18px",
              fontWeight: "600",
            }}
          >
            Oyuncu Ekle
          </h2>
          <p
            style={{
              fontSize: "12px",
              opacity: 0.7,
              marginBottom: "12px",
            }}
          >
            Sadece telefonunu kaydeden taraftarlar oyuncu ekleyebilir. Aynı
            oyuncu ismi birden fazla kez eklenemez.
          </p>

          {phoneVerified ? (
            <>
              <div style={{ marginBottom: "10px" }}>
                <label style={{ fontSize: "13px" }}>Oyuncu Adı</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
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
                  Mevki (ST, MC, CB...)
                </label>
                <input
                  type="text"
                  value={playerPosition}
                  onChange={(e) => setPlayerPosition(e.target.value)}
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
                <label style={{ fontSize: "13px" }}>Doğum Yılı</label>
                <input
                  type="number"
                  value={playerBirthYear}
                  onChange={(e) => setPlayerBirthYear(e.target.value)}
                  placeholder="2005"
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
                <label style={{ fontSize: "13px" }}>Kulüp</label>
                <input
                  type="text"
                  value={playerClub}
                  onChange={(e) => setPlayerClub(e.target.value)}
                  placeholder="Örn: FC Midtjylland U19"
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
                <label style={{ fontSize: "13px" }}>Ülke / Not</label>
                <input
                  type="text"
                  value={playerCountry}
                  onChange={(e) => setPlayerCountry(e.target.value)}
                  placeholder="Örn: Danimarka, solak, çok teknik"
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
                <label style={{ fontSize: "13px" }}>Oyuncu Notu</label>
                <textarea
                  value={playerNote}
                  onChange={(e) => setPlayerNote(e.target.value)}
                  placeholder="Bu oyuncu hakkında detaylı gözlemlerini yazabilirsin..."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    marginTop: "4px",
                    borderRadius: "8px",
                    border: "1px solid #333",
                    background: "#050505",
                    color: "#fff",
                    fontSize: "13px",
                    resize: "vertical",
                  }}
                />
              </div>

              <button
                onClick={addPlayer}
                disabled={savingPlayer}
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
                {savingPlayer ? "Ekleniyor..." : "Oyuncuyu Listeye Ekle"}
              </button>
            </>
          ) : (
            <p style={{ fontSize: "13px", opacity: 0.8 }}>
              Oyuncu ekleyebilmek için önce{" "}
              <a
                href="/profile"
                style={{ color: "#ffc107", textDecoration: "underline" }}
              >
                profil sayfasına
              </a>{" "}
              gidip telefon numaranı kaydetmen gerekiyor.
            </p>
          )}
        </div>

        {/* BENİM OYUNCULARIM KARTI */}
        <div
          style={{
            background: "rgba(10,10,10,0.9)",
            borderRadius: "16px",
            padding: "18px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(10px)",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "600",
              marginBottom: "6px",
            }}
          >
            Benim Oyuncularım
          </h2>
          <p
            style={{
              fontSize: "13px",
              opacity: 0.8,
              marginBottom: "10px",
            }}
          >
            Toplam <strong>{myPlayerCount}</strong> oyuncu ekledin, bu oyuncular{" "}
            <strong>{myTotalLikes}</strong> beğeni aldı.
          </p>

          {myPlayers.length === 0 && (
            <p style={{ fontSize: "13px", opacity: 0.8 }}>
              Henüz oyuncu eklemedin. Beğendiğin gençleri ekleyerek GsScout
              katkısı yapabilirsin.
            </p>
          )}

          {myPlayers.map((p) => {
            const likedBy = Array.isArray(p.likedBy) ? p.likedBy : [];
            const likeCount = likedBy.length;
            return (
              <div
                key={p.id}
                style={{
                  borderBottom: "1px solid #222",
                  padding: "8px 0",
                  fontSize: "13px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "8px",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <a
                      href={`/player/${p.id}`}
                      style={{
                        color: "#fff",
                        textDecoration: "none",
                        fontWeight: "600",
                      }}
                    >
                      {p.name}
                    </a>
                    <div style={{ opacity: 0.8 }}>
                      {p.position}{" "}
                      {p.birthYear ? `· ${p.birthYear} doğumlu` : ""}{" "}
                      {p.club ? `· ${p.club}` : ""}
                    </div>
                  </div>
                  <div style={{ fontSize: "12px", opacity: 0.9 }}>
                    {likeCount} beğeni
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* OYUNCU LİSTESİ + ARAMA */}
        <div
          style={{
            background: "rgba(10,10,10,0.9)",
            borderRadius: "16px",
            padding: "18px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              marginBottom: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "600",
              }}
            >
              Topluluk Oyuncu Listesi
            </h2>
            <a
              href="/ranking"
              style={{
                fontSize: "12px",
                textDecoration: "underline",
                color: "#ffc107",
              }}
            >
              En çok beğenilenler →
            </a>
          </div>

          {/* Arama kutusu */}
          <div
            style={{
              marginBottom: "12px",
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Oyuncu adıyla ara..."
              style={{
                flex: "1 1 180px",
                minWidth: "0",
                padding: "6px 8px",
                borderRadius: "999px",
                border: "1px solid #333",
                background: "#050505",
                color: "#fff",
                fontSize: "13px",
              }}
            />
            <span
              style={{
                fontSize: "12px",
                opacity: 0.7,
                alignSelf: "center",
              }}
            >
              {searchTerm.trim()
                ? `"${searchTerm}" için sonuçlar`
                : "İsim yazarak listede hızlıca oyuncu bulabilirsin."}
            </span>
          </div>

          {filteredPlayers.length === 0 && (
            <p style={{ fontSize: "14px", opacity: 0.8 }}>
              {searchTerm.trim()
                ? "Bu isimle eşleşen oyuncu bulunamadı."
                : "Henüz kimse oyuncu eklemedi. İlk GsScout sensin!"}
            </p>
          )}

          {filteredPlayers.map((p) => {
            const likedBy = Array.isArray(p.likedBy) ? p.likedBy : [];
            const likeCount = likedBy.length;
            const isLiked = user ? likedBy.includes(user.uid) : false;

            return (
              <div
                key={p.id}
                style={{
                  borderBottom: "1px solid #222",
                  padding: "10px 0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <a
                      href={`/player/${p.id}`}
                      style={{
                        fontSize: "16px",
                        fontWeight: "600",
                        color: "#fff",
                        textDecoration: "none",
                      }}
                    >
                      {p.name}
                    </a>

                    <div style={{ fontSize: "14px", opacity: 0.9 }}>
                      {p.position}{" "}
                      {p.birthYear ? `· ${p.birthYear} doğumlu` : ""}{" "}
                      {p.club ? `· ${p.club}` : ""}{" "}
                      {p.country ? `· ${p.country}` : ""}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        opacity: 0.7,
                        marginTop: "4px",
                      }}
                    >
                      Ekleyen: {p.addedByName || p.addedByEmail}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        opacity: 0.85,
                        marginTop: "4px",
                      }}
                    >
                      {likeCount === 0
                        ? "Bu oyuncuyu henüz kimse beğenmedi."
                        : likeCount === 1
                        ? "Bu oyuncuyu 1 kişi beğendi."
                        : `Bu oyuncuyu ${likeCount} kişi beğendi.`}
                    </div>

                    {p.note && (
                      <div
                        style={{
                          fontSize: "12px",
                          opacity: 0.8,
                          marginTop: "4px",
                        }}
                      >
                        Not:{" "}
                        {p.note.length > 100
                          ? p.note.slice(0, 100) + "..."
                          : p.note}
                      </div>
                    )}

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

                  <div>
                    <button
                      onClick={() => toggleLike(p)}
                      style={{
                        padding: "6px 12px",
                        cursor: "pointer",
                        borderRadius: "999px",
                        border: "none",
                        fontSize: "13px",
                        background: isLiked ? "#ffc107" : "#222",
                        color: isLiked ? "#000" : "#fff",
                        fontWeight: "500",
                      }}
                    >
                      {isLiked ? "Beğendim ✔" : "Beğen"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
