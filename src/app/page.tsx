//\app\page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth, db } from '@/firebase/firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore'
import Head from 'next/head'
import Link from 'next/link'
import styles from './page.module.css'
import { toast } from 'react-hot-toast'
import FloatingButton from './components/FloatingButton'

interface Post {
  id: string
  title: string
  content: string
  author: {
    uid: string
    name: string
  }
  createdAt: {
    toDate: () => Date
  }
}

export default function Home() {
  const router = useRouter()
  const [userName, setUserName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<Post[]>([])

  // 로그인 상태 확인
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user?.email) {
        const userRef = doc(db, 'users', user.email)
        const userSnap = await getDoc(userRef)

        if (userSnap.exists()) {
          const data = userSnap.data()
          setUserName(data.name || '사용자')
        } else {
          toast.error('회원가입을 먼저 완료해주세요.')
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

  // 게시물 불러오기
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'))
        const querySnapshot = await getDocs(q)
        const postsData = await Promise.all(
          querySnapshot.docs.map(async (docSnapshot) => {
            const postData = docSnapshot.data() as any

            // author 정보가 없는 경우 처리
            if (!postData.author) {
              return {
                id: docSnapshot.id,
                ...postData,
                author: {
                  name: '익명',
                  email: 'unknown',
                },
              } as Post
            }

            // author.email 정보가 없는 경우 처리
            if (!postData.author.email) {
              return {
                id: docSnapshot.id,
                ...postData,
                author: {
                  ...postData.author,
                  name: postData.author.name || '익명',
                  email: 'unknown',
                },
              } as Post
            }

            // 작성자 정보 가져오기
            const authorRef = doc(db, 'users', postData.author.email)
            const authorSnap = await getDoc(authorRef)
            const authorData = authorSnap.data() as any

            // 작성자 이름이 있는 경우에만 사용
            const authorName =
              authorData?.name || postData.author.name || '익명'

            return {
              id: docSnapshot.id,
              ...postData,
              author: {
                ...postData.author,
                name: authorName,
              },
            } as Post
          })
        )
        setPosts(postsData)
      } catch (error) {
        console.error('Error fetching posts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [])

  if (loading) {
    return <div className={styles.container}>로딩 중...</div>
  }

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

      {/* 게시물 카드 */}
      <div className={styles.grid}>
        {posts.length === 0 ? (
          <p>등록된 게시물이 없습니다.</p>
        ) : (
          posts.map((post) => (
            <Link
              key={post.id}
              href={`/post/${post.id}`}
              className={styles.card}
            >
              <div className={styles.imagePlaceholder}>
                <span>image</span>
              </div>
              <h3>{post.title}</h3>
              <div className={styles.postMeta}>
                <span className={styles.author}>{post.author.name}</span>
                <span className={styles.date}>
                  {post.createdAt.toDate().toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* 고정 업로드 버튼 */}
      <FloatingButton />
    </div>
  )
}
