'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { auth, db } from '@/firebase/firebase'
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  getDocs,
} from 'firebase/firestore'
import styles from './Header.module.css'

interface UserData {
  name: string
  role?: 'admin' | 'subAdmin' | 'user'
}

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const [userName, setUserName] = useState<string>('')
  const [userRole, setUserRole] = useState<
    'admin' | 'subAdmin' | 'user' | null
  >(null)
  const [years, setYears] = useState<string[]>([])
  const [isYearMenuOpen, setIsYearMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [userMenuTimer, setUserMenuTimer] = useState<NodeJS.Timeout | null>(
    null
  )
  const [yearMenuTimer, setYearMenuTimer] = useState<NodeJS.Timeout | null>(
    null
  ) // yearMenuTimer 추가
  const [searchQuery, setSearchQuery] = useState('')
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user)
      if (user?.email) {
        const userRef = doc(db, 'users', user.email)
        const userSnap = await getDoc(userRef)
        if (userSnap.exists()) {
          const userData = userSnap.data() as UserData
          setUserName(userData.name)
          setUserRole(userData.role || 'user')
        }
      }
    })

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

        setYears(Array.from(yearSet).sort((a, b) => Number(b) - Number(a)))
      } catch (error) {
        console.error('연도 목록 로딩 중 오류:', error)
      }
    }

    fetchYears()
    return () => {
      unsubscribe()
      // 컴포넌트 언마운트 시 타이머 클리어
      if (userMenuTimer) clearTimeout(userMenuTimer)
      if (yearMenuTimer) clearTimeout(yearMenuTimer)
    }
  }, [userMenuTimer, yearMenuTimer]) // 의존성 배열에 타이머 추가

  const handleLogout = async () => {
    try {
      await auth.signOut()
      window.location.href = '/'
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error)
    }
  }

  const handleYearClick = (year: string) => {
    router.push(`/yearly?year=${year}`)
    setIsYearMenuOpen(false)
  }

  // ---- 사용자 메뉴 관련 함수 (개선됨) ----
  const handleUserMenuEnter = () => {
    if (userMenuTimer) {
      clearTimeout(userMenuTimer)
      setUserMenuTimer(null)
    }
    setIsUserMenuOpen(true)
  }

  const handleUserMenuLeave = () => {
    const timer = setTimeout(() => {
      setIsUserMenuOpen(false)
    }, 1000) // 0.3초 지연
    setUserMenuTimer(timer)
  }
  // -------------------------------------

  const handleAdminClick = () => {
    router.push('/admin')
    setIsUserMenuOpen(false)
  }

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // ---- 연도별 메뉴 관련 함수 ----
  const handleYearMenuEnter = () => {
    if (yearMenuTimer) {
      clearTimeout(yearMenuTimer);
      setYearMenuTimer(null);
    }
    setIsYearMenuOpen(true);
  };

  const handleYearMenuLeave = () => {
    const timer = setTimeout(() => {
      setIsYearMenuOpen(false);
    }, 300); // 0.3초 지연
    setYearMenuTimer(timer);
  };
  // -------------------------------------


  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <Link href="/" className={styles.logo}>
          Clix
        </Link>
        <div className={styles.searchSection}>
          <input
            type="text"
            placeholder="프로젝트 및 기술태그 검색"
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleSearchKeyPress}
          />
          <button onClick={handleSearch} className={styles.searchButton}>
            검색
          </button>
        </div>
        <nav className={styles.nav}>
          <div
            className={styles.yearNavItem}
            onMouseEnter={handleYearMenuEnter}
            onMouseLeave={handleYearMenuLeave}
          >
            <span
              className={`${styles.navItem} ${
                pathname === '/yearly' ? styles.active : ''
              }`}
            >
              연도별
            </span>
            {isYearMenuOpen && (
              <div
                className={styles.yearDropdown}
                onMouseEnter={handleYearMenuEnter} // 드롭다운 내부로 마우스 진입 시 타이머 리셋
                onMouseLeave={handleYearMenuLeave} // 드롭다운 내부에서 마우스 이탈 시 타이머 시작
              >
                {years.map((year) => (
                  <button
                    key={year}
                    className={styles.yearOption}
                    onClick={() => handleYearClick(year)}
                  >
                    {year}년
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link
            href="/hall-of-fame"
            className={`${styles.navItem} ${
              pathname === '/hall-of-fame' ? styles.active : ''
            }`}
          >
            명예전당
          </Link>
        </nav>
        <div className={styles.authSection}>
          {user ? (
            <div
              className={styles.userMenu}
              onMouseEnter={handleUserMenuEnter}
              onMouseLeave={handleUserMenuLeave}
            >
              <button
                className={styles.userNameButton}
                // 여기서는 버튼 자체에 onMouseEnter/onMouseLeave를 추가하지 않고,
                // 부모 div (styles.userMenu)에서 전체적으로 관리합니다.
                // 이렇게 해야 드롭다운 영역까지 포함하여 마우스 이탈을 감지합니다.
              >
                {userName}
                {(userRole === 'admin' || userRole === 'subAdmin') && (
                  <span className={styles.adminBadge}>관리자</span>
                )}
              </button>
              {isUserMenuOpen && (
                <div
                  className={styles.userDropdown}
                  onMouseEnter={handleUserMenuEnter} // 드롭다운 내부로 마우스 진입 시 타이머 리셋
                  onMouseLeave={handleUserMenuLeave} // 드롭다운 내부에서 마우스 이탈 시 타이머 시작
                >
                  <Link href="/mypage" className={styles.userMenuItem}>
                    마이페이지
                  </Link>
                  <Link href="/upload" className={styles.userMenuItem}>
                    프로젝트 업로드
                  </Link>
                  {(userRole === 'admin' || userRole === 'subAdmin') && (
                    <Link href="/admin" className={styles.userMenuItem}>
                      관리자 페이지
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className={styles.userMenuItem}
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.authButtons}>
              <Link href="/login" className={styles.loginButton}>
                로그인
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}