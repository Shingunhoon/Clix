'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth, db } from '@/firebase/firebase'
import { doc, getDoc } from 'firebase/firestore'
import Head from 'next/head'
import Link from 'next/link'
import styles from '../styles/Home.module.css'
import { toast } from 'react-hot-toast' // ✅ 추가

export default function Home() {
  const router = useRouter()
  const [userName, setUserName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // 🔐 로그인 상태 감지 + Firestore에 사용자 정보 있는지 확인
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user?.email) {
        const userRef = doc(db, 'users', user.email)
        const userSnap = await getDoc(userRef)

        if (userSnap.exists()) {
          const data = userSnap.data()
          setUserName(data.name || '사용자')
        } else {
          // ❌ Firestore에 사용자 정보 없음 → 회원가입 미완료
          toast.error('회원가입을 먼저 완료해주세요.') // ✅ 변경
          await signOut(auth)
          router.push('/signup')
        }
      } else {
        setUserName(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  if (loading) return <div className={styles.container}>로딩 중...</div>

  return (
    <div className={styles.container}>
      <Head>
        <title>Clix</title>
      </Head>

      {/* 헤더 */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <img src="/logo.png" alt="Clix 로고" className={styles.logoImage} />
        </div>

        {userName ? (
          <div className={styles.authBox}>
            <span className={styles.email}>{userName}</span>
            <button
              onClick={async () => {
                await signOut(auth)
                router.push('/login')
              }}
              className={styles.login}
            >
              로그아웃
            </button>
          </div>
        ) : (
          <Link href="/login">
            <button className={styles.login}>로그인</button>
          </Link>
        )}
      </header>

      {/* 검색 창 */}
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="검색어를 입력하세요..."
          className={styles.searchBox}
        />
      </div>

      {/* 명예의 전당 */}
      <div className={styles.hallOfFame}>
        명예 전당
        <br />
        sample web
      </div>

      {/* 게시물 카드 */}
      <div className={styles.grid}>
        {Array.from({ length: 9 }).map((_, index) => (
          <div key={index} className={styles.card}>
            <p>게시물 {index + 1}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
