import Head from 'next/head'
import styles from '../styles/Home.module.css'

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>My Next.js App</title>
      </Head>

      {/* 헤더 */}
      <header className={styles.header}>
        <div className={styles.logo}>Clix</div>
        <nav className={styles.nav}>
          <div className={styles.navItem}></div>
          <div className={styles.navItem}></div>
          <div className={styles.navItem}></div>
        </nav>
        <button className={styles.login}>로그인</button>
      </header>

      {/* 검색 창 */}
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="검색어를 입력하세요..."
          className={styles.searchBox}
        />
      </div>

      {/* 명예의 전당 박스 */}
      <div className={styles.hallOfFame}>
        명예의 전당
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
