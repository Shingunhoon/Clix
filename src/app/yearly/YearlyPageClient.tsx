'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  doc,
  getDoc,
} from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import styles from './page.module.css'

interface Post {
  id: string
  title: string
  content: string
  thumbnailUrl?: string
  detailImages?: string[]
  author: {
    name: string
    email: string
  }
  createdAt: {
    toDate: () => Date
  }
  likes: string[]
  views: number
  teamName?: string
  teamMembers?: {
    name: string
    role: string
    githubLink?: string
    portfolioLink?: string
  }[]
  techStack?: string[]
}

interface Banner {
  id: string
  imageUrl: string
  position: 'right'
  isActive: boolean
  order: number
  year?: string
}

interface PhotoAlbum {
  year: string
  googleDriveLink: string
}

interface YearMeta {
  title?: string
  headProfessor?: string
  advisors?: string
  committee?: string
  president?: string
  color?: string
  textColor?: string
}

export default function YearlyPageClient() {
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [years, setYears] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [showLoadMoreButton, setShowLoadMoreButton] = useState(false)
  const [lastDoc, setLastDoc] = useState<any>(null)
  const [banners, setBanners] = useState<Banner[]>([])
  const [photoAlbumLink, setPhotoAlbumLink] = useState<string>('')

  const [yearMeta, setYearMeta] = useState<YearMeta>({})
  const searchParams = useSearchParams()
  const POSTS_PER_PAGE = 9

  // 연도 목록 가져오기
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const postsRef = collection(db, 'posts')
        const q = query(postsRef, orderBy('createdAt', 'desc'))
        const querySnapshot = await getDocs(q)

        const yearSet = new Set<string>()
        querySnapshot.docs.forEach((doc) => {
          const year = doc.data().createdAt.toDate().getFullYear().toString()
          yearSet.add(year)
        })

        const yearsArray = Array.from(yearSet).sort(
          (a, b) => Number(b) - Number(a)
        )
        setYears(yearsArray)

        // URL에서 연도 파라미터 가져오기
        const yearFromUrl = searchParams.get('year')
        if (yearFromUrl && yearsArray.includes(yearFromUrl)) {
          setSelectedYear(yearFromUrl)
        } else if (yearsArray.length > 0) {
          setSelectedYear(yearsArray[0])
        }
      } catch (error) {
        console.error('연도 목록 로딩 중 오류:', error)
      }
    }

    fetchYears()
  }, [searchParams])

  // 배너 불러오기
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const bannersRef = collection(db, 'banners')
        let q

        if (selectedYear) {
          // 선택된 연도에 특화된 배너가 있는지 확인
          q = query(
            bannersRef,
            where('isActive', '==', true),
            where('position', '==', 'right'),
            where('year', '==', selectedYear)
          )
        } else {
          // 연도별 배너가 없으면 일반 배너 사용
          q = query(
            bannersRef,
            where('isActive', '==', true),
            where('position', '==', 'right')
          )
        }

        const querySnapshot = await getDocs(q)
        const bannersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Banner[]

        // order 기준으로 정렬
        setBanners(bannersData.sort((a, b) => a.order - b.order))
      } catch (error) {
        console.error('배너 로딩 중 오류:', error)
      }
    }

    fetchBanners()
  }, [selectedYear])

  // 포토앨범 링크 가져오기
  useEffect(() => {
    const fetchPhotoAlbumLink = async () => {
      if (!selectedYear) return

      try {
        console.log('포토앨범 링크 조회 시작:', selectedYear)

        // 연도별로 쿼리하여 포토앨범 데이터 가져오기
        const photoAlbumsRef = collection(db, 'photoAlbums')
        const q = query(photoAlbumsRef, where('year', '==', selectedYear))
        const querySnapshot = await getDocs(q)

        console.log('쿼리 결과 개수:', querySnapshot.size)

        if (!querySnapshot.empty) {
          const photoAlbumDoc = querySnapshot.docs[0]
          const photoAlbumData = photoAlbumDoc.data() as PhotoAlbum
          console.log('포토앨범 데이터:', photoAlbumData)
          setPhotoAlbumLink(photoAlbumData.googleDriveLink)
          console.log('포토앨범 링크 설정됨:', photoAlbumData.googleDriveLink)
        } else {
          console.log('해당 연도의 포토앨범 데이터 없음:', selectedYear)
          setPhotoAlbumLink('')
        }
      } catch (error) {
        console.error('포토앨범 링크 로딩 중 오류:', error)
        setPhotoAlbumLink('')
      }
    }

    fetchPhotoAlbumLink()
  }, [selectedYear])

  // yearMetas 컬렉션에서 상단 정보 가져오기
  useEffect(() => {
    const fetchYearMeta = async () => {
      if (!selectedYear) return
      try {
        const yearMetasRef = collection(db, 'yearMetas')
        const q = query(yearMetasRef, where('year', '==', selectedYear))
        const querySnapshot = await getDocs(q)
        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data()
          setYearMeta({
            title: data.title || '',
            headProfessor: data.headProfessor || '',
            advisors: data.advisors || '',
            committee: data.committee || '',
            president: data.president || '',
            color: data.color || '#fde1e4',
            textColor: data.textColor || '#7a2327',
          })
        } else {
          setYearMeta({})
        }
      } catch (e) {
        setYearMeta({})
      }
    }
    fetchYearMeta()
  }, [selectedYear])

  // 선택된 연도의 게시물 가져오기
  const fetchPosts = async (isInitial: boolean = false) => {
    if (!selectedYear) return

    if (isInitial) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const startDate = new Date(Number(selectedYear), 0, 1)
      const endDate = new Date(Number(selectedYear) + 1, 0, 1)

      let q
      if (isInitial) {
        q = query(
          collection(db, 'posts'),
          where('createdAt', '>=', startDate),
          where('createdAt', '<', endDate),
          orderBy('createdAt', 'desc'),
          limit(POSTS_PER_PAGE)
        )
      } else {
        q = query(
          collection(db, 'posts'),
          where('createdAt', '>=', startDate),
          where('createdAt', '<', endDate),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(POSTS_PER_PAGE)
        )
      }

      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        setHasMore(false)
        setShowLoadMoreButton(false)
        return
      }

      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1])

      const postsData = await Promise.all(
        querySnapshot.docs.map(async (docSnapshot) => {
          const postData = docSnapshot.data() as any
          return {
            id: docSnapshot.id,
            ...postData,
            author: {
              name: postData.author?.name || '익명',
              email: postData.author?.email || 'unknown',
            },
            likes: postData.likes || [],
            views: postData.views || 0,
          } as Post
        })
      )

      setPosts((prevPosts) =>
        isInitial ? postsData : [...prevPosts, ...postsData]
      )

      // 9개 이상의 게시물이 있으면 화살표 버튼 표시
      if (isInitial && postsData.length === POSTS_PER_PAGE) {
        setShowLoadMoreButton(true)
      }
    } catch (error) {
      console.error('게시물 로딩 중 오류:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // 선택된 연도가 변경될 때 게시물 다시 로드
  useEffect(() => {
    if (selectedYear) {
      setPosts([])
      setLastDoc(null)
      setHasMore(true)
      setShowLoadMoreButton(false)
      fetchPosts(true)
    }
  }, [selectedYear])

  // 수동으로 더 많은 게시물 로드
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return

    setLoadingMore(true)
    try {
      await fetchPosts(false)
    } finally {
      setLoadingMore(false)
    }
  }

  // 스크롤 이벤트 리스너 추가
  useEffect(() => {
    const handleScroll = () => {
      if (showLoadMoreButton && !loadingMore && hasMore) {
        const scrollTop =
          window.pageYOffset || document.documentElement.scrollTop
        const windowHeight = window.innerHeight
        const documentHeight = document.documentElement.scrollHeight

        // 스크롤이 페이지 하단 근처에 도달했을 때
        if (scrollTop + windowHeight >= documentHeight - 100) {
          setShowLoadMoreButton(true)
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [showLoadMoreButton, loadingMore, hasMore])

  const handlePhotoAlbumClick = () => {
    console.log('포토앨범 버튼 클릭됨')
    console.log('현재 포토앨범 링크:', photoAlbumLink)
    console.log('선택된 연도:', selectedYear)

    if (photoAlbumLink) {
      console.log('구글 드라이브 링크로 이동:', photoAlbumLink)
      window.open(photoAlbumLink, '_blank')
    } else {
      console.log('포토앨범 링크가 없습니다.')
      alert('이 연도의 포토앨범 링크가 아직 등록되지 않았습니다.')
    }
  }

    return (
    <div className={styles.container}>
      {/* metaHeader now lives directly inside the main container but spans full width */}
      {yearMeta.title && (
        <div
          className={styles.metaHeader}
          style={{
            background: yearMeta.color || '#fde1e4',
          }}
        >
          <h1
            className={styles.metaTitle}
            style={{ color: yearMeta.textColor || '#7a2327' }}
          >
            {yearMeta.title &&
            yearMeta.title.includes('중부대학교 정보보호학과') ? (
              <>
                중부대학교 정보보호학과
                <br />
                {yearMeta.title.replace('중부대학교 정보보호학과', '').trim()}
              </>
            ) : (
              yearMeta.title
            )}
          </h1>
          <div
            className={styles.metaInfo}
            style={{ color: yearMeta.textColor || '#7a2327' }}
          >
            {yearMeta.headProfessor && (
              <div>학과장: {yearMeta.headProfessor}</div>
            )}
            {yearMeta.advisors && (
              <div>졸업연구 지도교수: {yearMeta.advisors}</div>
            )}
            {yearMeta.committee && (
              <div>졸업준비위원장: {yearMeta.committee}</div>
            )}
            {yearMeta.president && <div>학회장: {yearMeta.president}</div>}
          </div>
        </div>
      )}

      {/* This wrapper now contains the sidebars and the main content */}
      <div className={styles.contentWrapper}>
        <div className={styles.leftSpace} /> {/* Left sidebar */}

        <div className={styles.mainContent}>
          <div className={styles.yearSelector}>
            {years.map((year) => (
              <button
                key={year}
                className={`${styles.yearButton} ${
                  selectedYear === year ? styles.active : ''
                }`}
                onClick={() => setSelectedYear(year)}
              >
                {year}년
              </button>
            ))}
          </div>

          {/* Photo album button */}
          {photoAlbumLink && (
            <div className={styles.photoAlbumSection}>
              <button
                className={styles.photoAlbumButton}
                onClick={handlePhotoAlbumClick}
              >
                📸 포토앨범 →
              </button>
            </div>
          )}

          {loading ? (
            <div className={styles.loading}>로딩 중...</div>
          ) : (
            <>
              <div className={styles.postsGrid}>
                {posts.map((post, index) => (
                  <div key={post.id} className={styles.card}>
                    <div className={styles.imageContainer}>
                      <Link href={`/post/${post.id}`}>
                        {post.thumbnailUrl ? (
                          <img
                            src={post.thumbnailUrl}
                            alt={post.title}
                            className={styles.cardImage}
                          />
                        ) : (
                          <div className={styles.imagePlaceholder}>
                            <span>이미지 없음</span>
                          </div>
                        )}
                      </Link>
                    </div>
                    <div className={styles.cardContent}>
                      <h3>{post.title}</h3>
                      <div className={styles.cardInfo}>
                        <span>팀명: {post.teamName || '미지정'}</span>
                        <span>작성자: {post.author.name}</span>
                        {post.teamMembers &&
                          post.teamMembers.length > 0 &&
                          (() => {
                            const professors = post.teamMembers.filter(
                              (member) => member.role === '지도교수'
                            )
                            return professors.length > 0 ? (
                              <span>
                                지도교수:{' '}
                                {professors.map((p) => p.name).join(', ')}
                              </span>
                            ) : null
                          })()}
                        {post.techStack && post.techStack.length > 0 && (
                          <div className={styles.techStackContainer}>
                            <div className={styles.techStackList}>
                              {post.techStack.slice(0, 3).map((tech, index) => (
                                <span
                                  key={index}
                                  className={styles.techStackItem}
                                >
                                  #{tech}
                                </span>
                              ))}
                              {post.techStack.length > 3 && (
                                <span className={styles.techStackMore}>+</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className={styles.cardMeta}>
                        <div className={styles.cardStats}>
                          <button className={styles.likeButton}>
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className={styles.heartIcon}
                            >
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                            <span>{post.likes.length}</span>
                          </button>
                          <span className={styles.views}>
                            조회수: {post.views.toLocaleString()}
                          </span>
                          <span className={styles.createdAt}>
                            {post.createdAt.toDate().toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load more posts button */}
              {showLoadMoreButton && (
                <div className={styles.loadMoreContainer}>
                  <button
                    className={styles.loadMoreSmallButton}
                    onClick={handleLoadMore}
                    disabled={loadingMore || !hasMore}
                  >
                    {loadingMore ? '로딩 중...' : '게시물 더보기↓'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.rightBanner}>
          {banners.map((banner) => (
            <img
              key={banner.id}
              src={banner.imageUrl}
              alt={`${selectedYear}년 배너`}
              className={styles.bannerImage}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
