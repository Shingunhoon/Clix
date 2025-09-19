'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, db } from '@/firebase/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc, // updateDoc 추가
} from 'firebase/firestore';
import styles from './page.module.css';

interface User {
  email: string;
  name: string;
  role: 'admin' | 'subAdmin' | 'user';
  createdAt: {
    toDate: () => Date;
  };
}

interface Stats {
  totalUsers: number;
  totalPosts: number;
  totalComments: number;
  activeBanners: number;
  totalPhotoAlbums: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalPosts: 0,
    totalComments: 0,
    activeBanners: 0,
    totalPhotoAlbums: 0,
  });
  const [postUploadEnabled, setPostUploadEnabled] = useState(true); // 새로운 상태 추가

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user?.email) {
        const userRef = doc(db, 'users', user.email);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data() as User;
          if (userData.role === 'admin' || userData.role === 'subAdmin') {
            const { email: _, ...userInfo } = userData;
            setCurrentUser({ email: user.email, ...userInfo });
            fetchStats();
            fetchSettings(); // 설정 값 불러오기
          } else {
            router.push('/');
          }
        } else {
          router.push('/');
        }
      } else {
        router.push('/');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const fetchStats = async () => {
    try {
      // ... (기존 fetchStats 로직 유지)
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnapshot.size;

      const postsSnapshot = await getDocs(collection(db, 'posts'));
      const totalPosts = postsSnapshot.size;

      const commentsSnapshot = await getDocs(collection(db, 'comments'));
      const totalComments = commentsSnapshot.size;

      const bannersQuery = query(
        collection(db, 'banners'),
        where('isActive', '==', true)
      );
      const bannersSnapshot = await getDocs(bannersQuery);
      const activeBanners = bannersSnapshot.size;

      const photoAlbumsSnapshot = await getDocs(collection(db, 'photoAlbums'));
      const totalPhotoAlbums = photoAlbumsSnapshot.size;

      setStats({
        totalUsers,
        totalPosts,
        totalComments,
        activeBanners,
        totalPhotoAlbums,
      });
    } catch (error) {
      console.error('통계 데이터 조회 실패:', error);
    }
  };

  // 게시물 업로드 설정 값 불러오기
  const fetchSettings = async () => {
    try {
      const settingsDocRef = doc(db, 'settings', 'config');
      const settingsSnap = await getDoc(settingsDocRef);
      if (settingsSnap.exists()) {
        setPostUploadEnabled(settingsSnap.data().postUploadEnabled || false);
      } else {
        // 문서가 없으면 기본값으로 설정하고 생성 (선택 사항)
        console.warn('설정 문서가 존재하지 않습니다. 기본값으로 생성합니다.');
        await updateDoc(settingsDocRef, { postUploadEnabled: true });
        setPostUploadEnabled(true);
      }
    } catch (error) {
      console.error('설정 데이터 조회 실패:', error);
    }
  };

  // 게시물 업로드 설정 토글 함수
  const togglePostUploadEnabled = async () => {
    if (
      !currentUser ||
      (currentUser.role !== 'admin' && currentUser.role !== 'subAdmin')
    ) {
      alert('권한이 없습니다.');
      return;
    }
    try {
      const settingsDocRef = doc(db, 'settings', 'config');
      await updateDoc(settingsDocRef, {
        postUploadEnabled: !postUploadEnabled,
      });
      setPostUploadEnabled(!postUploadEnabled);
      alert(
        `게시물 업로드가 ${
          !postUploadEnabled ? '활성화' : '비활성화'
        }되었습니다.`
      );
    } catch (error) {
      console.error('게시물 업로드 설정 업데이트 실패:', error);
      alert('설정 업데이트 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return <div className={styles.loading}>로딩 중...</div>;
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className={styles.dashboard}>
      <h2 className={styles.dashboardTitle}>관리자 대시보드</h2>
      <div className={styles.statsGrid}>
        <Link href="/admin/users" className={styles.statCard}>
          <h3>전체 사용자</h3>
          <p>{stats.totalUsers.toLocaleString()}명</p>
        </Link>
        <Link href="/admin/posts" className={styles.statCard}>
          <h3>전체 게시물</h3>
          <p>{stats.totalPosts.toLocaleString()}개</p>
        </Link>
        <div className={styles.statCard}>
          <h3>전체 댓글</h3>
          <p>{stats.totalComments.toLocaleString()}개</p>
        </div>
        <Link href="/admin/banners" className={styles.statCard}>
          <h3>활성 배너</h3>
          <p>{stats.activeBanners.toLocaleString()}개</p>
        </Link>
        <Link href="/admin/photo-albums" className={styles.statCard}>
          <h3>포토앨범</h3>
          <p>{stats.totalPhotoAlbums.toLocaleString()}개</p>
        </Link>

        {/* 게시물 업로드 활성화/비활성화 토글 카드 추가 */}
        <div
          className={styles.statCard}
          onClick={togglePostUploadEnabled}
          style={{ cursor: 'pointer' }}
        >
          <h3>게시물 업로드</h3>
          <p>
            {postUploadEnabled ? '활성화' : '비활성화'}
            <span
              style={{ marginLeft: '10px', fontSize: '0.8em', color: '#666' }}
            >
              <br />
              (클릭 시 변경)
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
