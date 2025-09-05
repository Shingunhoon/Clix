'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '@/firebase/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
} from 'firebase/firestore'
import styles from './page.module.css'

interface User {
  email: string
  name: string
  role: 'admin' | 'subAdmin' | 'user'
}

interface PhotoAlbum {
  id: string
  year: string
  googleDriveLink: string
  createdAt: {
    toDate: () => Date
  }
}

export default function PhotoAlbumsPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [photoAlbums, setPhotoAlbums] = useState<PhotoAlbum[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newYear, setNewYear] = useState('')
  const [newLink, setNewLink] = useState('')
  const [editYear, setEditYear] = useState('')
  const [editLink, setEditLink] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user?.email) {
        const userRef = doc(db, 'users', user.email)
        const userSnap = await getDoc(userRef)
        if (userSnap.exists()) {
          const userData = userSnap.data() as User
          if (userData.role === 'admin' || userData.role === 'subAdmin') {
            setCurrentUser({
              email: user.email,
              name: userData.name,
              role: userData.role,
            })
            fetchPhotoAlbums()
          } else {
            router.push('/')
          }
        } else {
          router.push('/')
        }
      } else {
        router.push('/')
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const fetchPhotoAlbums = async () => {
    try {
      const photoAlbumsRef = collection(db, 'photoAlbums')
      const q = query(photoAlbumsRef, orderBy('year', 'desc'))
      const querySnapshot = await getDocs(q)

      const albums = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PhotoAlbum[]

      setPhotoAlbums(albums)
    } catch (error) {
      console.error('포토앨범 목록 조회 실패:', error)
    }
  }

  const handleAddPhotoAlbum = async () => {
    if (!newYear || !newLink) {
      alert('연도와 링크를 모두 입력해주세요.')
      return
    }

    try {
      // 연도 중복 확인 - 쿼리로 확인
      const photoAlbumsRef = collection(db, 'photoAlbums')
      const q = query(photoAlbumsRef, where('year', '==', newYear))
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        alert('이미 존재하는 연도입니다.')
        return
      }

      // 새 포토앨범 추가
      await addDoc(collection(db, 'photoAlbums'), {
        year: newYear,
        googleDriveLink: newLink,
        createdAt: new Date(),
      })

      setNewYear('')
      setNewLink('')
      fetchPhotoAlbums()
      alert('포토앨범이 추가되었습니다.')
    } catch (error) {
      console.error('포토앨범 추가 실패:', error)
      alert('포토앨범 추가에 실패했습니다.')
    }
  }

  const handleEditPhotoAlbum = async (id: string) => {
    if (!editYear || !editLink) {
      alert('연도와 링크를 모두 입력해주세요.')
      return
    }

    try {
      // 연도 중복 확인 (자신 제외) - 쿼리로 확인
      const photoAlbumsRef = collection(db, 'photoAlbums')
      const q = query(photoAlbumsRef, where('year', '==', editYear))
      const querySnapshot = await getDocs(q)

      const existingAlbum = querySnapshot.docs.find((doc) => doc.id !== id)
      if (existingAlbum) {
        alert('이미 존재하는 연도입니다.')
        return
      }

      const photoAlbumRef = doc(db, 'photoAlbums', id)
      await updateDoc(photoAlbumRef, {
        year: editYear,
        googleDriveLink: editLink,
      })

      setEditingId(null)
      setEditYear('')
      setEditLink('')
      fetchPhotoAlbums()
      alert('포토앨범이 수정되었습니다.')
    } catch (error) {
      console.error('포토앨범 수정 실패:', error)
      alert('포토앨범 수정에 실패했습니다.')
    }
  }

  const handleDeletePhotoAlbum = async (id: string) => {
    if (!confirm('정말로 이 포토앨범을 삭제하시겠습니까?')) {
      return
    }

    try {
      await deleteDoc(doc(db, 'photoAlbums', id))
      fetchPhotoAlbums()
      alert('포토앨범이 삭제되었습니다.')
    } catch (error) {
      console.error('포토앨범 삭제 실패:', error)
      alert('포토앨범 삭제에 실패했습니다.')
    }
  }

  const startEdit = (album: PhotoAlbum) => {
    setEditingId(album.id)
    setEditYear(album.year)
    setEditLink(album.googleDriveLink)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditYear('')
    setEditLink('')
  }

  if (loading) {
    return <div className={styles.loading}>로딩 중...</div>
  }

  if (!currentUser) {
    return null
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>포토앨범 관리</h1>
        <button
          onClick={() => router.push('/admin')}
          className={styles.backButton}
        >
          ← 대시보드로 돌아가기
        </button>
      </div>

      <div className={styles.addSection}>
        <h2>새 포토앨범 추가</h2>
        <div className={styles.addForm}>
          <input
            type="text"
            placeholder="연도 (예: 2024)"
            value={newYear}
            onChange={(e) => setNewYear(e.target.value)}
            className={styles.input}
          />
          <input
            type="url"
            placeholder="구글 드라이브 링크"
            value={newLink}
            onChange={(e) => setNewLink(e.target.value)}
            className={styles.input}
          />
          <button onClick={handleAddPhotoAlbum} className={styles.addButton}>
            +
          </button>
        </div>
      </div>

      <div className={styles.listSection}>
        <h2>포토앨범 목록</h2>
        {photoAlbums.length === 0 ? (
          <p className={styles.noData}>등록된 포토앨범이 없습니다.</p>
        ) : (
          <div className={styles.photoAlbumsList}>
            {photoAlbums.map((album) => (
              <div key={album.id} className={styles.photoAlbumItem}>
                {editingId === album.id ? (
                  <div className={styles.editForm}>
                    <input
                      type="text"
                      value={editYear}
                      onChange={(e) => setEditYear(e.target.value)}
                      className={styles.input}
                    />
                    <input
                      type="url"
                      value={editLink}
                      onChange={(e) => setEditLink(e.target.value)}
                      className={styles.input}
                    />
                    <div className={styles.editButtons}>
                      <button
                        onClick={() => handleEditPhotoAlbum(album.id)}
                        className={styles.saveButton}
                      >
                        저장
                      </button>
                      <button
                        onClick={cancelEdit}
                        className={styles.cancelButton}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.albumInfo}>
                    <div className={styles.albumDetails}>
                      <span className={styles.year}>{album.year}년</span>
                      <a
                        href={album.googleDriveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.link}
                      >
                        구글 드라이브 링크
                      </a>
                    </div>
                    <div className={styles.albumActions}>
                      <button
                        onClick={() => startEdit(album)}
                        className={styles.editButton}
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDeletePhotoAlbum(album.id)}
                        className={styles.deleteButton}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
