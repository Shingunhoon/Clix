'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase/firebase'
import styles from './edit.module.css'

export default function EditPage() {
  const { id } = useParams()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const postRef = doc(db, 'posts', id as string)
        const postSnap = await getDoc(postRef)

        if (!postSnap.exists()) {
          alert('게시물을 찾을 수 없습니다.')
          router.push('/')
          return
        }

        const postData = postSnap.data()

        // 작성자 확인
        const user = auth.currentUser
        if (!user || postData.author.email !== user.email) {
          alert('수정 권한이 없습니다.')
          router.push('/')
          return
        }

        setTitle(postData.title)
        setContent(postData.content)
      } catch (error) {
        console.error('게시물 불러오기 실패:', error)
        alert('게시물을 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [id, router])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const postRef = doc(db, 'posts', id as string)
      await updateDoc(postRef, {
        title,
        content,
        updatedAt: new Date(),
      })

      alert('게시물이 수정되었습니다.')
      router.push(`/post/${id}`)
    } catch (error) {
      console.error('게시물 수정 실패:', error)
      alert('게시물 수정 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return <div className={styles.loading}>로딩 중...</div>
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>게시물 수정</h1>
      <form onSubmit={handleUpdate} className={styles.form}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.input}
            required
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.label}>내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={styles.textarea}
            required
            rows={10}
          />
        </div>
        <div className={styles.buttonGroup}>
          <button type="submit" className={styles.submitButton}>
            수정하기
          </button>
          <button
            type="button"
            onClick={() => router.push(`/post/${id}`)}
            className={styles.cancelButton}
          >
            취소
          </button>
        </div>
      </form>
    </div>
  )
}
