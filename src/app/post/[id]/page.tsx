'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { doc, getDoc, deleteDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase/firebase'
import styles from './post.module.css'
import Link from 'next/link'

interface Post {
  id: string
  title: string
  content: string
  author: {
    email: string
    name: string
  }
  createdAt: {
    toDate: () => Date
  }
}

export default function PostPage() {
  const params = useParams()
  const router = useRouter()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthor, setIsAuthor] = useState(false)

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const docRef = doc(db, 'posts', params.id as string)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const postData = { id: docSnap.id, ...docSnap.data() } as Post
          setPost(postData)

          // 작성자 확인
          const user = auth.currentUser
          setIsAuthor(user?.email === postData.author.email)
        } else {
          console.log('No such document!')
        }
      } catch (error) {
        console.error('Error fetching post:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [params.id])

  const handleDelete = async () => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return

    try {
      await deleteDoc(doc(db, 'posts', params.id as string))
      alert('게시물이 삭제되었습니다.')
      router.push('/')
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('게시물 삭제 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading...</div>
  }

  if (!post) {
    return <div className={styles.error}>게시물을 찾을 수 없습니다.</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.postContainer}>
        <h1 className={styles.title}>{post.title}</h1>
        <div className={styles.meta}>
          <span className={styles.author}>작성자: {post.author.name}</span>
          <span className={styles.date}>
            {post.createdAt.toDate().toLocaleDateString()}
          </span>
        </div>
        <div className={styles.content}>{post.content}</div>

        {isAuthor && (
          <div className={styles.buttons}>
            <Link href={`/post/${post.id}/edit`} className={styles.editButton}>
              수정
            </Link>
            <button onClick={handleDelete} className={styles.deleteButton}>
              삭제
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
