'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/firebase/firebase'
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from 'firebase/firestore'
import styles from './upload.module.css'

export default function UploadPage() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // 로그인 상태 확인
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        alert('로그인이 필요합니다.')
        router.push('/login')
        return
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const handleSubmit = async () => {
    const user = auth.currentUser
    if (!user) {
      alert('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    try {
      // 사용자 정보 가져오기
      const userRef = doc(db, 'users', user.email || '')
      const userSnap = await getDoc(userRef)

      if (!userSnap.exists()) {
        alert('사용자 정보를 찾을 수 없습니다.')
        return
      }

      const userData = userSnap.data()

      await addDoc(collection(db, 'posts'), {
        title,
        content,
        author: {
          email: user.email,
          name: userData.name,
        },
        createdAt: serverTimestamp(),
      })

      alert('게시물이 등록되었습니다!')
      router.push('/')
    } catch (error) {
      console.error('업로드 에러:', error)
      alert('게시물 등록 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return <div className={styles.loading}>로딩 중...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h1 className={styles.title}>새 게시물 작성</h1>
        <div className={styles.inputGroup}>
          <label className={styles.label}>제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.input}
            placeholder="제목을 입력하세요"
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.label}>내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={styles.textarea}
            placeholder="내용을 입력하세요"
            rows={10}
          />
        </div>
        <button onClick={handleSubmit} className={styles.submitButton}>
          게시하기
        </button>
      </div>
    </div>
  )
}
