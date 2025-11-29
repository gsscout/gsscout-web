"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { auth, db } from "../../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
} from "firebase/firestore";

// ⚠ BURAYA KENDİ ADMIN UID'İNİ YAZ
const ADMIN_UID = "xKH1GOchlKafqE2eMA10YVusonj2";

export default function PlayerDetailPage() {
  const { id } = useParams(); // URL'deki [id]

  const [currentUser, setCurrentUser] = useState(null);
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [player, setPlayer] = useState(null);
  const [loadingPlayer, setLoadingPlayer] = useState(true);
  const [togglingLike, setTogglingLike] = useState(false);

  // Not düzenleme
  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Link edit state
  const [youtubeLinkInput, setYoutubeLinkInput] = useState("");
  const [tmLinkInput, setTmLinkInput] = useState("");
  const [savingLinks, setSavingLinks] = useState(false); // admin için
  const [savingTmLink, setSavingTmLink] = useState(false); // owner için

  // Yorumlar
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [togglingCommentLikeId, setTogglingCommentLikeId] = useState(null);
  const [deletingCommentId, setDeletingCommentId] = useState(null);

  // Kullanıcı + telefon doğrulama bilgisi
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setCurrentUser(firebaseUser || null);
      setPhoneVerified(false);

      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setPhoneVerified(!!data.phoneVerified);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Oyuncu verisi
  useEffect(() => {
    const fetchPlayer = async () => {
      if (!id) return;

      try {
        const refDoc = doc(db, "players", id);
        const snap = await getDoc(refDoc);
        if (snap.exists()) {
          const data = snap.data();
          setPlayer({ id: snap.id, ...data });
          setNoteInput(data.note || "");
          setYoutubeLinkInput(data.youtubeLink || "");
          setTmLinkInput(data.transfermarktLink || "");
        } else {
          setPlayer(null);
        }
      } catch (err) {
        console.error(err);
        setPlayer(null);
      } finally {
        setLoadingPlayer(false);
      }
    };

    fetchPlayer();
  }, [id]);

  // Yorumları canlı dinle
  useEffect(() => {
    if (!id) return;

    const commentsRef = collection(db, "players", id, "comments");
    const q = query(commentsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setComments(list);
    });

    return () => unsubscribe();
  }, [id]);

  const isAdmin = currentUser && currentUser.uid === ADMIN_UID;
  const isOwner =
    currentUser && player && currentUser.uid === player.addedByUid;

  const canEditNote = isOwner || isAdmin;
  const canEditTmLink = isOwner || isAdmin; // Transfermarkt: owner + admin

  const toggleLike = async () => {
    if (!currentUser) {
      alert("Beğenmek için giriş yapman gerekiyor.");
      return;
    }

    if (!phoneVerified) {
      alert("Beğenmek için önce telefonunu girip profili kaydetmelisin.");
      return;
    }

    if (!player) return;

    const refDoc = doc(db, "players", player.id);
    const likedBy = Array.isArray(player.likedBy) ? player.likedBy : [];
    const alreadyLiked = likedBy.includes(currentUser.uid);

    try {
      setTogglingLike(true);
      await updateDoc(refDoc, {
        likedBy: alreadyLiked
          ? arrayRemove(currentUser.uid)
          : arrayUnion(currentUser.uid),
      });

      // local state güncelle
      setPlayer((prev) => {
        if (!prev) return prev;
        const prevLikedBy = Array.isArray(prev.likedBy) ? prev.likedBy : [];
        if (alreadyLiked) {
          return {
            ...prev,
            likedBy: prevLikedBy.filter((uid) => uid !== currentUser.uid),
          };
        } else {
          return {
            ...prev,
            likedBy: [...prevLikedBy, currentUser.uid],
          };
        }
      });
    } catch (err) {
      console.error(err);
      alert("Beğeni güncellenirken hata oluştu.");
    } finally {
      setTogglingLike(false);
    }
  };

  const saveNote = async () => {
    if (!canEditNote || !player) return;

    try {
      setSavingNote(true);
      const refDoc = doc(db, "players", player.id);
      const newNote = noteInput.trim();

      await updateDoc(refDoc, {
        note: newNote,
      });

      setPlayer((prev) =>
        prev
          ? {
              ...prev,
              note: newNote,
            }
          : prev
      );

      alert("Not kaydedildi.");
    } catch (err) {
      console.error(err);
      alert("Not kaydedilirken hata oluştu.");
    } finally {
      setSavingNote(false);
    }
  };

  // ADMIN: YouTube + TM linkleri kaydet
  const saveLinks = async () => {
    if (!isAdmin || !player) return;

    try {
      setSavingLinks(true);
      const refDoc = doc(db, "players", player.id);
      const newYoutube = youtubeLinkInput.trim();
      const newTm = tmLinkInput.trim();

      await updateDoc(refDoc, {
        youtubeLink: newYoutube,
        transfermarktLink: newTm,
      });

      setPlayer((prev) =>
        prev
          ? {
              ...prev,
              youtubeLink: newYoutube,
              transfermarktLink: newTm,
            }
          : prev
      );

      alert("Linkler kaydedildi.");
    } catch (err) {
      console.error(err);
      alert("Linkler kaydedilirken hata oluştu.");
    } finally {
      setSavingLinks(false);
    }
  };

  // OWNER (veya admin de isterse kullanabilir): sadece Transfermarkt linkini kaydet
  const saveTmLink = async () => {
    if (!canEditTmLink || !player) return;

    try {
      setSavingTmLink(true);
      const refDoc = doc(db, "players", player.id);
      const newTm = tmLinkInput.trim();

      await updateDoc(refDoc, {
        transfermarktLink: newTm,
      });

      setPlayer((prev) =>
        prev
          ? {
              ...prev,
              transfermarktLink: newTm,
            }
          : prev
      );

      alert("Transfermarkt linki kaydedildi.");
    } catch (err) {
      console.error(err);
      alert("Transfermarkt linki kaydedilirken hata oluştu.");
    } finally {
      setSavingTmLink(false);
    }
  };

  const buildYoutubeEmbedUrl = (url) => {
    if (!url) return null;

    try {
      const u = new URL(url);
      // https://www.youtube.com/watch?v=VIDEOID
      if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
        const vid = u.searchParams.get("v");
        return `https://www.youtube.com/embed/${vid}`;
      }

      // https://youtu.be/VIDEOID
      if (u.hostname === "youtu.be") {
        const vid = u.pathname.replace("/", "");
        if (vid) {
          return `https://www.youtube.com/embed/${vid}`;
        }
      }

      return null;
    } catch {
      return null;
    }
  };

  // Yorum ekle
  const addComment = async () => {
    if (!currentUser) {
      alert("Yorum yazmak için giriş yapman gerekiyor.");
      return;
    }

    if (!phoneVerified) {
      alert(
        "Yorum yazabilmek için önce telefonunu girip profilde kaydetmelisin."
      );
      return;
    }

    if (!player) return;

    const text = newComment.trim();
    if (!text) {
      alert("Boş yorum gönderemezsin.");
      return;
    }
    if (text.length < 3) {
      alert("Yorum en az 3 karakter olmalı.");
      return;
    }

    try {
      setSavingComment(true);
      await addDoc(collection(db, "players", player.id, "comments"), {
        text,
        createdAt: new Date(),
        authorUid: currentUser.uid,
        authorName: currentUser.email || "GsScout üyesi",
        likedBy: [],
      });
      setNewComment("");
    } catch (err) {
      console.error(err);
      alert("Yorum eklenirken hata oluştu.");
    } finally {
      setSavingComment(false);
    }
  };

  // Yorumu beğen / vazgeç
  const toggleCommentLike = async (comment) => {
    if (!currentUser) {
      alert("Yorumu beğenmek için giriş yapman gerekiyor.");
      return;
    }

    if (!phoneVerified) {
      alert(
        "Yorum beğenebilmek için önce telefonunu girip profili kaydetmelisin."
      );
      return;
    }

    const refDoc = doc(db, "players", player.id, "comments", comment.id);
    const likedBy = Array.isArray(comment.likedBy) ? comment.likedBy : [];
    const alreadyLiked = likedBy.includes(currentUser.uid);

    try {
      setTogglingCommentLikeId(comment.id);
      await updateDoc(refDoc, {
        likedBy: alreadyLiked
          ? arrayRemove(currentUser.uid)
          : arrayUnion(currentUser.uid),
      });
    } catch (err) {
      console.error(err);
      alert("Yorum beğenisi güncellenirken hata oluştu.");
    } finally {
      setTogglingCommentLikeId(null);
    }
  };

  // Yorumu sil
  const deleteComment = async (comment) => {
    if (!currentUser) {
      alert("Yorum silmek için giriş yapman gerekiyor.");
      return;
    }

    const isOwnerOfComment = currentUser.uid === comment.authorUid;
    if (!isOwnerOfComment && !isAdmin) {
      alert("Bu yorumu silme iznin yok.");
      return;
    }

    if (
      typeof window !== "undefined" &&
      !window.confirm("Bu yorumu silmek istediğine emin misin?")
    ) {
      return;
    }

    try {
      setDeletingCommentId(comment.id);
      const refDoc = doc(db, "players", player.id, "comments", comment.id);
      await deleteDoc(refDoc);
    } catch (err) {
      console.error(err);
      alert("Yorum silinirken bir hata oluştu.");
    } finally {
      setDeletingCommentId(null);
    }
  };

  if (loadingPlayer) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top, #8a1538 0, #050008 45%, #000 100%)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Oyuncu yükleniyor...
      </main>
    );
  }

  if (!player) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top, #8a1538 0, #050008 45%, #000 100%)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <h1>Oyuncu bulunamadı</h1>
        <p style={{ marginTop: "8px", fontSize: "14px", opacity: 0.8 }}>
          Link yanlış olabilir veya oyuncu silinmiş olabilir.
        </p>
        <a
          href="/"
          style={{
            marginTop: "16px",
            textDecoration: "underline",
            color: "#fff",
            fontSize: "14px",
          }}
        >
          ← Ana sayfaya dön
        </a>
      </main>
    );
  }

  const likedBy = Array.isArray(player.likedBy) ? player.likedBy : [];
  const likeCount = likedBy.length;
  const isLiked = currentUser && likedBy.includes(currentUser.uid);

  const youtubeEmbedUrl = buildYoutubeEmbedUrl(player.youtubeLink);

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
          maxWidth: "700px",
        }}
      >
        {/* Üst kısım */}
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
            ← Ana sayfa
          </a>
          <a
            href="/ranking"
            style={{
              fontSize: "13px",
              color: "#ffc107",
              textDecoration: "none",
            }}
          >
            Sıralama →
          </a>
        </header>

        {/* Kart */}
        <div
          style={{
            background: "rgba(10,10,10,0.9)",
            borderRadius: "18px",
            padding: "20px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(10px)",
          }}
        >
          {/* Temel bilgiler */}
          <h1
            style={{
              fontSize: "24px",
              marginBottom: "4px",
              fontWeight: "600",
            }}
          >
            {player.name}
          </h1>

          <div
            style={{
              fontSize: "14px",
              opacity: 0.9,
              marginBottom: "12px",
            }}
          >
            {player.position && <span>{player.position}</span>}
            {player.birthYear && <span> · {player.birthYear} doğumlu</span>}
            {player.club && <span> · {player.club}</span>}
            {player.country && <span> · {player.country}</span>}
          </div>

          <div
            style={{
              fontSize: "12px",
              opacity: 0.75,
              marginBottom: "16px",
            }}
          >
            Ekleyen: {player.addedByName || player.addedByEmail}
          </div>

          {/* Beğeni durumu */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            <div style={{ fontSize: "13px", opacity: 0.9 }}>
              {likeCount === 0
                ? "Bu oyuncuyu henüz kimse beğenmedi."
                : likeCount === 1
                ? "Bu oyuncuyu 1 kişi beğendi."
                : `Bu oyuncuyu ${likeCount} kişi beğendi.`}
            </div>

            <button
              onClick={toggleLike}
              disabled={togglingLike}
              style={{
                padding: "8px 14px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "500",
                background: isLiked ? "#ffc107" : "#222",
                color: isLiked ? "#000" : "#fff",
              }}
            >
              {isLiked
                ? togglingLike
                  ? "Güncelleniyor..."
                  : "Beğendim ✔"
                : togglingLike
                ? "Güncelleniyor..."
                : "Beğen"}
            </button>
          </div>

          {/* Not bölümü */}
          <div
            style={{
              marginTop: "10px",
              paddingTop: "10px",
              borderTop: "1px solid #333",
            }}
          >
            <h2
              style={{
                fontSize: "16px",
                marginBottom: "6px",
                fontWeight: "600",
              }}
            >
              Oyuncu Notu
            </h2>

            {!canEditNote && (
              <p
                style={{
                  fontSize: "13px",
                  opacity: 0.85,
                  whiteSpace: "pre-wrap",
                }}
              >
                {player.note
                  ? player.note
                  : "Bu oyuncu için henüz detaylı bir not girilmemiş."}
              </p>
            )}

            {canEditNote && (
              <>
                <textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Bu oyuncu hakkında detaylı notlarını buraya yazabilirsin. Oyun stili, güçlü ve zayıf yönleri, hangi maçta dikkatini çekti gibi..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    border: "1px solid #333",
                    background: "#050505",
                    color: "#fff",
                    fontSize: "13px",
                    resize: "vertical",
                    marginBottom: "6px",
                  }}
                />
                <button
                  onClick={saveNote}
                  disabled={savingNote}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "999px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "500",
                    background:
                      "linear-gradient(135deg, #ffc107 0%, #ff6f00 50%, #b71c1c 100%)",
                    color: "#000",
                  }}
                >
                  {savingNote ? "Kaydediliyor..." : "Notu Kaydet"}
                </button>
              </>
            )}
          </div>

          {/* YouTube & Transfermarkt Bölümü */}
          <div
            style={{
              marginTop: "16px",
              paddingTop: "12px",
              borderTop: "1px solid #333",
            }}
          >
            <h2
              style={{
                fontSize: "16px",
                marginBottom: "8px",
                fontWeight: "600",
              }}
            >
              Ek Kaynaklar
            </h2>

            {/* YouTube video gösterimi (herkes görebilir, sadece admin düzenler) */}
            {player.youtubeLink && (
              <div style={{ marginBottom: "12px" }}>
                <div
                  style={{
                    fontSize: "13px",
                    marginBottom: "4px",
                    opacity: 0.9,
                  }}
                >
                  YouTube Video:
                </div>
                {youtubeEmbedUrl ? (
                  <div
                    style={{
                      position: "relative",
                      paddingBottom: "56.25%",
                      height: 0,
                      overflow: "hidden",
                      borderRadius: "12px",
                      border: "1px solid #333",
                    }}
                  >
                    <iframe
                      src={youtubeEmbedUrl}
                      title="Oyuncu videosu"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        border: "0",
                      }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                ) : (
                  <a
                    href={player.youtubeLink}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: "13px",
                      color: "#ffc107",
                      textDecoration: "underline",
                    }}
                  >
                    YouTube videosunu aç →
                  </a>
                )}
              </div>
            )}

            {/* Transfermarkt linki gösterimi */}
            {player.transfermarktLink && (
              <div style={{ marginBottom: "12px" }}>
                <div
                  style={{
                    fontSize: "13px",
                    marginBottom: "4px",
                    opacity: 0.9,
                  }}
                >
                  Transfermarkt Profili:
                </div>
                <a
                  href={player.transfermarktLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: "13px",
                    color: "#ffc107",
                    textDecoration: "underline",
                  }}
                >
                  Transfermarkt sayfasını aç →
                </a>
              </div>
            )}

            {/* OWNER / ADMIN: sadece Transfermarkt linki düzenleme alanı */}
            {canEditTmLink && (
              <div
                style={{
                  marginTop: "12px",
                  paddingTop: "10px",
                  borderTop: "1px dashed #444",
                  fontSize: "12px",
                }}
              >
                <div
                  style={{
                    marginBottom: "6px",
                    opacity: 0.85,
                    fontWeight: "600",
                  }}
                >
                  Transfermarkt Linki Düzenleme
                  {!isAdmin && " (Sadece kendi eklediğin oyuncu)"}
                </div>

                <div style={{ marginBottom: "8px" }}>
                  <label>Transfermarkt Linki</label>
                  <input
                    type="text"
                    value={tmLinkInput}
                    onChange={(e) => setTmLinkInput(e.target.value)}
                    placeholder="https://www.transfermarkt.com.tr/..."
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      marginTop: "4px",
                      borderRadius: "6px",
                      border: "1px solid #333",
                      background: "#050505",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                </div>

                <button
                  disabled={savingTmLink}
                  onClick={saveTmLink}
                  style={{
                    marginTop: "4px",
                    padding: "6px 12px",
                    borderRadius: "999px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "500",
                    background:
                      "linear-gradient(135deg, #ffc107 0%, #ff6f00 50%, #b71c1c 100%)",
                    color: "#000",
                  }}
                >
                  {savingTmLink ? "Kaydediliyor..." : "Transfermarkt Linkini Kaydet"}
                </button>
              </div>
            )}

            {/* Admin için ekstra: YouTube + TM birlikte düzenleme */}
            {isAdmin && (
              <div
                style={{
                  marginTop: "12px",
                  paddingTop: "10px",
                  borderTop: "1px dashed #555",
                  fontSize: "12px",
                }}
              >
                <div
                  style={{
                    marginBottom: "6px",
                    opacity: 0.85,
                    fontWeight: "600",
                  }}
                >
                  Admin: YouTube & TM Link Düzenleme
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <label>YouTube Linki</label>
                  <input
                    type="text"
                    value={youtubeLinkInput}
                    onChange={(e) => setYoutubeLinkInput(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      marginTop: "4px",
                      borderRadius: "6px",
                      border: "1px solid #333",
                      background: "#050505",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <label>Transfermarkt Linki</label>
                  <input
                    type="text"
                    value={tmLinkInput}
                    onChange={(e) => setTmLinkInput(e.target.value)}
                    placeholder="https://www.transfermarkt.com.tr/..."
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      marginTop: "4px",
                      borderRadius: "6px",
                      border: "1px solid #333",
                      background: "#050505",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                </div>

                <button
                  disabled={savingLinks}
                  onClick={saveLinks}
                  style={{
                    marginTop: "4px",
                    padding: "6px 12px",
                    borderRadius: "999px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "500",
                    background:
                      "linear-gradient(135deg, #ffc107 0%, #ff6f00 50%, #b71c1c 100%)",
                    color: "#000",
                  }}
                >
                  {savingLinks ? "Kaydediliyor..." : "Admin Olarak Linkleri Kaydet"}
                </button>
              </div>
            )}
          </div>

          {/* YORUMLAR BÖLÜMÜ */}
          <div
            style={{
              marginTop: "16px",
              paddingTop: "12px",
              borderTop: "1px solid #333",
            }}
          >
            <h2
              style={{
                fontSize: "16px",
                marginBottom: "8px",
                fontWeight: "600",
              }}
            >
              Yorumlar
            </h2>

            {/* Yorum yazma alanı */}
            {currentUser ? (
              phoneVerified ? (
                <div
                  style={{
                    marginBottom: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Bu oyuncu hakkında görüşlerini yaz..."
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "10px",
                      border: "1px solid #333",
                      background: "#050505",
                      color: "#fff",
                      fontSize: "13px",
                      resize: "vertical",
                    }}
                  />
                  <button
                    onClick={addComment}
                    disabled={savingComment}
                    style={{
                      alignSelf: "flex-end",
                      padding: "6px 14px",
                      borderRadius: "999px",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "500",
                      background:
                        "linear-gradient(135deg, #ffc107 0%, #ff6f00 50%, #b71c1c 100%)",
                      color: "#000",
                    }}
                  >
                    {savingComment ? "Gönderiliyor..." : "Yorumu Gönder"}
                  </button>
                </div>
              ) : (
                <p
                  style={{
                    fontSize: "13px",
                    opacity: 0.85,
                    marginBottom: "12px",
                  }}
                >
                  Yorum yazabilmek için önce{" "}
                  <a
                    href="/profile"
                    style={{ color: "#ffc107", textDecoration: "underline" }}
                  >
                    profil sayfasından
                  </a>{" "}
                  telefon numaranı kaydetmen gerekiyor.
                </p>
              )
            ) : (
              <p
                style={{
                  fontSize: "13px",
                  opacity: 0.85,
                  marginBottom: "12px",
                }}
              >
                Yorum yazmak için önce ana sayfadan Google ile giriş yapmalısın.
              </p>
            )}

            {/* Yorum listesi */}
            {comments.length === 0 ? (
              <p
                style={{
                  fontSize: "13px",
                  opacity: 0.8,
                  marginTop: "8px",
                }}
              >
                Bu oyuncu hakkında henüz yorum yapılmamış. İlk yorumu sen yaz!
              </p>
            ) : (
              comments.map((c) => {
                const likedBy = Array.isArray(c.likedBy) ? c.likedBy : [];
                const likeCount = likedBy.length;
                const isCommentLiked =
                  currentUser && likedBy.includes(currentUser.uid);
                const isUpdating = togglingCommentLikeId === c.id;
                const canDeleteComment =
                  currentUser &&
                  (currentUser.uid === c.authorUid || isAdmin);
                const isDeleting = deletingCommentId === c.id;

                return (
                  <div
                    key={c.id}
                    style={{
                      borderTop: "1px solid #222",
                      paddingTop: "10px",
                      marginTop: "10px",
                      display: "flex",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "50%",
                        background:
                          "linear-gradient(135deg, #ffc107 0%, #ff6f00 50%, #b71c1c 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "#000",
                        flexShrink: 0,
                      }}
                    >
                      {c.authorName
                        ? c.authorName.charAt(0).toUpperCase()
                        : "?"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "4px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: "600",
                          }}
                        >
                          {c.authorName || "Anonim"}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: "13px",
                          opacity: 0.9,
                          marginBottom: "6px",
                        }}
                      >
                        {c.text}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "12px",
                          opacity: 0.85,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          onClick={() => toggleCommentLike(c)}
                          disabled={isUpdating}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "999px",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "12px",
                            background: isCommentLiked ? "#ffc107" : "#222",
                            color: isCommentLiked ? "#000" : "#fff",
                          }}
                        >
                          {isCommentLiked
                            ? isUpdating
                              ? "Güncelleniyor..."
                              : "Beğendim ✔"
                            : isUpdating
                            ? "Güncelleniyor..."
                            : "Beğen"}
                        </button>
                        <span>
                          {likeCount === 0
                            ? "0 beğeni"
                            : `${likeCount} beğeni`}
                        </span>

                        {canDeleteComment && (
                          <button
                            onClick={() => deleteComment(c)}
                            disabled={isDeleting}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "999px",
                              border: "1px solid #444",
                              cursor: "pointer",
                              fontSize: "12px",
                              background: "#150000",
                              color: "#ff7373",
                              marginLeft: "8px",
                            }}
                          >
                            {isDeleting ? "Siliniyor..." : "Sil"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <p
            style={{
              fontSize: "12px",
              opacity: 0.7,
              marginTop: "12px",
            }}
          >
            İleride bu sayfaya daha fazla istatistik ve veri kaynağı da
            ekleyebiliriz. Şimdilik GsScout topluluğunun beğeni verisi,
            detaylı notlar, linkler ve yorumlar burada.
          </p>
        </div>
      </div>
    </main>
  );
}
